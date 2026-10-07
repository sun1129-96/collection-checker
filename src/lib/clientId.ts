const STORAGE_KEY = 'collection-checker-client-id'

export function getClientId(): string {
  const existing = localStorage.getItem(STORAGE_KEY)
  if (existing) return existing
  const created = crypto.randomUUID()
  localStorage.setItem(STORAGE_KEY, created)
  return created
}
