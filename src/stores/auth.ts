import { defineStore } from 'pinia'
import { ref } from 'vue'
import { AuthService } from '../services/auth'

export const useAuthStore = defineStore('auth', () => {
  const isLoggedIn = ref(AuthService.isLoggedIn())
  const username = ref(AuthService.getUsername())
  const isRegistered = ref(AuthService.isRegistered())
  const hasTwoFactor = ref(AuthService.hasTwoFactor())

  async function login(user: string, password: string): Promise<{ success: false } | { success: true; requiresTwoFactor: boolean }> {
    const result = await AuthService.login(user, password)
    if (result.success && !result.requiresTwoFactor) {
      isLoggedIn.value = true
      username.value = user
    }
    return result
  }

  async function loginWithTwoFactor(code: string): Promise<boolean> {
    const ok = await AuthService.loginWithTwoFactor(code)
    if (ok) {
      isLoggedIn.value = true
      username.value = AuthService.getUsername()
    }
    return ok
  }

  async function register(user: string, password: string): Promise<void> {
    await AuthService.register(user, password)
    isLoggedIn.value = true
    isRegistered.value = true
    hasTwoFactor.value = false
    username.value = user
  }

  function generateTwoFactorSetup(): { secret: string; uri: string } {
    return AuthService.generateTwoFactorSetup()
  }

  async function enableTwoFactor(secret: string, code: string): Promise<boolean> {
    const ok = await AuthService.enableTwoFactor(secret, code)
    if (ok) hasTwoFactor.value = true
    return ok
  }

  async function disableTwoFactor(code: string): Promise<boolean> {
    const ok = await AuthService.disableTwoFactor(code)
    if (ok) hasTwoFactor.value = false
    return ok
  }

  function logout() {
    AuthService.logout()
    isLoggedIn.value = false
  }

  return {
    isLoggedIn, username, isRegistered, hasTwoFactor,
    login, loginWithTwoFactor, register, logout,
    generateTwoFactorSetup, enableTwoFactor, disableTwoFactor,
  }
})
