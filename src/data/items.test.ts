import { describe, expect, it } from 'vitest'
import { CHECKLIST_ITEMS, ITEM_CATEGORIES, calcAchievementRate } from './items'

describe('calcAchievementRate（達成率計算ロジック）', () => {
  it('チェック項目が0件の場合は0%を返すこと', () => {
    const rate = calcAchievementRate([])
    expect(rate).toBe(0)
  })

  it('全12件中3件チェックした場合は25%を返すこと', () => {
    const checked = ['spring-sakura', 'spring-butterfly', 'spring-rain']
    const rate = calcAchievementRate(checked)
    expect(rate).toBe(25)
  })

  it('全12件中1件チェックした場合は四捨五入して8%を返すこと', () => {
    const checked = ['spring-sakura']
    const rate = calcAchievementRate(checked)
    // 1 / 12 = 8.333... -> 8
    expect(rate).toBe(8)
  })

  it('全項目チェックした場合は100%を返すこと', () => {
    const allIds = CHECKLIST_ITEMS.map((item) => item.id)
    const rate = calcAchievementRate(allIds)
    expect(rate).toBe(100)
  })

  it('無効なIDが含まれていても除外して正しく計算すること', () => {
    const checked = ['spring-sakura', 'invalid-id-xyz', 'another-invalid-id']
    const rate = calcAchievementRate(checked)
    // 有効なのは1件のみ -> 8%
    expect(rate).toBe(8)
  })

  it('総数が0の場合はゼロ除算を回避して0を返すこと', () => {
    const rate = calcAchievementRate(['spring-sakura'], 0)
    expect(rate).toBe(0)
  })
})

describe('チェックリストデータ定義', () => {
  it('アイテム一覧が空でなく、各要素に必須属性が存在すること', () => {
    expect(CHECKLIST_ITEMS.length).toBeGreaterThan(0)
    for (const item of CHECKLIST_ITEMS) {
      expect(item.id).toBeTruthy()
      expect(item.label).toBeTruthy()
      expect(item.category).toBeTruthy()
    }
  })

  it('カテゴリ一覧に重複が存在しないこと', () => {
    const uniqueCategories = new Set(ITEM_CATEGORIES)
    expect(ITEM_CATEGORIES.length).toBe(uniqueCategories.size)
  })
})
