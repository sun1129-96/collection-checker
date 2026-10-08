import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CHECKLIST_ITEMS,
  ITEM_CATEGORIES,
  calcAchievementRate,
  calcConditionAchievement,
  filterItems,
  getItemProgress,
  makeSubItemKey,
  sortItems,
  type FilterCondition,
  type SortOption,
  type StatusFilter,
} from './data/items'
import { isSupabaseConfigured } from './lib/supabase'
import { loadCachedProgress, loadProgress, saveProgress } from './lib/progressStore'

// 達成率（0〜100%）に応じたTailwind CSSの幅クラス（インラインスタイルを完全排除）
function getProgressWidthClass(rate: number): string {
  if (rate <= 0) return 'w-0'
  if (rate <= 5) return 'w-[5%]'
  if (rate <= 11) return 'w-[11%]'
  if (rate <= 22) return 'w-[22%]'
  if (rate <= 25) return 'w-[25%]'
  if (rate <= 33) return 'w-[33%]'
  if (rate <= 44) return 'w-[44%]'
  if (rate <= 50) return 'w-1/2'
  if (rate <= 56) return 'w-[56%]'
  if (rate <= 67) return 'w-[67%]'
  if (rate <= 75) return 'w-3/4'
  if (rate <= 78) return 'w-[78%]'
  if (rate <= 89) return 'w-[89%]'
  if (rate < 100) return 'w-[95%]'
  return 'w-full'
}

function App() {
  // チェック済みサブ要素キーのSet（ローカルキャッシュから即時復元）
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(
    () => new Set(loadCachedProgress().checkedIds),
  )
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(
    isSupabaseConfigured ? null : 'Supabaseの接続情報が未設定です。環境変数にURLとanon keyを追加してください。',
  )

  // 絞り込み条件（カテゴリ、ステータス）
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all')

  // 並べ替え条件
  const [sortOption, setSortOption] = useState<SortOption>('default')

  const saveQueue = useRef(Promise.resolve())

  // 総合達成率（全サブ要素基準）
  const achievementRate = useMemo(() => calcAchievementRate(checkedKeys), [checkedKeys])

  // 絞り込み条件オブジェクト
  const filterCondition = useMemo<FilterCondition>(() => ({
    category: filterCategory,
    status: filterStatus,
  }), [filterCategory, filterStatus])

  // 絞り込みが適用されたアイテム一覧
  const filteredItems = useMemo(
    () => filterItems(CHECKLIST_ITEMS, filterCondition, checkedKeys),
    [filterCondition, checkedKeys],
  )

  // 絞り込みおよび並び替えが適用された表示対象アイテム一覧
  const displayedItems = useMemo(
    () => sortItems(filteredItems, sortOption, checkedKeys),
    [filteredItems, sortOption, checkedKeys],
  )

  // 条件が指定されているかどうかの判定
  const isConditionActive = filterCategory !== 'all' || filterStatus !== 'all'

  // 設定された条件の組み合わせに対する達成状況
  const conditionAchievement = useMemo(
    () => calcConditionAchievement(filteredItems, checkedKeys),
    [filteredItems, checkedKeys],
  )

  // 全サブ要素総数
  const totalSubItemsCount = useMemo(() => {
    return CHECKLIST_ITEMS.reduce((sum, item) => sum + item.subItems.length, 0)
  }, [])

  // チェック済みサブ要素の有効数
  const checkedSubItemsCount = useMemo(() => {
    let count = 0
    for (const item of CHECKLIST_ITEMS) {
      for (const sub of item.subItems) {
        if (checkedKeys.has(makeSubItemKey(item.id, sub.id))) {
          count += 1
        }
      }
    }
    return count
  }, [checkedKeys])

  // マウント時にSupabaseから最新進捗を取得
  useEffect(() => {
    let cancelled = false

    loadProgress()
      .then((snapshot) => {
        if (cancelled) return
        setCheckedKeys(new Set(snapshot.checkedIds))
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

  // 個別サブ要素のトグル操作
  function toggleSubItem(itemId: string, subItemId: string) {
    const key = makeSubItemKey(itemId, subItemId)
    const next = new Set(checkedKeys)
    if (next.has(key)) {
      next.delete(key)
    } else {
      next.add(key)
    }
    setCheckedKeys(next)
    persist(next)
  }

  // アイテム内全サブ要素の一括トグル（利便性向上）
  function toggleAllSubItems(item: (typeof CHECKLIST_ITEMS)[number]) {
    const next = new Set(checkedKeys)
    const allChecked = item.subItems.every((sub) =>
      next.has(makeSubItemKey(item.id, sub.id)),
    )

    for (const sub of item.subItems) {
      const key = makeSubItemKey(item.id, sub.id)
      if (allChecked) {
        next.delete(key)
      } else {
        next.add(key)
      }
    }

    setCheckedKeys(next)
    persist(next)
  }

  const overallProgressWidthClass = getProgressWidthClass(achievementRate)
  const conditionProgressWidthClass = getProgressWidthClass(conditionAchievement.rate)

  // 条件表示用のラベル文字列作成
  const conditionLabel = useMemo(() => {
    const parts: string[] = []
    if (filterCategory !== 'all') {
      parts.push(`季節: ${filterCategory}`)
    }
    if (filterStatus === 'unstarted') {
      parts.push('未着手')
    } else if (filterStatus === 'in_progress') {
      parts.push('進行中')
    } else if (filterStatus === 'completed') {
      parts.push('完了')
    }
    return parts.join(' × ')
  }, [filterCategory, filterStatus])

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 py-8 px-4 sm:px-6 lg:px-8">
      <main className="max-w-3xl mx-auto flex flex-col gap-6">
        {/* ヘッダー */}
        <header className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                第2週：サブ要素・条件別集計
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 mt-1">
                コレクションチェックリスト
              </h1>
            </div>

            {/* クラウド保存ステータス表示 */}
            <div className="text-xs">
              {saveState === 'saving' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  保存中...
                </span>
              )}
              {saveState === 'saved' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  保存完了
                </span>
              )}
              {saveState === 'error' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  同期エラー
                </span>
              )}
              {saveState === 'idle' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                  準備完了
                </span>
              )}
            </div>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500">
            項目内のサブ要素タグをタップして個別にチェックできます。設定した条件の達成率バーと絞り込み・並べ替えが即座に反映されます。
          </p>
        </header>

        {/* 総合達成率カード */}
        <section
          className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs"
          aria-live="polite"
        >
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                総合達成率
              </span>
              <p className="text-xs text-zinc-400 mt-0.5">全サブ要素のコンプリート率</p>
            </div>
            <span className="text-3xl sm:text-4xl font-bold text-zinc-900 font-mono">
              {achievementRate}%
            </span>
          </div>

          {/* 全体プログレスバー */}
          <div
            className="mt-3 h-3 w-full bg-zinc-100 rounded-full overflow-hidden"
            aria-hidden="true"
          >
            <div
              className={`h-full bg-zinc-900 rounded-full transition-all duration-300 ease-out ${overallProgressWidthClass}`}
            />
          </div>

          <div className="mt-2.5 flex items-center justify-between text-xs text-zinc-500">
            <span>
              {checkedSubItemsCount} / {totalSubItemsCount} サブ要素完了
            </span>
            <span>
              {achievementRate === 100
                ? '🎉 全要素コンプリート！'
                : `残り ${totalSubItemsCount - checkedSubItemsCount} 要素`}
            </span>
          </div>
        </section>

        {/* 設定条件の達成率バー（設定した条件の組み合わせのもののみ表示） */}
        {isConditionActive ? (
          <section className="bg-white border border-indigo-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
                  条件別達成率
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                  {conditionLabel}
                </span>
              </div>
              <span className="text-2xl font-bold text-indigo-950 font-mono">
                {conditionAchievement.rate}%
              </span>
            </div>

            {/* 条件別プログレスバー */}
            <div
              className="mt-3 h-2.5 w-full bg-indigo-50 rounded-full overflow-hidden"
              aria-hidden="true"
            >
              <div
                className={`h-full bg-indigo-600 rounded-full transition-all duration-300 ease-out ${conditionProgressWidthClass}`}
              />
            </div>

            <div className="mt-2.5 flex items-center justify-between text-xs text-zinc-500">
              <span>
                {conditionAchievement.checkedCount} / {conditionAchievement.totalCount} サブ要素完了
                （対象: {filteredItems.length} 項目）
              </span>
              <button
                type="button"
                onClick={() => {
                  setFilterCategory('all')
                  setFilterStatus('all')
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
              >
                条件を解除
              </button>
            </div>
          </section>
        ) : null}

        {/* 絞り込み & 並べ替え コントロールバー */}
        <section className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* カテゴリ選択 */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="category-select"
                className="text-xs font-semibold text-zinc-600"
              >
                カテゴリ絞り込み
              </label>
              <select
                id="category-select"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="text-xs bg-zinc-50 border border-zinc-300 rounded-md px-2.5 py-1.5 text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">すべてのカテゴリ</option>
                {ITEM_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    季節: {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* 進行ステータス選択 */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="status-select"
                className="text-xs font-semibold text-zinc-600"
              >
                進行ステータス
              </label>
              <select
                id="status-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as StatusFilter)}
                className="text-xs bg-zinc-50 border border-zinc-300 rounded-md px-2.5 py-1.5 text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">すべて</option>
                <option value="unstarted">未着手 (0%)</option>
                <option value="in_progress">進行中 (1〜99%)</option>
                <option value="completed">コンプリート (100%)</option>
              </select>
            </div>

            {/* 並べ替え選択 */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="sort-select"
                className="text-xs font-semibold text-zinc-600"
              >
                並べ替え
              </label>
              <select
                id="sort-select"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="text-xs bg-zinc-50 border border-zinc-300 rounded-md px-2.5 py-1.5 text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="default">標準順（初期配置）</option>
                <option value="rate_desc">達成率が高い順</option>
                <option value="rate_asc">達成率が低い順</option>
                <option value="uncompleted_first">未完了を優先</option>
                <option value="name_asc">五十音・名前順</option>
              </select>
            </div>
          </div>

          {/* フィルター結果ステータス & リセット */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-xs text-zinc-500">
            <span>
              該当項目: <strong className="text-zinc-800">{displayedItems.length}</strong> / {CHECKLIST_ITEMS.length} 件
            </span>
            {(isConditionActive || sortOption !== 'default') && (
              <button
                type="button"
                onClick={() => {
                  setFilterCategory('all')
                  setFilterStatus('all')
                  setSortOption('default')
                }}
                className="text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
              >
                条件をすべてリセット
              </button>
            )}
          </div>
        </section>

        {/* Supabase接続エラー/未設定案内 */}
        {errorMessage && (
          <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            <p className="font-semibold">接続情報のお知らせ</p>
            <p className="mt-0.5 text-amber-700">{errorMessage}</p>
          </div>
        )}

        {/* 1週目の表示のような一覧表示とタグの組み合わせ */}
        <section className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-800">
              チェック項目一覧
            </h2>
            <span className="text-xs text-zinc-400 font-mono">
              表示: {displayedItems.length} 項目
            </span>
          </div>

          {displayedItems.length === 0 ? (
            <div className="text-center py-10 px-4 border border-dashed border-zinc-200 rounded-lg">
              <p className="text-sm text-zinc-500">指定された条件に一致する項目がありません。</p>
              <button
                type="button"
                onClick={() => {
                  setFilterCategory('all')
                  setFilterStatus('all')
                }}
                className="mt-3 text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
              >
                絞り込み条件をリセット
              </button>
            </div>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {displayedItems.map((item) => {
                const progress = getItemProgress(item, checkedKeys)
                const isAllChecked = progress.isCompleted

                return (
                  <li key={item.id}>
                    <div
                      className={`w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3.5 py-3 rounded-lg border transition-colors ${
                        isAllChecked
                          ? 'bg-zinc-50 border-zinc-300'
                          : 'bg-white border-zinc-200 hover:bg-zinc-50/50 hover:border-zinc-300'
                      }`}
                    >
                      {/* 左側: 一括チェックボタン + 項目名 + 進捗バッジ */}
                      <div className="flex items-center gap-3 min-w-0">
                        {/* 一括チェック/解除アイコンボタン */}
                        <button
                          type="button"
                          aria-label={`${item.label}の全要素を一括チェック/解除`}
                          onClick={() => toggleAllSubItems(item)}
                          title={isAllChecked ? 'すべて解除' : 'すべてチェック'}
                          className={`w-4 h-4 rounded flex items-center justify-center text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                            isAllChecked
                              ? 'bg-zinc-900 border border-zinc-900 text-white'
                              : progress.isInProgress
                              ? 'border-2 border-indigo-600 bg-indigo-50 text-indigo-700 text-[10px] leading-none'
                              : 'border border-zinc-300 bg-white text-transparent hover:border-zinc-400'
                          }`}
                        >
                          {isAllChecked ? '✓' : progress.isInProgress ? '–' : ''}
                        </button>

                        {/* 項目名（取り消し線なし） */}
                        <span className="font-normal text-zinc-900 text-sm truncate">
                          {item.label}
                        </span>

                        {/* 進捗数値バッジ */}
                        <span
                          className={`text-[11px] font-mono px-1.5 py-0.5 rounded shrink-0 font-medium ${
                            isAllChecked
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : progress.isInProgress
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                              : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                          }`}
                        >
                          {progress.checkedCount}/{progress.totalCount} ({progress.rate}%)
                        </span>
                      </div>

                      {/* 右側: サブ要素タグ群（個別にタップ可能） + カテゴリタグ */}
                      <div className="flex items-center flex-wrap gap-1.5 shrink-0 pl-7 sm:pl-0">
                        {item.subItems.map((sub) => {
                          const subKey = makeSubItemKey(item.id, sub.id)
                          const isSubChecked = checkedKeys.has(subKey)

                          return (
                            <button
                              key={sub.id}
                              type="button"
                              aria-pressed={isSubChecked}
                              onClick={() => toggleSubItem(item.id, sub.id)}
                              className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                                isSubChecked
                                  ? 'bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800 shadow-2xs'
                                  : 'bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200 hover:text-zinc-900'
                              }`}
                            >
                              <span className="text-[10px] font-bold">
                                {isSubChecked ? '✓' : '+'}
                              </span>
                              <span>{sub.label}</span>
                            </button>
                          )
                        })}

                        {/* 1週目スタイルのカテゴリタグ */}
                        <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
                          季節: {item.category}
                        </span>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}

export default App


