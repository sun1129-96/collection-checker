import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CHECKLIST_ITEMS,
  MOTIFS,
  SEASONS,
  calcAchievementRate,
  calcComparisonConditionRate,
  calcMultiConditionRate,
  filterItems,
  formatConditionLabel,
  sortItems,
  type ComparisonCondition,
  type MatchMode,
  type MultiFilterConfig,
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

/**
 * 2つの比較条件が同一であるかを判定（重複追加防止、matchModeも照合）
 */
function isSameCondition(
  a: Pick<ComparisonCondition, 'seasons' | 'motifs' | 'matchMode'>,
  b: Pick<ComparisonCondition, 'seasons' | 'motifs' | 'matchMode'>,
): boolean {
  if ((a.matchMode ?? 'and') !== (b.matchMode ?? 'and')) {
    return false
  }
  if (a.seasons.length !== b.seasons.length || a.motifs.length !== b.motifs.length) {
    return false
  }
  const aSeasons = [...a.seasons].sort()
  const bSeasons = [...b.seasons].sort()
  if (!aSeasons.every((s, i) => s === bSeasons[i])) return false

  const aMotifs = [...a.motifs].sort()
  const bMotifs = [...b.motifs].sort()
  return aMotifs.every((m, i) => m === bMotifs[i])
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

  // 比較表示する条件別達成率リスト（複合条件・一致モードに対応）
  const [comparedConditions, setComparedConditions] = useState<ComparisonCondition[]>([
    { id: 'init-spring', seasons: ['春'], motifs: [], matchMode: 'and' },
    { id: 'init-summer', seasons: ['夏'], motifs: [], matchMode: 'and' },
  ])

  // 新規比較条件作成フォーム用State（軸を選択してチェック形式で複数・複合指定）
  const [newCondSeasons, setNewCondSeasons] = useState<string[]>([])
  const [newCondMotifs, setNewCondMotifs] = useState<string[]>([])
  const [newCondMatchMode, setNewCondMatchMode] = useState<MatchMode>('and')
  const [activeNewCondTab, setActiveNewCondTab] = useState<TagCategoryType>('season')

  // 絞り込み条件（複数選択・AND/OR一致モード対応）
  const [filterSeasons, setFilterSeasons] = useState<string[]>([])
  const [filterMotifs, setFilterMotifs] = useState<string[]>([])
  const [filterMatchMode, setFilterMatchMode] = useState<MatchMode>('and')
  const [activeFilterTab, setActiveFilterTab] = useState<TagCategoryType>('season')
  const [statusFilter, setStatusFilter] = useState<'all' | 'uncompleted' | 'completed'>('all')

  // 並べ替え条件
  const [sortOption, setSortOption] = useState<SortOption>('default')

  const saveQueue = useRef(Promise.resolve())

  // 総合達成率
  const achievementRate = useMemo(() => calcAchievementRate(checkedIds), [checkedIds])

  // 絞り込み設定オブジェクト
  const filterConfig = useMemo<MultiFilterConfig>(() => ({
    seasons: filterSeasons,
    motifs: filterMotifs,
    status: statusFilter,
    matchMode: filterMatchMode,
  }), [filterSeasons, filterMotifs, statusFilter, filterMatchMode])

  // 絞り込みおよび並び替えが適用された表示対象要素一覧
  const displayedItems = useMemo(() => {
    const filtered = filterItems(CHECKLIST_ITEMS, filterConfig, checkedIds)
    return sortItems(filtered, sortOption, checkedIds)
  }, [filterConfig, sortOption, checkedIds])

  // フィルターが適用されているかどうかの判定
  const isFilterActive = filterSeasons.length > 0 || filterMotifs.length > 0 || statusFilter !== 'all'

  // 現在の絞り込み条件に対する達成状況
  const currentFilteredRate = useMemo(
    () => calcMultiConditionRate(filterConfig, checkedIds),
    [filterConfig, checkedIds],
  )

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

  // 比較条件作成用：季節トグル
  function toggleNewCondSeason(season: string) {
    if (newCondSeasons.includes(season)) {
      setNewCondSeasons(newCondSeasons.filter((s) => s !== season))
    } else {
      setNewCondSeasons([...newCondSeasons, season])
    }
  }

  // 比較条件作成用：モチーフトグル
  function toggleNewCondMotif(motif: string) {
    if (newCondMotifs.includes(motif)) {
      setNewCondMotifs(newCondMotifs.filter((m) => m !== motif))
    } else {
      setNewCondMotifs([...newCondMotifs, motif])
    }
  }

  // 比較条件の追加
  function handleAddCustomCondition() {
    if (newCondSeasons.length === 0 && newCondMotifs.length === 0) return

    const isDuplicate = comparedConditions.some((c) =>
      isSameCondition(c, {
        seasons: newCondSeasons,
        motifs: newCondMotifs,
        matchMode: newCondMatchMode,
      }),
    )
    if (isDuplicate) return

    const newCondition: ComparisonCondition = {
      id: `cond-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      seasons: [...newCondSeasons],
      motifs: [...newCondMotifs],
      matchMode: newCondMatchMode,
    }
    setComparedConditions([...comparedConditions, newCondition])
    setNewCondSeasons([])
    setNewCondMotifs([])
  }

  // 現在の一覧絞り込み条件を比較リストに追加
  function handleAddCurrentFilterToComparison() {
    if (filterSeasons.length === 0 && filterMotifs.length === 0) return

    const isDuplicate = comparedConditions.some((c) =>
      isSameCondition(c, {
        seasons: filterSeasons,
        motifs: filterMotifs,
        matchMode: filterMatchMode,
      }),
    )
    if (isDuplicate) return

    const newCondition: ComparisonCondition = {
      id: `cond-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      seasons: [...filterSeasons],
      motifs: [...filterMotifs],
      matchMode: filterMatchMode,
    }
    setComparedConditions([...comparedConditions, newCondition])
  }

  // 比較条件の削除
  function handleRemoveCondition(id: string) {
    setComparedConditions(comparedConditions.filter((c) => c.id !== id))
  }

  // 季節フィルターのトグル操作
  function toggleSeasonFilter(season: string) {
    if (filterSeasons.includes(season)) {
      setFilterSeasons(filterSeasons.filter((s) => s !== season))
    } else {
      setFilterSeasons([...filterSeasons, season])
    }
  }

  // モチーフフィルターのトグル操作
  function toggleMotifFilter(motif: string) {
    if (filterMotifs.includes(motif)) {
      setFilterMotifs(filterMotifs.filter((m) => m !== motif))
    } else {
      setFilterMotifs([...filterMotifs, motif])
    }
  }

  // 比較条件カードをクリックしてその条件で絞り込む
  function handleApplyFilterFromCondition(condition: ComparisonCondition) {
    setFilterSeasons([...condition.seasons])
    setFilterMotifs([...condition.motifs])
    setFilterMatchMode(condition.matchMode ?? 'and')
    if (condition.seasons.length > 0 && condition.motifs.length === 0) {
      setActiveFilterTab('season')
    } else if (condition.motifs.length > 0 && condition.seasons.length === 0) {
      setActiveFilterTab('motif')
    }
  }

  // フィルターのリセット
  function handleResetFilters() {
    setFilterSeasons([])
    setFilterMotifs([])
    setFilterMatchMode('and')
    setStatusFilter('all')
    setSortOption('default')
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
            各要素をチェックすると達成率が自動更新されます。軸を選んでチェック形式で複数条件の組み合わせ絞り込みを行えます。
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

        {/* 条件別達成率の比較セクション（軸を選んでチェック形式で複数条件の比較が可能） */}
        <section className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-800">条件別達成率の比較</h2>
              <p className="text-xs text-zinc-400">
                軸を選んでチェックした組み合わせ条件（AND完全一致／ORいずれかを含む）を追加し、達成率を並べて比較できます
              </p>
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
              現在比較中の条件がありません。下記の「比較条件を作成・追加」から条件を追加してください。
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {comparedConditions.map((cond) => {
                const result = calcComparisonConditionRate(cond, checkedIds)
                const barWidthClass = getProgressWidthClass(result.rate)
                const hasSeason = cond.seasons.length > 0
                const hasMotif = cond.motifs.length > 0
                const isHybrid = hasSeason && hasMotif
                const isOrMode = cond.matchMode === 'or'

                return (
                  <div
                    key={cond.id}
                    aria-label={`比較条件: ${formatConditionLabel(cond)}`}
                    className="p-3.5 rounded-lg border border-zinc-200 bg-zinc-50/50 flex flex-col gap-2 hover:border-zinc-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {hasSeason && (
                          <span className="text-xs px-2 py-0.5 rounded font-medium border bg-amber-50 text-amber-800 border-amber-200">
                            季節: {cond.seasons.join(', ')}
                          </span>
                        )}
                        {isHybrid && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                              isOrMode
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-purple-50 text-purple-700 border-purple-200'
                            }`}
                          >
                            {isOrMode ? 'または (OR)' : 'かつ (AND)'}
                          </span>
                        )}
                        {hasMotif && (
                          <span className="text-xs px-2 py-0.5 rounded font-medium border bg-indigo-50 text-indigo-800 border-indigo-200">
                            モチーフ: {cond.motifs.join(', ')}
                          </span>
                        )}
                        {!hasSeason && !hasMotif && (
                          <span className="text-xs px-2 py-0.5 rounded font-medium border bg-zinc-100 text-zinc-700 border-zinc-200">
                            すべての要素
                          </span>
                        )}
                        <span className="text-xs text-zinc-500 ml-1">
                          {result.checkedCount} / {result.totalCount} 完了
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
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
                          isHybrid
                            ? isOrMode
                              ? 'bg-emerald-600'
                              : 'bg-purple-600'
                            : hasSeason
                            ? 'bg-amber-600'
                            : 'bg-indigo-600'
                        } rounded-full transition-all duration-300 ${barWidthClass}`}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* 比較条件の作成・追加パネル（軸を選択してチェック形式で指定） */}
          <div className="pt-3 border-t border-zinc-100 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-700">
                + 比較条件を作成・追加
              </span>
              {(filterSeasons.length > 0 || filterMotifs.length > 0) && (
                <button
                  type="button"
                  onClick={handleAddCurrentFilterToComparison}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                  title="一覧で絞り込んでいる現在の条件（AND/OR含む）を比較に追加します"
                >
                  ⚡ 現在の絞り込み条件を追加
                </button>
              )}
            </div>

            {/* 軸選択タブ & 一致モード選択 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              {/* 軸選択タブ */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 shrink-0">
                  設定する軸:
                </span>
                <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setActiveNewCondTab('season')}
                    className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                      activeNewCondTab === 'season'
                        ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    季節 {newCondSeasons.length > 0 && `(${newCondSeasons.length})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveNewCondTab('motif')}
                    className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                      activeNewCondTab === 'motif'
                        ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    モチーフ {newCondMotifs.length > 0 && `(${newCondMotifs.length})`}
                  </button>
                </div>
              </div>

              {/* 一致条件（AND: 完全一致 / OR: いずれかを含む） */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 shrink-0">
                  一致条件:
                </span>
                <div className="flex items-center gap-1 p-0.5 bg-zinc-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setNewCondMatchMode('and')}
                    className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                      newCondMatchMode === 'and'
                        ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    完全一致 (AND)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCondMatchMode('or')}
                    className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                      newCondMatchMode === 'or'
                        ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    いずれかを含む (OR)
                  </button>
                </div>
              </div>
            </div>

            {/* チェック形式の項目選択ピル */}
            <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-700">
                  {activeNewCondTab === 'season' ? '季節をチェック（複数選択可）' : 'モチーフをチェック（複数選択可）'}
                </span>
                <div className="flex items-center gap-2 text-[11px]">
                  {activeNewCondTab === 'season' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setNewCondSeasons([...SEASONS])}
                        className="text-indigo-600 hover:underline cursor-pointer"
                      >
                        全選択
                      </button>
                      <span className="text-zinc-300">|</span>
                      <button
                        type="button"
                        onClick={() => setNewCondSeasons([])}
                        className="text-zinc-500 hover:underline cursor-pointer"
                      >
                        クリア
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setNewCondMotifs([...MOTIFS])}
                        className="text-indigo-600 hover:underline cursor-pointer"
                      >
                        全選択
                      </button>
                      <span className="text-zinc-300">|</span>
                      <button
                        type="button"
                        onClick={() => setNewCondMotifs([])}
                        className="text-zinc-500 hover:underline cursor-pointer"
                      >
                        クリア
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* ピル型チェックボックス群 */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {activeNewCondTab === 'season'
                  ? SEASONS.map((season) => {
                      const isChecked = newCondSeasons.includes(season)
                      return (
                        <button
                          key={season}
                          type="button"
                          aria-pressed={isChecked}
                          onClick={() => toggleNewCondSeason(season)}
                          className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-amber-600 text-white border-amber-600 font-medium shadow-2xs'
                              : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100 hover:border-zinc-400'
                          }`}
                        >
                          <span className="text-[10px] font-bold">
                            {isChecked ? '✓' : '□'}
                          </span>
                          <span>{season}</span>
                        </button>
                      )
                    })
                  : MOTIFS.map((motif) => {
                      const isChecked = newCondMotifs.includes(motif)
                      return (
                        <button
                          key={motif}
                          type="button"
                          aria-pressed={isChecked}
                          onClick={() => toggleNewCondMotif(motif)}
                          className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-indigo-600 text-white border-indigo-600 font-medium shadow-2xs'
                              : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100 hover:border-zinc-400'
                          }`}
                        >
                          <span className="text-[10px] font-bold">
                            {isChecked ? '✓' : '□'}
                          </span>
                          <span>{motif}</span>
                        </button>
                      )
                    })}
              </div>
            </div>

            {/* 条件プレビュー ＆ 追加ボタン */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="text-zinc-500 text-[11px] font-medium">作成中の条件:</span>
                {newCondSeasons.length === 0 && newCondMotifs.length === 0 ? (
                  <span className="text-zinc-400 italic text-xs">未選択（上の項目をチェックしてください）</span>
                ) : (
                  <>
                    {newCondSeasons.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                        季節: {newCondSeasons.join(', ')}
                        <button
                          type="button"
                          onClick={() => setNewCondSeasons([])}
                          className="text-amber-500 hover:text-amber-800 cursor-pointer text-[10px]"
                        >
                          ×
                        </button>
                      </span>
                    )}
                    {newCondSeasons.length > 0 && newCondMotifs.length > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                          newCondMatchMode === 'or'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}
                      >
                        {newCondMatchMode === 'or' ? 'または (OR)' : 'かつ (AND)'}
                      </span>
                    )}
                    {newCondMotifs.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200">
                        モチーフ: {newCondMotifs.join(', ')}
                        <button
                          type="button"
                          onClick={() => setNewCondMotifs([])}
                          className="text-indigo-500 hover:text-indigo-800 cursor-pointer text-[10px]"
                        >
                          ×
                        </button>
                      </span>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {(newCondSeasons.length > 0 || newCondMotifs.length > 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewCondSeasons([])
                      setNewCondMotifs([])
                    }}
                    className="text-xs text-zinc-500 hover:text-zinc-700 px-2 py-1.5 cursor-pointer"
                  >
                    選択クリア
                  </button>
                )}
                <button
                  type="button"
                  disabled={newCondSeasons.length === 0 && newCondMotifs.length === 0}
                  onClick={handleAddCustomCondition}
                  className={`text-xs px-3.5 py-1.5 rounded-md font-medium transition-colors ${
                    newCondSeasons.length === 0 && newCondMotifs.length === 0
                      ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                      : 'bg-zinc-900 text-white hover:bg-zinc-800 cursor-pointer'
                  }`}
                >
                  この条件を比較に追加
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 絞り込み & 並べ替え コントロールバー（軸を選択し、チェック形式で項目を選択） */}
        <section className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs flex flex-col gap-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
            <div>
              <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wide">
                絞り込み（軸を選択してチェック）
              </h3>
              <p className="text-[11px] text-zinc-400">
                軸ごとに複数の項目をチェックして組み合わせ絞り込みができます
              </p>
            </div>
            {isFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
              >
                すべての条件を解除
              </button>
            )}
          </div>

          {/* 軸選択タブ & 結合方法（AND / OR） */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* 軸選択タブ（季節 / モチーフ） */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-600 shrink-0">
                絞り込み軸:
              </span>
              <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setActiveFilterTab('season')}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                    activeFilterTab === 'season'
                      ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  季節 {filterSeasons.length > 0 && `(${filterSeasons.length})`}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilterTab('motif')}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                    activeFilterTab === 'motif'
                      ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  モチーフ {filterMotifs.length > 0 && `(${filterMotifs.length})`}
                </button>
              </div>
            </div>

            {/* 結合方法（AND: 完全一致 / OR: いずれかを含む） */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-600 shrink-0">
                結合方法:
              </span>
              <div className="flex items-center gap-1 p-0.5 bg-zinc-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setFilterMatchMode('and')}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                    filterMatchMode === 'and'
                      ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  完全一致 (AND)
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMatchMode('or')}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                    filterMatchMode === 'or'
                      ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  いずれかを含む (OR)
                </button>
              </div>
              <span className="text-[11px] text-zinc-400 hidden sm:inline">
                {filterMatchMode === 'and' ? '選択した全項目を含む要素のみ' : '選択したいずれかの項目を含む要素'}
              </span>
            </div>
          </div>

          {/* 選択中の軸に応じたチェック形式項目セレクター */}
          <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-700">
                {activeFilterTab === 'season' ? '季節を選択（複数選択可）' : 'モチーフを選択（複数選択可）'}
              </span>
              <div className="flex items-center gap-2 text-[11px]">
                {activeFilterTab === 'season' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setFilterSeasons([...SEASONS])}
                      className="text-indigo-600 hover:underline cursor-pointer"
                    >
                      全選択
                    </button>
                    <span className="text-zinc-300">|</span>
                    <button
                      type="button"
                      onClick={() => setFilterSeasons([])}
                      className="text-zinc-500 hover:underline cursor-pointer"
                    >
                      クリア
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setFilterMotifs([...MOTIFS])}
                      className="text-indigo-600 hover:underline cursor-pointer"
                    >
                      全選択
                    </button>
                    <span className="text-zinc-300">|</span>
                    <button
                      type="button"
                      onClick={() => setFilterMotifs([])}
                      className="text-zinc-500 hover:underline cursor-pointer"
                    >
                      クリア
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* チェック形式の項目群（ピル型チェックボックス） */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {activeFilterTab === 'season'
                ? SEASONS.map((season) => {
                    const isChecked = filterSeasons.includes(season)
                    return (
                      <button
                        key={season}
                        type="button"
                        aria-pressed={isChecked}
                        onClick={() => toggleSeasonFilter(season)}
                        className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-amber-600 text-white border-amber-600 font-medium shadow-2xs'
                            : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100 hover:border-zinc-400'
                        }`}
                      >
                        <span className="text-[10px] font-bold">
                          {isChecked ? '✓' : '□'}
                        </span>
                        <span>{season}</span>
                      </button>
                    )
                  })
                : MOTIFS.map((motif) => {
                    const isChecked = filterMotifs.includes(motif)
                    return (
                      <button
                        key={motif}
                        type="button"
                        aria-pressed={isChecked}
                        onClick={() => toggleMotifFilter(motif)}
                        className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-indigo-600 text-white border-indigo-600 font-medium shadow-2xs'
                            : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100 hover:border-zinc-400'
                        }`}
                      >
                        <span className="text-[10px] font-bold">
                          {isChecked ? '✓' : '□'}
                        </span>
                        <span>{motif}</span>
                      </button>
                    )
                  })}
            </div>
          </div>

          {/* 適用中のフィルターバッジ表示 */}
          {(filterSeasons.length > 0 || filterMotifs.length > 0) && (
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center flex-wrap gap-1.5">
                <span className="text-zinc-500 text-[11px] font-medium">適用中:</span>
                {filterSeasons.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                    <span>季節: {filterSeasons.join(', ')}</span>
                    <button
                      type="button"
                      onClick={() => setFilterSeasons([])}
                      className="text-amber-500 hover:text-amber-800 cursor-pointer text-[10px]"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filterSeasons.length > 0 && filterMotifs.length > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                      filterMatchMode === 'or'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-purple-50 text-purple-700 border-purple-200'
                    }`}
                  >
                    {filterMatchMode === 'or' ? 'または (OR)' : 'かつ (AND)'}
                  </span>
                )}
                {filterMotifs.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200">
                    <span>モチーフ: {filterMotifs.join(', ')}</span>
                    <button
                      type="button"
                      onClick={() => setFilterMotifs([])}
                      className="text-indigo-500 hover:text-indigo-800 cursor-pointer text-[10px]"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleAddCurrentFilterToComparison}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                title="この絞り込み条件（AND/OR含む）を上部の条件別達成率比較リストに追加します"
              >
                + この絞り込みを比較に追加
              </button>
            </div>
          )}

          {/* 進行ステータス & 並べ替え */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-zinc-100">
            <div className="flex flex-col gap-1">
              <label htmlFor="status-select" className="text-xs font-semibold text-zinc-600">
                完了状態の絞り込み
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

            <div className="flex flex-col gap-1">
              <label htmlFor="sort-select" className="text-xs font-semibold text-zinc-600">
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

          <div className="pt-2 text-xs text-zinc-500 flex items-center justify-between border-t border-zinc-100">
            <span>
              該当要素: <strong className="text-zinc-800">{displayedItems.length}</strong> / {CHECKLIST_ITEMS.length} 件
            </span>
            {isFilterActive && (
              <span className="text-zinc-500 font-mono">
                達成率: {currentFilteredRate.rate}% ({currentFilteredRate.checkedCount}/{currentFilteredRate.totalCount})
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
                onClick={handleResetFilters}
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

                      {/* 右側: タグの組み合わせ（複数要素・歌唱者等に対応） */}
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
                          モチーフ: {Array.isArray(item.motif) ? item.motif.join(', ') : item.motif}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
                          季節: {Array.isArray(item.season) ? item.season.join(', ') : item.season}
                        </span>
                        {Array.isArray(item.singers) && item.singers.length > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
                            歌唱者: {item.singers.join(', ')}
                          </span>
                        )}
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



