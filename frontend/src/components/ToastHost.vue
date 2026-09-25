<template>
  <div class="fixed bottom-4 right-4 z-50 w-80 space-y-2">
    <div
      v-for="toast in store.toasts"
      :key="toast.id"
      :class="['flex items-start gap-2 rounded-lg border px-3 py-2 text-sm shadow-lg bg-slate-800', borderClass(toast.type)]"
    >
      <span class="shrink-0 leading-5">{{ icons[toast.type] }}</span>
      <div class="flex-1 min-w-0">
        <div class="text-slate-200 break-words">{{ toast.message }}</div>
        <button
          v-if="toast.action"
          @click="runAction(toast)"
          class="mt-1 text-xs font-bold text-cyan-400 hover:text-cyan-300"
        >{{ toast.action.label }}</button>
      </div>
      <button @click="store.dismissToast(toast.id)" class="shrink-0 text-slate-500 hover:text-slate-300 text-xs">✕</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRegexStore } from '../store/regex'
import type { Toast } from '../types'

const store = useRegexStore()

const icons: Record<Toast['type'], string> = {
  success: '✅',
  info: 'ℹ️',
  error: '⚠️'
}

function borderClass(type: Toast['type']) {
  if (type === 'success') return 'border-green-700'
  if (type === 'error') return 'border-red-700'
  return 'border-cyan-800'
}

function runAction(toast: Toast) {
  toast.action?.handler()
  store.dismissToast(toast.id)
}
</script>
