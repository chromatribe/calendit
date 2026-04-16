# 更新履歴 (Changelog)

## v1.0.2 — 2026-04-16

### 変更
- `docs/changelog.md` 表記修正
- `docs/commands.md` に `config delete-context` コマンドの説明と例を追加

---

## v1.0.1 — 2026-04-16

### 追加
- `calendit config delete-context <name>` コマンドを追加
  - 登録済みのコンテキストを削除できるようになりました
  - 存在しないコンテキストを指定した場合はエラーメッセージを表示

### テスト
- TC-CTX-DEL-01: コンテキスト削除（正常系）
- TC-CTX-DEL-02: 存在しないコンテキスト削除（異常系）
- 合計テストケース: 44件（全通過）

---

## v1.0.0 — 2026-04-16

### 初回リリース

#### 主要機能
- **`query`** — Google / Outlook カレンダーの予定取得（MD / CSV / JSON 形式対応）
- **`add`** — 予定の新規追加（ドライラン対応）
- **`apply`** — Markdown / CSV / JSON ファイルからの一括追加・更新・削除（sync モード対応）
- **`cal`** — カレンダーの作成・削除・一覧表示
- **`auth`** — Google / Outlook OAuth 認証フロー
- **`config`** — 認証情報・コンテキストの管理、診断コマンド（`config check`）

#### 品質・設計
- テストベンダー水準（ISTQB準拠）の品質基準（EP / BVA / DT / ST / EG）に基づく自動テスト設計
- 仕様書（`spec/spec.md`）とテストケース（`docs/tests.md`）のトレーサビリティマトリクス
- 構造化ログ（タイムスタンプ・モジュールラベル付き）
- カスタムエラー階層（`CalendarError` / `ConfigError` / `AuthError` / `ValidationError` / `ApiError`）
- Zod によるスキーマバリデーション
- `--verbose` / `--debug-dump` によるデバッグ強化

#### 実環境テストで修正したバグ
| # | バグ内容 | 修正ファイル |
|---|---|---|
| 1 | `auth login --set` と `query --set` でトークンキーが不一致 | `shared.ts` |
| 2 | MSALアカウントのメアドマッチング未対応 | `shared.ts` |
| 3 | OutlookでカレンダーID `primary` が無効 | `outlook.ts` |
| 4 | Outlook API の時刻がUTCのまま表示される | `outlook.ts` |
| 5 | `apply` 時のタイムゾーン差分誤検知 | `applier.ts` |
| 6 | `YYYY-MM-DD HH:mm` 形式の日時が未対応 | `datetime.ts` |

#### 対応サービス
- Google Calendar API（OAuth 2.0）
- Microsoft Graph API / Outlook（OAuth 2.0）
  - 個人アカウント（outlook.com / hotmail.com）: 利用可能
  - 組織アカウント（Microsoft 365）: IT管理者の承認が必要

---

## リリース方針

- **パッチバージョン** (`x.x.1`): バグ修正・軽微な機能追加
- **マイナーバージョン** (`x.1.0`): 後方互換性のある新機能追加
- **メジャーバージョン** (`1.0.0`): 破壊的変更

リリース時は以下を更新してください:
1. `package.json` の `version`
2. `docs/changelog.md`（このファイル）
3. `git tag vX.X.X && git push --tags`
4. `npm publish --access public`
