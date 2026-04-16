# 開発者向けガイド

`calendit` の設計思想・開発フロー・ロードマップについての解説です。

---

## アーキテクチャ

```
src/
├── index.ts              # エントリポイント（コマンド登録 + 中央エラーハンドラ）
├── commands/             # CLI コマンド定義（1コマンド1ファイル）
│   ├── auth.ts, config.ts, query.ts, apply.ts, add.ts, cal.ts
│   └── shared.ts         # コマンド間共通ユーティリティ
├── core/                 # ビジネスロジック
│   ├── errors.ts         # カスタムエラー階層
│   ├── logger.ts         # レベル制御付きロガー
│   ├── config.ts         # 設定の永続化と型安全なアクセス
│   ├── auth.ts           # OAuth2 認証フロー
│   ├── datetime.ts       # 日時パースとバリデーション
│   ├── formatter.ts      # Markdown/CSV/JSON ↔ 内部モデル変換
│   └── applier.ts        # 予定の差分計算と適用ロジック
├── services/             # カレンダープロバイダ実装
│   ├── base.ts           # ICalendarService インターフェース
│   ├── google.ts         # Google Calendar API
│   ├── outlook.ts        # Microsoft Graph API
│   └── mock.ts           # テスト用モック
└── types/index.ts        # 共通型定義
```

**依存関係の方向**: `commands` → `core` / `services`、`services` → `core/errors`, `core/logger`

---

## エラーハンドリング

`src/core/errors.ts` に独自のエラー階層を定義しています。

```
CalendarError (基底)
├── ConfigError    — 設定ファイルの不備・未設定
├── AuthError      — OAuth トークンの取得/更新失敗
├── ValidationError — 入力値の不整合（日時逆転、ID重複など）
└── ApiError       — Google / Outlook API との通信エラー
```

各エラーには `hint` フィールドがあり、ユーザーが次に取るべき行動を提示します。

```
設定エラー: Google 認証情報が未設定です。
ヒント: `calendit config set-google --id <id> --secret <secret>` を実行してください。
```

全エラーは `src/index.ts` の `handleError()` で集中管理されており、コマンドごとに分散した `try/catch + process.exit` はありません。

---

## ロギング

`src/core/logger.ts` に軽量ロガーを実装しています。

| レベル | 用途 |
|---|---|
| `debug` | API リクエスト詳細、日時パース結果、同期レンジ計算 |
| `info` | 通常の操作進捗（デフォルト） |
| `warn` | Markdown パース時のスキップ警告など |
| `error` | エラーメッセージ |

`--verbose` フラグまたは `DEBUG=calendit` 環境変数で `debug` レベルを有効化できます。

---

## テスト

### 自律的テスト環境

`docs/tests.md` に Markdown 形式でテストケースを定義します。`src/test_runner.ts` がこのファイルを解析し、記載されたコマンドを実行して出力を検証します。

```bash
npm test
```

- **独立したテストケース**（`--dry-run` 等）は `Promise.allSettled` で並列実行されます。
- **依存関係のあるケース**（前のコマンド結果を使うもの）は直列で実行されます。
- 各テスト実行は **一時ディレクトリ** に隔離されており、開発環境の設定に影響しません。

### モックサービス

テスト実行時は `CALENDIT_MOCK=true` が自動設定され、実際の API を叩かずに `src/services/mock.ts` で動作を検証します。`mock_db.json` に一時的なイベントデータを保持します。

### 新しいテストケースの追加

`docs/tests.md` に以下の形式で追記するだけでテストランナーが自動的に検出します。

````markdown
### TC-XX: テストケース名

```sh
calendit add --summary "Test" --start "tomorrow 10:00" --dry-run
```
```expect
✅ [Dry Run] Event would be added: "Test"
```
````

失敗を期待するケースは ` ```expect-fail ` を使います。

---

## バージョン管理

バージョン番号は `YYYY-mmdd-[Sequence]` 形式 (例: `2026-0416-01.02`) で管理されています。

変更を加えた際は以下のドキュメントを必ず更新してください:

| ファイル | 更新内容 |
|---|---|
| `src/index.ts` | `.version("...")` の文字列 |
| `spec/spec.md` | 最新バージョン番号と変更内容の概要 |
| `spec/history/YYYY-mmdd-XX.XX.md` | その版での詳細変更ログ |

---

## 設定ファイルの保存場所

```
~/.config/calendit/
├── config.json             # コンテキスト・認証情報設定
├── google_token.json       # Google デフォルトトークン
├── google_token_<id>.json  # Google コンテキスト別トークン
└── msal_cache.json         # Outlook (MSAL) トークンキャッシュ
```

設定ディレクトリは `CALENDIT_CONFIG_DIR` 環境変数で変更できます（テスト時の隔離に利用）。

---

## ロードマップ

### 実装済み

| 機能 | 概要 |
|---|---|
| Google カレンダー CRUD | `query`, `apply`, `add`, `cal` |
| Outlook カレンダー CRUD | Microsoft Graph API 経由 |
| Markdown 双方向同期 | `query` → 編集 → `apply` ワークフロー |
| コンテキスト管理 | 複数アカウント・カレンダーの切り替え |
| Dry Run / Sync モード | 安全な操作プレビューと完全同期 |
| 自律的テスト環境 | `docs/tests.md` 定義→並列実行 |
| 堅牢なエラーハンドリング | カスタムエラー階層とユーザー向けヒント |

### 今後の予定

| 機能 | 優先度 | 概要 |
|---|---|---|
| 重複予定の検知 | 高 | 同時刻の予定が重複した際の警告表示 |
| Web 会議連携 | 中 | Google Meet / Teams の URL 自動生成 |
| 繰り返し予定のサポート | 中 | 週次・月次などの繰り返し予定の CRUD |
| `cal edit` コマンド | 低 | カレンダー名の変更 |
