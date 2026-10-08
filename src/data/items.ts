export type ChecklistItem = {
  id: string
  label: string
  season: string
  motif: string
}

export const CHECKLIST_ITEMS: ChecklistItem[] = [
  // 春 - 桜モチーフ
  { id: 'spring-sakura-spot', season: '春', motif: '桜', label: '花見スポット探索' },
  { id: 'spring-sakura-photo', season: '春', motif: '桜', label: '夜桜の撮影' },
  { id: 'spring-sakura-crystal', season: '春', motif: '桜', label: '満開の結晶入手' },

  // 春 - 蝶々モチーフ
  { id: 'spring-butterfly-catch', season: '春', motif: '蝶々', label: '春の野原で捕獲' },
  { id: 'spring-butterfly-book', season: '春', motif: '蝶々', label: '図鑑登録完了' },
  { id: 'spring-butterfly-golden', season: '春', motif: '蝶々', label: '金色の個体入手' },

  // 春 - 雨の日モチーフ
  { id: 'spring-rain-event', season: '春', motif: '雨の日', label: '春雨イベント制覇' },
  { id: 'spring-rain-shelter', season: '春', motif: '雨の日', label: '雨宿り小屋解放' },
  { id: 'spring-rain-rainbow', season: '春', motif: '雨の日', label: '虹のドロップ収集' },

  // 夏 - 太陽モチーフ
  { id: 'summer-sun-climb', season: '夏', motif: '太陽', label: '真昼の頂上登頂' },
  { id: 'summer-sun-amulet', season: '夏', motif: '太陽', label: '日輪の護符入手' },
  { id: 'summer-sun-trial', season: '夏', motif: '太陽', label: '灼熱試練クリア' },

  // 夏 - 海モチーフ
  { id: 'summer-sea-deep', season: '夏', motif: '海', label: '深海ダンジョン踏破' },
  { id: 'summer-sea-treasure', season: '夏', motif: '海', label: '沈没船の宝箱開封' },
  { id: 'summer-sea-pearl', season: '夏', motif: '海', label: '真珠の首飾り入手' },

  // 夏 - 蛍モチーフ
  { id: 'summer-firefly-stream', season: '夏', motif: '蛍', label: '清流エリア探索' },
  { id: 'summer-firefly-night', season: '夏', motif: '蛍', label: '夜間観測完了' },
  { id: 'summer-firefly-lantern', season: '夏', motif: '蛍', label: '蛍火のランタン入手' },

  // 秋 - 紅葉モチーフ
  { id: 'autumn-maple-valley', season: '秋', motif: '紅葉', label: '紅葉渓谷踏破' },
  { id: 'autumn-maple-carpet', season: '秋', motif: '紅葉', label: '落ち葉の絨毯散策' },
  { id: 'autumn-maple-tapestry', season: '秋', motif: '紅葉', label: '錦秋のタペストリー入手' },

  // 秋 - 月見モチーフ
  { id: 'autumn-moon-spot', season: '秋', motif: '月見', label: '名月鑑賞スポット発見' },
  { id: 'autumn-moon-dumpling', season: '秋', motif: '月見', label: '月見団子作り' },
  { id: 'autumn-moon-treasure', season: '秋', motif: '月見', label: '十五夜の秘宝入手' },

  // 秋 - 収穫モチーフ
  { id: 'autumn-harvest-fruits', season: '秋', motif: '収穫', label: '豊作の果実収集' },
  { id: 'autumn-harvest-festival', season: '秋', motif: '収穫', label: '秋祭りコンプリート' },
  { id: 'autumn-harvest-ear', season: '秋', motif: '収穫', label: '黄金の稲穂入手' },

  // 冬 - 雪モチーフ
  { id: 'winter-snow-summit', season: '冬', motif: '雪', label: '白銀の山頂制覇' },
  { id: 'winter-snow-snowman', season: '冬', motif: '雪', label: '雪だるまコンプリート' },
  { id: 'winter-snow-ice-corridor', season: '冬', motif: '雪', label: '樹氷の回廊踏破' },

  // 冬 - 星モチーフ
  { id: 'winter-star-stargaze', season: '冬', motif: '星', label: '冬の天体観測' },
  { id: 'winter-star-shooting-star', season: '冬', motif: '星', label: '流れ星の破片収集' },
  { id: 'winter-star-star-chart', season: '冬', motif: '星', label: '星図の復元完了' },

  // 冬 - 正月モチーフ
  { id: 'winter-newyear-sunrise', season: '冬', motif: '正月', label: '初日の出拝謁' },
  { id: 'winter-newyear-shrine', season: '冬', motif: '正月', label: '神社参拝コンプリート' },
  { id: 'winter-newyear-arrow', season: '冬', motif: '正月', label: '破魔矢の入手' },
]

export const SEASONS = [...new Set(CHECKLIST_ITEMS.map((item) => item.season))]
export const MOTIFS = [...new Set(CHECKLIST_ITEMS.map((item) => item.motif))]

export const TAG_CATEGORIES = [
  { id: 'season', label: '季節' },
  { id: 'motif', label: 'モチーフ' },
] as const

export type TagCategoryType = (typeof TAG_CATEGORIES)[number]['id']

/**
 * 総合達成率（0〜100%）を計算する
 */
export function calcAchievementRate(
  checkedIds: Iterable<string>,
  total: number = CHECKLIST_ITEMS.length,
): number {
  if (total === 0) return 0
  const validIds = new Set(CHECKLIST_ITEMS.map((item) => item.id))

  let checked = 0
  for (const id of checkedIds) {
    if (validIds.has(id)) checked += 1
  }

  return Math.round((checked / total) * 100)
}

/**
 * 条件の一致モード（AND: 完全一致/すべてに一致, OR: いずれかを含む）
 */
export type MatchMode = 'and' | 'or'

/**
 * 比較条件の定義（複数選択・複数軸の複合条件に対応）
 */
export type ComparisonCondition = {
  id: string // 一意の識別子
  seasons: string[] // 対象の季節（空配列の場合は全季節）
  motifs: string[]  // 対象のモチーフ（空配列の場合は全モチーフ）
  matchMode?: MatchMode // 一致条件（'and': 完全一致, 'or': いずれかを含む）
  customLabel?: string // 任意のカスタム表示名
}

/**
 * 比較条件の表示用ラベルを生成する
 * 例: "季節: 春 × モチーフ: 桜 (AND条件)" / "季節: 春 または モチーフ: 桜 (OR条件)"
 */
export function formatConditionLabel(
  condition: Pick<ComparisonCondition, 'seasons' | 'motifs'> & {
    matchMode?: MatchMode
    customLabel?: string
  },
): string {
  if (condition.customLabel) {
    return condition.customLabel
  }

  const parts: string[] = []
  if (condition.seasons.length > 0) {
    parts.push(`季節: ${condition.seasons.join(', ')}`)
  }
  if (condition.motifs.length > 0) {
    parts.push(`モチーフ: ${condition.motifs.join(', ')}`)
  }

  if (parts.length === 0) {
    return 'すべての要素'
  }

  const mode = condition.matchMode ?? 'and'
  const isCompound = condition.seasons.length > 0 && condition.motifs.length > 0
  const separator = mode === 'or' ? ' または ' : ' × '
  const modeSuffix = isCompound ? (mode === 'or' ? ' (OR条件)' : ' (AND条件)') : ''

  return `${parts.join(separator)}${modeSuffix}`
}

export type ConditionRateResult = {
  checkedCount: number
  totalCount: number
  rate: number
}

/**
 * 比較条件に一致するアイテム群に対する達成率を計算する
 */
export function calcComparisonConditionRate(
  condition: Pick<ComparisonCondition, 'seasons' | 'motifs'> & { matchMode?: MatchMode },
  checkedIds: Set<string>,
  items: ChecklistItem[] = CHECKLIST_ITEMS,
): ConditionRateResult {
  return calcMultiConditionRate(
    {
      seasons: condition.seasons,
      motifs: condition.motifs,
      status: 'all',
      matchMode: condition.matchMode ?? 'and',
    },
    checkedIds,
    items,
  )
}

/**
 * 特定の単一タグ条件に対する達成率を計算する（後方互換用）
 */
export function calcConditionRate(
  condition: { category: TagCategoryType; value: string },
  checkedIds: Set<string>,
  items: ChecklistItem[] = CHECKLIST_ITEMS,
): ConditionRateResult {
  const seasons = condition.category === 'season' ? [condition.value] : []
  const motifs = condition.category === 'motif' ? [condition.value] : []
  return calcComparisonConditionRate({ seasons, motifs, matchMode: 'and' }, checkedIds, items)
}

/**
 * 複数選択および複数軸の複合絞り込み条件の定義
 */
export type MultiFilterConfig = {
  seasons: string[] // 空配列の場合は制限なし（すべての季節）
  motifs: string[]  // 空配列の場合は制限なし（すべてのモチーフ）
  status: 'all' | 'uncompleted' | 'completed'
  matchMode?: MatchMode // 'and': 完全一致（すべてに一致）, 'or': いずれかを含む
}

/**
 * 複合条件に基づいてアイテム一覧を絞り込む
 * - matchMode === 'and' (デフォルト): 指定された各軸の条件すべてに完全一致する要素を抽出
 * - matchMode === 'or': 指定された条件のいずれかを含む要素を抽出
 */
export function filterItems(
  items: ChecklistItem[],
  config: MultiFilterConfig,
  checkedIds: Set<string>,
): ChecklistItem[] {
  const selectedSeasonsSet = new Set(config.seasons)
  const selectedMotifsSet = new Set(config.motifs)
  const hasSeasonFilter = selectedSeasonsSet.size > 0
  const hasMotifFilter = selectedMotifsSet.size > 0
  const matchMode = config.matchMode ?? 'and'

  return items.filter((item) => {
    // 季節およびモチーフ両方が指定されている場合の一致判定
    if (hasSeasonFilter && hasMotifFilter) {
      if (matchMode === 'and') {
        // AND条件: 季節条件とモチーフ条件の両方に完全一致
        if (!selectedSeasonsSet.has(item.season) || !selectedMotifsSet.has(item.motif)) {
          return false
        }
      } else {
        // OR条件: 季節条件またはモチーフ条件のいずれかを含む
        if (!selectedSeasonsSet.has(item.season) && !selectedMotifsSet.has(item.motif)) {
          return false
        }
      }
    } else if (hasSeasonFilter) {
      // 季節条件のみ指定されている場合
      if (!selectedSeasonsSet.has(item.season)) {
        return false
      }
    } else if (hasMotifFilter) {
      // モチーフ条件のみ指定されている場合
      if (!selectedMotifsSet.has(item.motif)) {
        return false
      }
    }

    // 進行ステータスの絞り込み
    if (config.status !== 'all') {
      const isChecked = checkedIds.has(item.id)
      if (config.status === 'completed' && !isChecked) {
        return false
      }
      if (config.status === 'uncompleted' && isChecked) {
        return false
      }
    }

    return true
  })
}

/**
 * 複合絞り込み条件に一致するアイテム群に対する達成率を計算する
 */
export function calcMultiConditionRate(
  config: MultiFilterConfig,
  checkedIds: Set<string>,
  items: ChecklistItem[] = CHECKLIST_ITEMS,
): ConditionRateResult {
  const matched = filterItems(items, { ...config, status: 'all' }, checkedIds)
  const totalCount = matched.length
  if (totalCount === 0) {
    return { checkedCount: 0, totalCount: 0, rate: 0 }
  }

  let checkedCount = 0
  for (const item of matched) {
    if (checkedIds.has(item.id)) {
      checkedCount += 1
    }
  }

  const rate = Math.round((checkedCount / totalCount) * 100)
  return { checkedCount, totalCount, rate }
}

/**
 * ソート条件の定義
 */
export type SortOption =
  | 'default'
  | 'name_asc'
  | 'uncompleted_first'
  | 'completed_first'

/**
 * アイテム一覧を並べ替える
 */
export function sortItems(
  items: ChecklistItem[],
  sortOption: SortOption,
  checkedIds: Set<string>,
): ChecklistItem[] {
  const cloned = [...items]

  switch (sortOption) {
    case 'name_asc':
      return cloned.sort((a, b) => a.label.localeCompare(b.label, 'ja'))
    case 'uncompleted_first':
      return cloned.sort((a, b) => {
        const aChecked = checkedIds.has(a.id) ? 1 : 0
        const bChecked = checkedIds.has(b.id) ? 1 : 0
        return aChecked - bChecked
      })
    case 'completed_first':
      return cloned.sort((a, b) => {
        const aChecked = checkedIds.has(a.id) ? 1 : 0
        const bChecked = checkedIds.has(b.id) ? 1 : 0
        return bChecked - aChecked
      })
    case 'default':
    default:
      return cloned
  }
}


