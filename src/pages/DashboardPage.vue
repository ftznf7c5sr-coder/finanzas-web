<template>
  <q-page class="q-pa-md">
    <!-- Skeleton loading -->
    <div v-if="portfolio.loading">
      <div class="row q-gutter-sm q-mb-md">
        <q-skeleton v-for="i in 3" :key="i" type="QChip" width="110px" />
      </div>
      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-12 col-sm-6"><q-skeleton type="rect" height="100px" style="border-radius:16px" /></div>
        <div class="col-12 col-sm-6"><q-skeleton type="rect" height="100px" style="border-radius:16px" /></div>
      </div>
      <div class="row q-col-gutter-sm q-mb-md">
        <div v-for="i in 3" :key="i" class="col-4"><q-skeleton type="rect" height="72px" style="border-radius:12px" /></div>
      </div>
      <q-skeleton type="rect" height="300px" style="border-radius:16px" class="q-mb-md" />
    </div>

    <template v-else>
      <!-- Dólar strip -->
      <div class="row items-center q-gutter-sm q-mb-md">
        <q-card
          v-for="d in dolarChips"
          :key="d.label"
          flat
          bordered
          class="dolar-chip"
          style="border-radius: 10px; cursor: default"
        >
          <q-card-section class="q-pa-sm row items-center no-wrap q-gutter-xs">
            <q-icon :name="d.icon" :color="d.color" size="16px" />
            <span class="text-caption text-weight-bold" :style="`color: var(--q-${d.color})`">{{ d.label }}</span>
            <span class="text-caption text-weight-bold text-grey-8">${{ fmt(d.value) }}</span>
          </q-card-section>
        </q-card>
        <q-space />
        <q-btn unelevated round dense icon="refresh" color="primary" size="sm" @click="portfolio.init()">
          <q-tooltip>Actualizar cotizaciones</q-tooltip>
        </q-btn>
      </div>

      <!-- Patrimonio total -->
      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-12 col-sm-6">
          <q-card class="bg-primary text-white" style="border-radius: 16px">
            <q-card-section>
              <div class="text-overline opacity-80">PATRIMONIO TOTAL · ARS</div>
              <div class="text-h4 text-weight-bold q-mt-xs">
                $&nbsp;{{ fmt(portfolio.totalPatrimonioARS) }}
              </div>
              <div class="text-caption opacity-70 q-mt-xs">
                Calculado al dólar blue
              </div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-sm-6">
          <q-card class="bg-teal text-white" style="border-radius: 16px">
            <q-card-section>
              <div class="text-overline opacity-80">PATRIMONIO TOTAL · USD</div>
              <div class="text-h4 text-weight-bold q-mt-xs">
                U$D&nbsp;{{ fmt(portfolio.totalPatrimonioUSD) }}
              </div>
              <div class="text-caption opacity-70 q-mt-xs">
                Al tipo de cambio blue
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Breakdown cards -->
      <div class="row q-col-gutter-sm q-mb-md">
        <div v-for="card in breakdownCards" :key="card.label" class="col-4">
          <q-card bordered flat style="border-radius: 12px">
            <q-card-section class="q-pa-sm text-center">
              <q-icon :name="card.icon" :color="card.color" size="24px" />
              <div class="text-caption text-grey-6 q-mt-xs">{{ card.label }}</div>
              <div class="text-body2 text-weight-bold">$ {{ fmtShort(card.value) }}</div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Distribución donut -->
      <q-card
        v-if="portfolio.totalPatrimonioARS > 0"
        class="q-mb-md"
        style="border-radius: 16px"
      >
        <q-card-section>
          <div class="text-subtitle1 text-weight-bold">Distribución del patrimonio</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <apexchart
            type="donut"
            height="280"
            :options="donutOptions"
            :series="donutSeries"
          />
        </q-card-section>
      </q-card>

      <!-- Evolución -->
      <q-card
        v-if="portfolio.snapshots.length >= 2"
        style="border-radius: 16px"
      >
        <q-card-section>
          <div class="row items-center">
            <div class="text-subtitle1 text-weight-bold col">Evolución del patrimonio</div>
            <q-btn-toggle
              v-model="chartCurrency"
              :options="[{ label: 'ARS', value: 'ARS' }, { label: 'USD', value: 'USD' }]"
              unelevated
              dense
              rounded
              color="grey-2"
              text-color="grey-8"
              toggle-color="primary"
              toggle-text-color="white"
              class="q-ml-sm currency-toggle"
            />
          </div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <apexchart
            type="area"
            height="260"
            :options="lineOptions"
            :series="lineSeries"
          />
        </q-card-section>
      </q-card>

      <!-- Balances entre personas — siempre visible -->
      <q-card class="q-mb-md" style="border-radius: 16px">
        <q-card-section class="q-pb-sm">
          <div class="row items-center">
            <q-icon name="people" color="purple" size="20px" class="q-mr-sm" />
            <div class="text-subtitle1 text-weight-bold col">Deudas entre personas</div>
            <q-btn flat dense size="sm" label="Gestionar" color="primary" :to="{ name: 'contacts' }" />
          </div>
        </q-card-section>
        <q-separator />

        <!-- Sin contactos registrados -->
        <q-card-section v-if="portfolio.contacts.length === 0" class="text-center q-py-lg">
          <q-icon name="person_add" size="40px" color="grey-4" class="q-mb-sm" />
          <div class="text-grey-5">No hay personas registradas</div>
          <div class="text-caption text-grey-4 q-mb-md">Registrá personas para dividir gastos y llevar el control de deudas</div>
          <q-btn unelevated color="purple" icon="people" label="Ir a Personas" :to="{ name: 'contacts' }" size="sm" />
        </q-card-section>

        <!-- Con contactos, sin gastos compartidos -->
        <q-card-section v-else-if="!hasAnySharedExpense" class="text-center q-py-lg">
          <q-icon name="handshake" size="40px" color="grey-4" class="q-mb-sm" />
          <div class="text-grey-5">Sin gastos compartidos aún</div>
          <div class="text-caption text-grey-4 q-mb-md">Cargá un gasto en "Gastos", indicá quién pagó y cómo se divide</div>
          <q-btn unelevated color="orange-8" icon="receipt_long" label="Ir a Gastos" :to="{ name: 'expenses' }" size="sm" />
        </q-card-section>

        <!-- Balances por persona -->
        <q-list v-else separator>
          <q-item v-for="(bal, name) in portfolio.globalParticipantBalances" :key="name" dense class="q-py-sm">
            <q-item-section avatar>
              <q-avatar size="36px"
                :color="Math.abs(bal as number) < 0.01 ? 'grey-3' : ((bal as number) > 0 ? 'green-2' : 'red-2')"
                :text-color="Math.abs(bal as number) < 0.01 ? 'grey-6' : ((bal as number) > 0 ? 'green-9' : 'red-9')"
                font-size="14px">
                {{ String(name).charAt(0).toUpperCase() }}
              </q-avatar>
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-medium">{{ name }}</q-item-label>
              <q-item-label caption
                :class="Math.abs(bal as number) < 0.01 ? 'text-grey-5' : ((bal as number) > 0 ? 'text-positive' : 'text-negative')">
                {{ Math.abs(bal as number) < 0.01 ? 'Sin deudas' : ((bal as number) > 0 ? 'te debe' : 'le debés') }}
              </q-item-label>
            </q-item-section>
            <q-item-section side class="row items-center q-gutter-xs">
              <div class="text-weight-bold text-body1"
                :class="Math.abs(bal as number) < 0.01 ? 'text-grey-4' : ((bal as number) > 0 ? 'text-positive' : 'text-negative')">
                {{ Math.abs(bal as number) < 0.01 ? '—' : `${(bal as number) > 0 ? '+' : ''}$ ${fmt(Math.abs(bal as number))}` }}
              </div>
              <q-btn v-if="Math.abs(bal as number) >= 0.01"
                flat dense size="xs" icon="handshake" color="teal"
                :to="{ name: 'contacts' }">
                <q-tooltip>Saldar deuda</q-tooltip>
              </q-btn>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card>

      <!-- Empty state -->
      <q-card v-if="portfolio.totalPatrimonioARS === 0" style="border-radius: 16px">
        <q-card-section class="text-center q-py-xl">
          <q-icon name="account_balance_wallet" size="64px" color="grey-4" />
          <div class="text-h6 text-grey-5 q-mt-md">Tu patrimonio está vacío</div>
          <div class="text-grey-5 q-mt-xs">Agregá cuentas, inversiones o bienes para empezar</div>
          <div class="row q-gutter-sm justify-center q-mt-lg">
            <q-btn outline color="primary" label="Agregar cuenta" icon="account_balance" :to="{ name: 'accounts' }" />
            <q-btn outline color="teal" label="Agregar inversión" icon="trending_up" :to="{ name: 'investments' }" />
          </div>
        </q-card-section>
      </q-card>
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { usePortfolioStore } from '../stores/portfolio'

const portfolio = usePortfolioStore()
const chartCurrency = ref<'ARS' | 'USD'>('ARS')

onMounted(() => portfolio.init())

function fmt(n: number): string {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n)
}

function fmtShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return fmt(n)
}

const dolarChips = computed(() => [
  { label: 'Blue', value: portfolio.dolarBlue, color: 'blue-8', icon: 'attach_money' },
  { label: 'Oficial', value: portfolio.dolarOficial, color: 'green-7', icon: 'attach_money' },
  { label: 'MEP', value: portfolio.dolarMep, color: 'orange-7', icon: 'attach_money' }
].filter(d => d.value > 0))

const breakdownCards = computed(() => [
  { label: 'Cuentas', value: portfolio.totalAccountsARS, icon: 'account_balance', color: 'blue' },
  { label: 'Inversiones', value: portfolio.totalInvestmentsARS, icon: 'trending_up', color: 'teal' },
  { label: 'Bienes', value: portfolio.totalAssetsARS, icon: 'home', color: 'purple' }
])

const hasAnySharedExpense = computed(() =>
  Object.values(portfolio.globalParticipantBalances).some(b => Math.abs(b as number) >= 0.01)
)

const donutSeries = computed(() =>
  [portfolio.totalAccountsARS, portfolio.totalInvestmentsARS, portfolio.totalAssetsARS]
    .map(v => Math.max(0, Math.round(v)))
)

const donutOptions = {
  chart: { toolbar: { show: false }, zoom: { enabled: false } },
  labels: ['Cuentas', 'Inversiones', 'Bienes'],
  colors: ['#1976D2', '#26A69A', '#7C4DFF'],
  legend: { position: 'bottom' },
  dataLabels: { enabled: true, formatter: (val: number) => `${val.toFixed(0)}%` },
  plotOptions: { pie: { donut: { size: '60%' } } },
  tooltip: {
    y: {
      formatter: (val: number) => `$ ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(val)}`
    }
  }
}

const lineSeries = computed(() => [{
  name: chartCurrency.value === 'ARS' ? 'Patrimonio ARS' : 'Patrimonio USD',
  data: portfolio.snapshots.map(s => ({
    x: new Date(s.date).getTime(),
    y: Math.round(chartCurrency.value === 'ARS' ? s.totalARS : s.totalUSD)
  }))
}])

const lineOptions = computed(() => ({
  chart: {
    type: 'area',
    toolbar: { show: false },
    sparkline: { enabled: false },
    zoom: { enabled: false },
    selection: { enabled: false },
  },
  stroke: { curve: 'smooth', width: 2 },
  fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
  xaxis: { type: 'datetime', labels: { datetimeFormatter: { month: 'MMM' } } },
  yaxis: {
    labels: {
      formatter: (val: number) => {
        const prefix = chartCurrency.value === 'ARS' ? '$' : 'U$D'
        return `${prefix} ${fmtShort(val)}`
      }
    }
  },
  tooltip: {
    x: { format: 'dd/MM/yy' },
    y: {
      formatter: (val: number) => {
        const prefix = chartCurrency.value === 'ARS' ? '$' : 'U$D'
        return `${prefix} ${fmt(val)}`
      }
    }
  },
  colors: ['#1976D2'],
  grid: { borderColor: '#f0f0f0' }
}))
</script>

<style scoped>
.dolar-chip {
  min-width: 90px;
}
.currency-toggle {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}
/* Prevent charts from hijacking touch scroll on mobile */
:deep(.apexcharts-canvas) {
  touch-action: pan-y !important;
}
</style>
