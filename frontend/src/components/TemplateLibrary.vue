<template>
  <div class="bg-slate-800 rounded-lg p-4 border border-slate-700">
    <h3 class="text-sm font-bold text-slate-400 mb-3">模板库 ({{ store.filteredTemplates.length }}/{{ templates.length }})</h3>

    <!-- 常用入口：全部 / 收藏 / 最近使用，数量与列表同源 -->
    <div class="flex gap-1 mb-2 text-xs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        @click="store.templateTab = tab.key"
        :class="['px-2 py-1 rounded border transition-colors',
          store.templateTab === tab.key
            ? 'bg-cyan-600 border-cyan-500 text-white font-bold'
            : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500']"
      >{{ tab.label }} {{ tabCounts[tab.key] }}</button>
    </div>

    <!-- 分类筛选，数量与当前入口的筛选结果保持一致 -->
    <div class="flex flex-wrap gap-1 mb-2 text-xs">
      <button
        @click="store.templateCategory = ''"
        :class="['px-1.5 py-0.5 rounded border transition-colors',
          store.templateCategory === ''
            ? 'bg-slate-600 border-slate-500 text-white'
            : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500']"
      >全部 {{ store.tabBaseTemplates.length }}</button>
      <button
        v-for="c in visibleCategories"
        :key="c"
        @click="store.templateCategory = c"
        :class="['px-1.5 py-0.5 rounded border transition-colors',
          store.templateCategory === c
            ? 'bg-slate-600 border-slate-500 text-white'
            : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500']"
      >{{ c }} {{ store.categoryCounts[c] || 0 }}</button>
    </div>

    <!-- 搜索 -->
    <div class="relative mb-3">
      <input
        v-model="store.templateSearch"
        placeholder="搜索模板..."
        class="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 pr-7 text-sm focus:outline-none focus:border-cyan-500"
      />
      <button
        v-if="store.templateSearch"
        @click="store.templateSearch = ''"
        title="清除搜索"
        class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
      >✕</button>
    </div>

    <!-- 当前选择被筛选隐藏时：保留选择并给出恢复入口 -->
    <div
      v-if="store.selectedTemplate && !store.selectedTemplateVisible"
      class="flex items-center justify-between gap-2 mb-2 px-2 py-1.5 rounded bg-cyan-900/30 border border-cyan-800 text-xs text-cyan-300"
    >
      <span class="truncate">已选「{{ store.selectedTemplate }}」不在当前筛选中</span>
      <button @click="store.clearTemplateFilters()" class="shrink-0 font-bold hover:text-cyan-100">清除筛选查看</button>
    </div>

    <!-- 模板列表 -->
    <div v-if="store.filteredTemplates.length" class="space-y-1 max-h-64 overflow-y-auto">
      <div
        v-for="t in store.filteredTemplates"
        :key="t.name"
        @click="store.applyTemplate(t)"
        :class="['cursor-pointer p-2 rounded-lg border transition-all', store.selectedTemplate === t.name ? 'border-cyan-500 bg-cyan-900/30' : 'border-slate-700 bg-slate-900 hover:border-slate-500']"
      >
        <div class="flex items-center justify-between">
          <span class="text-sm font-bold text-slate-200">{{ t.name }}</span>
          <div class="flex items-center gap-1.5">
            <button
              @click.stop="store.toggleFavorite(t)"
              :title="store.favorites.includes(t.name) ? '取消收藏' : '收藏'"
              :class="['text-sm leading-none transition-colors', store.favorites.includes(t.name) ? 'text-yellow-400 hover:text-yellow-300' : 'text-slate-600 hover:text-yellow-300']"
            >{{ store.favorites.includes(t.name) ? '★' : '☆' }}</button>
            <span class="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">{{ t.category }}</span>
          </div>
        </div>
        <div class="text-xs text-slate-500 mt-1">{{ t.description }}</div>
        <div class="text-xs font-mono text-cyan-500 mt-1 truncate">{{ t.pattern }}</div>
      </div>
    </div>

    <!-- 空态：保留当前选择，给出恢复方式 -->
    <div v-else class="py-6 text-center text-sm text-slate-500 space-y-3">
      <template v-if="store.templateSearch.trim()">
        <div>未找到与「{{ store.templateSearch.trim() }}」匹配的模板</div>
        <div class="flex justify-center gap-2 text-xs">
          <button @click="store.templateSearch = ''" class="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200">清除搜索</button>
          <button @click="store.clearTemplateFilters()" class="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200">重置全部筛选</button>
        </div>
      </template>
      <template v-else-if="store.templateTab === 'favorites' && !store.favorites.length">
        <div>还没有收藏模板</div>
        <div class="text-xs text-slate-600">点击模板卡片右上角的 ☆ 收藏常用模板</div>
        <div class="text-xs">
          <button @click="store.templateTab = 'all'" class="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200">浏览全部模板</button>
        </div>
      </template>
      <template v-else-if="store.templateTab === 'recent' && !store.recentUsed.length">
        <div>还没有使用记录</div>
        <div class="text-xs text-slate-600">点击任意模板即可套用并记录到最近使用</div>
        <div class="text-xs">
          <button @click="store.templateTab = 'all'" class="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200">浏览全部模板</button>
        </div>
      </template>
      <template v-else>
        <div>当前筛选条件下没有模板</div>
        <div class="text-xs">
          <button @click="store.clearTemplateFilters()" class="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200">重置全部筛选</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRegexStore, TEMPLATES } from '../store/regex'
import type { RegexTemplate, TemplateTab } from '../types'

const store = useRegexStore()
const templates: RegexTemplate[] = TEMPLATES

const tabs: { key: TemplateTab; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'favorites', label: '★ 收藏' },
  { key: 'recent', label: '🕒 最近' }
]

const tabCounts = computed<Record<TemplateTab, number>>(() => ({
  all: templates.length,
  favorites: store.favorites.length,
  recent: store.recentUsed.length
}))

// 只展示当前入口下确实有模板的分类；已选中的分类即使为 0 也保留，便于取消
const visibleCategories = computed(() =>
  store.templateCategories.filter(c => (store.categoryCounts[c] || 0) > 0 || store.templateCategory === c)
)
</script>
