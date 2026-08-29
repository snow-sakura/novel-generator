/**
 * 共享常量和工具函数 — 消除跨文件重复
 */

// ─── LABEL_MAP：大纲层级中文标签映射（~140 条）───
export const LABEL_MAP: Record<string, string> = {
  strategy: '战略层', characters: '人物层', world: '世界观层',
  plot_structure: '结构层', rhythm: '节奏层', style_tone: '风格层',
  chapters: '章节细纲', core_idea: '核心立意', theme: '思想主题',
  ending: '结局预判', protagonist: '主角', supporting: '配角',
  antagonist: '反派', relationships: '人物关系', time_space: '时空背景',
  rules: '规则体系', factions: '势力格局', three_acts: '三幕式',
  beat_sheet: '节拍表', golden_three: '黄金三章',
  satisfaction_points: '爽点布局', emotional_peaks: '泪点/痛点',
  pace_curve: '节奏曲线', perspective: '叙事视角',
  language: '语言风格', atmosphere: '氛围基调',
  high_concept: '高概念设定', unique_selling_point: '独特卖点',
  core_question: '核心问题', values: '价值观',
  type: '结局类型', final_scene: '最终场景',
  desire: '核心欲望', flaw: '核心缺陷', traits: '性格特质',
  arc: '成长弧线', motive: '动机', threat: '压迫感',
  value_opposition: '价值对立', era: '时代', locations: '场景',
  world_rules: '世界规则', power_system: '力量体系',
  social_structure: '社会结构', act1: '第一幕·建置',
  act2: '第二幕·对抗', act3: '第三幕·结局',
  hook: '钩子', function: '功能定位', summary: '概要',
  cliffhanger: '悬念', word_count_estimate: '字数预估',
  description: '描述', alignment: '立场', role: '作用',
  name: '姓名', age: '年龄', identity: '身份',
  tone: '故事基调', initial_state: '初始状态',
  love_interest: '情感线', conflict_point: '冲突点',
  core_conflict_source: '核心冲突根源', devices: '设定与伏笔',
  power_rules: '力量规则', key_items: '核心道具',
  foreshadowing: '伏笔清单', item: '伏笔内容',
  planned_reveal: '揭示时机', scenes: '场景列表',
  time_era: '时代背景', conflict_type: '冲突类型',
  inciting_incident: '激励事件', development: '发展方向',
  resolution_tendency: '结局倾向', world_tone: '世界观基调',
  beat: '节拍', chapter: '章节', content: '内容',
  narrative_style: '叙事风格',
  relationship: '关系', goal: '目标', background: '背景',
  conflict: '冲突', state: '状态', appearance: '外貌',
  ability: '能力', personality: '性格', speciality: '特长',
  weakness: '弱点', climax: '高潮', turning_point: '转折点',
  event: '事件', significance: '意义', growth: '成长',
  transformation: '蜕变', overview: '概览', style: '风格',
  setting: '设定', element: '元素', structure: '结构',
  character: '角色', story: '故事', worldview: '世界观',
  plot: '情节', intro: '简介', introduction: '简介',
  detail: '细节', info: '信息', status: '状态',
  position: '立场', emotion: '情感', relation: '关系',
  role_type: '角色类型', importance: '重要性',
  character_growth: '角色成长', character_arc: '角色弧线',
  chapter_range: '章节范围',
}

// ─── flattenDict：将嵌套对象扁平化为行列表 ───
function addItemRows(
  item: Record<string, unknown>,
  label: string,
  idx: number,
  rows: Array<{ key: string; val: string | string[]; isItemHeader?: boolean; indent?: number }>
) {
  const itemName = (item.name || item.姓名 || `${label} ${idx + 1}`) as string
  rows.push({ key: itemName, val: '', isItemHeader: true })
  for (const [sk, sv] of Object.entries(item)) {
    if (sk === 'name' || sk === '姓名') continue
    if (sv === null || sv === undefined) continue
    const s = String(sv).trim()
    if (!s) continue
    const sl = LABEL_MAP[sk] || sk
    rows.push({ key: sl, val: s.replace(/^#+\s*/gm, '').trim(), indent: 1 })
  }
}

export function flattenDict(
  obj: Record<string, unknown>,
  depth = 0,
  maxDepth = 4
): Array<{ key: string; val: string | string[]; isSection?: boolean; isArray?: boolean; isItemHeader?: boolean; indent?: number }> {
  if (depth > maxDepth) return []
  const rows: Array<{ key: string; val: string | string[]; isSection?: boolean; isArray?: boolean; isItemHeader?: boolean; indent?: number }> = []
  const seenKeys = new Set<string>()
  for (const [k, v] of Object.entries(obj)) {
    if (/^\d+$/.test(k) && (typeof v !== 'object' || v === null)) continue
    const label = LABEL_MAP[k] || k
    if (v === null || v === undefined) continue
    if (seenKeys.has(label)) continue
    seenKeys.add(label)
    if (typeof v === 'string') {
      if (v.trim()) rows.push({ key: label, val: v.replace(/^#+\s*/gm, '').trim() })
    } else if (typeof v === 'number') {
      rows.push({ key: label, val: String(v) })
    } else if (Array.isArray(v)) {
      if (v.length > 0) {
        if (typeof v[0] === 'object' && v[0] !== null) {
          if (label !== (v[0] as Record<string, unknown>).name) {
            rows.push({ key: label, val: '', isSection: true })
          }
          v.slice(0, 6).forEach((item: unknown, idx: number) => {
            if (typeof item === 'object' && item !== null) {
              addItemRows(item as Record<string, unknown>, label, idx, rows)
            }
          })
          if (v.length > 6) rows.push({ key: '', val: `+${v.length - 6} 项` })
        } else {
          const items = v.slice(0, 6).map((item: unknown) => {
            if (typeof item === 'string') return item.replace(/^#+\s*/gm, '').trim()
            if (typeof item === 'object' && item !== null) {
              return Object.entries(item as Record<string, unknown>)
                .map(([sk, sv]) => `${LABEL_MAP[sk] || sk}: ${String(sv).replace(/^#+\s*/gm, '').trim()}`)
                .join(' | ')
            }
            return String(item)
          })
          rows.push({ key: label, val: items, isArray: true })
          if (v.length > 6) rows.push({ key: '', val: `+${v.length - 6} 项` })
        }
      }
    } else if (typeof v === 'object') {
      const vKeys = Object.keys(v as Record<string, unknown>)
      if (vKeys.length > 0 && vKeys.every(kk => /^\d+$/.test(kk))) {
        rows.push({ key: label, val: '', isSection: true })
        vKeys.sort((a, b) => Number(a) - Number(b)).slice(0, 6).forEach((itemKey, idx) => {
          const item = (v as Record<string, unknown>)[itemKey]
          if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
            addItemRows(item as Record<string, unknown>, label, idx, rows)
          } else if (typeof item === 'string' && item.trim()) {
            rows.push({ key: `${idx + 1}`, val: item.replace(/^#+\s*/gm, '').trim(), isItemHeader: true })
          }
        })
        if (vKeys.length > 6) rows.push({ key: '', val: `+${vKeys.length - 6} 项` })
      } else {
        const childRows = flattenDict(v as Record<string, unknown>, depth + 1, maxDepth)
        if (childRows.length > 0) {
          rows.push({ key: label, val: '', isSection: true })
          rows.push(...childRows)
        }
      }
    }
  }
  return rows
}

// ─── Demo 数据常量（前端 + demo 模式共用）───
export const DEMO_GENRES_MALE = [
  '都市脑洞', '都市生活', '都市修真', '异术超能', '灵气复苏',
  '末世危机', '科幻星际', '时空穿梭', '历史古代', '军事战争',
  '奇幻仙侠', '武侠江湖', '游戏体育', '悬疑灵异', '轻小说',
  '诸天无限', '影视综漫', '玄幻奇幻', '武斗江湖',
]

export const DEMO_GENRES_FEMALE = [
  '古代言情', '现代言情', '浪漫青春', '幻想言情', '仙侠奇缘',
  '悬疑言情', '百合小说', 'GL 轻小说', '短篇小说', '现代婚宠',
  '豪门世家', '民国情缘', '宫斗宅斗', '种田经商', '末世女强',
  '星际机甲', '年代文', '种田重生',
]

export const DEMO_STYLES = [
  '轻松搞笑', '热血爽文', '深情虐恋', '悬疑烧脑', '清新治愈',
  '暗黑写实', '史诗大气', '细腻温馨', '反转惊奇', '日常流水',
  '诗意唯美', '诙谐幽默', '紧张刺激', '催泪感人', '沙雕搞笑',
]
