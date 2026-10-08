import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CHECKLIST_ITEMS,
  MOTIFS,
  SEASONS,
  TAG_CATEGORIES,
  calcAchievementRate,
  calcConditionRate,
  filterItems,
  sortItems,
  type ComparisonCondition,
  type FilterConfig,
  type SortOption,
  type TagCategoryType,
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
  // チェック済み要素IDのSet（ローカルキャッシュから即時復元）
  const [checkedIds, setCheckedIds] = useState<Set<string>>(
    () => new Set(loadCachedProgress().checkedIds),
  )
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(
    isSupabaseConfigured ? null : 'Supabaseの接続情報が未設定です。環境変数にURLとanon keyを追加してください。',
  )

  // 比較表示する条件別達成率リスト（ユーザーが自由に追加・削除・比較可能）
  const [comparedConditions, setComparedConditions] = useState<ComparisonCondition[]>([
    { id: 'init-spring', category: 'season', value: '春' },
    { id: 'init-summer', category: 'season', value: '夏' },
  ])

  // 新規比較条件の追加用State
  const [newConditionCategory, setNewConditionCategory] = useState<TagCategoryType>('season')
  const [newConditionValue, setNewConditionValue] = useState<string>('秋')

  // 絞り込み条件（2段階: まずタグのメイン部分を選択し、その中で絞り込み）
  const [selectedTagCategory, setSelectedTagCategory] = useState<'all' | TagCategoryType>('all')
  const [selectedTagValue, setSelectedTagValue] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'uncompleted' | 'completed'>('all')

  // 並べ替え条件
  const [sortOption, setSortOption] = useState<SortOption>('default')

  const saveQueue = useRef(Promise.resolve())

  // 総合達成率
  const achievementRate = useMemo(() => calcAchievementRate(checkedIds), [checkedIds])

  // 絞り込み設定オブジェクト
  const filterConfig = useMemo<FilterConfig>(() => ({
    tagCategory: selectedTagCategory,
    tagValue: selectedTagValue,
    status: statusFilter,
  }), [selectedTagCategory, selectedTagValue, statusFilter])

  // 絞り込みおよび並び替えが適用された表示対象要素一覧
  const displayedItems = useMemo(() => {
    const filtered = filterItems(CHECKLIST_ITEMS, filterConfig, checkedIds)
    return sortItems(filtered, sortOption, checkedIds)
  }, [filterConfig, sortOption, checkedIds])

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

  // 要素のトグル操作
  function toggleItem(id: string) {
    const next = new Set(checkedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setCheckedIds(next)
    persist(next)
  }

  // 比較条件の追加
  function handleAddCondition() {
    const isAlreadyAdded = comparedConditions.some(
      (c) => c.category === newConditionCategory && c.value === newConditionValue,
    )
    if (isAlreadyAdded) return

    const newCondition: ComparisonCondition = {
      id: `cond-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      category: newConditionCategory,
      value: newConditionValue,
    }
    setComparedConditions([...comparedConditions, newCondition])
  }

  // 比較条件の削除
  function handleRemoveCondition(id: string) {
    setComparedConditions(comparedConditions.filter((c) => c.id !== id))
  }

  // 比較条件カードをクリックしてその条件で絞り込む
  function handleApplyFilterFromCondition(condition: ComparisonCondition) {
    setSelectedTagCategory(condition.category)
    setSelectedTagValue(condition.value)
  }

  // タグメイン部分切り替え時のハンドラ
  function handleTagCategoryChange(cat: 'all' | TagCategoryType) {
    setSelectedTagCategory(cat)
    setSelectedTagValue('all')
  }

  // 比較条件追加フォームでタグ種別が切り替わったときの初期値セット
  function handleNewConditionCategoryChange(cat: TagCategoryType) {
    setNewConditionCategory(cat)
    if (cat === 'season') {
      setNewConditionValue(SEASONS[0])
    } else {
      setNewConditionValue(MOTIFS[0])
    }
  }

  const overallProgressWidthClass = getProgressWidthClass(achievementRate)

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 py-8 px-4 sm:px-6 lg:px-8">
      <main className="max-w-3xl mx-auto flex flex-col gap-6">
        {/* ヘッダー */}
        <header className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                第2週：要素一覧・条件別達成率比較
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
            各要素をチェックすると達成率が自動更新されます。比較したい条件を追加して達成率の比較を行えます。
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
              <p className="text-xs text-zinc-400 mt-0.5">全{CHECKLIST_ITEMS.length}要素のコンプリート状況</p>
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
              {checkedIds.size} / {CHECKLIST_ITEMS.length} 要素完了
            </span>
            <span>
              {achievementRate === 100
                ? '🎉 すべての要素をコンプリート！'
                : `残り ${CHECKLIST_ITEMS.length - checkedIds.size} 要素`}
            </span>
          </div>
        </section>

        {/* 条件別達成率の比較セクション（条件の追加・比較・削除が可能） */}
        <section className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-800">条件別達成率の比較</h2>
              <p className="text-xs text-zinc-400">比較したい条件を追加して達成率を並べて確認できます</p>
            </div>
            {comparedConditions.length > 0 && (
              <button
                type="button"
                onClick={() => setComparedConditions([])}
                className="text-xs text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                すべてクリア
              </button>
            )}
          </div>

          {/* 比較バー一覧 */}
          {comparedConditions.length === 0 ? (
            <div className="text-center py-6 px-4 border border-dashed border-zinc-200 rounded-lg text-xs text-zinc-500">
              現在比較中の条件がありません。下記のフォームから条件を追加してください。
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {comparedConditions.map((cond) => {
                const result = calcConditionRate(cond, checkedIds)
                const barWidthClass = getProgressWidthClass(result.rate)
                const isSeason = cond.category === 'season'

                return (
                  <div
                    key={cond.id}
                    className="p-3.5 rounded-lg border border-zinc-200 bg-zinc-50/50 flex flex-col gap-2 hover:border-zinc-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-medium border ${
                            isSeason
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                          }`}
                        >
                          {isSeason ? '季節' : 'モチーフ'}: {cond.value}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {result.checkedCount} / {result.totalCount} 完了
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <span className="text-base font-bold font-mono text-zinc-900">
                          {result.rate}%
                        </span>
                        <button
                          type="button"
                          onClick={() => handleApplyFilterFromCondition(cond)}
                          className="text-[11px] text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                          title="この条件で一覧を絞り込む"
                        >
                          絞り込み
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveCondition(cond.id)}
                          className="text-zinc-400 hover:text-zinc-600 p-0.5 rounded cursor-pointer leading-none text-sm"
                          aria-label="この条件を削除"
                          title="比較から削除"
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    {/* プログレスバー */}
                    <div className="h-2 w-full bg-zinc-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          isSeason ? 'bg-amber-600' : 'bg-indigo-600'
                        } rounded-full transition-all duration-300 ${barWidthClass}`}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* 条件追加フォーム */}
          <div className="pt-3 border-t border-zinc-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <span className="text-xs font-semibold text-zinc-600 shrink-0">
              + 比較条件を追加:
            </span>

            {/* タグ種別選択 */}
            <select
              value={newConditionCategory}
              onChange={(e) => handleNewConditionCategoryChange(e.target.value as TagCategoryType)}
              className="text-xs bg-white border border-zinc-300 rounded-md px-2.5 py-1.5 text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {TAG_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>

            {/* タグ値選択 */}
            <select
              value={newConditionValue}
              onChange={(e) => setNewConditionValue(e.target.value)}
              className="text-xs bg-white border border-zinc-300 rounded-md px-2.5 py-1.5 text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {(newConditionCategory === 'season' ? SEASONS : MOTIFS).map((val) => (
                <option key={val} value={val}>
                  {val}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleAddCondition}
              className="text-xs px-3 py-1.5 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 font-medium transition-colors cursor-pointer shrink-0"
            >
              比較リストに追加
            </button>
          </div>
        </section>

        {/* 絞り込み & 並べ替え コントロールバー（タグのメイン部分選択 → その中での絞り込み） */}
        <section className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between pb-1 border-b border-zinc-100">
            <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-wide">
              絞り込み・並べ替え
            </h3>
            {(selectedTagCategory !== 'all' || selectedTagValue !== 'all' || statusFilter !== 'all' || sortOption !== 'default') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTagCategory('all')
                  setSelectedTagValue('all')
                  setStatusFilter('all')
                  setSortOption('default')
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
              >
                条件をすべてリセット
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Step 1: タグのメイン部分の選択 */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="tag-main-select"
                className="text-xs font-semibold text-zinc-600"
              >
                1. 絞り込みタグ軸
              </label>
              <select
                id="tag-main-select"
                value={selectedTagCategory}
                onChange={(e) => handleTagCategoryChange(e.target.value as 'all' | TagCategoryType)}
                className="text-xs bg-zinc-50 border border-zinc-300 rounded-md px-2.5 py-1.5 text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">すべての軸（全要素）</option>
                <option value="season">季節</option>
                <option value="motif">モチーフ</option>
              </select>
            </div>

            {/* Step 2: その中での値絞り込み */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="tag-value-select"
                className="text-xs font-semibold text-zinc-600"
              >
                2. タグの値
              </label>
              <select
                id="tag-value-select"
                disabled={selectedTagCategory === 'all'}
                value={selectedTagValue}
                onChange={(e) => setSelectedTagValue(e.target.value)}
                className="text-xs bg-zinc-50 border border-zinc-300 rounded-md px-2.5 py-1.5 text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="all">
                  {selectedTagCategory === 'all'
                    ? '（軸を選択してください）'
                    : selectedTagCategory === 'season'
                    ? 'すべての季節'
                    : 'すべてのモチーフ'}
                </option>
                {selectedTagCategory === 'season' &&
                  SEASONS.map((s) => (
                    <option key={s} value={s}>
                      季節: {s}
                    </option>
                  ))}
                {selectedTagCategory === 'motif' &&
                  MOTIFS.map((m) => (
                    <option key={m} value={m}>
                      モチーフ: {m}
                    </option>
                  ))}
              </select>
            </div>

            {/* 進行ステータス */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="status-select"
                className="text-xs font-semibold text-zinc-600"
              >
                3. 完了状態
              </label>
              <select
                id="status-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'uncompleted' | 'completed')}
                className="text-xs bg-zinc-50 border border-zinc-300 rounded-md px-2.5 py-1.5 text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">すべて</option>
                <option value="uncompleted">未完了のみ</option>
                <option value="completed">完了のみ</option>
              </select>
            </div>

            {/* 並べ替え */}
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
                <option value="uncompleted_first">未完了を優先</option>
                <option value="completed_first">完了を優先</option>
                <option value="name_asc">五十音・名前順</option>
              </select>
            </div>
          </div>

          <div className="pt-2 text-xs text-zinc-500 flex items-center justify-between">
            <span>
              該当要素: <strong className="text-zinc-800">{displayedItems.length}</strong> / {CHECKLIST_ITEMS.length} 件
            </span>
            {selectedTagCategory !== 'all' && selectedTagValue !== 'all' && (
              <span className="text-zinc-400">
                選択中: {selectedTagCategory === 'season' ? '季節' : 'モチーフ'}: {selectedTagValue}
              </span>
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

        {/* チェック項目一覧（最小単位の要素を基準、タグの組み合わせ表示） */}
        <section className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-800">
              チェック要素一覧
            </h2>
            <span className="text-xs text-zinc-400 font-mono">
              表示: {displayedItems.length} 要素
            </span>
          </div>

          {displayedItems.length === 0 ? (
            <div className="text-center py-10 px-4 border border-dashed border-zinc-200 rounded-lg">
              <p className="text-sm text-zinc-500">指定された条件に一致する要素がありません。</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedTagCategory('all')
                  setSelectedTagValue('all')
                  setStatusFilter('all')
                }}
                className="mt-3 text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
              >
                絞り込み条件をリセット
              </button>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {displayedItems.map((item) => {
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
                      {/* 左側: チェックボックス + 要素名 */}
                      <div className="flex items-center gap-3 min-w-0">
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
                        <span className={`font-normal truncate ${isChecked ? 'text-zinc-600' : 'text-zinc-900'}`}>
                          {item.label}
                        </span>
                      </div>

                      {/* 右側: タグの組み合わせ（モチーフ: 桜, 季節: 春） */}
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
                          モチーフ: {item.motif}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
                          季節: {item.season}
                        </span>
                      </div>
                    </button>
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



