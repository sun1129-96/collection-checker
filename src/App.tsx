import { useEffect, useMemo, useRef, useState } from 'react'
import { CHECKLIST_ITEMS, calcAchievementRate } from './data/items'
import { isSupabaseConfigured } from './lib/supabase'
import { loadCachedProgress, loadProgress, saveProgress } from './lib/progressStore'

// 達成率（0〜100%）に応じたTailwind CSSの幅クラス（インラインスタイルを完全排除）
function getProgressWidthClass(rate: number): string {
  if (rate <= 0) return 'w-0'
  if (rate <= 8) return 'w-[8%]'
  if (rate <= 17) return 'w-[17%]'
  if (rate <= 25) return 'w-[25%]'
  if (rate <= 33) return 'w-[33%]'
  if (rate <= 42) return 'w-[42%]'
  if (rate <= 50) return 'w-1/2'
  if (rate <= 58) return 'w-[58%]'
  if (rate <= 67) return 'w-[67%]'
  if (rate <= 75) return 'w-3/4'
  if (rate <= 83) return 'w-[83%]'
  if (rate <= 92) return 'w-[92%]'
  return 'w-full'
}

function App() {
  // チェック済み項目のIDセット（ローカルキャッシュから即時復元）
  const [checkedIds, setCheckedIds] = useState<Set<string>>(
    () => new Set(loadCachedProgress().checkedIds),
  )
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(
    isSupabaseConfigured ? null : 'Supabaseの接続情報が未設定です。環境変数にURLとanon keyを追加してください。',
  )
  const checkedRef = useRef(checkedIds)
  const saveQueue = useRef(Promise.resolve())

  checkedRef.current = checkedIds
  const achievementRate = useMemo(() => calcAchievementRate(checkedIds), [checkedIds])

  // マウント時にSupabaseから最新進捗を取得
  useEffect(() => {
    let cancelled = false

    loadProgress()
      .then((snapshot) => {
        if (cancelled) return
        setCheckedIds(new Set(snapshot.checkedIds))
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const message = error instanceof Error ? error.message : '進捗の読み込みに失敗しました。'
        setErrorMessage(message)
        setSaveState('error')
      })

    return () => {
      cancelled = true
    }
  }, [])

  // チェック状態をSupabaseとローカルストレージへ保存
  function persist(nextChecked: Set<string>) {
    setSaveState('saving')
    saveQueue.current = saveQueue.current
      .then(() => saveProgress(nextChecked))
      .then(() => {
        setSaveState('saved')
        setErrorMessage(null)
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : '保存に失敗しました。'
        setErrorMessage(message)
        setSaveState('error')
      })
  }

  // チェック項目のトグル操作
  function toggleItem(id: string) {
    const next = new Set(checkedRef.current)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setCheckedIds(next)
    persist(next)
  }

  const progressWidthClass = getProgressWidthClass(achievementRate)

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 py-10 px-4 sm:px-6">
      <main className="max-w-2xl mx-auto flex flex-col gap-6">
        {/* ヘッダー */}
        <header className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
              コレクションチェックリスト
            </h1>

            {/* 保存状態のシンプルな表示 */}
            <div className="text-xs text-zinc-500">
              {saveState === 'saving' && <span className="text-amber-600">保存中...</span>}
              {saveState === 'saved' && <span className="text-emerald-600">保存完了</span>}
              {saveState === 'error' && <span className="text-rose-600">保存エラー</span>}
            </div>
          </div>
          <p className="text-sm text-zinc-500">
            項目をタップすると達成率が自動更新され、状態が保持されます。
          </p>
        </header>

        {/* 達成率カード */}
        <section className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs" aria-live="polite">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              総合達成率
            </span>
            <span className="text-3xl sm:text-4xl font-bold text-zinc-900 font-mono">
              {achievementRate}%
            </span>
          </div>

          {/* プログレスバー */}
          <div className="mt-3 h-2.5 w-full bg-zinc-100 rounded-full overflow-hidden" aria-hidden="true">
            <div
              className={`h-full bg-zinc-800 rounded-full transition-all duration-200 ease-out ${progressWidthClass}`}
            />
          </div>

          <div className="mt-2.5 flex items-center justify-between text-xs text-zinc-500">
            <span>{checkedIds.size} / {CHECKLIST_ITEMS.length} 件完了</span>
            <span>{achievementRate === 100 ? 'すべて完了' : `残り ${CHECKLIST_ITEMS.length - checkedIds.size} 件`}</span>
          </div>
        </section>

        {/* Supabase接続エラー/未設定案内 */}
        {errorMessage && (
          <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            <p className="font-semibold">接続情報のお知らせ</p>
            <p className="mt-0.5 text-amber-700">{errorMessage}</p>
          </div>
        )}

        {/* 1つのつながったチェックリスト（単一リスト） */}
        <section className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-800">チェック項目一覧</h2>
            <span className="text-xs text-zinc-400 font-mono">
              全 {CHECKLIST_ITEMS.length} 項目
            </span>
          </div>

          <ul className="flex flex-col gap-2">
            {CHECKLIST_ITEMS.map((item) => {
              const isChecked = checkedIds.has(item.id)
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-pressed={isChecked}
                    onClick={() => toggleItem(item.id)}
                    className={`w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-lg border text-left transition-colors cursor-pointer text-sm ${
                      isChecked
                        ? 'bg-zinc-50 border-zinc-300'
                        : 'bg-white border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* チェックボックスアイコン */}
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                          isChecked
                            ? 'bg-zinc-900 border border-zinc-900 text-white'
                            : 'border border-zinc-300 bg-white text-transparent'
                        }`}
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                      {/* 項目名（取り消し線なし） */}
                      <span className="font-normal text-zinc-800">
                        {item.label}
                      </span>
                    </div>

                    {/* タグ表示領域（将来の複数サブ要素保持に対応） */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
                        季節: {item.category}
                      </span>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      </main>
    </div>
  )
}

export default App
