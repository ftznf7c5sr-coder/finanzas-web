import {
  collection, doc, getDocs, setDoc, deleteDoc, query, orderBy, limit, writeBatch
} from 'firebase/firestore'
import { auth, db } from 'src/firebase'

export interface TnaPeriod {
  tna: number
  from: string
}

export interface Split {
  participant: string
  amount: number
}

export interface Movement {
  id: string
  type: 'expense' | 'income'
  amount: number
  description: string
  date: string
  paidBy?: string
  splits?: Split[]
}

export interface Account {
  id: string
  name: string
  type: 'bank' | 'wallet' | 'cash' | 'broker'
  currency: 'ARS' | 'USD'
  balance: number
  tna?: number
  tnaPeriods?: TnaPeriod[]
  balanceUpdatedAt: string
  createdAt: string
  movements?: Movement[]
  participants?: string[]
  owner?: string
}

export interface Investment {
  id: string
  name: string
  ticker: string
  type: 'stock' | 'bond' | 'crypto' | 'fci' | 'cedear' | 'plazo_fijo' | 'other'
  currency: 'ARS' | 'USD'
  quantity: number
  avgPrice: number
  currentPrice: number
  createdAt: string
  updatedAt: string
  owner?: string
}

export interface Asset {
  id: string
  name: string
  type: 'property' | 'vehicle' | 'other'
  currency: 'ARS' | 'USD'
  value: number
  createdAt: string
  owner?: string
}

export interface Contact {
  id: string
  name: string
  createdAt: string
}

export interface FreeExpense {
  id: string
  type: 'expense' | 'income'
  amount: number
  currency: 'ARS' | 'USD'
  description: string
  date: string
  paidBy?: string
  splits?: Split[]
  createdAt: string
}

export interface Settlement {
  id: string
  fromPerson: string
  toPerson: string
  amount: number
  currency: 'ARS' | 'USD'
  date: string
  description: string
  createdAt: string
}

export interface PortfolioSnapshot {
  date: string
  totalARS: number
  totalUSD: number
  byOwner?: Record<string, { totalARS: number; totalUSD: number }>
}

function uid(): string {
  const u = auth.currentUser
  if (!u) throw new Error('Usuario no autenticado')
  return u.uid
}

function col(sub: string) {
  return collection(db, 'users', uid(), sub)
}

function docRef(sub: string, id: string) {
  return doc(db, 'users', uid(), sub, id)
}

async function getAll<T>(sub: string): Promise<T[]> {
  const snap = await getDocs(col(sub))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as T)
}

export const StorageService = {
  getAccounts: () => getAll<Account>('accounts'),
  getInvestments: () => getAll<Investment>('investments'),
  getAssets: () => getAll<Asset>('assets'),
  getContacts: () => getAll<Contact>('contacts'),
  getFreeExpenses: () => getAll<FreeExpense>('free_expenses'),
  getSettlements: () => getAll<Settlement>('settlements'),

  saveSettlement(s: Settlement): Promise<void> {
    const { id, ...data } = s
    return setDoc(docRef('settlements', id), data)
  },

  deleteSettlement(id: string): Promise<void> {
    return deleteDoc(docRef('settlements', id))
  },

  saveContact(contact: Contact): Promise<void> {
    const { id, ...data } = contact
    return setDoc(docRef('contacts', id), data)
  },

  deleteContact(id: string): Promise<void> {
    return deleteDoc(docRef('contacts', id))
  },

  saveFreeExpense(expense: FreeExpense): Promise<void> {
    const { id, ...data } = expense
    return setDoc(docRef('free_expenses', id), data)
  },

  deleteFreeExpense(id: string): Promise<void> {
    return deleteDoc(docRef('free_expenses', id))
  },

  async getSnapshots(): Promise<PortfolioSnapshot[]> {
    const q = query(col('snapshots'), orderBy('date', 'asc'))
    const snap = await getDocs(q)
    return snap.docs.map(d => d.data() as PortfolioSnapshot)
  },

  saveAccount(account: Account): Promise<void> {
    const { id, ...data } = account
    return setDoc(docRef('accounts', id), data)
  },

  deleteAccount(id: string): Promise<void> {
    return deleteDoc(docRef('accounts', id))
  },

  saveInvestment(investment: Investment): Promise<void> {
    const { id, ...data } = investment
    return setDoc(docRef('investments', id), data)
  },

  deleteInvestment(id: string): Promise<void> {
    return deleteDoc(docRef('investments', id))
  },

  saveAsset(asset: Asset): Promise<void> {
    const { id, ...data } = asset
    return setDoc(docRef('assets', id), data)
  },

  deleteAsset(id: string): Promise<void> {
    return deleteDoc(docRef('assets', id))
  },

  async addSnapshot(snapshot: PortfolioSnapshot): Promise<PortfolioSnapshot[]> {
    await setDoc(docRef('snapshots', snapshot.date), snapshot)

    // Mantener solo últimos 365
    const q = query(col('snapshots'), orderBy('date', 'asc'))
    const snap = await getDocs(q)
    if (snap.docs.length > 365) {
      const toDelete = snap.docs.slice(0, snap.docs.length - 365)
      const batch = writeBatch(db)
      toDelete.forEach(d => batch.delete(d.ref))
      await batch.commit()
      return snap.docs.slice(snap.docs.length - 365).map(d => d.data() as PortfolioSnapshot)
    }
    return snap.docs.map(d => d.data() as PortfolioSnapshot)
  },
}
