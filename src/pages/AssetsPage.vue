<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="text-h6 text-weight-bold col">Mis Bienes</div>
      <q-btn icon="add" color="primary" label="Agregar" unelevated @click="openDialog()" />
    </div>

    <!-- Total -->
    <q-card class="bg-purple-7 text-white q-mb-md" style="border-radius: 16px" flat>
      <q-card-section>
        <div class="text-overline opacity-80">TOTAL EN BIENES</div>
        <div class="text-h5 text-weight-bold">$ {{ fmt(portfolio.totalAssetsARS) }}</div>
        <div class="text-caption opacity-70">
          U$D {{ fmt(portfolio.dolarBlue > 0 ? portfolio.totalAssetsARS / portfolio.dolarBlue : 0) }}
        </div>
      </q-card-section>
    </q-card>

    <!-- List -->
    <q-card style="border-radius: 16px">
      <q-list separator>
        <q-item v-for="asset in portfolio.assets" :key="asset.id" class="q-py-md">
          <q-item-section avatar>
            <q-avatar :color="typeColor(asset.type)" text-color="white">
              <q-icon :name="typeIcon(asset.type)" />
            </q-avatar>
          </q-item-section>

          <q-item-section>
            <q-item-label class="text-weight-bold">{{ asset.name }}</q-item-label>
            <q-item-label caption>{{ typeLabel(asset.type) }}</q-item-label>
          </q-item-section>

          <q-item-section side>
            <div class="text-right">
              <div class="text-weight-bold text-body1">
                {{ asset.currency === 'ARS' ? '$' : 'U$D' }} {{ fmt(asset.value) }}
              </div>
              <div class="text-caption text-grey-6">
                <span v-if="asset.currency === 'USD' && portfolio.dolarBlue > 0">
                  $ {{ fmt(asset.value * portfolio.dolarBlue) }} ARS
                </span>
                <span v-else-if="portfolio.dolarBlue > 0">
                  U$D {{ fmt(asset.value / portfolio.dolarBlue) }}
                </span>
              </div>
            </div>
          </q-item-section>

          <q-item-section side>
            <div class="column">
              <q-btn flat round dense icon="edit" color="grey-6" size="sm" @click="openDialog(asset)" />
              <q-btn flat round dense icon="delete" color="negative" size="sm" @click="confirmDelete(asset.id)" />
            </div>
          </q-item-section>
        </q-item>

        <q-item v-if="portfolio.assets.length === 0">
          <q-item-section class="text-center q-py-xl">
            <q-icon name="home" size="56px" color="grey-4" class="q-mb-sm" />
            <div class="text-grey-5">No tenés bienes registrados</div>
            <div class="text-caption text-grey-4">Propiedades, autos, etc.</div>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <!-- Dialog -->
    <q-dialog v-model="showDialog" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <div class="text-h6">{{ editingId ? 'Editar' : 'Nuevo' }} bien</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="closeDialog" />
        </q-card-section>

        <q-separator />

        <q-card-section class="q-gutter-sm">
          <q-input
            v-model="form.name"
            label="Nombre del bien *"
            outlined dense
            placeholder="Ej: Departamento Palermo, Auto Honda"
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

          <q-input
            v-model.number="form.value"
            :label="`Valor estimado (${form.currency})`"
            outlined dense
            type="number"
            min="0"
          />

          <q-banner v-if="form.value && portfolio.dolarBlue > 0" class="bg-purple-1 rounded-borders">
            <div class="text-caption text-grey-7">Equivalente</div>
            <div class="text-body2" v-if="form.currency === 'USD'">
              <strong>$ {{ fmt(form.value * portfolio.dolarBlue) }}</strong> ARS (blue)
            </div>
            <div class="text-body2" v-else>
              <strong>U$D {{ fmt(form.value / portfolio.dolarBlue) }}</strong> (blue)
            </div>
          </q-banner>

          <q-select
            v-if="portfolio.contacts.length > 0"
            v-model="form.owner"
            :options="['', ...portfolio.contacts.map(c => c.name)]"
            label="Propietario (opcional)"
            outlined dense clearable
            hint="Persona a quien pertenece este bien"
          >
            <template #option="{ opt, selected, toggleOption }">
              <q-item clickable :active="selected" @click="toggleOption(opt)">
                <q-item-section>{{ opt || 'Sin asignar' }}</q-item-section>
              </q-item>
            </template>
            <template #selected>
              <span>{{ form.owner || 'Sin asignar' }}</span>
            </template>
          </q-select>
        </q-card-section>

        <q-separator />

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" @click="closeDialog" />
          <q-btn
            color="primary"
            :label="editingId ? 'Guardar cambios' : 'Agregar'"
            unelevated
            :disable="!form.name"
            @click="saveAsset"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { usePortfolioStore } from '../stores/portfolio'
import { useQuasar } from 'quasar'
import type { Asset } from '../services/storage'

const portfolio = usePortfolioStore()
const $q = useQuasar()

const showDialog = ref(false)
const editingId = ref<string | null>(null)

const defaultForm = () => ({
  name: '',
  type: 'property' as Asset['type'],
  currency: 'USD' as 'ARS' | 'USD',
  value: 0,
  owner: ''
})

const form = ref(defaultForm())

const typeOptions = [
  { label: 'Propiedad', value: 'property' },
  { label: 'Vehículo', value: 'vehicle' },
  { label: 'Otro', value: 'other' }
]

function typeIcon(type: string): string {
  return ({ property: 'home', vehicle: 'directions_car', other: 'category' } as Record<string, string>)[type] ?? 'category'
}

function typeColor(type: string): string {
  return ({ property: 'purple-7', vehicle: 'red-6', other: 'grey-6' } as Record<string, string>)[type] ?? 'grey-6'
}

function typeLabel(type: string): string {
  return typeOptions.find(o => o.value === type)?.label ?? type
}

function fmt(n: number): string {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n)
}

function openDialog(asset?: Asset) {
  if (asset) {
    editingId.value = asset.id
    form.value = { name: asset.name, type: asset.type, currency: asset.currency, value: asset.value, owner: asset.owner ?? '' }
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

function saveAsset() {
  if (!form.value.name) return
  if (editingId.value) {
    portfolio.updateAsset(editingId.value, form.value)
  } else {
    portfolio.addAsset(form.value)
  }
  closeDialog()
  $q.notify({ type: 'positive', message: 'Bien guardado' })
}

function confirmDelete(id: string) {
  $q.dialog({
    title: 'Eliminar bien',
    message: '¿Estás seguro?',
    cancel: { flat: true, label: 'Cancelar' },
    ok: { color: 'negative', label: 'Eliminar', unelevated: true }
  }).onOk(() => {
    portfolio.deleteAsset(id)
    $q.notify({ type: 'warning', message: 'Bien eliminado' })
  })
}
</script>
