import { describe, expect, it } from 'vitest'
import {
  CHECKLIST_ITEMS,
  MOTIFS,
  SEASONS,
  calcAchievementRate,
  calcComparisonConditionRate,
  calcConditionRate,
  filterItems,
  formatConditionLabel,
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

describe('calcComparisonConditionRate（複合比較条件に対する達成率計算）', () => {
  const checked = new Set([
    'spring-sakura-spot',
    'spring-sakura-photo',
    'summer-sun-climb',
  ])

  it('季節の複数選択（例: 春と夏、OR条件）の達成率が正しく計算されること', () => {
    // 春9件 + 夏9件 = 18件中 3件完了 -> 17%
    const result = calcComparisonConditionRate(
      { seasons: ['春', '夏'], motifs: [], matchMode: 'or' },
      checked,
    )
    expect(result.totalCount).toBe(18)
    expect(result.checkedCount).toBe(3)
    expect(result.rate).toBe(17)
  })

  it('季節の複数選択（例: 春と夏、AND条件）では両方を持つ要素のみ対象となること', () => {
    // 春と夏の両方を持つ要素は現状0件 -> 0%
    const result = calcComparisonConditionRate(
      { seasons: ['春', '夏'], motifs: [], matchMode: 'and' },
      checked,
    )
    expect(result.totalCount).toBe(0)
    expect(result.checkedCount).toBe(0)
    expect(result.rate).toBe(0)
  })

  it('季節とモチーフの複合（例: 春 × 桜、AND条件）の達成率が正しく計算されること', () => {
    // 春かつ桜 = 3件中 2件完了 -> 67%
    const result = calcComparisonConditionRate(
      { seasons: ['春'], motifs: ['桜'], matchMode: 'and' },
      checked,
    )
    expect(result.totalCount).toBe(3)
    expect(result.checkedCount).toBe(2)
    expect(result.rate).toBe(67)
  })

  it('季節とモチーフの複合（例: 春 または 太陽、OR条件）の達成率が正しく計算されること', () => {
    // 春(9件: 2件チェック済み) または 太陽(3件: 1件チェック済み) = 計12件中 3件完了 -> 25%
    const result = calcComparisonConditionRate(
      { seasons: ['春'], motifs: ['太陽'], matchMode: 'or' },
      checked,
    )
    expect(result.totalCount).toBe(12)
    expect(result.checkedCount).toBe(3)
    expect(result.rate).toBe(25)
  })
})

describe('formatConditionLabel（比較条件のラベル生成）', () => {
  it('季節のみの場合のフォーマットが正しいこと', () => {
    expect(formatConditionLabel({ seasons: ['春', '夏'], motifs: [] })).toBe('季節: 春, 夏')
  })

  it('モチーフのみの場合のフォーマットが正しいこと', () => {
    expect(formatConditionLabel({ seasons: [], motifs: ['桜', '蝶々'] })).toBe('モチーフ: 桜, 蝶々')
  })

  it('季節とモチーフの複合条件（AND条件）の場合のフォーマットが正しいこと', () => {
    expect(
      formatConditionLabel({ seasons: ['春'], motifs: ['桜'], matchMode: 'and' }),
    ).toBe('季節: 春 × モチーフ: 桜 (AND条件)')
  })

  it('季節とモチーフの複合条件（OR条件）の場合のフォーマットが正しいこと', () => {
    expect(
      formatConditionLabel({ seasons: ['春'], motifs: ['太陽'], matchMode: 'or' }),
    ).toBe('季節: 春 または モチーフ: 太陽 (OR条件)')
  })

  it('未指定の場合はすべての要素と表示されること', () => {
    expect(formatConditionLabel({ seasons: [], motifs: [] })).toBe('すべての要素')
  })

  it('カスタムラベルが指定されている場合はそれが優先されること', () => {
    expect(
      formatConditionLabel({ seasons: ['春'], motifs: [], customLabel: 'お気に入り条件' }),
    ).toBe('お気に入り条件')
  })
})

describe('filterItems（複数選択および複数軸の複合絞り込み）', () => {
  const checked = new Set(['spring-sakura-spot', 'spring-sakura-photo', 'summer-sun-climb'])

  it('同一軸内の複数選択でOR条件（春 または 夏）の場合はいずれかを含む要素が絞り込めること', () => {
    const filtered = filterItems(
      CHECKLIST_ITEMS,
      { seasons: ['春', '夏'], motifs: [], status: 'all', matchMode: 'or' },
      checked,
    )
    // 春9件 + 夏9件 = 18件
    expect(filtered.length).toBe(18)
    expect(filtered.every((item) => item.season === '春' || item.season === '夏')).toBe(true)
  })

  it('同一軸内の複数選択でAND条件（春 かつ 夏）の場合は全てを含む要素のみ絞り込まれること（単一値なら0件）', () => {
    const filtered = filterItems(
      CHECKLIST_ITEMS,
      { seasons: ['春', '夏'], motifs: [], status: 'all', matchMode: 'and' },
      checked,
    )
    // 春と夏の両方を持つ要素は存在しないため0件
    expect(filtered.length).toBe(0)
  })

  it('ひとつの軸に複数の要素を持つアイテム（歌唱者:A, Bなど）に対するAND検索で、項目全てが含まれるもののみ絞り込めること', () => {
    // 歌唱者タグなど複数要素を持つアイテムのモック
    const multiTagItems = [
      { id: 'item-ab', label: '曲AB', season: ['春', '夏'], motif: '桜' },
      { id: 'item-a', label: '曲A', season: '春', motif: '桜' },
      { id: 'item-b', label: '曲B', season: '夏', motif: '太陽' },
    ]

    // 季節に「春」「夏」の両方が選択されたAND検索 -> 曲AB のみ
    const andFiltered = filterItems(
      multiTagItems,
      { seasons: ['春', '夏'], motifs: [], status: 'all', matchMode: 'and' },
      checked,
    )
    expect(andFiltered.length).toBe(1)
    expect(andFiltered[0].id).toBe('item-ab')

    // 季節に「春」「夏」が選択されたOR検索 -> 曲AB, 曲A, 曲B の3件すべて
    const orFiltered = filterItems(
      multiTagItems,
      { seasons: ['春', '夏'], motifs: [], status: 'all', matchMode: 'or' },
      checked,
    )
    expect(orFiltered.length).toBe(3)
  })

  it('季節が春でモチーフが桜のもの（完全一致: AND条件）で絞り込めること', () => {
    const filtered = filterItems(
      CHECKLIST_ITEMS,
      { seasons: ['春'], motifs: ['桜'], status: 'all', matchMode: 'and' },
      checked,
    )
    // 春かつ桜 = 3件
    expect(filtered.length).toBe(3)
    expect(filtered.every((item) => item.season === '春' && item.motif === '桜')).toBe(true)
  })

  it('季節が春またはモチーフが太陽のもの（いずれかを含む: OR条件）で絞り込めること', () => {
    const filtered = filterItems(
      CHECKLIST_ITEMS,
      { seasons: ['春'], motifs: ['太陽'], status: 'all', matchMode: 'or' },
      checked,
    )
    // 春9件 + 夏の太陽3件 = 12件
    expect(filtered.length).toBe(12)
    expect(filtered.every((item) => item.season === '春' || item.motif === '太陽')).toBe(true)
  })

  it('季節が春・夏でモチーフが桜・太陽のAND検索では全指定条件（4条件全て）を満たす要素のみ絞り込まれること（単一値要素なら0件）', () => {
    const filtered = filterItems(
      CHECKLIST_ITEMS,
      { seasons: ['春', '夏'], motifs: ['桜', '太陽'], status: 'all', matchMode: 'and' },
      checked,
    )
    // 春かつ夏かつ桜かつ太陽の全条件を満たす単一値要素は存在しないため0件
    expect(filtered.length).toBe(0)
  })

  it('複数タグ保持アイテムにおいて、季節（春・夏）およびモチーフ（桜・太陽）の全条件を満たすアイテムがAND検索で絞り込めること', () => {
    const multiTagItems = [
      { id: 'full-match', label: '全条件合致', season: ['春', '夏'], motif: ['桜', '太陽'] },
      { id: 'partial-match', label: '一部合致', season: ['春', '夏'], motif: ['桜'] },
    ]
    const filtered = filterItems(
      multiTagItems,
      { seasons: ['春', '夏'], motifs: ['桜', '太陽'], status: 'all', matchMode: 'and' },
      checked,
    )
    expect(filtered.length).toBe(1)
    expect(filtered[0].id).toBe('full-match')
  })

  it('完了状態（completed）で絞り込めること', () => {
    const filtered = filterItems(
      CHECKLIST_ITEMS,
      { seasons: [], motifs: [], status: 'completed' },
      checked,
    )
    expect(filtered.length).toBe(3)
  })

  it('未完了状態（uncompleted）で絞り込めること', () => {
    const filtered = filterItems(
      CHECKLIST_ITEMS,
      { seasons: [], motifs: [], status: 'uncompleted' },
      checked,
    )
    expect(filtered.length).toBe(33) // 36 - 3
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


