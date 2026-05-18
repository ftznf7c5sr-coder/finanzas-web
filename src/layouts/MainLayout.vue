<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="bg-primary">
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="drawer = !drawer" />
        <q-toolbar-title class="text-weight-bold">Finanzas Puchi</q-toolbar-title>
        <q-btn flat dense round icon="logout" @click="handleLogout">
          <q-tooltip>Cerrar sesión</q-tooltip>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="drawer" show-if-above bordered>
      <q-list padding>
        <q-item-label header class="text-weight-bold text-grey-7">Navegación</q-item-label>

        <q-item v-for="item in menuItems" :key="item.name" clickable v-ripple
          :to="{ name: item.name }" active-class="bg-blue-1 text-primary"
          class="rounded-borders q-mb-xs">
          <q-item-section avatar><q-icon :name="item.icon" /></q-item-section>
          <q-item-section><q-item-label>{{ item.label }}</q-item-label></q-item-section>
        </q-item>

        <q-separator class="q-my-md" />

        <q-item clickable v-ripple class="rounded-borders" @click="openSecurity">
          <q-item-section avatar>
            <q-icon name="security" :color="authStore.hasTwoFactor ? 'positive' : 'grey'" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Seguridad</q-item-label>
            <q-item-label caption>{{ authStore.hasTwoFactor ? '2FA activado' : '2FA desactivado' }}</q-item-label>
          </q-item-section>
        </q-item>

        <q-separator class="q-my-md" />

        <q-item>
          <q-item-section avatar><q-icon name="person" color="grey" /></q-item-section>
          <q-item-section>
            <q-item-label class="text-grey-7 text-caption">{{ authStore.username }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <!-- Dialog seguridad / 2FA -->
    <q-dialog v-model="showSecurity" persistent>
      <q-card style="min-width: 320px; max-width: 440px">
        <q-card-section class="row items-center">
          <div class="text-h6">Seguridad</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="closeSecurity" />
        </q-card-section>
        <q-separator />

        <q-card-section>
          <!-- Estado actual -->
          <div class="row items-center q-mb-md">
            <q-icon :name="authStore.hasTwoFactor ? 'verified_user' : 'gpp_maybe'"
              :color="authStore.hasTwoFactor ? 'positive' : 'warning'" size="32px" class="q-mr-md" />
            <div>
              <div class="text-weight-bold">Doble factor de autenticación</div>
              <div class="text-caption" :class="authStore.hasTwoFactor ? 'text-positive' : 'text-grey-6'">
                {{ authStore.hasTwoFactor ? 'Activado' : 'Desactivado' }}
              </div>
            </div>
          </div>

          <!-- Panel activar 2FA -->
          <div v-if="!authStore.hasTwoFactor">
            <div v-if="!secSetupStarted">
              <div class="text-caption text-grey-7 q-mb-md">
                El segundo factor protege tu cuenta aunque alguien obtenga tu contraseña. Usá Google Authenticator, Authy u otra app compatible.
              </div>
              <q-btn color="primary" label="Activar segundo factor" unelevated class="full-width" @click="startSetup" :loading="secLoading" />
            </div>
            <div v-else>
              <div class="text-caption text-grey-7 q-mb-sm">Escaneá el QR con tu app autenticadora:</div>
              <div class="flex flex-center q-mb-sm">
                <img v-if="secQrUrl" :src="secQrUrl" style="width:160px;height:160px;border-radius:8px" />
              </div>
              <q-expansion-item label="Ver clave manual" dense class="q-mb-sm text-caption text-grey-7">
                <div class="q-pa-xs bg-grey-2 rounded-borders text-caption text-center" style="word-break:break-all">
                  {{ secSecret }}
                </div>
              </q-expansion-item>
              <q-input v-model="secCode" label="Código de verificación" outlined dense
                maxlength="6" inputmode="numeric" class="q-mb-sm">
                <template #prepend><q-icon name="pin" /></template>
              </q-input>
              <div v-if="secError" class="text-negative text-caption q-mb-sm">{{ secError }}</div>
              <div class="row q-gutter-sm">
                <q-btn flat label="Cancelar" @click="secSetupStarted = false; secCode = ''" class="col" />
                <q-btn color="positive" label="Confirmar" unelevated class="col"
                  :disable="secCode.length !== 6" :loading="secLoading" @click="confirmEnable" />
              </div>
            </div>
          </div>

          <!-- Panel desactivar 2FA -->
          <div v-else>
            <div class="text-caption text-grey-7 q-mb-md">
              Para desactivar el segundo factor, ingresá un código de tu app autenticadora.
            </div>
            <q-input v-model="secCode" label="Código de verificación" outlined dense
              maxlength="6" inputmode="numeric" class="q-mb-sm">
              <template #prepend><q-icon name="pin" /></template>
            </q-input>
            <div v-if="secError" class="text-negative text-caption q-mb-sm">{{ secError }}</div>
            <q-btn color="negative" label="Desactivar segundo factor" unelevated class="full-width"
              :disable="secCode.length !== 6" :loading="secLoading" @click="confirmDisable" />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useQuasar } from 'quasar'
import QRCode from 'qrcode'

const drawer = ref(false)
const router = useRouter()
const authStore = useAuthStore()
const $q = useQuasar()

const menuItems = [
  { name: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { name: 'investments', label: 'Inversiones', icon: 'trending_up' },
  { name: 'accounts', label: 'Cuentas', icon: 'account_balance' },
  { name: 'expenses', label: 'Gastos', icon: 'receipt_long' },
  { name: 'contacts', label: 'Personas', icon: 'people' },
  { name: 'assets', label: 'Bienes', icon: 'home' },
]

function handleLogout() {
  authStore.logout()
  router.push({ name: 'login' })
}

// Security dialog
const showSecurity = ref(false)
const secSetupStarted = ref(false)
const secSecret = ref('')
const secQrUrl = ref('')
const secCode = ref('')
const secError = ref('')
const secLoading = ref(false)

function openSecurity() {
  showSecurity.value = true
  secSetupStarted.value = false
  secCode.value = ''
  secError.value = ''
}

function closeSecurity() {
  showSecurity.value = false
  secSetupStarted.value = false
  secCode.value = ''
  secError.value = ''
}

async function startSetup() {
  secLoading.value = true
  try {
    const { secret, uri } = authStore.generateTwoFactorSetup()
    secSecret.value = secret
    secQrUrl.value = await QRCode.toDataURL(uri, { width: 180, margin: 1 })
    secCode.value = ''
    secError.value = ''
    secSetupStarted.value = true
  } finally {
    secLoading.value = false
  }
}

async function confirmEnable() {
  secError.value = ''
  secLoading.value = true
  try {
    const ok = await authStore.enableTwoFactor(secSecret.value, secCode.value)
    if (!ok) { secError.value = 'Código incorrecto'; return }
    $q.notify({ type: 'positive', message: 'Segundo factor activado' })
    closeSecurity()
  } finally {
    secLoading.value = false
  }
}

async function confirmDisable() {
  secError.value = ''
  secLoading.value = true
  try {
    const ok = await authStore.disableTwoFactor(secCode.value)
    if (!ok) { secError.value = 'Código incorrecto'; return }
    $q.notify({ type: 'warning', message: 'Segundo factor desactivado' })
    closeSecurity()
  } finally {
    secLoading.value = false
  }
}
</script>
