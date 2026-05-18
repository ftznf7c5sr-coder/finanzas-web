import { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('src/layouts/AuthLayout.vue'),
    children: [
      { path: '', name: 'login', component: () => import('src/pages/LoginPage.vue') }
    ]
  },
  {
    path: '/app',
    component: () => import('src/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: 'dashboard', name: 'dashboard', component: () => import('src/pages/DashboardPage.vue') },
      { path: 'investments', name: 'investments', component: () => import('src/pages/InvestmentsPage.vue') },
      { path: 'accounts', name: 'accounts', component: () => import('src/pages/AccountsPage.vue') },
      { path: 'assets', name: 'assets', component: () => import('src/pages/AssetsPage.vue') },
      { path: 'expenses', name: 'expenses', component: () => import('src/pages/ExpensesPage.vue') },
      { path: 'contacts', name: 'contacts', component: () => import('src/pages/ContactsPage.vue') }
    ]
  },
  { path: '/:catchAll(.*)*', redirect: '/' }
]

export default routes
