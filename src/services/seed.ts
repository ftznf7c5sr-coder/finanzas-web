import seedData from '../data/seed.json'
import { StorageService } from './storage'
import { AuthService } from './auth'
import type { Account, Investment, Asset, PortfolioSnapshot } from './storage'

const SEED_KEY = 'fp_seeded'

export async function loadSeedIfNeeded() {
  if (!import.meta.env.DEV) return
  if (localStorage.getItem(SEED_KEY)) return

  try {
    await AuthService.register('user1', 'user1')
  } catch {
    // Ya existe — intentar login
    const result = await AuthService.login('user1', 'user1')
    if (!result.success) return
  }

  await Promise.all([
    ...seedData.accounts.map(a => StorageService.saveAccount(a as Account)),
    ...seedData.investments.map(i => StorageService.saveInvestment(i as Investment)),
    ...seedData.assets.map(a => StorageService.saveAsset(a as Asset)),
  ])

  for (const s of seedData.snapshots) {
    await StorageService.addSnapshot(s as PortfolioSnapshot)
  }

  localStorage.setItem(SEED_KEY, '1')
  console.info('[DEV] Seed data loaded in Firebase')
}

export function clearSeed() {
  localStorage.removeItem(SEED_KEY)
}
