export type SubItem = {
  id: string
  label: string
}

export type ChecklistItem = {
  id: string
  label: string
  category: string
  subItems: SubItem[]
}

export const CHECKLIST_ITEMS: ChecklistItem[] = [
  // 春カテゴリ
  {
    id: 'spring-sakura',
    category: '春',
    label: '桜モチーフ',
    subItems: [
      { id: 'spot', label: '花見スポット探索' },
      { id: 'photo', label: '夜桜の撮影' },
      { id: 'crystal', label: '満開の結晶入手' },
    ],
  },
  {
    id: 'spring-butterfly',
    category: '春',
    label: '蝶々モチーフ',
    subItems: [
      { id: 'catch', label: '春の野原で捕獲' },
      { id: 'book', label: '図鑑登録完了' },
      { id: 'golden', label: '金色の個体入手' },
    ],
  },
  {
    id: 'spring-rain',
    category: '春',
    label: '雨の日モチーフ',
    subItems: [
      { id: 'event', label: '春雨イベント制覇' },
      { id: 'shelter', label: '雨宿り小屋解放' },
      { id: 'rainbow', label: '虹のドロップ収集' },
    ],
  },

  // 夏カテゴリ
  {
    id: 'summer-sun',
    category: '夏',
    label: '太陽モチーフ',
    subItems: [
      { id: 'climb', label: '真昼の頂上登頂' },
      { id: 'amulet', label: '日輪の護符入手' },
      { id: 'trial', label: '灼熱試練クリア' },
    ],
  },
  {
    id: 'summer-sea',
    category: '夏',
    label: '海モチーフ',
    subItems: [
      { id: 'deep-sea', label: '深海ダンジョン踏破' },
      { id: 'treasure', label: '沈没船の宝箱開封' },
      { id: 'pearl', label: '真珠の首飾り入手' },
    ],
  },
  {
    id: 'summer-firefly',
    category: '夏',
    label: '蛍モチーフ',
    subItems: [
      { id: 'stream', label: '清流エリア探索' },
      { id: 'night', label: '夜間観測完了' },
      { id: 'lantern', label: '蛍火のランタン入手' },
    ],
  },

  // 秋カテゴリ
  {
    id: 'autumn-maple',
    category: '秋',
    label: '紅葉モチーフ',
    subItems: [
      { id: 'valley', label: '紅葉渓谷踏破' },
      { id: 'carpet', label: '落ち葉の絨毯散策' },
      { id: 'tapestry', label: '錦秋のタペストリー入手' },
    ],
  },
  {
    id: 'autumn-moon',
    category: '秋',
    label: '月見モチーフ',
    subItems: [
      { id: 'spot', label: '名月鑑賞スポット発見' },
      { id: 'dumpling', label: '月見団子作り' },
      { id: 'treasure', label: '十五夜の秘宝入手' },
    ],
  },
  {
    id: 'autumn-harvest',
    category: '秋',
    label: '収穫モチーフ',
    subItems: [
      { id: 'fruits', label: '豊作の果実収集' },
      { id: 'festival', label: '秋祭りコンプリート' },
      { id: 'ear', label: '黄金の稲穂入手' },
    ],
  },

  // 冬カテゴリ
  {
    id: 'winter-snow',
    category: '冬',
    label: '雪モチーフ',
    subItems: [
      { id: 'summit', label: '白銀の山頂制覇' },
      { id: 'snowman', label: '雪だるまコンプリート' },
      { id: 'ice-corridor', label: '樹氷の回廊踏破' },
    ],
  },
  {
    id: 'winter-star',
    category: '冬',
    label: '星モチーフ',
    subItems: [
      { id: 'stargaze', label: '冬の天体観測' },
      { id: 'shooting-star', label: '流れ星の破片収集' },
      { id: 'star-chart', label: '星図の復元完了' },
    ],
  },
  {
    id: 'winter-newyear',
    category: '冬',
    label: '正月モチーフ',
    subItems: [
      { id: 'sunrise', label: '初日の出拝謁' },
      { id: 'shrine', label: '神社参拝コンプリート' },
      { id: 'arrow', label: '破魔矢の入手' },
    ],
  },
]

export const ITEM_CATEGORIES = [...new Set(CHECKLIST_ITEMS.map((item) => item.category))]

/**
 * サブ要素の一意識別キーを生成する（フォーマット: `${itemId}:${subItemId}`）
 */
export function makeSubItemKey(itemId: string, subItemId: string): string {
  return `${itemId}:${subItemId}`
}

/**
 * サブ要素キーからアイテムIDとサブ要素IDを分解する
 */
export function parseSubItemKey(key: string): { itemId: string; subItemId: string } | null {
  const separatorIndex = key.indexOf(':')
  if (separatorIndex === -1) return null
  return {
    itemId: key.slice(0, separatorIndex),
    subItemId: key.slice(separatorIndex + 1),
  }
}

/**
 * 全アイテム内の全サブ要素キー一覧（Set）を取得
 */
export function getAllValidSubItemKeys(items: ChecklistItem[] = CHECKLIST_ITEMS): Set<string> {
  const keys = new Set<string>()
  for (const item of items) {
    for (const sub of item.subItems) {
      keys.add(makeSubItemKey(item.id, sub.id))
    }
  }
  return keys
}

/**
 * 単一アイテムの進捗状況を計算する
 */
export type ItemProgress = {
  checkedCount: number
  totalCount: number
  rate: number
  isCompleted: boolean
  isInProgress: boolean
  isUnstarted: boolean
}

export function getItemProgress(
  item: ChecklistItem,
  checkedKeys: Set<string>,
): ItemProgress {
  const totalCount = item.subItems.length
  if (totalCount === 0) {
    return {
      checkedCount: 0,
      totalCount: 0,
      rate: 0,
      isCompleted: true,
      isInProgress: false,
      isUnstarted: false,
    }
  }

  let checkedCount = 0
  for (const sub of item.subItems) {
    if (checkedKeys.has(makeSubItemKey(item.id, sub.id))) {
      checkedCount += 1
    }
  }

  const rate = Math.round((checkedCount / totalCount) * 100)
  const isCompleted = checkedCount === totalCount
  const isUnstarted = checkedCount === 0
  const isInProgress = !isCompleted && !isUnstarted

  return {
    checkedCount,
    totalCount,
    rate,
    isCompleted,
    isInProgress,
    isUnstarted,
  }
}

/**
 * 全体の達成率（0〜100%）を計算する
 * サブ要素の総数に対するチェック済みサブ要素数の割合
 */
export function calcAchievementRate(
  checkedKeys: Iterable<string>,
  items: ChecklistItem[] = CHECKLIST_ITEMS,
): number {
  const validKeys = getAllValidSubItemKeys(items)
  if (validKeys.size === 0) return 0

  let checked = 0
  for (const key of checkedKeys) {
    if (validKeys.has(key)) checked += 1
  }

  return Math.round((checked / validKeys.size) * 100)
}

/**
 * 条件（カテゴリ）別の達成状況および達成率を計算する
 */
export type CategoryAchievement = {
  category: string
  checkedCount: number
  totalCount: number
  rate: number
}

export function calcCategoryAchievements(
  checkedKeys: Set<string>,
  items: ChecklistItem[] = CHECKLIST_ITEMS,
): CategoryAchievement[] {
  const categories = [...new Set(items.map((item) => item.category))]

  return categories.map((category) => {
    const categoryItems = items.filter((item) => item.category === category)
    let totalCount = 0
    let checkedCount = 0

    for (const item of categoryItems) {
      for (const sub of item.subItems) {
        totalCount += 1
        if (checkedKeys.has(makeSubItemKey(item.id, sub.id))) {
          checkedCount += 1
        }
      }
    }

    const rate = totalCount === 0 ? 0 : Math.round((checkedCount / totalCount) * 100)

    return {
      category,
      checkedCount,
      totalCount,
      rate,
    }
  })
}

/**
 * 設定された条件（指定アイテム一覧）に対する達成状況および達成率を計算する
 */
export type ConditionAchievement = {
  checkedCount: number
  totalCount: number
  rate: number
}

export function calcConditionAchievement(
  items: ChecklistItem[],
  checkedKeys: Set<string>,
): ConditionAchievement {
  let totalCount = 0
  let checkedCount = 0

  for (const item of items) {
    for (const sub of item.subItems) {
      totalCount += 1
      if (checkedKeys.has(makeSubItemKey(item.id, sub.id))) {
        checkedCount += 1
      }
    }
  }

  const rate = totalCount === 0 ? 0 : Math.round((checkedCount / totalCount) * 100)

  return {
    checkedCount,
    totalCount,
    rate,
  }
}


/**
 * 絞り込み条件の定義
 */
export type StatusFilter = 'all' | 'unstarted' | 'in_progress' | 'completed'

export type FilterCondition = {
  category: string // 'all' または 各カテゴリ名
  status: StatusFilter
}

/**
 * アイテム一覧を絞り込む
 */
export function filterItems(
  items: ChecklistItem[],
  condition: FilterCondition,
  checkedKeys: Set<string>,
): ChecklistItem[] {
  return items.filter((item) => {
    // カテゴリによる絞り込み
    if (condition.category !== 'all' && item.category !== condition.category) {
      return false
    }

    // 進行ステータスによる絞り込み
    if (condition.status !== 'all') {
      const progress = getItemProgress(item, checkedKeys)
      if (condition.status === 'completed' && !progress.isCompleted) {
        return false
      }
      if (condition.status === 'in_progress' && !progress.isInProgress) {
        return false
      }
      if (condition.status === 'unstarted' && !progress.isUnstarted) {
        return false
      }
    }

    return true
  })
}

/**
 * ソート条件の定義
 */
export type SortOption =
  | 'default'
  | 'rate_desc'
  | 'rate_asc'
  | 'name_asc'
  | 'uncompleted_first'

/**
 * アイテム一覧を並べ替える
 */
export function sortItems(
  items: ChecklistItem[],
  sortOption: SortOption,
  checkedKeys: Set<string>,
): ChecklistItem[] {
  const cloned = [...items]

  switch (sortOption) {
    case 'rate_desc':
      return cloned.sort((a, b) => {
        const rateA = getItemProgress(a, checkedKeys).rate
        const rateB = getItemProgress(b, checkedKeys).rate
        return rateB - rateA
      })
    case 'rate_asc':
      return cloned.sort((a, b) => {
        const rateA = getItemProgress(a, checkedKeys).rate
        const rateB = getItemProgress(b, checkedKeys).rate
        return rateA - rateB
      })
    case 'name_asc':
      return cloned.sort((a, b) => a.label.localeCompare(b.label, 'ja'))
    case 'uncompleted_first':
      return cloned.sort((a, b) => {
        const compA = getItemProgress(a, checkedKeys).isCompleted ? 1 : 0
        const compB = getItemProgress(b, checkedKeys).isCompleted ? 1 : 0
        return compA - compB
      })
    case 'default':
    default:
      return cloned
  }
}
