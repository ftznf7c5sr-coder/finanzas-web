<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h6 text-weight-bold col">Mis Inversiones</div>
      <q-btn
        flat round dense icon="sync" color="primary" class="q-mr-xs"
        :loading="refreshingAll"
        @click="refreshAllPrices"
      >
        <q-tooltip>Actualizar todos los precios</q-tooltip>
      </q-btn>
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
        <apexchart type="donut" height="220" :options="chartOptions" :series="chartSeries" />
      </q-card-section>
    </q-card>

    <!-- Cards de inversiones -->
    <div class="column q-gutter-sm">
      <q-card
        v-for="inv in portfolio.investments"
        :key="inv.id"
        flat bordered
        style="border-radius: 14px; cursor: pointer"
        @click="toggleExpand(inv.id)"
      >
        <!-- Fila principal -->
        <q-card-section class="q-pa-md">
          <div class="row items-center no-wrap q-gutter-sm">
            <q-avatar :color="typeColor(inv.type)" text-color="white" size="42px">
              <q-icon :name="typeIcon(inv.type)" size="20px" />
            </q-avatar>

            <div class="col">
              <div class="row items-center q-gutter-xs">
                <span class="text-weight-bold">{{ inv.name }}</span>
                <q-badge v-if="inv.ticker" color="grey-4" text-color="grey-8" class="text-caption">
                  {{ inv.ticker }}
                </q-badge>
              </div>
              <div class="text-caption text-grey-6">
                {{ typeLabel(inv.type) }} · {{ inv.quantity }} u.
              </div>
            </div>

            <div class="text-right q-mr-xs">
              <div class="text-weight-bold text-body1">
                $ {{ fmtShort(portfolio.toARS(inv.quantity * inv.currentPrice, inv.currency)) }}
              </div>
              <q-badge
                :color="gainPct(inv) >= 0 ? 'positive' : 'negative'"
                class="q-mt-xs"
              >
                {{ gainPct(inv) >= 0 ? '+' : '' }}{{ gainPct(inv).toFixed(1) }}%
              </q-badge>
            </div>

            <div class="column items-center q-gutter-xs" @click.stop>
              <q-btn flat round dense icon="edit" color="grey-6" size="sm" @click="openDialog(inv)" />
              <q-btn flat round dense icon="delete" color="negative" size="sm" @click="confirmDelete(inv.id)" />
            </div>
          </div>
        </q-card-section>

        <!-- Panel expandible -->
        <template v-if="expanded === inv.id">
          <q-separator />
          <q-card-section class="q-pa-md bg-grey-1">
            <div class="row q-col-gutter-sm q-mb-sm">
              <div class="col-6">
                <div class="text-caption text-grey-6">Precio actual</div>
                <div v-if="editingPriceId !== inv.id" class="row items-center no-wrap q-gutter-xs">
                  <span class="text-body2 text-weight-bold">
                    {{ inv.currency === 'ARS' ? '$' : 'U$D' }} {{ fmt(inv.currentPrice) }}
                  </span>
                  <q-btn flat round dense icon="edit" size="xs" color="grey-5"
                    @click.stop="startEditPrice(inv)" />
                </div>
                <div v-else class="row items-center no-wrap q-gutter-xs" @click.stop>
                  <q-input
                    v-model.number="editPriceValue"
                    dense outlined type="number" min="0"
                    style="width: 110px" autofocus
                    @keyup.enter="saveEditPrice(inv)"
                    @keyup.esc="editingPriceId = null"
                  />
                  <q-btn flat round dense icon="check" size="sm" color="positive"
                    @click.stop="saveEditPrice(inv)" />
                  <q-btn flat round dense icon="close" size="sm" color="grey-5"
                    @click.stop="editingPriceId = null" />
                </div>
              </div>
              <div class="col-6">
                <div class="text-caption text-grey-6">Precio promedio compra</div>
                <div class="text-body2 text-weight-bold">
                  {{ inv.currency === 'ARS' ? '$' : 'U$D' }} {{ fmt(inv.avgPrice) }}
                </div>
              </div>
              <div class="col-6">
                <div class="text-caption text-grey-6">Valor total actual</div>
                <div class="text-body2 text-weight-bold text-primary">
                  $ {{ fmt(portfolio.toARS(inv.quantity * inv.currentPrice, inv.currency)) }}
                </div>
              </div>
              <div class="col-6">
                <div class="text-caption text-grey-6">Costo total</div>
                <div class="text-body2 text-weight-bold text-grey-7">
                  $ {{ fmt(portfolio.toARS(inv.quantity * inv.avgPrice, inv.currency)) }}
                </div>
              </div>
              <div class="col-12">
                <div class="text-caption text-grey-6">Ganancia / Pérdida</div>
                <div
                  class="text-body2 text-weight-bold"
                  :class="gainAbs(inv) >= 0 ? 'text-positive' : 'text-negative'"
                >
                  {{ gainAbs(inv) >= 0 ? '+' : '' }}$
                  {{ fmt(Math.abs(portfolio.toARS(gainAbs(inv), inv.currency))) }}
                  <span class="text-caption">
                    ({{ gainPct(inv) >= 0 ? '+' : '' }}{{ gainPct(inv).toFixed(2) }}%)
                  </span>
                </div>
              </div>
              <div v-if="inv.currency === 'USD'" class="col-6">
                <div class="text-caption text-grey-6">Valor en USD</div>
                <div class="text-body2 text-weight-bold text-teal">
                  U$D {{ fmt(inv.quantity * inv.currentPrice) }}
                </div>
              </div>
            </div>

            <div class="row q-gutter-xs justify-end q-mt-sm">
              <q-btn
                v-if="canAutoFetch(inv)"
                unelevated dense size="sm" icon="sync" color="teal" text-color="white"
                :loading="refreshing[inv.id]"
                label="Precio desde Yahoo"
                @click.stop="refreshPrice(inv)"
              />
              <q-btn
                flat dense size="sm" icon="edit" color="grey-7"
                label="Editar todo"
                @click.stop="openDialog(inv)"
              />
            </div>

            <div v-if="lastUpdated[inv.id]" class="text-caption text-grey-5 q-mt-xs text-right">
              Cotización actualizada {{ lastUpdated[inv.id] }}
            </div>
          </q-card-section>
        </template>
      </q-card>

      <q-card v-if="portfolio.investments.length === 0" style="border-radius: 16px">
        <q-card-section class="text-center q-py-xl">
          <q-icon name="trending_up" size="56px" color="grey-4" class="q-mb-sm" />
          <div class="text-grey-5">Aún no tenés inversiones registradas</div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Dialog -->
    <q-dialog v-model="showDialog" persistent maximized-mobile>
      <q-card>
        <q-card-section class="row items-center">
          <div class="text-h6">{{ editingId ? 'Editar' : 'Nueva' }} inversión</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="closeDialog" />
        </q-card-section>

        <q-separator />

        <q-card-section class="q-gutter-sm">
          <q-input v-model="form.name" label="Nombre *" outlined dense />

          <q-input
            v-model="form.ticker"
            label="Ticker (ej: GGAL, BTC, AAPL)"
            outlined dense
            :hint="tickerHint"
          />

          <q-select
            v-model="form.type"
            :options="typeOptions"
            label="Tipo *"
            outlined dense emit-value map-options
          />

          <q-select
            v-model="form.currency"
            :options="[{ label: 'Pesos (ARS)', value: 'ARS' }, { label: 'Dólares (USD)', value: 'USD' }]"
            label="Moneda *"
            outlined dense emit-value map-options
          />

          <q-input v-model.number="form.quantity" label="Cantidad / unidades"
            outlined dense type="number" min="0" />

          <q-input v-model.number="form.avgPrice"
            :label="`Precio promedio de compra (${form.currency})`"
            outlined dense type="number" min="0" />

          <div class="row items-start q-gutter-sm">
            <q-input v-model.number="form.currentPrice"
              :label="`Precio actual (${form.currency})`"
              outlined dense type="number" min="0" class="col" />
            <q-btn
              v-if="canAutoFetchForm()"
              unelevated color="teal" size="sm" icon="sync"
              label="Yahoo"
              :loading="fetchingFormPrice"
              class="self-start q-mt-xs"
              @click="fetchFormPrice"
            />
          </div>

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
          <q-btn color="primary" :label="editingId ? 'Guardar cambios' : 'Agregar'"
            unelevated :disable="!form.name" @click="saveInvestment" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePortfolioStore } from '../stores/portfolio'
import { useQuasar } from 'quasar'
import { QuoteService } from '../services/quotes'
import type { Investment } from '../services/storage'

const portfolio = usePortfolioStore()
const $q = useQuasar()

const expanded = ref<string | null>(null)
const refreshing = ref<Record<string, boolean>>({})
const refreshingAll = ref(false)
const lastUpdated = ref<Record<string, string>>({})
const editingPriceId = ref<string | null>(null)
const editPriceValue = ref(0)

function startEditPrice(inv: Investment) {
  editingPriceId.value = inv.id
  editPriceValue.value = inv.currentPrice
}

function saveEditPrice(inv: Investment) {
  if (editPriceValue.value > 0) {
    portfolio.updateInvestment(inv.id, { currentPrice: editPriceValue.value })
    $q.notify({ type: 'positive', message: 'Precio actualizado', timeout: 1500 })
  }
  editingPriceId.value = null
}

function toggleExpand(id: string) {
  expanded.value = expanded.value === id ? null : id
}

function canAutoFetch(inv: Investment): boolean {
  return !!inv.ticker && ['stock', 'bond', 'cedear', 'crypto'].includes(inv.type)
}

function canAutoFetchForm(): boolean {
  return !!form.value.ticker && ['stock', 'bond', 'cedear', 'crypto'].includes(form.value.type)
}

async function refreshPrice(inv: Investment) {
  refreshing.value[inv.id] = true
  try {
    const price = await QuoteService.fetchPrice(inv.ticker, inv.type, inv.currency)
    if (price != null) {
      portfolio.updateInvestment(inv.id, { currentPrice: price })
      const now = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
      lastUpdated.value[inv.id] = `a las ${now}`
      $q.notify({ type: 'positive', message: `Precio de ${inv.name} actualizado`, timeout: 2000 })
    } else {
      $q.notify({ type: 'warning', message: `No se encontró cotización para ${inv.ticker}`, timeout: 3000 })
    }
  } catch {
    $q.notify({ type: 'negative', message: 'Error al obtener la cotización', timeout: 3000 })
  } finally {
    refreshing.value[inv.id] = false
  }
}

async function refreshAllPrices() {
  const fetchable = portfolio.investments.filter(canAutoFetch)
  if (fetchable.length === 0) {
    $q.notify({ type: 'info', message: 'No hay inversiones con ticker para actualizar', timeout: 2500 })
    return
  }
  refreshingAll.value = true
  let updated = 0
  await Promise.all(
    fetchable.map(async (inv) => {
      const price = await QuoteService.fetchPrice(inv.ticker, inv.type, inv.currency).catch(() => null)
      if (price != null) {
        portfolio.updateInvestment(inv.id, { currentPrice: price })
        const now = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
        lastUpdated.value[inv.id] = `a las ${now}`
        updated++
      }
    })
  )
  refreshingAll.value = false
  $q.notify({
    type: updated > 0 ? 'positive' : 'warning',
    message: updated > 0 ? `${updated} precio${updated !== 1 ? 's' : ''} actualizados` : 'No se pudieron obtener cotizaciones',
    timeout: 3000
  })
}

// --- Formulario ---
const showDialog = ref(false)
const editingId = ref<string | null>(null)
const fetchingFormPrice = ref(false)

const defaultForm = () => ({
  name: '', ticker: '',
  type: 'stock' as Investment['type'],
  currency: 'ARS' as 'ARS' | 'USD',
  quantity: 0, avgPrice: 0, currentPrice: 0
})

const form = ref(defaultForm())

const tickerHint = computed(() => {
  const t = form.value.type
  if (t === 'stock') return 'Acción argentina: GGAL, YPFD, BMA…'
  if (t === 'bond') return 'Bono: AL30, GD30…'
  if (t === 'cedear') return 'CEDEAR: AAPL, AMZN, MSFT…'
  if (t === 'crypto') return 'Crypto: BTC, ETH, SOL…'
  return ''
})

async function fetchFormPrice() {
  if (!form.value.ticker) return
  fetchingFormPrice.value = true
  try {
    const price = await QuoteService.fetchPrice(form.value.ticker, form.value.type, form.value.currency)
    if (price != null) {
      form.value.currentPrice = price
      $q.notify({ type: 'positive', message: `Cotización obtenida: ${form.value.currency === 'ARS' ? '$' : 'U$D'} ${fmt(price)}`, timeout: 2500 })
    } else {
      $q.notify({ type: 'warning', message: `No se encontró cotización para "${form.value.ticker}"`, timeout: 3000 })
    }
  } catch {
    $q.notify({ type: 'negative', message: 'Error al obtener la cotización', timeout: 3000 })
  } finally {
    fetchingFormPrice.value = false
  }
}

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

function gainAbs(inv: Investment): number {
  return (inv.currentPrice - inv.avgPrice) * inv.quantity
}

const gainPctForm = computed(() => {
  if (!form.value.avgPrice) return 0
  return ((form.value.currentPrice - form.value.avgPrice) / form.value.avgPrice) * 100
})

function fmt(n: number): string {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n)
}

function fmtShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return fmt(n)
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
  tooltip: { y: { formatter: (val: number) => `$ ${fmt(val)}` } }
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
