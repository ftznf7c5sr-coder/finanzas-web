<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h6 text-weight-bold col">Personas</div>
    </div>

    <div class="text-caption text-grey-6 q-mb-md">
      Registrá las personas con quienes compartís gastos. Estarán disponibles al cargar cualquier gasto compartido.
    </div>

    <!-- Agregar persona -->
    <q-card flat bordered class="q-pa-md q-mb-md" style="border-radius: 12px">
      <div class="row q-col-gutter-sm items-center">
        <div class="col">
          <q-input v-model="newName" outlined dense label="Nombre de la persona"
            placeholder="Ej: María, Juan, Papá..." @keyup.enter="addContact" />
        </div>
        <div class="col-auto">
          <q-btn color="primary" icon="person_add" label="Agregar" unelevated
            :disable="!newName.trim()" @click="addContact" />
        </div>
      </div>
      <div v-if="dupError" class="text-negative text-caption q-mt-xs">{{ dupError }}</div>
    </q-card>

    <!-- Lista de personas con balances -->
    <q-card v-if="portfolio.contacts.length === 0" style="border-radius: 12px">
      <q-card-section class="text-center q-py-xl">
        <q-icon name="people" size="56px" color="grey-4" class="q-mb-sm" />
        <div class="text-grey-5">Aún no agregaste personas</div>
      </q-card-section>
    </q-card>

    <q-list v-else bordered separator style="border-radius: 12px; overflow: hidden" class="q-mb-md">
      <q-item v-for="contact in sortedContacts" :key="contact.id" class="q-py-sm">
        <q-item-section avatar>
          <q-avatar color="purple-2" text-color="purple-9" size="40px">
            {{ contact.name.charAt(0).toUpperCase() }}
          </q-avatar>
        </q-item-section>
        <q-item-section>
          <q-item-label class="text-weight-medium">{{ contact.name }}</q-item-label>
          <q-item-label caption :class="balanceClass(portfolio.globalParticipantBalances[contact.name] ?? 0)">
            {{ balanceLabel(portfolio.globalParticipantBalances[contact.name] ?? 0) }}
          </q-item-label>
        </q-item-section>
        <q-item-section side>
          <div class="row q-gutter-xs items-center">
            <q-btn v-if="Math.abs(portfolio.globalParticipantBalances[contact.name] ?? 0) >= 0.01"
              flat dense size="sm" icon="handshake" color="positive" label="Saldar"
              @click="openSettle(contact.name)" />
            <q-btn flat round dense icon="delete" color="negative" size="sm"
              @click="confirmDelete(contact)" />
          </div>
        </q-item-section>
      </q-item>
    </q-list>

    <!-- Historial de pagos / saldos -->
    <template v-if="portfolio.settlements.length > 0">
      <div class="row items-center q-mb-sm">
        <div class="text-subtitle2 text-weight-bold col">Historial de pagos</div>
      </div>
      <q-list bordered separator style="border-radius: 12px; overflow: hidden">
        <q-item v-for="s in sortedSettlements" :key="s.id" dense class="q-py-sm">
          <q-item-section avatar>
            <q-avatar size="32px" color="teal-2" text-color="teal-9">
              <q-icon name="handshake" size="16px" />
            </q-avatar>
          </q-item-section>
          <q-item-section>
            <q-item-label>
              <strong>{{ s.fromPerson }}</strong> le pagó a <strong>{{ s.toPerson }}</strong>
              <span class="text-weight-bold text-teal-8 q-ml-xs">
                {{ s.currency === 'USD' ? 'U$D' : '$' }} {{ fmt(s.amount) }}
              </span>
            </q-item-label>
            <q-item-label caption>
              {{ fmtDate(s.date) }}
              <span v-if="s.description" class="q-ml-xs text-grey-7">· {{ s.description }}</span>
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn flat round dense icon="delete" color="negative" size="sm"
              @click="confirmDeleteSettlement(s)" />
          </q-item-section>
        </q-item>
      </q-list>
    </template>

    <!-- Dialog saldar deuda -->
    <q-dialog v-model="showSettle" persistent>
      <q-card style="min-width: min(400px, 96vw); max-width: 440px">
        <q-card-section class="row items-center">
          <q-icon name="handshake" color="positive" size="24px" class="q-mr-sm" />
          <div class="text-h6">Registrar pago</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="closeSettle" />
        </q-card-section>
        <q-separator />
        <q-card-section class="q-gutter-sm">
          <q-select v-model="settleForm.fromPerson" :options="contactNames"
            label="¿Quién pagó?" outlined dense />
          <q-select v-model="settleForm.toPerson"
            :options="contactNames.filter(n => n !== settleForm.fromPerson)"
            label="¿A quién le pagó?" outlined dense />

          <div class="row q-col-gutter-sm">
            <div class="col-8">
              <q-input v-model.number="settleForm.amount" label="Monto" outlined dense
                type="number" min="0" />
            </div>
            <div class="col-4">
              <q-select v-model="settleForm.currency"
                :options="[{ label: 'ARS $', value: 'ARS' }, { label: 'USD U$D', value: 'USD' }]"
                outlined dense emit-value map-options />
            </div>
          </div>

          <q-input v-model="settleForm.date" label="Fecha" outlined dense type="date" />
          <q-input v-model="settleForm.description" label="Descripción (opcional)" outlined dense
            placeholder="Ej: transferencia, efectivo..." />

          <!-- Resumen del balance actual -->
          <q-card v-if="settleForm.fromPerson && settleForm.toPerson" flat bordered class="q-pa-sm bg-grey-1">
            <div class="text-caption text-grey-7">Balance actual entre estas personas:</div>
            <div class="text-body2 q-mt-xs">
              <template v-if="pairBalance !== 0">
                <span class="text-weight-medium">{{ pairBalance > 0 ? settleForm.toPerson : settleForm.fromPerson }}</span>
                le debe a
                <span class="text-weight-medium">{{ pairBalance > 0 ? settleForm.fromPerson : settleForm.toPerson }}</span>:
                <span class="text-weight-bold" :class="'text-negative'">
                  {{ settleForm.currency === 'USD' ? 'U$D' : '$' }} {{ fmt(Math.abs(pairBalance)) }}
                </span>
              </template>
              <span v-else class="text-grey-5">Sin deudas pendientes entre estas personas</span>
            </div>
          </q-card>
        </q-card-section>
        <q-separator />
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" @click="closeSettle" />
          <q-btn color="positive" icon="check" label="Registrar pago" unelevated
            :disable="!settleForm.fromPerson || !settleForm.toPerson || !settleForm.amount || !settleForm.date"
            @click="confirmSettle" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePortfolioStore } from '../stores/portfolio'
import { useQuasar } from 'quasar'
import type { Contact, Settlement } from '../services/storage'

const portfolio = usePortfolioStore()
const $q = useQuasar()

onMounted(() => { if (!portfolio.contacts.length && !portfolio.loading) void portfolio.init() })

const newName = ref('')
const dupError = ref('')

const sortedContacts = computed(() =>
  [...portfolio.contacts].sort((a, b) => a.name.localeCompare(b.name))
)

const sortedSettlements = computed(() =>
  [...portfolio.settlements].sort((a, b) => b.date.localeCompare(a.date))
)

const contactNames = computed(() => portfolio.contacts.map(c => c.name).sort())

function addContact() {
  const name = newName.value.trim()
  if (!name) return
  if (portfolio.contacts.some(c => c.name.toLowerCase() === name.toLowerCase())) {
    dupError.value = `"${name}" ya existe`
    return
  }
  dupError.value = ''
  portfolio.addContact(name)
  newName.value = ''
  $q.notify({ type: 'positive', message: `${name} agregado` })
}

function confirmDelete(contact: Contact) {
  $q.dialog({
    title: 'Eliminar persona',
    message: `¿Eliminar a "${contact.name}"? No se borrarán los gastos ya registrados.`,
    cancel: { flat: true, label: 'Cancelar' },
    ok: { color: 'negative', label: 'Eliminar', unelevated: true }
  }).onOk(() => {
    portfolio.deleteContact(contact.id)
    $q.notify({ type: 'warning', message: `${contact.name} eliminado` })
  })
}

// Settle dialog
const showSettle = ref(false)

const defaultSettle = () => ({
  fromPerson: '',
  toPerson: '',
  amount: 0,
  currency: 'ARS' as 'ARS' | 'USD',
  date: new Date().toISOString().split('T')[0],
  description: ''
})

const settleForm = ref(defaultSettle())

// Balance between the two selected persons (from the perspective of fromPerson)
// Positive = fromPerson is owed by toPerson; negative = fromPerson owes toPerson
const pairBalance = computed(() => {
  const from = settleForm.value.fromPerson
  const to = settleForm.value.toPerson
  if (!from || !to) return 0
  const b = portfolio.globalParticipantBalances
  return (b[from] ?? 0) - (b[to] ?? 0)
})

function openSettle(name: string) {
  settleForm.value = defaultSettle()
  const bal = portfolio.globalParticipantBalances[name] ?? 0
  // Pre-fill: if negative balance, they owe someone → they are the payer
  if (bal < 0) {
    settleForm.value.fromPerson = name
    // Find who they owe most to (highest positive balance)
    const creditor = Object.entries(portfolio.globalParticipantBalances)
      .filter(([n]) => n !== name)
      .sort(([, a], [, b]) => (b as number) - (a as number))[0]
    if (creditor) settleForm.value.toPerson = creditor[0]
    settleForm.value.amount = Math.abs(bal)
  } else {
    // They are owed → someone pays them
    settleForm.value.toPerson = name
    const debtor = Object.entries(portfolio.globalParticipantBalances)
      .filter(([n]) => n !== name)
      .sort(([, a], [, b]) => (a as number) - (b as number))[0]
    if (debtor) settleForm.value.fromPerson = debtor[0]
    settleForm.value.amount = Math.abs(bal)
  }
  showSettle.value = true
}

function closeSettle() {
  showSettle.value = false
  settleForm.value = defaultSettle()
}

function confirmSettle() {
  portfolio.addSettlement({
    fromPerson: settleForm.value.fromPerson,
    toPerson: settleForm.value.toPerson,
    amount: settleForm.value.amount,
    currency: settleForm.value.currency,
    date: settleForm.value.date,
    description: settleForm.value.description
  })
  $q.notify({ type: 'positive', message: 'Pago registrado' })
  closeSettle()
}

function confirmDeleteSettlement(s: Settlement) {
  $q.dialog({
    title: 'Eliminar pago',
    message: '¿Eliminar este registro de pago? El balance se recalculará.',
    cancel: { flat: true, label: 'Cancelar' },
    ok: { color: 'negative', label: 'Eliminar', unelevated: true }
  }).onOk(() => {
    portfolio.deleteSettlement(s.id)
    $q.notify({ type: 'warning', message: 'Pago eliminado' })
  })
}

function fmt(n: number): string {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.abs(n))
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function balanceLabel(bal: number): string {
  if (Math.abs(bal) < 0.01) return 'Sin deudas pendientes'
  return bal > 0 ? `Te debe $ ${fmt(bal)}` : `Le debés $ ${fmt(bal)}`
}

function balanceClass(bal: number): string {
  if (Math.abs(bal) < 0.01) return 'text-grey-5'
  return bal > 0 ? 'text-positive text-weight-medium' : 'text-negative text-weight-medium'
}
</script>
