import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { NFA, MatchResult, MatchStep, RegexTemplate, ASTNode, TemplateTab, Toast, ToastAction } from '../types'

const GROUP_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6']

const PREFS_STORAGE_KEY = 'regex-visual-debugger:template-prefs:v1'
const RECENT_LIMIT = 10

export const TEMPLATES: RegexTemplate[] = [
  { name: '邮箱地址', pattern: '^([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+)\\.([a-zA-Z]{2,})$', description: '匹配标准邮箱格式：用户名@域名.顶级域', testString: 'user@example.com admin@mail.org test.user+tag@sub.domain.co.uk', category: '常用' },
  { name: 'URL链接', pattern: '^(https?)://([^/:]+)(?::(\\d+))?(.*)$', description: '匹配HTTP/HTTPS URL：协议://主机:端口/路径', testString: 'https://www.example.com:8080/path/to/page http://localhost:3000/api', category: '常用' },
  { name: 'IPv4地址', pattern: '^(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})$', description: '匹配IPv4地址四段数字', testString: '192.168.1.1 10.0.0.1 255.255.255.0', category: '常用' },
  { name: '日期格式', pattern: '^(\\d{4})-(\\d{2})-(\\d{2})$', description: '匹配YYYY-MM-DD日期', testString: '2024-01-15 1999-12-31 2025-06-06', category: '常用' },
  { name: '手机号码', pattern: '^1[3-9]\\d{9}$', description: '匹配中国大陆手机号', testString: '13800138000 15912345678 18600000000', category: '常用' },
  { name: '身份证号', pattern: '^(\\d{6})(\\d{4})(\\d{2})(\\d{2})(\\d{3})([0-9Xx])$', description: '18位身份证：地区码+出生日期+顺序码+校验码', testString: '11010119900101001X 440304200512120039', category: '常用' },
  { name: '十六进制颜色', pattern: '^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$', description: '匹配#RGB或#RRGGBB格式', testString: '#FF5733 #abc #1A2B3C ff0000', category: '前端' },
  { name: '邮政编码', pattern: '^\\d{6}$', description: '6位中国邮编', testString: '100000 518000 200120', category: '常用' },
  { name: '浮点数', pattern: '^-?\\d+\\.\\d+$', description: '匹配带小数点的数字', testString: '3.14 -0.5 100.0', category: '数字' },
  { name: '科学计数法', pattern: '^-?\\d+(\\.\\d+)?[eE][+-]?\\d+$', description: '匹配科学计数法数字', testString: '1.5e10 -2.3E-4 6.022e23', category: '数字' },
  { name: 'MAC地址', pattern: '^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$', description: '匹配MAC地址XX:XX:XX:XX:XX:XX', testString: '00:1A:2B:3C:4D:5E AA-BB-CC-DD-EE-FF', category: '网络' },
  { name: 'UUID', pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', description: '标准UUID格式', testString: '550e8400-e29b-41d4-a716-446655440000', category: '网络' },
  { name: 'QQ号', pattern: '^[1-9]\\d{4,10}$', description: '5-11位QQ号', testString: '12345 10000 1234567890', category: '常用' },
  { name: '密码强度', pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$', description: '至少8位含大小写字母数字特殊字符', testString: 'Passw0rd! Str0ng@Pass', category: '安全' },
  { name: '中文姓名', pattern: '^[\\u4e00-\\u9fa5]{2,4}$', description: '2-4位中文字符', testString: '张三 李世明 王小明', category: '常用' },
  { name: '车牌号', pattern: '^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤川青藏琼宁][A-Z][A-HJ-NP-Z0-9]{5}$', description: '中国车牌格式', testString: '京A12345 沪B6789X', category: '常用' },
  { name: 'HTML标签', pattern: '<(\\w+)(\\s[^>]*)?>(.*?)</\\1>', description: '匹配HTML开闭标签对', testString: '<div class="x">content</div> <span>text</span>', category: '前端' },
  { name: '文件扩展名', pattern: '^.+\\.(\\w+)$', description: '提取文件扩展名', testString: 'image.png doc.pdf index.html', category: '前端' },
  { name: '经纬度', pattern: '^(\\-?\\d{1,3}\\.\\d+)\\s*,\\s*(\\-?\\d{1,3}\\.\\d+)$', description: '匹配经纬度坐标', testString: '116.404,39.915 -73.9857,40.7484', category: '地理' },
  { name: '版本号', pattern: '^(\\d+)\\.(\\d+)\\.(\\d+)(?:-(\\w+))?$', description: '语义化版本号x.y.z-tag', testString: '1.0.0 2.3.1-beta 10.20.30', category: '常用' },
  { name: '时间格式', pattern: '^([01]?\\d|2[0-3]):([0-5]\\d)(?::([0-5]\\d))?$', description: 'HH:MM或HH:MM:SS', testString: '14:30 23:59:59 00:00', category: '常用' }
]

// 冻结模板数据：套用后用户手动修改的是编辑器里的副本，模板原内容不可被改坏
Object.freeze(TEMPLATES)
TEMPLATES.forEach(t => Object.freeze(t))

interface StateNode {
  id: number
  isAccept: boolean
  transitions: Map<string, number[]>
  epsilonTransitions: number[]
}

function buildNFA(pattern: string): { states: StateNode[]; startState: number; acceptStates: number[] } {
  const states: StateNode[] = []
  let stateCounter = 0
  let pos = 0
  let groupCount = 0

  function newState(): number {
    const id = stateCounter++
    states.push({ id, isAccept: false, transitions: new Map(), epsilonTransitions: [] })
    return id
  }

  function addTransition(from: number, symbol: string, to: number) {
    if (!states[from].transitions.has(symbol)) {
      states[from].transitions.set(symbol, [])
    }
    states[from].transitions.get(symbol)!.push(to)
  }

  function addEpsilon(from: number, to: number) {
    states[from].epsilonTransitions.push(to)
  }

  function parseCharClass(): (ch: string) => boolean {
    const negative = pattern[pos] === '^'
    if (negative) pos++
    const ranges: [string, string][] = []
    const chars: string[] = []
    while (pos < pattern.length && pattern[pos] !== ']') {
      if (pattern[pos + 1] === '-' && pattern[pos + 2] && pattern[pos + 2] !== ']') {
        ranges.push([pattern[pos], pattern[pos + 2]])
        pos += 3
      } else {
        chars.push(pattern[pos])
        pos++
      }
    }
    pos++ // skip ]
    return (ch: string) => {
      if (negative) {
        return !chars.includes(ch) && !ranges.some(([s, e]) => ch >= s && ch <= e)
      }
      return chars.includes(ch) || ranges.some(([s, e]) => ch >= s && ch <= e)
    }
  }

  function parseConcat(): [number, number] {
    let start = newState()
    let end = start
    while (pos < pattern.length && !['|', ')'].includes(pattern[pos])) {
      let segStart: number, segEnd: number
      const ch = pattern[pos]
      if (ch === '(') {
        pos++
        groupCount++
        if (pattern[pos] === '?') {
          pos++
          if (pattern[pos] === ':') { pos++; }
          const [s, e] = parseOr()
          segStart = s; segEnd = e
        } else {
          const [s, e] = parseOr()
          segStart = s; segEnd = e
        }
        pos++ // skip )
      } else if (ch === '[') {
        pos++
        segStart = newState()
        segEnd = newState()
        const matcher = parseCharClass()
        addTransition(segStart, '__class_' + segStart, segEnd)
        ;(states[segEnd] as any)._matcher = matcher
      } else if (ch === '.') {
        segStart = newState()
        segEnd = newState()
        addTransition(segStart, '__dot', segEnd)
        pos++
      } else if (ch === '\\') {
        pos++
        const escaped = pattern[pos]
        segStart = newState()
        segEnd = newState()
        if (escaped === 'd') addTransition(segStart, '__digit', segEnd)
        else if (escaped === 'w') addTransition(segStart, '__word', segEnd)
        else if (escaped === 's') addTransition(segStart, '__space', segEnd)
        else addTransition(segStart, escaped, segEnd)
        pos++
      } else if (ch === '^' || ch === '$') {
        segStart = newState()
        segEnd = segStart
        pos++
      } else {
        segStart = newState()
        segEnd = newState()
        addTransition(segStart, ch, segEnd)
        pos++
      }

      // Handle quantifiers
      while (pos < pattern.length && ['*', '+', '?', '{'].includes(pattern[pos])) {
        const q = pattern[pos]
        if (q === '{') {
          while (pos < pattern.length && pattern[pos] !== '}') pos++
          pos++
        } else {
          pos++
        }
        const qStart = newState()
        const qEnd = newState()
        addEpsilon(qStart, segStart)
        if (q === '*') { addEpsilon(qStart, qEnd); addEpsilon(segEnd, qEnd); addEpsilon(segEnd, segStart) }
        else if (q === '+') { addEpsilon(segEnd, qEnd); addEpsilon(segEnd, segStart) }
        else if (q === '?') { addEpsilon(qStart, qEnd); addEpsilon(segEnd, qEnd) }
        segStart = qStart; segEnd = qEnd
        if (pos < pattern.length && pattern[pos] === '?') pos++ // lazy
      }

      if (end !== segStart) addEpsilon(end, segStart)
      end = segEnd
    }
    return [start, end]
  }

  function parseOr(): [number, number] {
    const [s1, e1] = parseConcat()
    let start = s1, end = e1
    while (pos < pattern.length && pattern[pos] === '|') {
      pos++
      const [s2, e2] = parseConcat()
      const ns = newState(), ne = newState()
      addEpsilon(ns, start); addEpsilon(ns, s2)
      addEpsilon(end, ne); addEpsilon(e2, ne)
      start = ns; end = ne
    }
    return [start, end]
  }

  const [startState, acceptState] = parseOr()
  states[acceptState].isAccept = true
  return { states, startState, acceptStates: [acceptState] }
}

function epsilonClosure(states: StateNode[], stateId: number): Set<number> {
  const closure = new Set<number>([stateId])
  const stack = [stateId]
  while (stack.length) {
    const s = stack.pop()!
    for (const next of states[s].epsilonTransitions) {
      if (!closure.has(next)) {
        closure.add(next)
        stack.push(next)
      }
    }
  }
  return closure
}

function matchTransition(state: StateNode, symbol: string): number[] {
  const results: number[] = []
  for (const [sym, targets] of state.transitions) {
    if (sym === symbol) { results.push(...targets); continue }
    if (sym === '__dot' && symbol !== '\n') { results.push(...targets); continue }
    if (sym === '__digit' && /\d/.test(symbol)) { results.push(...targets); continue }
    if (sym === '__word' && /\w/.test(symbol)) { results.push(...targets); continue }
    if (sym === '__space' && /\s/.test(symbol)) { results.push(...targets); continue }
    if (sym.startsWith('__class_')) {
      const matcher = (state as any)._matcher
      if (matcher && matcher(symbol)) results.push(...targets)
    }
  }
  return results
}

function runMatch(states: StateNode[], startState: number, input: string): MatchResult {
  const steps: MatchStep[] = []
  let backtracks = 0
  let stepIndex = 0
  const startTime = performance.now()

  // Try to match from each position
  for (let startPos = 0; startPos <= input.length; startPos++) {
    let currentStates = Array.from(epsilonClosure(states, startState))
    let matched = false
    let matchEnd = startPos

    for (let i = startPos; i < input.length; i++) {
      const char = input[i]
      const nextStates: number[] = []
      const seen = new Set<number>()

      for (const s of currentStates) {
        const targets = matchTransition(states[s], char)
        for (const t of targets) {
          const closure = epsilonClosure(states, t)
          for (const c of closure) {
            if (!seen.has(c)) {
              seen.add(c)
              nextStates.push(c)
              steps.push({
                stepIndex: stepIndex++,
                charIndex: i,
                char,
                currentState: s,
                nextState: c,
                transition: char,
                isBacktrack: false,
                isMatch: true
              })
            }
          }
        }
      }

      if (nextStates.length === 0) {
        if (currentStates.some(s => states[s].isAccept)) { matched = true; matchEnd = i; break }
        backtracks++
        steps.push({
          stepIndex: stepIndex++,
          charIndex: i,
          char,
          currentState: currentStates[0] || -1,
          nextState: -1,
          transition: 'FAIL',
          isBacktrack: true,
          isMatch: false
        })
        break
      }
      currentStates = nextStates
      if (currentStates.some(s => states[s].isAccept)) { matched = true; matchEnd = i + 1 }
    }

    if (matched || (startPos === input.length && currentStates.some(s => states[s].isAccept))) {
      const matchText = input.substring(startPos, matchEnd)
      const duration = performance.now() - startTime
      return {
        matched: true,
        matchText,
        groups: [matchText],
        steps,
        backtracks,
        totalSteps: stepIndex,
        duration: Math.round(duration * 100) / 100
      }
    }
  }

  const duration = performance.now() - startTime
  return { matched: false, matchText: '', groups: [], steps, backtracks, totalSteps: stepIndex, duration: Math.round(duration * 100) / 100 }
}

export function computeNFA(nfaResult: ReturnType<typeof buildNFA>): NFA {
  const nodes = nfaResult.states.map((s, i) => ({
    id: s.id,
    isStart: i === nfaResult.startState,
    isAccept: nfaResult.acceptStates.includes(s.id),
    x: 0, y: 0
  }))

  // Layout: circular
  const cx = 400, cy = 300, radius = 200
  nodes.forEach((n, i) => {
    const angle = (i / nodes.length) * Math.PI * 2
    n.x = cx + Math.cos(angle) * radius
    n.y = cy + Math.sin(angle) * radius
  })

  const transitions: any[] = []
  nfaResult.states.forEach(s => {
    s.transitions.forEach((targets, symbol) => {
      targets.forEach(t => {
        transitions.push({ from: s.id, to: t, symbol: symbol.startsWith('__') ? symbol.replace('__', '') : symbol, label: symbol.startsWith('__') ? symbol.replace('__', '') : symbol })
      })
    })
    s.epsilonTransitions.forEach(t => {
      transitions.push({ from: s.id, to: t, symbol: null, label: 'ε' })
    })
  })

  return { states: nodes, transitions, startState: nfaResult.startState, acceptStates: nfaResult.acceptStates }
}

export function parseAST(pattern: string): ASTNode {
  let pos = 0
  let groupIdx = 0

  function parseAtom(): ASTNode {
    const ch = pattern[pos]
    if (ch === '(') {
      pos++
      if (pattern[pos] === '?') { pos++; if (pattern[pos] === ':') pos++ }
      else groupIdx++
      const node = parseOr()
      if (pattern[pos] === ')') pos++
      return { type: 'group', children: [node], groupIndex: groupIdx }
    }
    if (ch === '[') {
      pos++
      let cls = ''
      while (pos < pattern.length && pattern[pos] !== ']') { cls += pattern[pos]; pos++ }
      pos++
      return { type: 'charclass', value: cls }
    }
    if (ch === '.') { pos++; return { type: 'dot' } }
    if (ch === '\\') {
      pos++
      const e = pattern[pos]; pos++
      if (e === 'd') return { type: 'digit' }
      if (e === 'w') return { type: 'word' }
      if (e === 's') return { type: 'space' }
      return { type: 'char', value: e }
    }
    if (ch === '^' || ch === '$') { pos++; return { type: 'anchor', value: ch } }
    pos++
    return { type: 'char', value: ch }
  }

  function parseQuantifier(): ASTNode {
    let node = parseAtom()
    while (pos < pattern.length && ['*', '+', '?', '{'].includes(pattern[pos])) {
      const q = pattern[pos]
      if (q === '{') {
        while (pos < pattern.length && pattern[pos] !== '}') pos++
        pos++
      } else {
        pos++
      }
      const type = q === '*' ? 'star' : q === '+' ? 'plus' : 'question'
      node = { type, children: [node] }
      if (pos < pattern.length && pattern[pos] === '?') pos++
    }
    return node
  }

  function parseConcat(): ASTNode {
    const nodes: ASTNode[] = []
    while (pos < pattern.length && !['|', ')'].includes(pattern[pos])) {
      nodes.push(parseQuantifier())
    }
    if (nodes.length === 1) return nodes[0]
    return { type: 'concat', children: nodes }
  }

  function parseOr(): ASTNode {
    let left = parseConcat()
    while (pos < pattern.length && pattern[pos] === '|') {
      pos++
      const right = parseConcat()
      left = { type: 'or', children: [left, right] }
    }
    return left
  }

  return parseOr()
}

export const useRegexStore = defineStore('regex', () => {
  const pattern = ref('^([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+)\\.([a-zA-Z]{2,})$')
  const testString = ref('user@example.com admin@mail.org invalid-email')
  const currentStep = ref(0)
  const isPlaying = ref(false)
  const nfa = ref<NFA | null>(null)
  const matchResult = ref<MatchResult | null>(null)
  const ast = ref<ASTNode | null>(null)
  const error = ref('')
  const selectedTemplate = ref<string>('')

  // ---- 模板收藏 / 最近使用 / 筛选 ----
  const favorites = ref<string[]>([])
  const recentUsed = ref<string[]>([])
  const templateSearch = ref('')
  const templateTab = ref<TemplateTab>('all')
  const templateCategory = ref('')
  const toasts = ref<Toast[]>([])
  let toastSeq = 0
  let storageErrorToastId: number | null = null

  const groupColors = GROUP_COLORS

  const matchHighlight = computed(() => {
    if (!matchResult.value || !matchResult.value.matched) return null
    const matchText = matchResult.value.matchText
    const idx = testString.value.indexOf(matchText)
    if (idx === -1) return null
    return {
      before: testString.value.substring(0, idx),
      match: matchText,
      after: testString.value.substring(idx + matchText.length)
    }
  })

  function dismissToast(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  function notify(type: Toast['type'], message: string, action?: ToastAction, persistent = false): number {
    const id = ++toastSeq
    toasts.value.push({ id, type, message, action, persistent })
    if (!persistent) setTimeout(() => dismissToast(id), 4000)
    return id
  }

  // 本地保存失败时保留内存中的状态，并给出可重试的恢复入口
  function persistTemplatePrefs(): boolean {
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify({ favorites: favorites.value, recent: recentUsed.value }))
    } catch {
      if (storageErrorToastId === null) {
        storageErrorToastId = notify('error', '本地保存失败：本次收藏/最近使用变更可能在刷新后丢失', { label: '重试', handler: () => persistTemplatePrefs() }, true)
      }
      return false
    }
    if (storageErrorToastId !== null) {
      dismissToast(storageErrorToastId)
      storageErrorToastId = null
      notify('success', '本地保存已恢复')
    }
    return true
  }

  function loadTemplatePrefs() {
    try {
      const raw = localStorage.getItem(PREFS_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      const validNames = new Set(TEMPLATES.map(t => t.name))
      const pickValid = (list: unknown): string[] =>
        Array.isArray(list) ? [...new Set(list.filter((n): n is string => typeof n === 'string'))].filter(n => validNames.has(n)) : []
      favorites.value = pickValid(parsed?.favorites)
      recentUsed.value = pickValid(parsed?.recent).slice(0, RECENT_LIMIT)
    } catch {
      notify('error', '本地收藏数据读取失败，已重置为空', { label: '重试', handler: () => loadTemplatePrefs() }, true)
    }
  }

  function addFavorite(t: RegexTemplate): boolean {
    if (favorites.value.includes(t.name)) {
      // 重复收藏：不改变任何状态，给出定位到收藏入口的恢复方式
      notify('info', `「${t.name}」已在收藏中，无需重复收藏`, { label: '查看收藏', handler: () => { templateTab.value = 'favorites' } })
      return false
    }
    favorites.value = [...favorites.value, t.name]
    persistTemplatePrefs()
    notify('success', `已收藏「${t.name}」`, { label: '查看收藏', handler: () => { templateTab.value = 'favorites' } })
    return true
  }

  function removeFavorite(t: RegexTemplate) {
    if (!favorites.value.includes(t.name)) return
    favorites.value = favorites.value.filter(n => n !== t.name)
    persistTemplatePrefs()
    notify('info', `已取消收藏「${t.name}」`, { label: '撤销', handler: () => addFavorite(t) })
  }

  function toggleFavorite(t: RegexTemplate) {
    if (favorites.value.includes(t.name)) removeFavorite(t)
    else addFavorite(t)
  }

  function clearTemplateFilters() {
    templateSearch.value = ''
    templateCategory.value = ''
    templateTab.value = 'all'
  }

  const templateCategories = computed(() => {
    const cats: string[] = []
    for (const t of TEMPLATES) if (!cats.includes(t.category)) cats.push(t.category)
    return cats
  })

  // 当前标签页（全部/收藏/最近）下的基础列表，分类与搜索在其上叠加
  const tabBaseTemplates = computed<RegexTemplate[]>(() => {
    if (templateTab.value === 'favorites') return TEMPLATES.filter(t => favorites.value.includes(t.name))
    if (templateTab.value === 'recent') {
      return recentUsed.value.map(n => TEMPLATES.find(t => t.name === n)).filter((t): t is RegexTemplate => !!t)
    }
    return TEMPLATES
  })

  const filteredTemplates = computed<RegexTemplate[]>(() => {
    let list = tabBaseTemplates.value
    if (templateCategory.value) list = list.filter(t => t.category === templateCategory.value)
    const q = templateSearch.value.trim().toLowerCase()
    if (q) {
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.pattern.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      )
    }
    return list
  })

  // 分类数量与当前标签页的基础列表同源，保证计数与筛选结果一致
  const categoryCounts = computed(() => {
    const counts: Record<string, number> = {}
    for (const t of tabBaseTemplates.value) counts[t.category] = (counts[t.category] || 0) + 1
    return counts
  })

  const selectedTemplateVisible = computed(() =>
    !!selectedTemplate.value && filteredTemplates.value.some(t => t.name === selectedTemplate.value)
  )

  loadTemplatePrefs()

  function execute() {
    error.value = ''
    try {
      const built = buildNFA(pattern.value)
      nfa.value = computeNFA(built)
      matchResult.value = runMatch(built.states, built.startState, testString.value)
      ast.value = parseAST(pattern.value)
      currentStep.value = 0
    } catch (e: any) {
      error.value = e.message || '正则表达式解析错误'
      nfa.value = null
      matchResult.value = null
      ast.value = null
    }
  }

  function setPattern(p: string) {
    pattern.value = p
    execute()
  }

  function setTestString(s: string) {
    testString.value = s
    execute()
  }

  function applyTemplate(t: RegexTemplate) {
    // 只读取模板字段拷贝到编辑器状态，模板原对象保持冻结不变
    pattern.value = t.pattern
    testString.value = t.testString
    selectedTemplate.value = t.name
    recentUsed.value = [t.name, ...recentUsed.value.filter(n => n !== t.name)].slice(0, RECENT_LIMIT)
    persistTemplatePrefs()
    execute()
  }

  function stepForward() {
    if (matchResult.value && currentStep.value < matchResult.value.steps.length - 1) {
      currentStep.value++
    }
  }

  function stepBackward() {
    if (currentStep.value > 0) currentStep.value--
  }

  function resetStep() {
    currentStep.value = 0
  }

  function play() {
    isPlaying.value = true
    const interval = setInterval(() => {
      if (matchResult.value && currentStep.value < matchResult.value.steps.length - 1) {
        currentStep.value++
      } else {
        isPlaying.value = false
        clearInterval(interval)
      }
    }, 200)
  }

  function stop() {
    isPlaying.value = false
  }

  return {
    pattern, testString, currentStep, isPlaying, nfa, matchResult, ast, error,
    selectedTemplate, groupColors, matchHighlight,
    favorites, recentUsed, templateSearch, templateTab, templateCategory, toasts,
    templateCategories, tabBaseTemplates, filteredTemplates, categoryCounts, selectedTemplateVisible,
    execute, setPattern, setTestString, applyTemplate,
    toggleFavorite, addFavorite, removeFavorite, clearTemplateFilters,
    dismissToast, persistTemplatePrefs,
    stepForward, stepBackward, resetStep, play, stop
  }
})
