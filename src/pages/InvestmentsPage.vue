<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h6 text-weight-bold col">Mis Inversiones</div>
      <q-btn icon="add" color="primary" label="Agregar" unelevated @click="openDialog()" />
    </div>

    <!-- Total banner -->
    <q-card class="bg-primary text-white q-mb-md" style="border-radius: 16px" flat>
      <q-card-section>
        <div class="row">
          <div class="col">
            <div class="text-overline opacity-80">TOTAL INVERSIONES</div>
            <div class="text-h5 text-weight-bold">$ {{ fmt(portfolio.totalInvestmentsARS) }}</div>
            <div class="text-caption opacity-70">
              U$D {{ fmt(portfolio.totalInvestmentsARS / portfolio.dolarBlue || 0) }}
            </div>
          </div>
          <div class="col-auto flex items-center">
            <q-icon name="trending_up" size="48px" class="opacity-30" />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Donut chart -->
    <q-card v-if="portfolio.investments.length > 0" class="q-mb-md" style="border-radius: 16px">
      <q-card-section>
        <div class="text-subtitle1 text-weight-bold q-mb-sm">Distribución de la cartera</div>
        <apexchart type="donut" height="250" :options="chartOptions" :series="chartSeries" />
      </q-card-section>
    </q-card>

    <!-- List -->
    <q-card style="border-radius: 16px">
      <q-list separator>
        <q-item
          v-for="inv in portfolio.investments"
          :key="inv.id"
          class="q-py-md"
        >
          <q-item-section avatar>
            <q-avatar :color="typeColor(inv.type)" text-color="white">
              <q-icon :name="typeIcon(inv.type)" />
            </q-avatar>
          </q-item-section>

          <q-item-section>
            <q-item-label class="text-weight-bold">{{ inv.name }}</q-item-label>
            <q-item-label caption>
              {{ inv.ticker ? inv.ticker + ' · ' : '' }}{{ typeLabel(inv.type) }}
            </q-item-label>
            <q-item-label caption>
              {{ inv.quantity }} u. @ {{ inv.currency === 'ARS' ? '$' : 'U$D' }} {{ fmt(inv.avgPrice) }}
            </q-item-label>
          </q-item-section>

          <q-item-section side>
            <div class="text-right">
              <div class="text-weight-bold text-body1">
                $ {{ fmt(portfolio.toARS(inv.quantity * inv.currentPrice, inv.currency)) }}
              </div>
              <div class="text-caption text-grey-6">
                U$D {{ fmt(portfolio.toUSD(inv.quantity * inv.currentPrice, inv.currency)) }}
              </div>
              <q-badge
                :color="gainPct(inv) >= 0 ? 'positive' : 'negative'"
                class="q-mt-xs"
              >
                {{ gainPct(inv) >= 0 ? '+' : '' }}{{ gainPct(inv).toFixed(1) }}%
              </q-badge>
            </div>
          </q-item-section>

          <q-item-section side>
            <div class="column">
              <q-btn flat round dense icon="edit" color="grey-6" size="sm" @click="openDialog(inv)" />
              <q-btn flat round dense icon="delete" color="negative" size="sm" @click="confirmDelete(inv.id)" />
            </div>
          </q-item-section>
        </q-item>

        <q-item v-if="portfolio.investments.length === 0">
          <q-item-section class="text-center q-py-xl">
            <q-icon name="trending_up" size="56px" color="grey-4" class="q-mb-sm" />
            <div class="text-grey-5">Aún no tenés inversiones registradas</div>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <!-- Dialog -->
    <q-dialog v-model="showDialog" persistent maximized-mobile>
      <q-card style="min-width: 320px; max-width: 500px">
        <q-card-section class="row items-center">
          <div class="text-h6">{{ editingId ? 'Editar' : 'Nueva' }} inversión</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="closeDialog" />
        </q-card-section>

        <q-separator />

        <q-card-section class="q-gutter-sm">
          <q-input v-model="form.name" label="Nombre *" outlined dense />
          <q-input v-model="form.ticker" label="Ticker (ej: GGAL, BTC)" outlined dense />

          <q-select
            v-model="form.type"
            :options="typeOptions"
            label="Tipo *"
            outlined
            dense
            emit-value
            map-options
          />

          <q-select
            v-model="form.currency"
            :options="[{ label: 'Pesos (ARS)', value: 'ARS' }, { label: 'Dólares (USD)', value: 'USD' }]"
            label="Moneda *"
            outlined
            dense
            emit-value
            map-options
          />

          <q-input
            v-model.number="form.quantity"
            label="Cantidad / unidades"
            outlined
            dense
            type="number"
            min="0"
          />

          <q-input
            v-model.number="form.avgPrice"
            :label="`Precio promedio de compra (${form.currency})`"
            outlined
            dense
            type="number"
            min="0"
          />

          <q-input
            v-model.number="form.currentPrice"
            :label="`Precio actual (${form.currency})`"
            outlined
            dense
            type="number"
            min="0"
          />

          <!-- Preview -->
          <q-banner v-if="form.quantity && form.currentPrice" class="bg-blue-1 rounded-borders">
            <div class="text-caption text-grey-7">Vista previa</div>
            <div class="text-body2">
              Valor total:
              <strong>{{ form.currency === 'ARS' ? '$' : 'U$D' }} {{ fmt(form.quantity * form.currentPrice) }}</strong>
            </div>
            <div v-if="form.avgPrice" class="text-body2">
              Resultado:
              <strong :class="gainPctForm >= 0 ? 'text-positive' : 'text-negative'">
                {{ gainPctForm >= 0 ? '+' : '' }}{{ gainPctForm.toFixed(1) }}%
              </strong>
            </div>
          </q-banner>
        </q-card-section>

        <q-separator />

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" @click="closeDialog" />
          <q-btn
            color="primary"
            :label="editingId ? 'Guardar cambios' : 'Agregar'"
            unelevated
            :disable="!form.name"
            @click="saveInvestment"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePortfolioStore } from '../stores/portfolio'
import { useQuasar } from 'quasar'
import type { Investment } from '../services/storage'

const portfolio = usePortfolioStore()
const $q = useQuasar()

const showDialog = ref(false)
const editingId = ref<string | null>(null)

const defaultForm = () => ({
  name: '',
  ticker: '',
  type: 'stock' as Investment['type'],
  currency: 'ARS' as 'ARS' | 'USD',
  quantity: 0,
  avgPrice: 0,
  currentPrice: 0
})

const form = ref(defaultForm())

const typeOptions = [
  { label: 'Acción', value: 'stock' },
  { label: 'Cedear', value: 'cedear' },
  { label: 'Bono', value: 'bond' },
  { label: 'FCI', value: 'fci' },
  { label: 'Plazo Fijo', value: 'plazo_fijo' },
  { label: 'Crypto', value: 'crypto' },
  { label: 'Otro', value: 'other' }
]

function typeIcon(type: string): string {
  return ({
    stock: 'show_chart', cedear: 'language', bond: 'receipt_long',
    fci: 'pie_chart', plazo_fijo: 'schedule', crypto: 'currency_bitcoin', other: 'attach_money'
  } as Record<string, string>)[type] ?? 'attach_money'
}

function typeColor(type: string): string {
  return ({
    stock: 'blue-7', cedear: 'teal-7', bond: 'green-7',
    fci: 'purple-7', plazo_fijo: 'brown-5', crypto: 'orange-7', other: 'grey-6'
  } as Record<string, string>)[type] ?? 'grey-6'
}

function typeLabel(type: string): string {
  return typeOptions.find(o => o.value === type)?.label ?? type
}

function gainPct(inv: Investment): number {
  if (!inv.avgPrice) return 0
  return ((inv.currentPrice - inv.avgPrice) / inv.avgPrice) * 100
}

const gainPctForm = computed(() => {
  if (!form.value.avgPrice) return 0
  return ((form.value.currentPrice - form.value.avgPrice) / form.value.avgPrice) * 100
})

function fmt(n: number): string {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n)
}

const chartSeries = computed(() =>
  portfolio.investments.map(inv =>
    Math.max(0, portfolio.toARS(inv.quantity * inv.currentPrice, inv.currency))
  )
)

const chartOptions = computed(() => ({
  chart: { toolbar: { show: false }, zoom: { enabled: false } },
  labels: portfolio.investments.map(i => i.name),
  legend: { position: 'bottom' },
  dataLabels: { enabled: true, formatter: (val: number) => `${val.toFixed(0)}%` },
  tooltip: {
    y: { formatter: (val: number) => `$ ${fmt(val)}` }
  }
}))

function openDialog(inv?: Investment) {
  if (inv) {
    editingId.value = inv.id
    form.value = { ...inv }
  } else {
    editingId.value = null
    form.value = defaultForm()
  }
  showDialog.value = true
}

function closeDialog() {
  showDialog.value = false
  editingId.value = null
  form.value = defaultForm()
}

function saveInvestment() {
  if (!form.value.name) return
  if (editingId.value) {
    portfolio.updateInvestment(editingId.value, form.value)
  } else {
    portfolio.addInvestment(form.value)
  }
  closeDialog()
  $q.notify({ type: 'positive', message: 'Inversión guardada' })
}

function confirmDelete(id: string) {
  $q.dialog({
    title: 'Eliminar inversión',
    message: '¿Estás seguro? Esta acción no se puede deshacer.',
    cancel: { flat: true, label: 'Cancelar' },
    ok: { color: 'negative', label: 'Eliminar', unelevated: true },
    persistent: true
  }).onOk(() => {
    portfolio.deleteInvestment(id)
    $q.notify({ type: 'warning', message: 'Inversión eliminada' })
  })
}
</script>

<style scoped>
:deep(.apexcharts-canvas) {
  touch-action: pan-y !important;
}
</style>
