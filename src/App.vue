<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
onMounted(() => {
  document.getElementById('app-splash')?.remove()
})
</script>
