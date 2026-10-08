import { describe, expect, it } from 'vitest'
import {
  CHECKLIST_ITEMS,
  MOTIFS,
  SEASONS,
  calcAchievementRate,
  calcConditionRate,
  filterItems,
  sortItems,
} from './items'

describe('calcAchievementRate（総合達成率計算）', () => {
  it('チェック項目が0件の場合は0%を返すこと', () => {
    const rate = calcAchievementRate([])
    expect(rate).toBe(0)
  })

  it('全36要素中9件チェックした場合は25%を返すこと', () => {
    const checked = [
      'spring-sakura-spot',
      'spring-sakura-photo',
      'spring-sakura-crystal',
      'spring-butterfly-catch',
      'spring-butterfly-book',
      'spring-butterfly-golden',
      'spring-rain-event',
      'spring-rain-shelter',
      'spring-rain-rainbow',
    ]
    const rate = calcAchievementRate(checked)
    expect(rate).toBe(25)
  })

  it('全要素をチェックした場合は100%を返すこと', () => {
    const allIds = CHECKLIST_ITEMS.map((item) => item.id)
    const rate = calcAchievementRate(allIds)
    expect(rate).toBe(100)
  })

  it('無効なIDが含まれていても除外して正しく計算すること', () => {
    const checked = ['spring-sakura-spot', 'invalid-id-xyz', 'another-invalid-id']
    const rate = calcAchievementRate(checked)
    // 1 / 36 = 2.777... -> 3%
    expect(rate).toBe(3)
  })

  it('総数が0の場合はゼロ除算を回避して0を返すこと', () => {
    const rate = calcAchievementRate(['spring-sakura-spot'], 0)
    expect(rate).toBe(0)
  })
})

describe('calcConditionRate（特定タグ条件に対する達成率計算）', () => {
  const checked = new Set([
    'spring-sakura-spot',
    'spring-sakura-photo',
    'spring-butterfly-catch',
  ])

  it('季節タグ条件（例: 春）の達成率が正しく計算されること', () => {
    // 春は全9要素中3要素チェック -> 33%
    const result = calcConditionRate({ category: 'season', value: '春' }, checked)
    expect(result.totalCount).toBe(9)
    expect(result.checkedCount).toBe(3)
    expect(result.rate).toBe(33)
  })

  it('モチーフタグ条件（例: 桜）の達成率が正しく計算されること', () => {
    // 桜は全3要素中2要素チェック -> 67%
    const result = calcConditionRate({ category: 'motif', value: '桜' }, checked)
    expect(result.totalCount).toBe(3)
    expect(result.checkedCount).toBe(2)
    expect(result.rate).toBe(67)
  })

  it('該当要素が存在しない条件の場合は0%を返すこと', () => {
    const result = calcConditionRate({ category: 'season', value: '存在しない季節' }, checked)
    expect(result.totalCount).toBe(0)
    expect(result.checkedCount).toBe(0)
    expect(result.rate).toBe(0)
  })
})

describe('filterItems（タグ階層およびステータスによる絞り込み）', () => {
  const checked = new Set(['spring-sakura-spot', 'spring-sakura-photo'])

  it('タグ種別: 季節（春）で絞り込めること', () => {
    const filtered = filterItems(
      CHECKLIST_ITEMS,
      { tagCategory: 'season', tagValue: '春', status: 'all' },
      checked,
    )
    expect(filtered.length).toBe(9)
    expect(filtered.every((item) => item.season === '春')).toBe(true)
  })

  it('タグ種別: モチーフ（桜）で絞り込めること', () => {
    const filtered = filterItems(
      CHECKLIST_ITEMS,
      { tagCategory: 'motif', tagValue: '桜', status: 'all' },
      checked,
    )
    expect(filtered.length).toBe(3)
    expect(filtered.every((item) => item.motif === '桜')).toBe(true)
  })

  it('完了状態（completed）で絞り込めること', () => {
    const filtered = filterItems(
      CHECKLIST_ITEMS,
      { tagCategory: 'all', tagValue: 'all', status: 'completed' },
      checked,
    )
    expect(filtered.length).toBe(2)
    expect(filtered.map((i) => i.id)).toEqual(['spring-sakura-spot', 'spring-sakura-photo'])
  })

  it('未完了状態（uncompleted）で絞り込めること', () => {
    const filtered = filterItems(
      CHECKLIST_ITEMS,
      { tagCategory: 'all', tagValue: 'all', status: 'uncompleted' },
      checked,
    )
    expect(filtered.length).toBe(34) // 36 - 2
  })

  it('タグ種別と進行ステータスの複合条件で絞り込めること', () => {
    const filtered = filterItems(
      CHECKLIST_ITEMS,
      { tagCategory: 'motif', tagValue: '桜', status: 'uncompleted' },
      checked,
    )
    // 桜全3件中、完了2件、未完了1件（crystal）
    expect(filtered.length).toBe(1)
    expect(filtered[0].id).toBe('spring-sakura-crystal')
  })
})

describe('sortItems（並べ替え）', () => {
  const checked = new Set(['spring-sakura-spot'])

  it('名前順（name_asc）で並び替えられること', () => {
    const sorted = sortItems(CHECKLIST_ITEMS, 'name_asc', checked)
    for (let i = 0; i < sorted.length - 1; i++) {
      expect(sorted[i].label.localeCompare(sorted[i + 1].label, 'ja')).toBeLessThanOrEqual(0)
    }
  })

  it('未完了優先（uncompleted_first）で並び替えられること', () => {
    const sorted = sortItems(CHECKLIST_ITEMS, 'uncompleted_first', checked)
    const lastItem = sorted[sorted.length - 1]
    expect(lastItem.id).toBe('spring-sakura-spot') // 完了済みが末尾
  })

  it('完了優先（completed_first）で並び替えられること', () => {
    const sorted = sortItems(CHECKLIST_ITEMS, 'completed_first', checked)
    expect(sorted[0].id).toBe('spring-sakura-spot') // 完了済みが先頭
  })
})

describe('データ構造の整合性検証', () => {
  it('全36個の要素が存在し、全属性（id, label, season, motif）が正しく定義されていること', () => {
    expect(CHECKLIST_ITEMS.length).toBe(36)
    for (const item of CHECKLIST_ITEMS) {
      expect(item.id).toBeTruthy()
      expect(item.label).toBeTruthy()
      expect(item.season).toBeTruthy()
      expect(item.motif).toBeTruthy()
    }
  })

  it('季節は4種類、モチーフは12種類存在すること', () => {
    expect(SEASONS).toEqual(['春', '夏', '秋', '冬'])
    expect(MOTIFS.length).toBe(12)
  })
})


