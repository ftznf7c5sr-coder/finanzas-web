<template>
  <q-page class="flex flex-center bg-grey-2" style="min-height: 100vh">
    <q-card class="q-pa-lg shadow-10" style="min-width: 340px; max-width: 420px; width: 100%">

      <!-- Header -->
      <q-card-section class="text-center q-pb-sm">
        <q-icon name="account_balance_wallet" size="64px" color="primary" />
        <div class="text-h5 text-weight-bold q-mt-sm">Finanzas Puchi</div>
        <div class="text-grey-6 text-body2 q-mt-xs">
          <span v-if="step === 'credentials'">{{ isRegistered ? 'Ingresá para continuar' : 'Creá tu cuenta para empezar' }}</span>
          <span v-else-if="step === 'totp'">Verificación en dos pasos</span>
          <span v-else>Configurar segundo factor</span>
        </div>
      </q-card-section>

      <!-- Step: credentials -->
      <q-card-section v-if="step === 'credentials'">
        <q-form @submit.prevent="handleCredentials" class="q-gutter-md">
          <q-input v-model="username" label="Usuario" outlined autofocus
            :rules="[v => !!v || 'El usuario es requerido']">
            <template #prepend><q-icon name="person" /></template>
          </q-input>

          <q-input v-model="password" label="Contraseña" outlined
            :type="showPass ? 'text' : 'password'"
            :rules="[v => !!v || 'La contraseña es requerida', v => v.length >= 6 || 'Mínimo 6 caracteres']">
            <template #prepend><q-icon name="lock" /></template>
            <template #append>
              <q-icon :name="showPass ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="showPass = !showPass" />
            </template>
          </q-input>

          <q-input v-if="!isRegistered" v-model="inviteCode" label="Código de invitación" outlined
            :rules="[v => !!v || 'El código de invitación es requerido']">
            <template #prepend><q-icon name="vpn_key" /></template>
          </q-input>

          <div v-if="credError" class="text-negative text-caption text-center">{{ credError }}</div>

          <q-btn type="submit" :label="isRegistered ? 'Ingresar' : 'Crear cuenta'"
            color="primary" class="full-width" size="lg" unelevated :loading="loading" />
        </q-form>
      </q-card-section>

      <!-- Step: TOTP verification (login) -->
      <q-card-section v-else-if="step === 'totp'">
        <div class="text-center q-mb-md">
          <q-icon name="security" size="48px" color="primary" />
          <div class="text-body2 text-grey-7 q-mt-sm">
            Ingresá el código de 6 dígitos de tu app autenticadora
          </div>
        </div>
        <q-form @submit.prevent="handleTotp" class="q-gutter-md">
          <q-input v-model="totpCode" label="Código de verificación" outlined autofocus
            maxlength="6" inputmode="numeric" class="text-center"
            :rules="[v => v.length === 6 || 'El código tiene 6 dígitos']">
            <template #prepend><q-icon name="pin" /></template>
          </q-input>
          <div v-if="totpError" class="text-negative text-caption text-center">{{ totpError }}</div>
          <q-btn type="submit" label="Verificar" color="primary" class="full-width" size="lg" unelevated :loading="loading" />
          <q-btn flat label="Volver" class="full-width" @click="step = 'credentials'" />
        </q-form>
      </q-card-section>

      <!-- Step: 2FA setup (after registration) -->
      <q-card-section v-else-if="step === 'setup2fa'">
        <div class="text-center q-mb-md">
          <q-icon name="qr_code_2" size="48px" color="primary" />
          <div class="text-subtitle2 q-mt-sm">Activar segundo factor de autenticación</div>
          <div class="text-caption text-grey-6 q-mt-xs">
            Escaneá el QR con Google Authenticator, Authy u otra app compatible
          </div>
        </div>

        <div v-if="qrDataUrl" class="flex flex-center q-mb-md">
          <img :src="qrDataUrl" alt="QR 2FA" style="width:180px;height:180px;border-radius:8px" />
        </div>

        <q-expansion-item label="Ver clave manual" dense class="q-mb-md text-caption text-grey-7">
          <div class="q-pa-sm bg-grey-2 rounded-borders text-mono text-caption text-center" style="word-break: break-all">
            {{ setup2faSecret }}
          </div>
        </q-expansion-item>

        <q-form @submit.prevent="handleEnable2fa" class="q-gutter-md">
          <q-input v-model="setup2faCode" label="Ingresá el código para confirmar" outlined autofocus
            maxlength="6" inputmode="numeric"
            :rules="[v => v.length === 6 || 'El código tiene 6 dígitos']">
            <template #prepend><q-icon name="pin" /></template>
          </q-input>
          <div v-if="setup2faError" class="text-negative text-caption text-center">{{ setup2faError }}</div>
          <q-btn type="submit" label="Activar segundo factor" color="positive" class="full-width" unelevated :loading="loading" />
          <q-btn flat label="Omitir por ahora" class="full-width" color="grey-7" @click="goToDashboard" />
        </q-form>
      </q-card-section>

      <q-card-section v-if="step === 'credentials'" class="text-center q-pt-none">
        <q-btn flat dense no-caps color="grey-7" size="sm"
          :label="isRegistered ? '¿No tenés cuenta? Crear cuenta' : '¿Ya tenés cuenta? Ingresar'"
          @click="isRegistered = !isRegistered; credError = ''" />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { AuthService } from '../services/auth'
import { useQuasar } from 'quasar'
import QRCode from 'qrcode'

const authStore = useAuthStore()
const router = useRouter()
const $q = useQuasar()

const isRegistered = ref(true)
const step = ref<'credentials' | 'totp' | 'setup2fa'>('credentials')

const username = ref('')
const password = ref('')
const inviteCode = ref('')
const showPass = ref(false)
const credError = ref('')
const loading = ref(false)

const totpCode = ref('')
const totpError = ref('')

const setup2faSecret = ref('')
const setup2faCode = ref('')
const setup2faError = ref('')
const qrDataUrl = ref('')

async function handleCredentials() {
  credError.value = ''
  loading.value = true
  try {
    if (isRegistered.value) {
      const result = await authStore.login(username.value, password.value)
      if (!result.success) {
        credError.value = 'Usuario o contraseña incorrectos'
        return
      }
      if (result.requiresTwoFactor) {
        step.value = 'totp'
        totpCode.value = ''
        totpError.value = ''
        return
      }
      goToDashboard()
    } else {
      const validCode = await AuthService.checkRegistrationCode(inviteCode.value)
      if (!validCode) {
        credError.value = 'Código de invitación incorrecto'
        return
      }
      await authStore.register(username.value, password.value)
      await initSetup2fa()
      step.value = 'setup2fa'
    }
  } finally {
    loading.value = false
  }
}

async function handleTotp() {
  totpError.value = ''
  loading.value = true
  try {
    const ok = await authStore.loginWithTwoFactor(totpCode.value)
    if (!ok) {
      totpError.value = 'Código incorrecto. Verificá la hora de tu dispositivo'
      return
    }
    goToDashboard()
  } finally {
    loading.value = false
  }
}

async function initSetup2fa() {
  const { secret, uri } = authStore.generateTwoFactorSetup()
  setup2faSecret.value = secret
  setup2faCode.value = ''
  setup2faError.value = ''
  qrDataUrl.value = await QRCode.toDataURL(uri, { width: 200, margin: 1 })
}

async function handleEnable2fa() {
  setup2faError.value = ''
  loading.value = true
  try {
    const ok = await authStore.enableTwoFactor(setup2faSecret.value, setup2faCode.value)
    if (!ok) {
      setup2faError.value = 'Código incorrecto. Asegurate de haber escaneado el QR correctamente'
      return
    }
    $q.notify({ type: 'positive', message: 'Segundo factor activado correctamente' })
    goToDashboard()
  } finally {
    loading.value = false
  }
}

function goToDashboard() {
  router.push({ name: 'dashboard' })
}

onMounted(() => {
  // intentionally left blank
})
</script>
