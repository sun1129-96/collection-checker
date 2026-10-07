export type ChecklistItem = {
  id: string
  label: string
  category: string
}

export const CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: 'spring-sakura', category: '春', label: '桜モチーフ' },
  { id: 'spring-butterfly', category: '春', label: '蝶々モチーフ' },
  { id: 'spring-rain', category: '春', label: '雨の日モチーフ' },
  { id: 'summer-sun', category: '夏', label: '太陽モチーフ' },
  { id: 'summer-sea', category: '夏', label: '海モチーフ' },
  { id: 'summer-firefly', category: '夏', label: '蛍モチーフ' },
  { id: 'autumn-maple', category: '秋', label: '紅葉モチーフ' },
  { id: 'autumn-moon', category: '秋', label: '月見モチーフ' },
  { id: 'autumn-harvest', category: '秋', label: '収穫モチーフ' },
  { id: 'winter-snow', category: '冬', label: '雪モチーフ' },
  { id: 'winter-star', category: '冬', label: '星モチーフ' },
  { id: 'winter-newyear', category: '冬', label: '正月モチーフ' },
]

export const ITEM_CATEGORIES = [...new Set(CHECKLIST_ITEMS.map((item) => item.category))]

export function calcAchievementRate(checkedIds: Iterable<string>, total = CHECKLIST_ITEMS.length): number {
  if (total === 0) return 0
  const validIds = new Set(CHECKLIST_ITEMS.map((item) => item.id))
  let checked = 0
  for (const id of checkedIds) {
    if (validIds.has(id)) checked += 1
  }
  return Math.round((checked / total) * 100)
}
