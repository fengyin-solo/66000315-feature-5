<template>
  <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
    <h3 class="text-sm font-bold text-slate-400 mb-3">模板库 ({{ templates.length }})</h3>

    <!-- 搜索 -->
    <div class="relative mb-2">
      <input v-model="search" placeholder="搜索模板..." class="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 pr-7 text-sm focus:outline-none focus:border-cyan-500" />
      <button v-if="search" @click="search = ''" title="清除搜索"
        class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-sm">×</button>
    </div>

    <!-- 常用入口：全部 / 收藏 / 最近使用（数量随搜索保持一致） -->
    <div class="flex gap-1 mb-2 text-xs">
      <button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key"
        :class="['flex-1 px-2 py-1 rounded border transition-all', activeTab === tab.key ? 'border-cyan-500 bg-cyan-900/30 text-cyan-300' : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500']">
        {{ tab.label }} ({{ tab.count }})
      </button>
    </div>

    <!-- 分类筛选：数量与当前筛选结果保持一致 -->
    <div v-if="categoryChips.length" class="flex flex-wrap gap-1 mb-2 text-xs">
      <button v-for="c in categoryChips" :key="c.name" @click="toggleCategory(c.name)"
        :class="['px-2 py-0.5 rounded border transition-all', activeCategory === c.name ? 'border-cyan-500 bg-cyan-900/30 text-cyan-300' : 'border-slate-700 bg-slate-900 text-slate-500 hover:border-slate-500']">
        {{ c.name }} {{ c.count }}
      </button>
    </div>
    <div class="text-xs text-slate-600 mb-2">显示 {{ visible.length }} / {{ templates.length }} 个模板</div>

    <!-- 操作反馈通知 -->
    <div v-if="store.notice" class="mb-2 text-xs px-2 py-1.5 rounded border border-cyan-700 bg-cyan-900/30 text-cyan-300">{{ store.notice }}</div>

    <!-- 本地保存失败：保留内存状态并给出恢复方式 -->
    <div v-if="store.storageError" class="mb-2 text-xs px-2 py-1.5 rounded border border-red-700 bg-red-900/30 text-red-300 flex items-center justify-between gap-2">
      <span>本地保存失败，收藏与最近使用仅在本次会话有效</span>
      <button @click="store.retryPersist()" class="shrink-0 underline hover:text-red-200">重试保存</button>
    </div>

    <!-- 模板列表 -->
    <div v-if="visible.length" class="space-y-1 max-h-64 overflow-y-auto">
      <div v-for="t in visible" :key="t.name"
        @click="store.applyTemplate(t)"
        :class="['cursor-pointer p-2 rounded-lg border transition-all', store.selectedTemplate === t.name ? 'border-cyan-500 bg-cyan-900/30' : 'border-slate-700 bg-slate-900 hover:border-slate-500']">
        <div class="flex items-center justify-between">
          <span class="text-sm font-bold text-slate-200">{{ t.name }}</span>
          <div class="flex items-center gap-1.5">
            <span class="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">{{ t.category }}</span>
            <button @click.stop="store.toggleFavorite(t.name)"
              :title="store.isFavorite(t.name) ? '取消收藏' : '收藏'"
              :class="['text-base leading-none transition-colors', store.isFavorite(t.name) ? 'text-yellow-400 hover:text-slate-400' : 'text-slate-600 hover:text-yellow-400']">
              {{ store.isFavorite(t.name) ? '★' : '☆' }}
            </button>
          </div>
        </div>
        <div class="text-xs text-slate-500 mt-1">{{ t.description }}</div>
        <div class="text-xs font-mono text-cyan-500 mt-1 truncate">{{ t.pattern }}</div>
      </div>
    </div>

    <!-- 空态：保留当前选择，并给出恢复方式 -->
    <div v-else class="p-3 rounded-lg border border-dashed border-slate-700 text-xs text-slate-500 text-center">
      <div>{{ emptyMessage }}</div>
      <div v-if="store.selectedTemplate" class="mt-1 text-slate-600">当前已选「{{ store.selectedTemplate }}」不受影响</div>
      <button @click="resetFilters" class="mt-2 px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300">清除筛选</button>
    </div>

    <!-- 当前选择状态：筛选/搜索后选择仍保留；手动修改不污染模板原件，可一键恢复 -->
    <div v-if="store.selectedTemplate" class="mt-2 text-xs text-slate-500 space-y-1">
      <div class="flex items-center flex-wrap gap-x-1">
        <span>当前已选：<span class="text-cyan-400">{{ store.selectedTemplate }}</span></span>
        <template v-if="store.isTemplateModified">
          <span class="text-orange-400">（已修改，模板原件未受影响）</span>
          <button @click="store.restoreTemplate()" class="underline text-cyan-500 hover:text-cyan-300">恢复模板</button>
        </template>
      </div>
      <div v-if="selectionHidden" class="flex items-center gap-1">
        <span class="text-slate-600">不在当前筛选结果中</span>
        <button @click="resetFilters" class="underline text-cyan-500 hover:text-cyan-300">清除筛选查看</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRegexStore, TEMPLATES } from '../store/regex'
import type { RegexTemplate } from '../types'

const store = useRegexStore()
const templates = TEMPLATES
const search = ref('')
const activeTab = ref<'all' | 'fav' | 'recent'>('all')
const activeCategory = ref('')

// 第一层：搜索过滤
const queryFiltered = computed<readonly RegexTemplate[]>(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return templates
  return templates.filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.pattern.toLowerCase().includes(q))
})

// 第二层：入口过滤（最近使用保持时间倒序）
const tabFiltered = computed<readonly RegexTemplate[]>(() => {
  if (activeTab.value === 'fav') {
    return queryFiltered.value.filter(t => store.favorites.includes(t.name))
  }
  if (activeTab.value === 'recent') {
    const qf = queryFiltered.value
    return store.recentTemplates
      .map(n => qf.find(t => t.name === n))
      .filter((t): t is RegexTemplate => Boolean(t))
  }
  return queryFiltered.value
})

// 第三层：分类过滤
const visible = computed<readonly RegexTemplate[]>(() => {
  if (!activeCategory.value) return tabFiltered.value
  return tabFiltered.value.filter(t => t.category === activeCategory.value)
})

// 入口数量与搜索结果保持一致
const tabs = computed(() => [
  { key: 'all' as const, label: '全部', count: queryFiltered.value.length },
  { key: 'fav' as const, label: '★ 收藏', count: queryFiltered.value.filter(t => store.favorites.includes(t.name)).length },
  { key: 'recent' as const, label: '🕘 最近', count: queryFiltered.value.filter(t => store.recentTemplates.includes(t.name)).length }
])

// 分类数量与当前入口筛选结果保持一致
const categoryChips = computed(() => {
  const counts = new Map<string, number>()
  for (const t of tabFiltered.value) counts.set(t.category, (counts.get(t.category) ?? 0) + 1)
  return [...counts.entries()].map(([name, count]) => ({ name, count }))
})

const emptyMessage = computed(() => {
  const q = search.value.trim()
  if (q) return `未找到与「${q}」匹配的模板`
  if (activeCategory.value && tabFiltered.value.length > 0) return `当前筛选下没有「${activeCategory.value}」分类的模板`
  if (activeTab.value === 'fav') return '还没有收藏模板，点击模板右侧 ☆ 收藏常用模板'
  if (activeTab.value === 'recent') return '暂无最近使用，点击任意模板即可套用'
  if (activeCategory.value) return `「${activeCategory.value}」分类下暂无模板`
  return '暂无模板'
})

// 当前选择被筛选条件隐藏时提示，选择本身始终保留
const selectionHidden = computed(() =>
  Boolean(store.selectedTemplate) && !visible.value.some(t => t.name === store.selectedTemplate)
)

function toggleCategory(name: string) {
  activeCategory.value = activeCategory.value === name ? '' : name
}

function resetFilters() {
  search.value = ''
  activeCategory.value = ''
  activeTab.value = 'all'
}
</script>
