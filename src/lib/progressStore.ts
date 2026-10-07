import { calcAchievementRate } from '../data/items'
import { getClientId } from './clientId'
import { isSupabaseConfigured, supabase } from './supabase'

export type ProgressSnapshot = {
  checkedIds: string[]
  achievementRate: number
  updatedAt: string
}

const CACHE_KEY = 'collection-checker-progress'

type ProgressRow = {
  client_id: string
  checked_item_ids: string[] | null
  achievement_rate: number | null
  updated_at?: string
}

function readCache(): ProgressSnapshot | null {
  const raw = localStorage.getItem(CACHE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<ProgressSnapshot>
    if (!Array.isArray(parsed.checkedIds)) return null
    const checkedIds = parsed.checkedIds.filter((id): id is string => typeof id === 'string')
    return {
      checkedIds,
      achievementRate: calcAchievementRate(checkedIds),
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date(0).toISOString(),
    }
  } catch {
    return null
  }
}

function writeCache(snapshot: ProgressSnapshot) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot))
}

function normalizeRow(row: ProgressRow | null): ProgressSnapshot {
  const checkedIds = row?.checked_item_ids?.filter((id): id is string => typeof id === 'string') ?? []
  return {
    checkedIds,
    achievementRate: calcAchievementRate(checkedIds),
    updatedAt: row?.updated_at ?? new Date(0).toISOString(),
  }
}

export function loadCachedProgress(): ProgressSnapshot {
  return readCache() ?? {
    checkedIds: [],
    achievementRate: 0,
    updatedAt: new Date(0).toISOString(),
  }
}

export async function loadProgress(): Promise<ProgressSnapshot> {
  const cached = loadCachedProgress()
  if (!supabase) return cached

  const { data, error } = await supabase
    .from('checklist_progress')
    .select('client_id, checked_item_ids, achievement_rate, updated_at')
    .eq('client_id', getClientId())
    .maybeSingle()

  if (error) throw error
  if (!data) return cached

  const remote = normalizeRow(data as ProgressRow)
  const snapshot =
    cached.updatedAt > remote.updatedAt ? cached : remote
  writeCache(snapshot)
  return snapshot
}

export async function saveProgress(checkedIds: Iterable<string>): Promise<ProgressSnapshot> {
  const snapshot: ProgressSnapshot = {
    checkedIds: [...checkedIds],
    achievementRate: calcAchievementRate(checkedIds),
    updatedAt: new Date().toISOString(),
  }
  writeCache(snapshot)

  if (!supabase) {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase の URL と anon key が設定されていません。')
    }
    throw new Error('Supabase クライアントを初期化できませんでした。')
  }

  const { error } = await supabase.from('checklist_progress').upsert(
    {
      client_id: getClientId(),
      checked_item_ids: snapshot.checkedIds,
      achievement_rate: snapshot.achievementRate,
      updated_at: snapshot.updatedAt,
    },
    { onConflict: 'client_id' },
  )

  if (error) throw error
  return snapshot
}
