import { boot } from 'quasar/wrappers'
import { loadSeedIfNeeded } from '../services/seed'
import { useAuthStore } from '../stores/auth'

export default boot(async ({ store }) => {
  await loadSeedIfNeeded()

  if (import.meta.env.DEV) {
    const auth = useAuthStore(store)
    if (!auth.isLoggedIn) {
      await auth.login('user1', 'user1')
    }
  }
})
