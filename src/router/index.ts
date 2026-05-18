import { route } from 'quasar/wrappers'
import { createRouter, createWebHashHistory } from 'vue-router'
import routes from './routes'
import { useAuthStore } from 'src/stores/auth'

export default route(function ({ store }) {
  const router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createWebHashHistory()
  })

  router.beforeEach((to) => {
    const auth = useAuthStore(store)
    if (to.meta.requiresAuth && !auth.isLoggedIn) {
      return { name: 'login' }
    }
    if (to.name === 'login' && auth.isLoggedIn) {
      return { name: 'dashboard' }
    }
  })

  return router
})
