import { describe, expect, it } from 'vitest'
import {
  CHECKLIST_ITEMS,
  ITEM_CATEGORIES,
  calcAchievementRate,
  calcCategoryAchievements,
  calcConditionAchievement,
  filterItems,
  getItemProgress,
  makeSubItemKey,
  sortItems,
} from './items'

describe('calcAchievementRate（全サブ要素基準の総合達成率計算）', () => {
  it('チェック項目が0件の場合は0%を返すこと', () => {
    const rate = calcAchievementRate([])
    expect(rate).toBe(0)
  })

  it('全36サブ要素中9件チェックした場合は25%を返すこと', () => {
    // 1アイテムあたり3つのサブ要素 x 12アイテム = 36サブ要素
    const checked = [
      makeSubItemKey('spring-sakura', 'spot'),
      makeSubItemKey('spring-sakura', 'photo'),
      makeSubItemKey('spring-sakura', 'crystal'),
      makeSubItemKey('spring-butterfly', 'catch'),
      makeSubItemKey('spring-butterfly', 'book'),
      makeSubItemKey('spring-butterfly', 'golden'),
      makeSubItemKey('spring-rain', 'event'),
      makeSubItemKey('spring-rain', 'shelter'),
      makeSubItemKey('spring-rain', 'rainbow'),
    ]
    const rate = calcAchievementRate(checked)
    expect(rate).toBe(25)
  })

  it('全サブ要素をチェックした場合は100%を返すこと', () => {
    const allKeys: string[] = []
    for (const item of CHECKLIST_ITEMS) {
      for (const sub of item.subItems) {
        allKeys.push(makeSubItemKey(item.id, sub.id))
      }
    }
    const rate = calcAchievementRate(allKeys)
    expect(rate).toBe(100)
  })

  it('無効なキーが含まれていても除外して計算すること', () => {
    const checked = [
      makeSubItemKey('spring-sakura', 'spot'),
      'invalid-key:unknown',
      'random_string',
    ]
    const rate = calcAchievementRate(checked)
    // 1 / 36 = 2.777... -> 3%
    expect(rate).toBe(3)
  })
})

describe('getItemProgress（個別アイテムのサブ要素進捗判定）', () => {
  const item = CHECKLIST_ITEMS[0] // spring-sakura (spot, photo, crystal の3サブ要素)

  it('サブ要素が未チェックのときは未着手状態（isUnstarted）となること', () => {
    const progress = getItemProgress(item, new Set())
    expect(progress.checkedCount).toBe(0)
    expect(progress.totalCount).toBe(3)
    expect(progress.rate).toBe(0)
    expect(progress.isUnstarted).toBe(true)
    expect(progress.isInProgress).toBe(false)
    expect(progress.isCompleted).toBe(false)
  })

  it('一部のサブ要素がチェックされているときは進行中（isInProgress）となること', () => {
    const checked = new Set([makeSubItemKey(item.id, 'spot')])
    const progress = getItemProgress(item, checked)
    expect(progress.checkedCount).toBe(1)
    expect(progress.rate).toBe(33) // 1 / 3 = 33%
    expect(progress.isUnstarted).toBe(false)
    expect(progress.isInProgress).toBe(true)
    expect(progress.isCompleted).toBe(false)
  })

  it('全サブ要素がチェックされているときは完了（isCompleted）となること', () => {
    const checked = new Set([
      makeSubItemKey(item.id, 'spot'),
      makeSubItemKey(item.id, 'photo'),
      makeSubItemKey(item.id, 'crystal'),
    ])
    const progress = getItemProgress(item, checked)
    expect(progress.checkedCount).toBe(3)
    expect(progress.rate).toBe(100)
    expect(progress.isUnstarted).toBe(false)
    expect(progress.isInProgress).toBe(false)
    expect(progress.isCompleted).toBe(true)
  })
})

describe('calcCategoryAchievements（条件・カテゴリ別の達成状況集計）', () => {
  it('カテゴリごとの達成率と件数が正しく集計されること', () => {
    // 春カテゴリの全9サブ要素のうち3つをチェック
    const checked = new Set([
      makeSubItemKey('spring-sakura', 'spot'),
      makeSubItemKey('spring-sakura', 'photo'),
      makeSubItemKey('spring-sakura', 'crystal'),
    ])

    const achievements = calcCategoryAchievements(checked)
    const spring = achievements.find((a) => a.category === '春')
    const summer = achievements.find((a) => a.category === '夏')

    expect(spring).toBeDefined()
    expect(spring?.totalCount).toBe(9)
    expect(spring?.checkedCount).toBe(3)
    expect(spring?.rate).toBe(33)

    expect(summer).toBeDefined()
    expect(summer?.totalCount).toBe(9)
    expect(summer?.checkedCount).toBe(0)
    expect(summer?.rate).toBe(0)
  })
})

describe('calcConditionAchievement（設定した条件のアイテム群に対する達成率集計）', () => {
  it('特定条件（例: 春カテゴリのアイテム群）に対する達成率が正しく算出されること', () => {
    const springItems = CHECKLIST_ITEMS.filter((i) => i.category === '春')
    const checked = new Set([
      makeSubItemKey('spring-sakura', 'spot'),
      makeSubItemKey('spring-sakura', 'photo'),
      makeSubItemKey('spring-sakura', 'crystal'),
    ])

    const achievement = calcConditionAchievement(springItems, checked)
    expect(achievement.totalCount).toBe(9)
    expect(achievement.checkedCount).toBe(3)
    expect(achievement.rate).toBe(33)
  })

  it('対象アイテムが0件の場合はゼロ除算を回避して0%を返すこと', () => {
    const achievement = calcConditionAchievement([], new Set())
    expect(achievement.totalCount).toBe(0)
    expect(achievement.checkedCount).toBe(0)
    expect(achievement.rate).toBe(0)
  })
})


describe('filterItems（条件指定による絞り込み）', () => {
  const itemSakura = CHECKLIST_ITEMS[0] // 春
  const itemButterfly = CHECKLIST_ITEMS[1] // 春

  it('カテゴリで絞り込めること', () => {
    const filtered = filterItems(CHECKLIST_ITEMS, { category: '春', status: 'all' }, new Set())
    expect(filtered.length).toBe(3)
    expect(filtered.every((item) => item.category === '春')).toBe(true)
  })

  it('完了状態（completed）で絞り込めること', () => {
    // 桜のみ全サブ要素チェック
    const checked = new Set([
      makeSubItemKey(itemSakura.id, 'spot'),
      makeSubItemKey(itemSakura.id, 'photo'),
      makeSubItemKey(itemSakura.id, 'crystal'),
    ])

    const filtered = filterItems(CHECKLIST_ITEMS, { category: 'all', status: 'completed' }, checked)
    expect(filtered.length).toBe(1)
    expect(filtered[0].id).toBe('spring-sakura')
  })

  it('進行中状態（in_progress）で絞り込めること', () => {
    // 桜は全完了、蝶々は1個だけチェック（進行中）
    const checked = new Set([
      makeSubItemKey(itemSakura.id, 'spot'),
      makeSubItemKey(itemSakura.id, 'photo'),
      makeSubItemKey(itemSakura.id, 'crystal'),
      makeSubItemKey(itemButterfly.id, 'catch'),
    ])

    const filtered = filterItems(CHECKLIST_ITEMS, { category: 'all', status: 'in_progress' }, checked)
    expect(filtered.length).toBe(1)
    expect(filtered[0].id).toBe('spring-butterfly')
  })

  it('未着手状態（unstarted）で絞り込めること', () => {
    const checked = new Set([
      makeSubItemKey(itemSakura.id, 'spot'),
    ])

    const filtered = filterItems(CHECKLIST_ITEMS, { category: 'all', status: 'unstarted' }, checked)
    // 12件中1件が進行中なので、未着手は11件
    expect(filtered.length).toBe(11)
    expect(filtered.some((item) => item.id === itemSakura.id)).toBe(false)
  })
})

describe('sortItems（並べ替えロジック）', () => {
  const itemSakura = CHECKLIST_ITEMS[0] // 桜 (3/3 = 100%)
  const itemButterfly = CHECKLIST_ITEMS[1] // 蝶 (1/3 = 33%)

  const checked = new Set([
    makeSubItemKey(itemSakura.id, 'spot'),
    makeSubItemKey(itemSakura.id, 'photo'),
    makeSubItemKey(itemSakura.id, 'crystal'),
    makeSubItemKey(itemButterfly.id, 'catch'),
  ])

  it('達成率降順（rate_desc）で並び替えられること', () => {
    const sorted = sortItems(CHECKLIST_ITEMS, 'rate_desc', checked)
    expect(sorted[0].id).toBe('spring-sakura') // 100%
    expect(sorted[1].id).toBe('spring-butterfly') // 33%
  })

  it('達成率昇順（rate_asc）で並び替えられること', () => {
    const sorted = sortItems(CHECKLIST_ITEMS, 'rate_asc', checked)
    const lastItem = sorted[sorted.length - 1]
    expect(lastItem.id).toBe('spring-sakura') // 100%が最後
  })

  it('五十音・名前順（name_asc）で並び替えられること', () => {
    const sorted = sortItems(CHECKLIST_ITEMS, 'name_asc', checked)
    // 日本語ラベルのソート検証
    for (let i = 0; i < sorted.length - 1; i++) {
      expect(sorted[i].label.localeCompare(sorted[i + 1].label, 'ja')).toBeLessThanOrEqual(0)
    }
  })

  it('未完了優先（uncompleted_first）で並び替えられること', () => {
    const sorted = sortItems(CHECKLIST_ITEMS, 'uncompleted_first', checked)
    const lastItem = sorted[sorted.length - 1]
    expect(lastItem.id).toBe('spring-sakura') // 完了済みが末尾
  })
})

describe('チェックリスト基本データ定義', () => {
  it('全アイテムが複数のサブ要素を保持していること', () => {
    expect(CHECKLIST_ITEMS.length).toBeGreaterThan(0)
    for (const item of CHECKLIST_ITEMS) {
      expect(item.id).toBeTruthy()
      expect(item.label).toBeTruthy()
      expect(item.category).toBeTruthy()
      expect(item.subItems.length).toBeGreaterThanOrEqual(2)
      for (const sub of item.subItems) {
        expect(sub.id).toBeTruthy()
        expect(sub.label).toBeTruthy()
      }
    }
  })

  it('カテゴリ一覧に重複が存在しないこと', () => {
    const uniqueCategories = new Set(ITEM_CATEGORIES)
    expect(ITEM_CATEGORIES.length).toBe(uniqueCategories.size)
  })
})

