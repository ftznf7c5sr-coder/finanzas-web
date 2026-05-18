<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h6 text-weight-bold col">Mis Cuentas</div>
      <q-btn icon="add" color="primary" label="Agregar" unelevated @click="openDialog()" />
    </div>

    <!-- Total -->
    <q-card class="bg-blue-8 text-white q-mb-lg" style="border-radius: 16px" flat>
      <q-card-section class="q-pa-lg">
        <div class="row items-center justify-between">
          <div>
            <div class="text-overline opacity-80">TOTAL EN CUENTAS</div>
            <div class="text-h4 text-weight-bold">$ {{ fmt(portfolio.totalAccountsARS) }}</div>
            <div class="text-body2 opacity-70">
              U$D {{ fmt(portfolio.dolarBlue > 0 ? portfolio.totalAccountsARS / portfolio.dolarBlue : 0) }}
            </div>
          </div>
          <div class="text-right opacity-80">
            <div class="text-caption">{{ portfolio.accounts.length }} cuenta{{ portfolio.accounts.length !== 1 ? 's' : '' }}</div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Cards grid -->
    <div class="row q-col-gutter-lg q-mb-md">
      <div v-for="acc in portfolio.accounts" :key="acc.id" class="col-12 col-md-6">
        <q-card style="border-radius: 16px; cursor: pointer" bordered flat @click="openDetail(acc)">
          <q-card-section class="q-pb-sm">
            <!-- Header -->
            <div class="row items-center no-wrap q-mb-md">
              <q-avatar :color="typeColor(acc.type)" text-color="white" size="48px" class="q-mr-md">
                <q-icon :name="typeIcon(acc.type)" size="24px" />
              </q-avatar>
              <div class="col">
                <div class="row items-center q-gutter-xs">
                  <span class="text-weight-bold text-h6">{{ acc.name }}</span>
                  <q-badge v-if="portfolio.currentTna(acc) > 0" color="green-7">
                    TNA {{ portfolio.currentTna(acc) }}%
                  </q-badge>
                </div>
                <div class="text-caption text-grey-6">{{ typeLabel(acc.type) }} · {{ acc.currency }}</div>
              </div>
              <div class="column q-gutter-xs" @click.stop>
                <q-btn flat round dense icon="edit" color="grey-6" size="sm" @click="openDialog(acc)" />
                <q-btn flat round dense icon="delete" color="negative" size="sm" @click="confirmDelete(acc.id)" />
              </div>
            </div>

            <!-- Breakdown grid -->
            <div class="row q-col-gutter-md q-mb-md">
              <div class="col-6">
                <div class="text-caption text-grey-6">Saldo base</div>
                <div class="text-body1 text-weight-medium">
                  {{ acc.currency === 'ARS' ? '$' : 'U$D' }} {{ fmt(acc.balance) }}
                </div>
              </div>
              <div v-if="portfolio.currentTna(acc) > 0" class="col-6">
                <div class="text-caption text-grey-6">Intereses acumulados</div>
                <div class="text-body1 text-green-7">
                  + {{ acc.currency === 'ARS' ? '$' : 'U$D' }} {{ fmt(portfolio.accountInterest(acc)) }}
                  <span class="text-caption text-grey-5">({{ fmtPct(portfolio.accountInterest(acc) / acc.balance) }})</span>
                </div>
              </div>
              <div v-if="portfolio.accountTotalIncome(acc) > 0" class="col-6">
                <div class="text-caption text-grey-6">Ingresos</div>
                <div class="text-body1 text-blue-7">
                  + {{ acc.currency === 'ARS' ? '$' : 'U$D' }} {{ fmt(portfolio.accountTotalIncome(acc)) }}
                </div>
              </div>
              <div v-if="portfolio.accountTotalExpenses(acc) > 0" class="col-6">
                <div class="text-caption text-grey-6">Gastos</div>
                <div class="text-body1 text-orange-8">
                  - {{ acc.currency === 'ARS' ? '$' : 'U$D' }} {{ fmt(portfolio.accountTotalExpenses(acc)) }}
                </div>
              </div>
            </div>

            <!-- Separator + saldo efectivo -->
            <q-separator class="q-mb-md" />
            <div class="row items-end justify-between">
              <div>
                <div class="text-caption text-grey-6">Saldo efectivo</div>
                <div class="text-h5 text-weight-bold">
                  {{ acc.currency === 'ARS' ? '$' : 'U$D' }} {{ fmt(portfolio.accountEffectiveBalance(acc)) }}
                </div>
                <div v-if="acc.currency === 'USD' && portfolio.dolarBlue > 0" class="text-caption text-grey-6">
                  $ {{ fmt(portfolio.accountEffectiveBalance(acc) * portfolio.dolarBlue) }} ARS
                </div>
                <div v-if="acc.currency === 'ARS' && portfolio.dolarBlue > 0" class="text-caption text-grey-6">
                  U$D {{ fmt(portfolio.accountEffectiveBalance(acc) / portfolio.dolarBlue) }}
                </div>
              </div>
              <div v-if="portfolio.currentTna(acc) > 0" class="text-right">
                <div class="text-caption text-grey-6">Rinde hoy</div>
                <div class="text-body2 text-weight-bold text-green-7">
                  {{ acc.currency === 'ARS' ? '$' : 'U$D' }}
                  {{ fmt2(acc.balance * portfolio.currentTna(acc) / 100 / 365) }} / día
                </div>
                <div class="text-caption text-grey-6">
                  {{ acc.currency === 'ARS' ? '$' : 'U$D' }}
                  {{ fmt(acc.balance * portfolio.currentTna(acc) / 100 / 12) }} / mes
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Empty state -->
    <q-card v-if="portfolio.accounts.length === 0" style="border-radius: 16px">
      <q-card-section class="text-center q-py-xl">
        <q-icon name="account_balance" size="56px" color="grey-4" class="q-mb-sm" />
        <div class="text-grey-5">No tenés cuentas registradas</div>
      </q-card-section>
    </q-card>

    <!-- Dialog editar/agregar -->
    <q-dialog ref="accountDialogRef" v-model="showDialog" persistent>
      <q-card style="min-width: 320px; max-width: 480px">
        <q-card-section class="row items-center">
          <div class="text-h6">{{ editingId ? 'Editar' : 'Nueva' }} cuenta</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="closeDialog" />
        </q-card-section>
        <q-separator />
        <q-card-section class="q-gutter-sm">
          <q-input v-model="form.name" label="Nombre de la cuenta *" outlined dense
            placeholder="Ej: Galicia, Mercado Pago, Efectivo" />
          <q-select v-model="form.type" :options="typeOptions" label="Tipo *" outlined dense emit-value map-options />
          <q-select v-model="form.currency"
            :options="[{ label: 'Pesos (ARS)', value: 'ARS' }, { label: 'Dólares (USD)', value: 'USD' }]"
            label="Moneda *" outlined dense emit-value map-options />
          <q-input v-model.number="form.balance" :label="`Saldo depositado (${form.currency})`"
            outlined dense type="number" min="0" />
          <q-input v-model.number="form.tna" label="TNA % inicial (opcional)"
            outlined dense type="number" min="0" max="999"
            hint="Podés agregar cambios de tasa desde el historial de la cuenta" />
          <q-input v-model="form.depositDate" label="Fecha de ingreso del saldo"
            outlined dense type="date"
            hint="Desde esta fecha se calculan los intereses" />
        </q-card-section>
        <q-separator />
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" @click="closeDialog" />
          <q-btn color="primary" :label="editingId ? 'Guardar cambios' : 'Agregar'"
            unelevated :disable="!form.name" @click="saveAccount" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog historial -->
    <q-dialog v-model="showDetail" :maximized="$q.screen.lt.sm">
      <q-card style="min-width: min(720px, 96vw); max-width: 800px; border-radius: 16px">
        <q-card-section class="row items-center q-pb-none">
          <div v-if="detailAcc">
            <div class="text-h6 text-weight-bold">{{ detailAcc.name }}</div>
            <div class="text-caption text-grey-6">{{ typeLabel(detailAcc.type) }}</div>
          </div>
          <q-space />
          <q-btn flat round dense icon="close" @click="showDetail = false" />
        </q-card-section>

        <q-card-section v-if="detailAcc">
          <!-- Stats -->
          <div class="row q-col-gutter-sm q-mb-md">
            <div class="col-6 col-sm-3">
              <q-card flat bordered class="text-center q-pa-sm bg-blue-1">
                <div class="text-caption text-grey-6">Saldo actual</div>
                <div class="text-weight-bold text-blue-9">
                  {{ detailAcc.currency === 'ARS' ? '$' : 'U$D' }} {{ fmt(portfolio.accountEffectiveBalance(detailAcc)) }}
                </div>
              </q-card>
            </div>
            <div class="col-6 col-sm-3">
              <q-card flat bordered class="text-center q-pa-sm">
                <div class="text-caption text-grey-6">Días transcurridos</div>
                <div class="text-weight-bold">{{ daysElapsed(detailAcc) }}</div>
              </q-card>
            </div>
            <div class="col-6 col-sm-3">
              <q-card flat bordered class="text-center q-pa-sm">
                <div class="text-caption text-grey-6">Intereses acumulados</div>
                <div class="text-weight-bold text-green-7">
                  {{ detailAcc.currency === 'ARS' ? '$' : 'U$D' }} {{ fmt(portfolio.accountInterest(detailAcc)) }}
                </div>
              </q-card>
            </div>
            <div class="col-6 col-sm-3">
              <q-card flat bordered class="text-center q-pa-sm">
                <div class="text-caption text-grey-6">Rendimiento total</div>
                <div class="text-weight-bold text-green-7">
                  {{ fmtPct(detailAcc.balance > 0 ? portfolio.accountInterest(detailAcc) / detailAcc.balance : 0) }}
                </div>
              </q-card>
            </div>
          </div>

          <!-- Proyecciones con tasa actual -->
          <div v-if="portfolio.currentTna(detailAcc) > 0" class="row q-col-gutter-sm q-mb-lg">
            <div class="col-4">
              <q-card flat bordered class="text-center q-pa-sm bg-green-1">
                <div class="text-caption text-grey-7">Por día (tasa actual)</div>
                <div class="text-weight-bold text-green-8">
                  {{ detailAcc.currency === 'ARS' ? '$' : 'U$D' }}
                  {{ fmt2(detailAcc.balance * portfolio.currentTna(detailAcc) / 100 / 365) }}
                </div>
              </q-card>
            </div>
            <div class="col-4">
              <q-card flat bordered class="text-center q-pa-sm bg-green-1">
                <div class="text-caption text-grey-7">Por mes</div>
                <div class="text-weight-bold text-green-8">
                  {{ detailAcc.currency === 'ARS' ? '$' : 'U$D' }}
                  {{ fmt(detailAcc.balance * portfolio.currentTna(detailAcc) / 100 / 12) }}
                </div>
              </q-card>
            </div>
            <div class="col-4">
              <q-card flat bordered class="text-center q-pa-sm bg-green-1">
                <div class="text-caption text-grey-7">Por año</div>
                <div class="text-weight-bold text-green-8">
                  {{ detailAcc.currency === 'ARS' ? '$' : 'U$D' }}
                  {{ fmt(detailAcc.balance * portfolio.currentTna(detailAcc) / 100) }}
                </div>
              </q-card>
            </div>
          </div>

          <!-- Chart -->
          <div v-if="chartSeries.length > 0 && chartSeries[0].data.length > 0" class="q-mb-lg">
            <div class="text-caption text-grey-6 q-mb-xs">Evolución del saldo</div>
            <apexchart type="area" height="220" :options="chartOptions" :series="chartSeries" />
          </div>

          <!-- Historial de tasas -->
          <q-separator class="q-mb-md" />
          <div class="row items-center q-mb-sm">
            <div class="text-subtitle2 col">Historial de tasas (TNA)</div>
            <q-btn icon="add" size="sm" color="primary" flat label="Agregar período" @click="showAddPeriod = !showAddPeriod" />
          </div>

          <!-- Form agregar período -->
          <q-card v-if="showAddPeriod" flat bordered class="q-pa-sm q-mb-md bg-blue-1">
            <div class="row q-col-gutter-sm items-end">
              <div class="col-12 col-sm-4">
                <q-input v-model.number="newPeriod.tna" label="TNA %" outlined dense type="number" min="0" max="999" />
              </div>
              <div class="col-12 col-sm-4">
                <q-input v-model="newPeriod.from" label="Vigente desde" outlined dense type="date" />
              </div>
              <div class="col-12 col-sm-4 row q-gutter-xs justify-end">
                <q-btn flat label="Cancelar" size="sm" @click="cancelAddPeriod" />
                <q-btn color="primary" label="Agregar" size="sm" unelevated
                  :disable="!newPeriod.tna || !newPeriod.from" @click="confirmAddPeriod" />
              </div>
            </div>
          </q-card>

          <!-- Lista de períodos -->
          <div v-if="detailPeriods.length === 0" class="text-caption text-grey-5 q-mb-md">
            Sin tasas configuradas para esta cuenta
          </div>
          <q-list v-else separator class="rounded-borders" bordered>
            <q-item v-for="(p, i) in detailPeriods" :key="p.from">
              <q-item-section avatar>
                <q-avatar size="32px" :color="i === detailPeriods.length - 1 ? 'green-7' : 'grey-4'" text-color="white" font-size="12px">
                  {{ i + 1 }}
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-bold">TNA {{ p.tna }}%</q-item-label>
                <q-item-label caption>
                  Desde {{ fmtDate(p.from) }}
                  <span v-if="i < detailPeriods.length - 1"> · Hasta {{ fmtDate(detailPeriods[i + 1].from) }}</span>
                  <q-badge v-else color="green-7" class="q-ml-xs">Vigente</q-badge>
                </q-item-label>
                <q-item-label v-if="i < detailPeriods.length - 1" caption class="text-green-7">
                  Intereses ese período: {{ detailAcc.currency === 'ARS' ? '$' : 'U$D' }}
                  {{ fmt(interestForPeriod(detailAcc, p.from, detailPeriods[i + 1].from)) }}
                </q-item-label>
                <q-item-label v-else caption class="text-green-7">
                  Intereses acumulados en este período: {{ detailAcc.currency === 'ARS' ? '$' : 'U$D' }}
                  {{ fmt(interestForPeriod(detailAcc, p.from, null)) }}
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn v-if="detailPeriods.length > 1" flat round dense icon="delete" color="negative" size="sm"
                  @click="deletePeriod(p.from)" />
              </q-item-section>
            </q-item>
          </q-list>

          <!-- Participantes (cuentas compartidas) -->
          <q-separator class="q-my-md" />
          <div class="row items-center q-mb-sm">
            <div class="text-subtitle2 col">Participantes</div>
          </div>

          <div v-if="portfolio.contacts.length === 0" class="text-caption text-grey-5 q-mb-md">
            Registrá personas en
            <router-link :to="{ name: 'contacts' }" class="text-primary">Personas</router-link>
            para poder dividir gastos en esta cuenta.
          </div>
          <div v-else class="q-mb-md">
            <q-select v-model="detailParticipants" :options="portfolio.contacts.map(c => c.name)"
              label="Personas que participan en esta cuenta" outlined dense multiple use-chips
              class="q-mb-sm" @update:model-value="saveParticipants" />

            <!-- Balance entre participantes en esta cuenta -->
            <q-card v-if="detailParticipants.length > 0" flat bordered class="q-pa-sm bg-grey-1">
              <div class="text-caption text-weight-bold text-grey-7 q-mb-xs">Balance en esta cuenta</div>
              <div v-for="(bal, name) in portfolio.participantBalances(detailAcc)" :key="name"
                class="row items-center q-mb-xs">
                <q-avatar size="24px" color="purple-2" text-color="purple-9" class="q-mr-sm" font-size="11px">
                  {{ String(name).charAt(0).toUpperCase() }}
                </q-avatar>
                <span class="text-body2 col">{{ name }}</span>
                <span class="text-weight-bold text-body2"
                  :class="(bal as number) >= 0 ? 'text-positive' : 'text-negative'">
                  {{ (bal as number) >= 0 ? 'le deben' : 'debe' }}
                  {{ detailAcc.currency === 'ARS' ? '$' : 'U$D' }} {{ fmt(Math.abs(bal as number)) }}
                </span>
              </div>
              <div v-if="!Object.keys(portfolio.participantBalances(detailAcc)).length" class="text-caption text-grey-5">
                Sin gastos compartidos en esta cuenta aún
              </div>
            </q-card>
          </div>

          <!-- Movimientos (gastos / ingresos) -->
          <q-separator class="q-my-md" />
          <div class="row items-center q-mb-sm">
            <div class="text-subtitle2 col">Movimientos</div>
            <div class="row q-gutter-xs">
              <q-btn icon="remove" size="sm" color="orange-8" flat label="Gasto" @click="openAddMovement('expense')" />
              <q-btn icon="add" size="sm" color="blue-7" flat label="Ingreso" @click="openAddMovement('income')" />
            </div>
          </div>

          <!-- Form agregar / editar movimiento -->
          <q-card v-if="showAddMovement" flat bordered class="q-pa-sm q-mb-md"
            :class="newMovement.type === 'expense' ? 'bg-orange-1' : 'bg-blue-1'">
            <div class="text-caption text-weight-bold q-mb-sm" :class="newMovement.type === 'expense' ? 'text-orange-9' : 'text-blue-9'">
              {{ editingMovementId ? 'Editar movimiento' : (newMovement.type === 'expense' ? 'Nuevo gasto' : 'Nuevo ingreso') }}
            </div>
            <div class="row q-col-gutter-sm items-end">
              <div class="col-12 col-sm-3">
                <q-select v-model="newMovement.type" outlined dense emit-value map-options
                  :options="[{ label: 'Gasto', value: 'expense' }, { label: 'Ingreso', value: 'income' }]"
                  label="Tipo" />
              </div>
              <div class="col-12 col-sm-3">
                <q-input v-model.number="newMovement.amount" label="Monto" outlined dense type="number" min="0" />
              </div>
              <div class="col-12 col-sm-3">
                <q-input v-model="newMovement.date" label="Fecha" outlined dense type="date" />
              </div>
              <div class="col-12 col-sm-3">
                <q-input v-model="newMovement.description" label="Descripción (opcional)" outlined dense />
              </div>
            </div>

            <!-- División (solo gastos, usando contactos globales) -->
            <template v-if="newMovement.type === 'expense' && portfolio.contacts.length > 0">
              <q-separator class="q-my-sm" />
              <div class="row items-center q-mb-xs">
                <div class="text-caption text-grey-7 text-weight-bold col">División del gasto (opcional)</div>
                <q-btn flat size="sm" label="Partes iguales" color="primary" @click="splitMovementEqually" />
              </div>
              <div class="row q-col-gutter-sm q-mb-xs">
                <div class="col-12 col-sm-6">
                  <q-select v-model="newMovement.paidBy" :options="portfolio.contacts.map(c => c.name)"
                    label="¿Quién pagó?" outlined dense clearable />
                </div>
              </div>
              <div v-for="c in portfolio.contacts" :key="c.id" class="row items-center q-col-gutter-sm q-mb-xs">
                <div class="col-6 col-sm-4">
                  <div class="text-body2 q-pl-sm">{{ c.name }}</div>
                </div>
                <div class="col-6 col-sm-4">
                  <q-input v-model.number="newMovement.splits[c.name]" outlined dense type="number" min="0"
                    :label="`${detailAcc.currency === 'ARS' ? '$' : 'U$D'}`" />
                </div>
              </div>
              <div v-if="movementSplitTotal > 0" class="text-caption q-mt-xs"
                :class="Math.abs(movementSplitTotal - newMovement.amount) < 0.01 ? 'text-positive' : 'text-negative'">
                Total: {{ detailAcc.currency === 'ARS' ? '$' : 'U$D' }} {{ fmt(movementSplitTotal) }}
                {{ Math.abs(movementSplitTotal - newMovement.amount) < 0.01 ? '✓ cuadra' : `(diferencia: ${fmt(newMovement.amount - movementSplitTotal)})` }}
              </div>
            </template>

            <div v-if="movementError" class="text-negative text-caption q-mt-xs">{{ movementError }}</div>
            <div class="row q-gutter-xs justify-end q-mt-sm">
              <q-btn flat label="Cancelar" size="sm" @click="cancelAddMovement" />
              <q-btn :color="newMovement.type === 'expense' ? 'orange-8' : 'blue-7'"
                :label="editingMovementId ? 'Guardar cambios' : (newMovement.type === 'expense' ? 'Registrar gasto' : 'Registrar ingreso')"
                size="sm" unelevated :disable="!newMovement.amount || !newMovement.date"
                @click="confirmAddMovement" />
            </div>
          </q-card>

          <!-- Lista de movimientos -->
          <div v-if="detailMovements.length === 0 && !showAddMovement" class="text-caption text-grey-5 q-mb-md">
            Sin movimientos registrados para esta cuenta
          </div>
          <q-list v-else-if="detailMovements.length > 0" separator class="rounded-borders" bordered>
            <q-item v-for="mov in detailMovements" :key="mov.id">
              <q-item-section avatar>
                <q-avatar size="32px"
                  :color="mov.type === 'income' ? 'blue-3' : 'orange-3'"
                  :text-color="mov.type === 'income' ? 'blue-9' : 'orange-9'">
                  <q-icon :name="mov.type === 'income' ? 'add' : 'remove'" />
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-bold"
                  :class="mov.type === 'income' ? 'text-blue-9' : 'text-orange-9'">
                  {{ mov.type === 'income' ? '+' : '-' }}
                  {{ detailAcc.currency === 'ARS' ? '$' : 'U$D' }} {{ fmt(mov.amount) }}
                  <q-badge :color="mov.type === 'income' ? 'blue-7' : 'orange-7'" class="q-ml-xs" style="font-size:10px">
                    {{ mov.type === 'income' ? 'ingreso' : 'gasto' }}
                  </q-badge>
                </q-item-label>
                <q-item-label caption>
                  {{ fmtDate(mov.date) }}
                  <span v-if="mov.description" class="q-ml-xs text-grey-7">· {{ mov.description }}</span>
                </q-item-label>
                <q-item-label v-if="mov.paidBy || mov.splits?.length" caption class="q-mt-xs">
                  <span v-if="mov.paidBy" class="q-mr-sm">
                    <q-icon name="person" size="12px" /> Pagó: <strong>{{ mov.paidBy }}</strong>
                  </span>
                  <q-chip v-for="s in (mov.splits ?? [])" :key="s.participant"
                    dense size="sm" color="purple-2" text-color="purple-9" class="q-mr-xs">
                    {{ s.participant }}: {{ detailAcc.currency === 'ARS' ? '$' : 'U$D' }} {{ fmt(s.amount) }}
                  </q-chip>
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <div class="column q-gutter-xs">
                  <q-btn flat round dense icon="edit" color="grey-6" size="sm" @click="openEditMovement(mov)" />
                  <q-btn flat round dense icon="delete" color="negative" size="sm" @click="confirmDeleteMovement(mov.id)" />
                </div>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePortfolioStore } from '../stores/portfolio'
import { useQuasar } from 'quasar'
import type { Account, TnaPeriod, Movement } from '../services/storage'

const portfolio = usePortfolioStore()
const $q = useQuasar()

const accountDialogRef = ref()
const showDialog = ref(false)
const editingId = ref<string | null>(null)
const showDetail = ref(false)
const detailAcc = ref<Account | null>(null)
const showAddPeriod = ref(false)
const newPeriod = ref({ tna: 0, from: '' })

const defaultForm = () => ({
  name: '',
  type: 'bank' as Account['type'],
  currency: 'ARS' as 'ARS' | 'USD',
  balance: 0,
  tna: 0,
  depositDate: new Date().toISOString().split('T')[0]
})
const form = ref(defaultForm())

const typeOptions = [
  { label: 'Banco', value: 'bank' },
  { label: 'Billetera virtual', value: 'wallet' },
  { label: 'Efectivo', value: 'cash' },
  { label: 'Broker / comitente', value: 'broker' }
]

function typeIcon(type: string): string {
  return ({ bank: 'account_balance', wallet: 'account_balance_wallet', cash: 'payments', broker: 'bar_chart' } as Record<string, string>)[type] ?? 'account_balance'
}
function typeColor(type: string): string {
  return ({ bank: 'blue-7', wallet: 'light-blue-6', cash: 'green-7', broker: 'indigo-6' } as Record<string, string>)[type] ?? 'grey-6'
}
function typeLabel(type: string): string {
  return typeOptions.find(o => o.value === type)?.label ?? type
}
function fmt(n: number): string {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n)
}
function fmt2(n: number): string {
  return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}
function fmtPct(n: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(n)
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function daysElapsed(acc: Account): number {
  return Math.max(0, Math.floor((Date.now() - new Date(acc.balanceUpdatedAt || acc.createdAt).getTime()) / 86_400_000))
}

function interestForPeriod(acc: Account, fromDate: string, toDate: string | null): number {
  const fromMs = new Date(fromDate).getTime()
  const toMs = toDate ? new Date(toDate).getTime() : Date.now()
  return Math.max(0, portfolio.accountInterestAt(acc, toMs) - portfolio.accountInterestAt(acc, fromMs))
}

// Periods sorted ascending for the detail dialog
const detailPeriods = computed<TnaPeriod[]>(() =>
  detailAcc.value ? portfolio.resolvedPeriods(detailAcc.value) : []
)

// Keep detailAcc in sync with the store (reacts to addTnaPeriod/removeTnaPeriod)
watch(() => portfolio.accounts, (accs) => {
  if (detailAcc.value) {
    detailAcc.value = accs.find(a => a.id === detailAcc.value!.id) ?? detailAcc.value
  }
}, { deep: true })

function openDialog(acc?: Account) {
  if (acc) {
    editingId.value = acc.id
    form.value = {
      name: acc.name, type: acc.type, currency: acc.currency, balance: acc.balance,
      tna: portfolio.currentTna(acc),
      depositDate: (acc.balanceUpdatedAt || acc.createdAt).split('T')[0]
    }
  } else {
    editingId.value = null
    form.value = defaultForm()
  }
  showDialog.value = true
}
function closeDialog() {
  accountDialogRef.value?.hide()
  showDialog.value = false
  editingId.value = null
  form.value = defaultForm()
}
function saveAccount() {
  if (!form.value.name) return
  try {
    const depositRaw = form.value.depositDate
    const depositMs = depositRaw ? new Date(depositRaw).getTime() : NaN
    const balanceUpdatedAt = isNaN(depositMs)
      ? new Date().toISOString()
      : new Date(depositRaw).toISOString()
    const data = {
      name: form.value.name, type: form.value.type,
      currency: form.value.currency,
      balance: Number(form.value.balance) || 0,
      tna: Number(form.value.tna) || 0,
      balanceUpdatedAt
    }
    if (editingId.value) {
      portfolio.updateAccount(editingId.value, data)
    } else {
      portfolio.addAccount(data)
    }
    $q.notify({ type: 'positive', message: 'Cuenta guardada' })
  } finally {
    closeDialog()
  }
}
function confirmDelete(id: string) {
  $q.dialog({
    title: 'Eliminar cuenta', message: '¿Estás seguro?',
    cancel: { flat: true, label: 'Cancelar' },
    ok: { color: 'negative', label: 'Eliminar', unelevated: true }
  }).onOk(() => {
    portfolio.deleteAccount(id)
    $q.notify({ type: 'warning', message: 'Cuenta eliminada' })
  })
}

// Participants — backed by global contacts, stored per-account
const detailParticipants = ref<string[]>([])

function saveParticipants(val: string[]) {
  if (!detailAcc.value) return
  portfolio.updateParticipants(detailAcc.value.id, val)
}

// Movements (expenses / income)
const showAddMovement = ref(false)
const editingMovementId = ref<string | null>(null)
const newMovement = ref<{ type: 'expense' | 'income'; amount: number; description: string; date: string; paidBy: string; splits: Record<string, number> }>({
  type: 'expense', amount: 0, description: '', date: new Date().toISOString().split('T')[0], paidBy: '', splits: {}
})
const movementError = ref('')

const movementSplitTotal = computed(() =>
  portfolio.contacts.reduce((s, c) => s + (newMovement.value.splits[c.name] || 0), 0)
)

function splitMovementEqually() {
  const contacts = portfolio.contacts
  if (!contacts.length || !newMovement.value.amount) return
  const share = Math.round((newMovement.value.amount / contacts.length) * 100) / 100
  const splits: Record<string, number> = {}
  contacts.forEach(c => { splits[c.name] = share })
  newMovement.value.splits = splits
}

const detailMovements = computed<Movement[]>(() =>
  (detailAcc.value?.movements ?? []).slice().sort((a, b) => b.date.localeCompare(a.date))
)

function openAddMovement(type: 'expense' | 'income' = 'expense') {
  editingMovementId.value = null
  newMovement.value = { type, amount: 0, description: '', date: new Date().toISOString().split('T')[0], paidBy: '', splits: {} }
  movementError.value = ''
  showAddMovement.value = true
}

function openEditMovement(mov: Movement) {
  editingMovementId.value = mov.id
  const splitsObj: Record<string, number> = {}
  for (const s of (mov.splits ?? [])) splitsObj[s.participant] = s.amount
  newMovement.value = {
    type: mov.type,
    amount: mov.amount,
    description: mov.description,
    date: mov.date.split('T')[0],
    paidBy: mov.paidBy ?? '',
    splits: splitsObj
  }
  movementError.value = ''
  showAddMovement.value = true
}

function cancelAddMovement() {
  showAddMovement.value = false
  editingMovementId.value = null
  movementError.value = ''
  newMovement.value = { type: 'expense', amount: 0, description: '', date: new Date().toISOString().split('T')[0], paidBy: '', splits: {} }
}

function confirmAddMovement() {
  if (!detailAcc.value) return
  if (!newMovement.value.amount || newMovement.value.amount <= 0) {
    movementError.value = 'El monto debe ser mayor a 0'
    return
  }
  const splits = Object.entries(newMovement.value.splits)
    .filter(([, v]) => v > 0)
    .map(([participant, amount]) => ({ participant, amount }))
  const data = {
    type: newMovement.value.type,
    amount: newMovement.value.amount,
    description: newMovement.value.description,
    date: newMovement.value.date,
    paidBy: newMovement.value.paidBy || undefined,
    splits
  }
  if (editingMovementId.value) {
    portfolio.updateMovement(detailAcc.value.id, editingMovementId.value, data)
    cancelAddMovement()
    $q.notify({ type: 'positive', message: 'Movimiento actualizado' })
  } else {
    portfolio.addMovement(detailAcc.value.id, data)
    cancelAddMovement()
    const label = newMovement.value.type === 'expense' ? 'Gasto' : 'Ingreso'
    $q.notify({ type: 'positive', message: `${label} registrado` })
  }
}

function confirmDeleteMovement(movementId: string) {
  if (!detailAcc.value) return
  $q.dialog({
    title: 'Eliminar movimiento',
    message: '¿Eliminar este movimiento? El saldo se recalculará automáticamente.',
    cancel: { flat: true, label: 'Cancelar' },
    ok: { color: 'negative', label: 'Eliminar', unelevated: true }
  }).onOk(() => {
    portfolio.deleteMovement(detailAcc.value!.id, movementId)
    $q.notify({ type: 'warning', message: 'Movimiento eliminado' })
  })
}

function openDetail(acc: Account) {
  detailAcc.value = acc
  showAddPeriod.value = false
  showAddMovement.value = false
  newPeriod.value = { tna: 0, from: '' }
  detailParticipants.value = acc.participants ?? []
  showDetail.value = true
}
function cancelAddPeriod() {
  showAddPeriod.value = false
  newPeriod.value = { tna: 0, from: '' }
}
function confirmAddPeriod() {
  if (!detailAcc.value || !newPeriod.value.tna || !newPeriod.value.from) return
  portfolio.addTnaPeriod(detailAcc.value.id, {
    tna: newPeriod.value.tna,
    from: new Date(newPeriod.value.from).toISOString()
  })
  cancelAddPeriod()
  $q.notify({ type: 'positive', message: 'Período agregado' })
}
function deletePeriod(from: string) {
  if (!detailAcc.value) return
  portfolio.removeTnaPeriod(detailAcc.value.id, from)
  $q.notify({ type: 'warning', message: 'Período eliminado' })
}

// Chart
const chartSeries = computed(() => {
  const acc = detailAcc.value
  if (!acc) return []
  const depositMs = new Date(acc.balanceUpdatedAt || acc.createdAt).getTime()
  const totalDays = Math.max(1, Math.floor((Date.now() - depositMs) / 86_400_000))
  const step = totalDays > 180 ? 7 : 1
  const data: { x: number; y: number }[] = []
  for (let d = 0; d <= totalDays; d += step) {
    const ms = depositMs + d * 86_400_000
    data.push({ x: ms, y: Math.round(portfolio.accountEffectiveBalanceAt(acc, ms)) })
  }
  return [{ name: 'Saldo efectivo', data }]
})

const chartOptions = computed(() => {
  const acc = detailAcc.value
  const cur = acc?.currency === 'ARS' ? '$' : 'U$D'

  const tnaAnnotations = acc ? portfolio.resolvedPeriods(acc).slice(1).map(p => ({
    x: new Date(p.from).getTime(),
    borderColor: '#1976D2',
    label: { text: `TNA ${p.tna}%`, style: { color: '#fff', background: '#1976D2', fontSize: '10px' } }
  })) : []

  const movementAnnotations = (acc?.movements ?? []).map(m => ({
    x: new Date(m.date).getTime(),
    borderColor: m.type === 'income' ? '#1565C0' : '#E65100',
    strokeDashArray: 4,
    label: {
      text: `${m.type === 'income' ? '+' : '-'}${cur} ${fmt(m.amount)}${m.description ? ' · ' + m.description : ''}`,
      style: { color: '#fff', background: m.type === 'income' ? '#1565C0' : '#E65100', fontSize: '10px' }
    }
  }))

  return {
    chart: { toolbar: { show: false } },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 } },
    colors: ['#1976D2'],
    xaxis: { type: 'datetime', labels: { format: 'dd/MM/yy', style: { fontSize: '11px' } } },
    yaxis: { labels: { formatter: (v: number) => fmt(v), style: { fontSize: '11px' } } },
    tooltip: {
      x: { format: 'dd/MM/yyyy' },
      y: { formatter: (v: number) => `${cur} ${fmt(v)}` }
    },
    annotations: { xaxis: [...tnaAnnotations, ...movementAnnotations] },
    grid: { borderColor: '#f0f0f0' },
    dataLabels: { enabled: false }
  }
})
</script>
