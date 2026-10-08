# コレクションチェックリスト (Collection Checker)

ゲームのやりこみ要素や収集要素を効率的に管理し、条件別の達成率を自動で可視化するWebアプリケーションです。  
スプレッドシートでの手動集計・管理の手間を解消し、データの追加・更新だけでリアルタイムに達成率を把握できる体験を提供します。

- **本番公開環境URL**: [https://collection-checker-theta.vercel.app](https://collection-checker-theta.vercel.app)
- **ソースコードリポジトリ**: [https://github.com/sun1129-96/collection-checker](https://github.com/sun1129-96/collection-checker)

---

## 1. 解決する課題と中核的価値

- **対象利用者**: ゲームの収集要素・やりこみ要素の達成率チェッカーをスプレッドシート等で管理しているプレイヤー
- **切実な不便**: 目的ごとにシートを作成するたびに達成率計算の実装が面倒であり、データ追加時の更新作業負荷が大きい
- **中核的価値**: 具体的な集計ロジックを自作することなく、データの追加・更新を行うだけで条件別の達成率が自動で可視化される体験

---

## 2. 実装状況とロードマップ

毎週「画面からデータ保存、配備までが完結する」垂直スライス開発を推進しています。

- [x] **第1週（完了）**: チェックリストの項目タップによる達成率（%）の即時自動計算、Supabaseへの永続化、リロード時の状態保持、Vercel本番公開
- [x] **第2週（完了）**: 1項目内の複数サブ要素（個別タスク/属性）保持と個別チェック、条件（カテゴリ）別達成率バー、動的絞り込み（カテゴリ・進行ステータス）および並べ替え（達成率・五十音・未完了優先）機能、Vitest単体テスト18件配備、AGENTS.mdコーディング規律整備
- [ ] **第3週**: 画像登録・一覧視覚化、画面上からの新規追加・編集・削除
- [ ] **第4週**: テーマ別チェックリストの独立作成・切り替え、キーワード検索機能
- [ ] **第5週**: スプレッドシートからのCSV・テキストデータ一括インポート機能
- [ ] **第6週**: ユーザー認証（個別アカウントによるデータ保護・管理）
- [ ] **第7週**: スマートフォン向け最適化UI、チェックリスト共有URL発行機能
- [ ] **第8週**: 実用データ蓄積環境による実演デモ・本番運用

---

## 3. 技術スタック

| 分類 | 技術 | 選定理由・役割 |
| :--- | :--- | :--- |
| **フロントエンド** | React 19, TypeScript | 高速なリアルタイム集計と厳格な型安全性（strictモード）の担保 |
| **スタイリング** | Tailwind CSS v4 | ユーティリティクラスによる一貫したデザイン設計と保守性 |
| **バックエンド/DB** | Supabase (PostgreSQL) | クレジットカード不要の完全無償枠、コールドスタートなしの即時応答と永続化 |
| **ホスティング** | Vercel | GitHub連動による自動CI/CDデプロイ環境 |
| **テスト** | Vitest | コアな達成率計算ロジックやデータ整合性の単体テスト自動化 |
| **ビルドツール** | Vite 8 | 高速な開発体験と最適化された本番バンドル |

---

## 4. プロジェクト規律 (`.projectrules`)

本プロジェクトでは以下の開発規律を徹底して開発を行っています：

1. **技術スタック**: Vite, React, TypeScript, Tailwind CSS, Supabase, Vitest
2. **TypeScript**: strictモードを遵守し、any型の使用を禁止。データ構造には型定義（interface/type）を必須とする。
3. **スタイリング**: Tailwind CSSのクラスのみを使用し、外部CSSやインラインスタイルは使用しない。
4. **開発手法**: 毎週全層貫通（UI - Logic - Supabase DB - Vercel）を行う垂直スライス開発。
5. **テスト**: 計算ロジック変更時はVitestの単体テストを更新・実行して品質を維持する。
6. **コード**: コード内のコメントやドキュメントは全て日本語で記述する。

---

## 5. ローカル開発環境のセットアップ

### 前提条件
- Node.js (v20以上推奨)
- npm

### インストール手順

```bash
# リポジトリのクローン
git clone https://github.com/sun1129-96/collection-checker.git
cd collection-checker

# 依存パッケージのインストール
npm install
```

### 環境変数の設定

プロジェクトルートに `.env.local` を作成し、Supabaseの接続情報を設定します：

```env
VITE_SUPABASE_URL=https://あなたのプロジェクトID.supabase.co
VITE_SUPABASE_ANON_KEY=あなたのanonキー
```

### データベースの準備 (Supabase)

Supabaseダッシュボードの **SQL Editor** にて、`supabase/schema.sql` の内容を実行してテーブルとRLSポリシーを作成します：

```sql
create table if not exists public.checklist_progress (
  client_id text primary key,
  checked_item_ids text[] not null default '{}'::text[],
  achievement_rate integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.checklist_progress enable row level security;

create policy "anon can manage checklist progress"
on public.checklist_progress
for all
to anon, authenticated
using (true)
with check (true);
```

### コマンド一覧

```bash
# ローカル開発サーバー起動 (http://localhost:5173)
npm run dev

# 単体テスト実行 (Vitest)
npm test

# 型チェックおよび本番ビルド
npm run build

# ビルド成果物のローカルプレビュー
npm run preview

# リント実行
npm run lint
```
