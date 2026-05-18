<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h6 text-weight-bold col">Gastos e Ingresos</div>
      <q-btn icon="add" color="primary" label="Registrar" unelevated @click="openAdd()" />
    </div>

    <!-- Resumen totales -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-4">
        <q-card flat bordered class="text-center q-pa-md" style="border-radius: 12px">
          <div class="text-caption text-grey-6">Total gastos</div>
          <div class="text-h5 text-weight-bold text-orange-8">- $ {{ fmt(totalExpenses) }}</div>
        </q-card>
      </div>
      <div class="col-12 col-sm-4">
        <q-card flat bordered class="text-center q-pa-md" style="border-radius: 12px">
          <div class="text-caption text-grey-6">Total ingresos</div>
          <div class="text-h5 text-weight-bold text-blue-7">+ $ {{ fmt(totalIncome) }}</div>
        </q-card>
      </div>
      <div class="col-12 col-sm-4">
        <q-card flat bordered class="text-center q-pa-md" style="border-radius: 12px">
          <div class="text-caption text-grey-6">Neto</div>
          <div class="text-h5 text-weight-bold" :class="netTotal >= 0 ? 'text-positive' : 'text-negative'">
            {{ netTotal >= 0 ? '+' : '' }}$ {{ fmt(netTotal) }}
          </div>
        </q-card>
      </div>
    </div>

    <!-- Aviso sin personas -->
    <q-banner v-if="portfolio.contacts.length === 0" rounded class="bg-purple-1 text-purple-9 q-mb-md">
      <template #avatar><q-icon name="people" color="purple" /></template>
      Para dividir gastos, primero registrá personas en
      <router-link :to="{ name: 'contacts' }" class="text-purple-9 text-weight-bold">Personas</router-link>.
    </q-banner>

    <!-- Filtros -->
    <q-card flat bordered class="q-pa-md q-mb-md" style="border-radius: 12px">
      <div class="row q-col-gutter-sm items-end">
        <div class="col-12 col-sm-3">
          <q-select v-model="filterAccount" :options="accountFilterOptions" label="Cuenta" outlined dense
            emit-value map-options clearable />
        </div>
        <div class="col-12 col-sm-3">
          <q-select v-model="filterType" :options="typeFilterOptions" label="Tipo" outlined dense
            emit-value map-options clearable />
        </div>
        <div class="col-12 col-sm-3">
          <q-input v-model="filterFrom" label="Desde" outlined dense type="date" />
        </div>
        <div class="col-12 col-sm-3">
          <q-input v-model="filterTo" label="Hasta" outlined dense type="date" />
        </div>
      </div>
    </q-card>

    <!-- Lista unificada -->
    <q-card v-if="filteredItems.length === 0" style="border-radius: 12px">
      <q-card-section class="text-center q-py-xl">
        <q-icon name="receipt_long" size="56px" color="grey-4" class="q-mb-sm" />
        <div class="text-grey-5">Sin movimientos para los filtros seleccionados</div>
      </q-card-section>
    </q-card>

    <q-list v-else separator bordered style="border-radius: 12px; overflow: hidden">
      <q-item v-for="item in filteredItems" :key="itemKey(item)" class="q-py-sm">
        <q-item-section avatar>
          <q-avatar size="36px"
            :color="itemType(item) === 'income' ? 'blue-3' : 'orange-3'"
            :text-color="itemType(item) === 'income' ? 'blue-9' : 'orange-9'">
            <q-icon :name="itemType(item) === 'income' ? 'add' : 'remove'" />
          </q-avatar>
        </q-item-section>

        <q-item-section>
          <q-item-label class="text-weight-bold"
            :class="itemType(item) === 'income' ? 'text-blue-9' : 'text-orange-9'">
            {{ itemType(item) === 'income' ? '+' : '-' }}
            {{ itemCurrency(item) === 'USD' ? 'U$D' : '$' }} {{ fmt(itemAmount(item)) }}
            <q-badge :color="itemType(item) === 'income' ? 'blue-7' : 'orange-7'" class="q-ml-xs" style="font-size:10px">
              {{ itemType(item) === 'income' ? 'ingreso' : 'gasto' }}
            </q-badge>
            <q-badge v-if="item.kind === 'free'" color="grey-6" class="q-ml-xs" style="font-size:10px">
              sin cuenta
            </q-badge>
          </q-item-label>
          <q-item-label caption>
            {{ fmtDate(itemDate(item)) }}
            <template v-if="item.kind === 'account'">
              · <span class="text-primary text-weight-medium">{{ item.account.name }}</span>
            </template>
            <span v-if="itemDescription(item)" class="q-ml-xs text-grey-7">· {{ itemDescription(item) }}</span>
          </q-item-label>
          <q-item-label v-if="itemPaidBy(item) || itemSplits(item).length" caption class="q-mt-xs">
            <span v-if="itemPaidBy(item)" class="q-mr-sm">
              <q-icon name="person" size="12px" /> Pagó: <strong>{{ itemPaidBy(item) }}</strong>
            </span>
            <q-chip v-for="s in itemSplits(item)" :key="s.participant"
              dense size="sm" color="purple-2" text-color="purple-9" class="q-mr-xs">
              {{ s.participant }}: {{ itemCurrency(item) === 'USD' ? 'U$D' : '$' }} {{ fmt(s.amount) }}
            </q-chip>
          </q-item-label>
        </q-item-section>

        <q-item-section side>
          <div class="column q-gutter-xs">
            <q-btn flat round dense icon="edit" color="grey-6" size="sm" @click="openEdit(item)" />
            <q-btn flat round dense icon="delete" color="negative" size="sm" @click="confirmDelete(item)" />
          </div>
        </q-item-section>
      </q-item>
    </q-list>

    <!-- Dialog agregar / editar -->
    <q-dialog v-model="showDialog" persistent>
      <q-card style="min-width: min(560px, 96vw); max-width: 600px">
        <q-card-section class="row items-center">
          <div class="text-h6">{{ editingId ? 'Editar movimiento' : 'Registrar movimiento' }}</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="closeDialog" />
        </q-card-section>
        <q-separator />

        <q-card-section class="q-gutter-sm">
          <q-select v-model="form.accountId" :options="accountSelectOptions" label="Cuenta (opcional)"
            outlined dense emit-value map-options clearable
            hint="Dejá vacío para registrar sin asociar a una cuenta" />

          <q-select v-if="!form.accountId" v-model="form.currency"
            :options="[{ label: 'Pesos (ARS)', value: 'ARS' }, { label: 'Dólares (USD)', value: 'USD' }]"
            label="Moneda *" outlined dense emit-value map-options />

          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-select v-model="form.type" outlined dense emit-value map-options label="Tipo *"
                :options="[{ label: 'Gasto', value: 'expense' }, { label: 'Ingreso', value: 'income' }]" />
            </div>
            <div class="col-6">
              <q-input v-model.number="form.amount" label="Monto *" outlined dense type="number" min="0" />
            </div>
          </div>
          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-input v-model="form.date" label="Fecha *" outlined dense type="date" />
            </div>
            <div class="col-6">
              <q-input v-model="form.description" label="Descripción (opcional)" outlined dense />
            </div>
          </div>

          <!-- División del gasto (solo gastos, requiere personas registradas) -->
          <template v-if="form.type === 'expense' && portfolio.contacts.length > 0">
            <q-separator class="q-my-xs" />
            <div class="row items-center q-mb-sm">
              <div class="text-caption text-grey-7 text-weight-bold col">División del gasto (opcional)</div>
              <q-btn flat size="sm" label="Partes iguales" color="primary" @click="splitEqually" />
            </div>

            <q-select v-model="form.paidBy" :options="contactNames" label="¿Quién pagó?"
              outlined dense clearable />

            <div v-for="c in portfolio.contacts" :key="c.id" class="row items-center q-col-gutter-sm q-mb-xs">
              <div class="col-5">
                <div class="text-body2 q-pl-sm">{{ c.name }}</div>
              </div>
              <div class="col-7">
                <q-input v-model.number="form.splits[c.name]" outlined dense type="number" min="0"
                  :label="activeCurrencySymbol" />
              </div>
            </div>

            <div v-if="splitTotal > 0" class="text-caption q-mt-xs"
              :class="Math.abs(splitTotal - form.amount) < 0.01 ? 'text-positive' : 'text-negative'">
              Total: {{ activeCurrencySymbol }} {{ fmt(splitTotal) }}
              {{ Math.abs(splitTotal - form.amount) < 0.01 ? '✓ cuadra' : `(diferencia: ${fmt(form.amount - splitTotal)})` }}
            </div>
          </template>

          <div v-else-if="form.type === 'expense' && portfolio.contacts.length === 0" class="text-caption text-grey-5">
            <q-icon name="info" size="14px" />
            Registrá personas en "Personas" para poder dividir este gasto.
          </div>
        </q-card-section>

        <q-separator />
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" @click="closeDialog" />
          <q-btn color="primary" :label="editingId ? 'Guardar cambios' : 'Registrar'"
            unelevated :disable="!form.amount || !form.date"
            @click="saveItem" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { usePortfolioStore } from '../stores/portfolio'
import { useQuasar } from 'quasar'
import type { Account, Movement, FreeExpense, Split } from '../services/storage'

const portfolio = usePortfolioStore()
onMounted(() => { if (!portfolio.accounts.length && !portfolio.loading) void portfolio.init() })
const $q = useQuasar()

// Filtros
const filterAccount = ref<string | null>(null)
const filterType = ref<string | null>(null)
const filterFrom = ref('')
const filterTo = ref('')

const accountFilterOptions = computed(() => [
  { label: 'Sin cuenta', value: '__free__' },
  ...portfolio.accounts.map(a => ({ label: a.name, value: a.id }))
])

const accountSelectOptions = computed(() =>
  portfolio.accounts.map(a => ({ label: a.name, value: a.id }))
)

const contactNames = computed(() => portfolio.contacts.map(c => c.name).sort())

const typeFilterOptions = [
  { label: 'Gastos', value: 'expense' },
  { label: 'Ingresos', value: 'income' }
]

// Tipos unión para la lista
type AccountItem = { kind: 'account'; movement: Movement; account: Account }
type FreeItem = { kind: 'free'; expense: FreeExpense }
type ListItem = AccountItem | FreeItem

function itemKey(i: ListItem) { return i.kind === 'account' ? i.movement.id : i.expense.id }
function itemType(i: ListItem) { return i.kind === 'account' ? i.movement.type : i.expense.type }
function itemAmount(i: ListItem) { return i.kind === 'account' ? i.movement.amount : i.expense.amount }
function itemCurrency(i: ListItem) { return i.kind === 'account' ? i.account.currency : i.expense.currency }
function itemDate(i: ListItem) { return i.kind === 'account' ? i.movement.date : i.expense.date }
function itemDescription(i: ListItem) { return i.kind === 'account' ? i.movement.description : i.expense.description }
function itemPaidBy(i: ListItem) { return i.kind === 'account' ? i.movement.paidBy : i.expense.paidBy }
function itemSplits(i: ListItem): Split[] { return (i.kind === 'account' ? i.movement.splits : i.expense.splits) ?? [] }

const allItems = computed<ListItem[]>(() => {
  const result: ListItem[] = []
  for (const acc of portfolio.accounts) {
    for (const m of (acc.movements ?? [])) result.push({ kind: 'account', movement: m, account: acc })
  }
  for (const e of portfolio.freeExpenses) result.push({ kind: 'free', expense: e })
  return result.sort((a, b) => itemDate(b).localeCompare(itemDate(a)))
})

const filteredItems = computed<ListItem[]>(() =>
  allItems.value.filter(item => {
    if (filterAccount.value === '__free__' && item.kind !== 'free') return false
    if (filterAccount.value && filterAccount.value !== '__free__' && item.kind === 'free') return false
    if (filterAccount.value && filterAccount.value !== '__free__' && item.kind === 'account' && item.account.id !== filterAccount.value) return false
    if (filterType.value && itemType(item) !== filterType.value) return false
    if (filterFrom.value && itemDate(item) < filterFrom.value) return false
    if (filterTo.value && itemDate(item) > filterTo.value + 'T23:59:59') return false
    return true
  })
)

const totalExpenses = computed(() =>
  filteredItems.value.filter(i => itemType(i) === 'expense').reduce((s, i) => s + itemAmount(i), 0)
)
const totalIncome = computed(() =>
  filteredItems.value.filter(i => itemType(i) === 'income').reduce((s, i) => s + itemAmount(i), 0)
)
const netTotal = computed(() => totalIncome.value - totalExpenses.value)

// Dialog
const showDialog = ref(false)
const editingId = ref<string | null>(null)
const editingKind = ref<'account' | 'free' | null>(null)
const editingAccountId = ref<string | null>(null)

const defaultForm = () => ({
  accountId: '' as string,
  currency: 'ARS' as 'ARS' | 'USD',
  type: 'expense' as 'expense' | 'income',
  amount: 0,
  description: '',
  date: new Date().toISOString().split('T')[0],
  paidBy: '',
  splits: {} as Record<string, number>
})

const form = ref(defaultForm())

const activeCurrencySymbol = computed(() => {
  if (form.value.accountId) {
    const acc = portfolio.accounts.find(a => a.id === form.value.accountId)
    return acc?.currency === 'USD' ? 'U$D' : '$'
  }
  return form.value.currency === 'USD' ? 'U$D' : '$'
})

const splitTotal = computed(() =>
  portfolio.contacts.reduce((s, c) => s + (form.value.splits[c.name] || 0), 0)
)

watch(() => form.value.accountId, () => {
  form.value.splits = {}
  form.value.paidBy = ''
})

function splitEqually() {
  if (!portfolio.contacts.length || !form.value.amount) return
  const share = Math.round((form.value.amount / portfolio.contacts.length) * 100) / 100
  const s: Record<string, number> = {}
  portfolio.contacts.forEach(c => { s[c.name] = share })
  form.value.splits = s
}

function openAdd() {
  editingId.value = null
  editingKind.value = null
  editingAccountId.value = null
  form.value = defaultForm()
  showDialog.value = true
}

function openEdit(item: ListItem) {
  if (item.kind === 'account') {
    editingId.value = item.movement.id
    editingKind.value = 'account'
    editingAccountId.value = item.account.id
    const splitsObj: Record<string, number> = {}
    for (const s of (item.movement.splits ?? [])) splitsObj[s.participant] = s.amount
    form.value = {
      accountId: item.account.id,
      currency: item.account.currency,
      type: item.movement.type,
      amount: item.movement.amount,
      description: item.movement.description,
      date: item.movement.date.split('T')[0],
      paidBy: item.movement.paidBy ?? '',
      splits: splitsObj
    }
  } else {
    editingId.value = item.expense.id
    editingKind.value = 'free'
    editingAccountId.value = null
    const splitsObj: Record<string, number> = {}
    for (const s of (item.expense.splits ?? [])) splitsObj[s.participant] = s.amount
    form.value = {
      accountId: '',
      currency: item.expense.currency,
      type: item.expense.type,
      amount: item.expense.amount,
      description: item.expense.description,
      date: item.expense.date.split('T')[0],
      paidBy: item.expense.paidBy ?? '',
      splits: splitsObj
    }
  }
  showDialog.value = true
}

function closeDialog() {
  showDialog.value = false
  editingId.value = null
  editingKind.value = null
  editingAccountId.value = null
  form.value = defaultForm()
}

function buildSplits(): Split[] {
  return portfolio.contacts
    .filter(c => (form.value.splits[c.name] ?? 0) > 0)
    .map(c => ({ participant: c.name, amount: form.value.splits[c.name] }))
}

function saveItem() {
  const isEditing = !!editingId.value
  const splits = buildSplits()

  if (form.value.accountId) {
    const data = {
      type: form.value.type,
      amount: form.value.amount,
      description: form.value.description,
      date: form.value.date,
      paidBy: form.value.paidBy || undefined,
      splits
    }
    if (isEditing && editingKind.value === 'account' && editingAccountId.value) {
      portfolio.updateMovement(editingAccountId.value, editingId.value!, data)
    } else {
      portfolio.addMovement(form.value.accountId, data)
    }
  } else {
    const data = {
      type: form.value.type,
      amount: form.value.amount,
      currency: form.value.currency,
      description: form.value.description,
      date: form.value.date,
      paidBy: form.value.paidBy || undefined,
      splits
    }
    if (isEditing && editingKind.value === 'free') {
      portfolio.updateFreeExpense(editingId.value!, data)
    } else {
      portfolio.addFreeExpense(data)
    }
  }

  $q.notify({ type: 'positive', message: isEditing ? 'Movimiento actualizado' : (form.value.type === 'expense' ? 'Gasto registrado' : 'Ingreso registrado') })
  closeDialog()
}

function confirmDelete(item: ListItem) {
  $q.dialog({
    title: 'Eliminar movimiento',
    message: '¿Eliminar este movimiento?',
    cancel: { flat: true, label: 'Cancelar' },
    ok: { color: 'negative', label: 'Eliminar', unelevated: true }
  }).onOk(() => {
    if (item.kind === 'account') {
      portfolio.deleteMovement(item.account.id, item.movement.id)
    } else {
      portfolio.deleteFreeExpense(item.expense.id)
    }
    $q.notify({ type: 'warning', message: 'Movimiento eliminado' })
  })
}

function fmt(n: number): string {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n)
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
</script>
