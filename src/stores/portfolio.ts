import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { StorageService, Account, Investment, Asset, PortfolioSnapshot, TnaPeriod, Movement, Split, FreeExpense, Contact, Settlement } from '../services/storage'
import { DolarService } from '../services/dolar'

export const usePortfolioStore = defineStore('portfolio', () => {
  const accounts = ref<Account[]>([])
  const investments = ref<Investment[]>([])
  const assets = ref<Asset[]>([])
  const snapshots = ref<PortfolioSnapshot[]>([])
  const freeExpenses = ref<FreeExpense[]>([])
  const contacts = ref<Contact[]>([])
  const settlements = ref<Settlement[]>([])
  const dolarBlue = ref(0)
  const dolarOficial = ref(0)
  const dolarMep = ref(0)
  const loading = ref(false)

  async function init() {
    loading.value = true
    try {
      ;[accounts.value, investments.value, assets.value, snapshots.value, freeExpenses.value, contacts.value, settlements.value] = await Promise.all([
        StorageService.getAccounts(),
        StorageService.getInvestments(),
        StorageService.getAssets(),
        StorageService.getSnapshots(),
        StorageService.getFreeExpenses(),
        StorageService.getContacts(),
        StorageService.getSettlements(),
      ])

      const rates = await DolarService.getRates()
      dolarBlue.value = rates.blue
      dolarOficial.value = rates.oficial
      dolarMep.value = rates.mep

      void saveSnapshot()
    } finally {
      loading.value = false
    }
  }

  function toARS(amount: number, currency: 'ARS' | 'USD'): number {
    if (currency === 'ARS') return amount
    return dolarBlue.value > 0 ? amount * dolarBlue.value : amount
  }

  function toUSD(amount: number, currency: 'ARS' | 'USD'): number {
    if (currency === 'USD') return amount
    return dolarBlue.value > 0 ? amount / dolarBlue.value : 0
  }

  function resolvedPeriods(account: Account): TnaPeriod[] {
    if (account.tnaPeriods && account.tnaPeriods.length > 0) {
      return [...account.tnaPeriods].sort((a, b) => new Date(a.from).getTime() - new Date(b.from).getTime())
    }
    if (account.tna && account.tna > 0) {
      return [{ tna: account.tna, from: account.balanceUpdatedAt || account.createdAt }]
    }
    return []
  }

  function currentTna(account: Account): number {
    const periods = resolvedPeriods(account)
    return periods.length > 0 ? periods[periods.length - 1].tna : 0
  }

  // Core calculation: processes TNA periods and movements chronologically.
  // After each movement the running base is crystallised (base + accrued interest ± movement),
  // so future interest is calculated on the adjusted balance.
  function accountEffectiveBalanceAt(account: Account, untilMs: number): number {
    const periods = resolvedPeriods(account)
    const depositMs = new Date(account.balanceUpdatedAt || account.createdAt).getTime()
    if (untilMs <= depositMs) return account.balance

    type Evt =
      | { ms: number; kind: 'tna'; tna: number }
      | { ms: number; kind: 'movement'; amount: number; movType: 'expense' | 'income' }

    const evts: Evt[] = []
    for (const p of periods) {
      const ms = new Date(p.from).getTime()
      if (ms > depositMs && ms <= untilMs) evts.push({ kind: 'tna', ms, tna: p.tna })
    }
    for (const m of (account.movements ?? [])) {
      const ms = new Date(m.date).getTime()
      if (ms > depositMs && ms <= untilMs) evts.push({ kind: 'movement', ms, amount: m.amount, movType: m.type })
    }
    evts.sort((a, b) => a.ms - b.ms || (a.kind === 'tna' ? -1 : 1))

    let currentTna = 0
    for (const p of periods) {
      if (new Date(p.from).getTime() <= depositMs) currentTna = p.tna
    }

    let base = account.balance
    let segInterest = 0
    let segStart = depositMs

    for (const evt of [...evts, { kind: 'end' as const, ms: untilMs }]) {
      if (evt.ms > segStart && currentTna > 0) {
        const days = (evt.ms - segStart) / 86_400_000
        segInterest += base * (currentTna / 100) * (days / 365)
      }
      if (evt.kind === 'tna') {
        currentTna = evt.tna
      } else if (evt.kind === 'movement') {
        const delta = evt.movType === 'income' ? evt.amount : -evt.amount
        base = Math.max(0, base + segInterest + delta)
        segInterest = 0
      }
      segStart = evt.ms
    }

    return base + segInterest
  }

  function accountEffectiveBalance(account: Account): number {
    return accountEffectiveBalanceAt(account, Date.now())
  }

  // Interest = effective balance minus original deposit minus net movements
  function accountInterestAt(account: Account, untilMs: number): number {
    const periods = resolvedPeriods(account)
    if (periods.length === 0 && (account.movements ?? []).length === 0) return 0
    const netMov = (account.movements ?? [])
      .filter(m => new Date(m.date).getTime() <= untilMs)
      .reduce((sum, m) => m.type === 'income' ? sum + m.amount : sum - m.amount, 0)
    return accountEffectiveBalanceAt(account, untilMs) - account.balance - netMov
  }

  function accountInterest(account: Account): number {
    return accountInterestAt(account, Date.now())
  }

  function accountNetMovements(account: Account): number {
    return (account.movements ?? []).reduce((sum, m) =>
      m.type === 'income' ? sum + m.amount : sum - m.amount, 0)
  }

  function accountTotalExpenses(account: Account): number {
    return (account.movements ?? []).filter(m => m.type === 'expense').reduce((s, m) => s + m.amount, 0)
  }

  function accountTotalIncome(account: Account): number {
    return (account.movements ?? []).filter(m => m.type === 'income').reduce((s, m) => s + m.amount, 0)
  }

  function addTnaPeriod(id: string, period: TnaPeriod) {
    const idx = accounts.value.findIndex(a => a.id === id)
    if (idx === -1) return
    const acc = accounts.value[idx]
    const periods = resolvedPeriods(acc)
    periods.push(period)
    periods.sort((a, b) => new Date(a.from).getTime() - new Date(b.from).getTime())
    accounts.value[idx] = { ...acc, tnaPeriods: periods, tna: periods[periods.length - 1].tna }
    void StorageService.saveAccount(accounts.value[idx])
    void saveSnapshot()
  }

  function removeTnaPeriod(id: string, from: string) {
    const idx = accounts.value.findIndex(a => a.id === id)
    if (idx === -1) return
    const acc = accounts.value[idx]
    const periods = resolvedPeriods(acc)
    if (periods.length <= 1) return
    const updated = periods.filter(p => p.from !== from)
    accounts.value[idx] = { ...acc, tnaPeriods: updated, tna: updated[updated.length - 1].tna }
    void StorageService.saveAccount(accounts.value[idx])
    void saveSnapshot()
  }

  const totalAccountsARS = computed(() =>
    accounts.value.reduce((sum, a) => sum + toARS(accountEffectiveBalance(a), a.currency), 0)
  )

  const totalInvestmentsARS = computed(() =>
    investments.value.reduce((sum, inv) =>
      sum + toARS(inv.quantity * inv.currentPrice, inv.currency), 0)
  )

  const totalAssetsARS = computed(() =>
    assets.value.reduce((sum, a) => sum + toARS(a.value, a.currency), 0)
  )

  const totalPatrimonioARS = computed(() =>
    totalAccountsARS.value + totalInvestmentsARS.value + totalAssetsARS.value
  )

  const totalPatrimonioUSD = computed(() =>
    dolarBlue.value > 0 ? totalPatrimonioARS.value / dolarBlue.value : 0
  )

  // Accounts
  function addAccount(account: Omit<Account, 'id' | 'createdAt'>) {
    const now = new Date().toISOString()
    const balanceUpdatedAt = account.balanceUpdatedAt || now
    const tnaPeriods = account.tna && account.tna > 0 && !account.tnaPeriods
      ? [{ tna: account.tna, from: balanceUpdatedAt }]
      : account.tnaPeriods
    const item: Account = { ...account, id: crypto.randomUUID(), createdAt: now, balanceUpdatedAt, tnaPeriods }
    accounts.value.push(item)
    void StorageService.saveAccount(item)
    void saveSnapshot()
  }

  function updateAccount(id: string, updates: Partial<Account>) {
    const idx = accounts.value.findIndex(a => a.id === id)
    if (idx !== -1) {
      const current = accounts.value[idx]
      const balanceChanged = updates.balance !== undefined && updates.balance !== current.balance
      const explicitDate = updates.balanceUpdatedAt !== undefined
      accounts.value[idx] = {
        ...current,
        ...updates,
        balanceUpdatedAt: explicitDate
          ? updates.balanceUpdatedAt!
          : balanceChanged ? new Date().toISOString() : current.balanceUpdatedAt
      }
      void StorageService.saveAccount(accounts.value[idx])
      void saveSnapshot()
    }
  }

  function deleteAccount(id: string) {
    accounts.value = accounts.value.filter(a => a.id !== id)
    void StorageService.deleteAccount(id)
    void saveSnapshot()
  }

  // Investments
  function addInvestment(investment: Omit<Investment, 'id' | 'createdAt' | 'updatedAt'>) {
    const item: Investment = {
      ...investment,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    investments.value.push(item)
    void StorageService.saveInvestment(item)
    void saveSnapshot()
  }

  function updateInvestment(id: string, updates: Partial<Investment>) {
    const idx = investments.value.findIndex(i => i.id === id)
    if (idx !== -1) {
      investments.value[idx] = { ...investments.value[idx], ...updates, updatedAt: new Date().toISOString() }
      void StorageService.saveInvestment(investments.value[idx])
      void saveSnapshot()
    }
  }

  function deleteInvestment(id: string) {
    investments.value = investments.value.filter(i => i.id !== id)
    void StorageService.deleteInvestment(id)
    void saveSnapshot()
  }

  // Assets
  function addAsset(asset: Omit<Asset, 'id' | 'createdAt'>) {
    const item: Asset = { ...asset, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
    assets.value.push(item)
    void StorageService.saveAsset(item)
    void saveSnapshot()
  }

  function updateAsset(id: string, updates: Partial<Asset>) {
    const idx = assets.value.findIndex(a => a.id === id)
    if (idx !== -1) {
      assets.value[idx] = { ...assets.value[idx], ...updates }
      void StorageService.saveAsset(assets.value[idx])
      void saveSnapshot()
    }
  }

  function deleteAsset(id: string) {
    assets.value = assets.value.filter(a => a.id !== id)
    void StorageService.deleteAsset(id)
    void saveSnapshot()
  }

  // Movements (expenses / income)
  function addMovement(accountId: string, data: { type: 'expense' | 'income'; amount: number; description: string; date: string; paidBy?: string; splits?: Split[] }) {
    const idx = accounts.value.findIndex(a => a.id === accountId)
    if (idx === -1) return
    const acc = accounts.value[idx]
    const movement: Movement = {
      id: crypto.randomUUID(),
      type: data.type,
      amount: data.amount,
      description: data.description,
      date: new Date(data.date).toISOString(),
      ...(data.paidBy ? { paidBy: data.paidBy } : {}),
      ...(data.splits?.length ? { splits: data.splits } : {})
    }
    const updated = { ...acc, movements: [...(acc.movements ?? []), movement] }
    accounts.value[idx] = updated
    StorageService.saveAccount(updated).catch(err => console.error('Error guardando movimiento:', err))
    void saveSnapshot()
  }

  function updateMovement(accountId: string, movementId: string, data: { type: 'expense' | 'income'; amount: number; description: string; date: string; paidBy?: string; splits?: Split[] }) {
    const idx = accounts.value.findIndex(a => a.id === accountId)
    if (idx === -1) return
    const acc = accounts.value[idx]
    const updated = {
      ...acc,
      movements: (acc.movements ?? []).map(m =>
        m.id === movementId
          ? { ...m, type: data.type, amount: data.amount, description: data.description, date: new Date(data.date).toISOString(), ...(data.paidBy ? { paidBy: data.paidBy } : {}), ...(data.splits?.length ? { splits: data.splits } : {}) }
          : m
      )
    }
    accounts.value[idx] = updated
    StorageService.saveAccount(updated).catch(err => console.error('Error actualizando movimiento:', err))
    void saveSnapshot()
  }

  function updateParticipants(accountId: string, participants: string[]) {
    const idx = accounts.value.findIndex(a => a.id === accountId)
    if (idx === -1) return
    accounts.value[idx] = { ...accounts.value[idx], participants }
    void StorageService.saveAccount(accounts.value[idx])
  }

  // Accumulates split balances into a map: positive = owed to them, negative = they owe
  function accumulateSplits(splits: Split[], paidBy: string | undefined, balances: Record<string, number>) {
    if (!paidBy || !splits.length) return
    for (const split of splits) {
      if (split.participant === paidBy) continue // paidBy's own share, no transfer needed
      balances[split.participant] = (balances[split.participant] ?? 0) - split.amount
      balances[paidBy] = (balances[paidBy] ?? 0) + split.amount
    }
  }

  // Returns net balance per participant for a single account
  function participantBalances(account: Account): Record<string, number> {
    const balances: Record<string, number> = {}
    for (const p of (account.participants ?? [])) balances[p] = 0
    for (const m of (account.movements ?? [])) {
      if (m.type !== 'expense' || !m.splits?.length) continue
      accumulateSplits(m.splits, m.paidBy, balances)
    }
    return balances
  }

  // Global balances across all accounts, free expenses and settlements, seeded with all contacts at 0
  const globalParticipantBalances = computed<Record<string, number>>(() => {
    const balances: Record<string, number> = {}
    for (const c of contacts.value) balances[c.name] = 0
    for (const acc of accounts.value) {
      for (const m of (acc.movements ?? [])) {
        if (m.type !== 'expense' || !m.splits?.length) continue
        accumulateSplits(m.splits, m.paidBy, balances)
      }
    }
    for (const e of freeExpenses.value) {
      if (e.type !== 'expense' || !e.splits?.length) continue
      accumulateSplits(e.splits, e.paidBy, balances)
    }
    // Settlements: fromPerson paid toPerson → fromPerson balance goes up, toPerson goes down
    for (const s of settlements.value) {
      balances[s.fromPerson] = (balances[s.fromPerson] ?? 0) + s.amount
      balances[s.toPerson] = (balances[s.toPerson] ?? 0) - s.amount
    }
    return balances
  })

  function addSettlement(data: Omit<Settlement, 'id' | 'createdAt'>) {
    const item: Settlement = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
    settlements.value.push(item)
    void StorageService.saveSettlement(item)
  }

  function deleteSettlement(id: string) {
    settlements.value = settlements.value.filter(s => s.id !== id)
    void StorageService.deleteSettlement(id)
  }

  function addContact(name: string) {
    if (contacts.value.some(c => c.name === name)) return
    const item: Contact = { id: crypto.randomUUID(), name, createdAt: new Date().toISOString() }
    contacts.value.push(item)
    void StorageService.saveContact(item)
  }

  function deleteContact(id: string) {
    contacts.value = contacts.value.filter(c => c.id !== id)
    void StorageService.deleteContact(id)
  }

  function deleteMovement(accountId: string, movementId: string) {
    const idx = accounts.value.findIndex(a => a.id === accountId)
    if (idx === -1) return
    const acc = accounts.value[idx]
    const updated = { ...acc, movements: (acc.movements ?? []).filter(m => m.id !== movementId) }
    accounts.value[idx] = updated
    void StorageService.saveAccount(updated)
    void saveSnapshot()
  }

  function addFreeExpense(data: Omit<FreeExpense, 'id' | 'createdAt'>) {
    const item: FreeExpense = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
    freeExpenses.value.push(item)
    void StorageService.saveFreeExpense(item)
  }

  function updateFreeExpense(id: string, data: Omit<FreeExpense, 'id' | 'createdAt'>) {
    const idx = freeExpenses.value.findIndex(e => e.id === id)
    if (idx === -1) return
    freeExpenses.value[idx] = { ...freeExpenses.value[idx], ...data }
    void StorageService.saveFreeExpense(freeExpenses.value[idx])
  }

  function deleteFreeExpense(id: string) {
    freeExpenses.value = freeExpenses.value.filter(e => e.id !== id)
    void StorageService.deleteFreeExpense(id)
  }

  async function saveSnapshot() {
    const today = new Date().toISOString().split('T')[0]

    const ownerNames = [...new Set([
      ...accounts.value.map(a => a.owner ?? ''),
      ...investments.value.map(i => i.owner ?? ''),
      ...assets.value.map(a => a.owner ?? '')
    ])].filter(n => n !== '')

    const byOwner: Record<string, { totalARS: number; totalUSD: number }> = {}
    for (const name of ownerNames) {
      const ownerARS =
        accounts.value.filter(a => (a.owner ?? '') === name)
          .reduce((s, a) => s + toARS(accountEffectiveBalance(a), a.currency), 0) +
        investments.value.filter(i => (i.owner ?? '') === name)
          .reduce((s, i) => s + toARS(i.quantity * i.currentPrice, i.currency), 0) +
        assets.value.filter(a => (a.owner ?? '') === name)
          .reduce((s, a) => s + toARS(a.value, a.currency), 0)
      byOwner[name] = {
        totalARS: ownerARS,
        totalUSD: dolarBlue.value > 0 ? ownerARS / dolarBlue.value : 0
      }
    }

    const snapshot: PortfolioSnapshot = {
      date: today,
      totalARS: totalPatrimonioARS.value,
      totalUSD: totalPatrimonioUSD.value,
      ...(ownerNames.length > 0 ? { byOwner } : {})
    }
    snapshots.value = await StorageService.addSnapshot(snapshot)
  }

  return {
    accounts, investments, assets, snapshots, freeExpenses, contacts, settlements,
    dolarBlue, dolarOficial, dolarMep, loading,
    totalAccountsARS, totalInvestmentsARS, totalAssetsARS,
    totalPatrimonioARS, totalPatrimonioUSD,
    init, toARS, toUSD,
    currentTna, accountInterest, accountInterestAt, accountEffectiveBalance, accountEffectiveBalanceAt,
    accountNetMovements, accountTotalExpenses, accountTotalIncome,
    addTnaPeriod, removeTnaPeriod, resolvedPeriods,
    addAccount, updateAccount, deleteAccount,
    addInvestment, updateInvestment, deleteInvestment,
    addAsset, updateAsset, deleteAsset,
    addMovement, updateMovement, deleteMovement,
    updateParticipants, participantBalances, globalParticipantBalances,
    addContact, deleteContact,
    addSettlement, deleteSettlement,
    addFreeExpense, updateFreeExpense, deleteFreeExpense,
    saveSnapshot
  }
})
