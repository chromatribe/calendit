# calendit テストケース & 期待動作 (v2026-0416-01.03)

このドキュメントでは、ツールの品質を担保するためのテストケースを定義します。  
`src/test_runner.ts` は本ファイルを解析し、記載されたコマンドの出力に期待文字列が含まれるかを検証します。

## テストマップ（仕様トレーサビリティ）

| 仕様セクション (`spec/spec.md`) | 対応テストケース ID |
|---|---|
| 1. 概要/起動 | `TC-INST-*` |
| 2.1 認証 | `TC-SETUP-*`, `TC-ERR-01`, `TC-ERR-02` |
| 2.2 予定/カレンダー操作 | `TC-QRY-*`, `TC-APPLY-*`, `TC-ADD-*`, `TC-CAL-*` |
| 2.4 安全性 | `TC-APPLY-04`, `TC-CAL-02`, `TC-ERR-04`, `TC-ERR-05` |
| 2.5 入出力フォーマット | `TC-QRY-04`, `TC-QRY-05`, `TC-FORMAT-*` |
| 4. コンテキスト | `TC-CTX-*` |
| 5. 同期ロジック | `TC-APPLY-01`〜`TC-APPLY-04`, `TC-LIVE-23` |

## テスト技法ラベル凡例

- `[EP]`: 同値分割
- `[BVA]`: 境界値分析
- `[DT]`: デシジョンテーブル
- `[ST]`: 状態遷移
- `[EG]`: エラー推測

---

## インストール & 起動検証

### TC-INST-01 [BVA]: `--version` がバージョン形式を返す
```sh
calendit --version
```
```expect
2026-
```

### TC-INST-02 [EP]: `--help` が主要コマンドを含む
```sh
calendit --help
```
```expect
query
```

### TC-INST-03 [EG]: 未知コマンドは失敗する
```sh
calendit unknown-cmd
```
```expect-fail
unknown command
```

---

## 導入 & セットアップ

### TC-00-INSTALL [ST]: 初期状態の検証
```sh
# TEST_FRESH_INSTALL=true 環境で実行
calendit query
```
```expect-fail
Failed to load configuration. Run 'calendit --help' for setup instructions.
```

### TC-SETUP-G-01 [EP]: Google 認証設定（正常）
```sh
calendit config set-google --id "dummy-id" --secret "dummy-secret"
```
```expect
Google credentials saved to config.
```

### TC-SETUP-G-02 [EG]: Google 設定（secret 欠落）
```sh
calendit config set-google --id "dummy-id"
```
```expect-fail
Either --id and --secret, or --file must be provided.
```

### TC-SETUP-G-03 [EG]: Google 設定（id 欠落）
```sh
calendit config set-google --secret "dummy-secret"
```
```expect-fail
Either --id and --secret, or --file must be provided.
```

### TC-SETUP-O-01 [EP]: Outlook 認証設定（正常）
```sh
calendit config set-outlook --id "dummy-client-id"
```
```expect
Outlook credentials saved to config.
```

### TC-SETUP-O-02 [EG]: Outlook 設定（id 欠落）
```sh
calendit config set-outlook
```
```expect-fail
required option '--id <id>' not specified
```

---

## コンテキスト管理

### TC-CTX-01 [EP]: コンテキスト作成
```sh
calendit config set-context work --service google --calendar "primary" --account "work-user"
```
```expect
Context 'work' saved.
```

### TC-CTX-02 [EG]: 無効なサービス値
```sh
calendit config set-context invalid --service fax --calendar "primary"
```
```expect-fail
Service must be 'google' or 'outlook'.
```

### TC-CTX-03 [EG]: 未定義コンテキスト参照
```sh
calendit query --set notfound --dry-run
```
```expect-fail
Context 'notfound' が見つかりません。
```

---

## Query コマンド

### TC-QRY-01 [EP]: 相対期間（7d）
```sh
calendit query --set work --start 7d --format md
```
```expect
Fetching events for primary
```

### TC-QRY-02 [BVA]: 期間指定（today -> tomorrow）
```sh
calendit query --set work --start today --end tomorrow --format json
```
```expect
Local timezone offset:
```

### TC-QRY-03 [BVA]: 終了 <= 開始 はエラー
```sh
calendit query --set work --start tomorrow --end today --format md
```
```expect-fail
Invalid time range: end must be after start.
```

### TC-QRY-04 [EP]: CSV 出力ファイル
```sh
calendit query --set work --start today --format csv --out tests/data/temp_test.csv
```
```expect
Events exported to tests/data/temp_test.csv
```

### TC-QRY-05 [EP]: JSON 出力ファイル
```sh
calendit query --set work --start today --format json --out tests/data/temp_test.json
```
```expect
Events exported to tests/data/temp_test.json
```

---

## Apply コマンド

### TC-APPLY-01 [EP]: ID なし（新規作成扱い）
```sh
calendit apply --set work --in tests/data/tc_apply_new.md --dry-run
```
```expect
Created (1):
```

### TC-APPLY-02 [EP]: ID あり（更新扱い）
```sh
calendit apply --set work --in tests/data/tc_apply_update.md --dry-run
```
```expect
Updated (1):
```

### TC-APPLY-03 [EG]: 存在しない入力ファイル
```sh
calendit apply --set work --in tests/data/not-exists.md --dry-run
```
```expect-fail
ENOENT
```

### TC-APPLY-04 [DT]: sync dry-run
```sh
calendit apply --set work --in tests/data/tc_apply_sync.md --sync --dry-run
```
```expect
Applying changes to
```

---

## Add コマンド

### TC-ADD-01 [EG]: summary 欠落
```sh
calendit add --set work --start "today 10:00" --dry-run
```
```expect-fail
Summary and Start time are required.
```

### TC-ADD-02 [EG]: start 欠落
```sh
calendit add --set work --summary "No start" --dry-run
```
```expect-fail
Summary and Start time are required.
```

### TC-ADD-03 [EP]: ISO 8601 開始時刻
```sh
calendit add --set work --summary "ISO Start" --start "2026-05-01T10:00:00+09:00" --end "2026-05-01T11:00:00+09:00" --dry-run
```
```expect
✅ [Dry Run] Event would be added: "ISO Start"
```

### TC-ADD-04 [EP]: 場所付きイベント
```sh
calendit add --set work --summary "With Location" --start "today 10:00" --location "会議室A" --dry-run
```
```expect
✅ [Dry Run] Event would be added: "With Location"
```

---

## Calendar 管理

### TC-CAL-01 [EP]: カレンダー作成
```sh
calendit cal add "Test Calendar" --set work
```
```expect
Calendar created:
```

### TC-CAL-02 [EG]: 存在しないカレンダー削除
```sh
calendit cal delete not-existing --set work --force
```
```expect-fail
Calendar 'not-existing' not found.
```

---

## エラー種別明示テスト

### TC-ERR-01 [ST]: Google 認証情報未設定
```sh
calendit query --set work
```
```expect
Fetching events for primary
```

### TC-ERR-02 [ST]: Outlook 認証情報未設定ヒント（文言確認）
```sh
calendit config check
```
```expect
Outlook credentials:
```

### TC-ERR-03 [EG]: 不正日時フォーマット
```sh
calendit add --set work --summary "Bad Date" --start "not-a-date" --dry-run
```
```expect-fail
日時フォーマットが不正です
```

### TC-ERR-04 [BVA]: 時刻逆転
```sh
calendit add --set work --summary "Paradox" --start "2026-05-01T10:00:00+09:00" --end "2026-04-01T10:00:00+09:00" --dry-run
```
```expect-fail
Invalid time range
```

### TC-ERR-05 [EG]: 重複 ID
```sh
calendit apply --set work --in tests/data/tc10_duplicate_id.md --dry-run
```
```expect-fail
Duplicate ID found
```

---

## プロバイダ固有チェック（設定診断）

### TC-PROV-G-01 [ST]: Google 設定状態の診断
```sh
calendit config check
```
```expect
Google credentials : OK
```

### TC-PROV-G-02 [EP]: Google文脈でのカレンダー一覧
```sh
calendit cal list --set work
```
```expect
--- Available Calendars ---
```

### TC-PROV-G-03 [EP]: Google文脈での Query
```sh
calendit query --set work --format json --start today
```
```expect
Fetching events for primary
```

### TC-PROV-O-01 [ST]: Outlook 設定状態の診断
```sh
calendit config check
```
```expect
Outlook credentials: OK
```

### TC-PROV-O-02 [EP]: Outlook文脈の作成
```sh
calendit config set-context home --service outlook --calendar "primary" --account "home-user"
```
```expect
Context 'home' saved.
```

### TC-PROV-O-03 [EP]: Outlook文脈での Query（mock経由）
```sh
calendit query --set home --format json --start today
```
```expect
Fetching events for primary
```

---

## 既存回帰テスト（重要）

### TC-FORMAT-CSV [EP]: CSV 形式での出力と適用
```sh
calendit query --start today --format csv --out tests/data/temp_test.csv
calendit apply --in tests/data/temp_test.csv --dry-run
```
```expect
Applying changes to
```

### TC-FORMAT-JSON [EP]: JSON 形式での出力と適用
```sh
calendit query --start today --format json --out tests/data/temp_test.json
calendit apply --in tests/data/temp_test.json --dry-run
```
```expect
Applying changes to
```

### TC-13 [EG]: プライマリカレンダーの削除保護
```sh
calendit cal delete primary
```
```expect-fail
cannot be deleted
```

### TC-17 [DT]: 空ファイルの適用（変更なし）
```sh
calendit apply --in tests/data/empty.md
```
```expect
No changes detected.
```

### TC-LIVE-21 [ST]: 単発予定の作成と確認（manual）
```sh
calendit add --summary "TC-LIVE-Event" --start "today 23:00" --end "today 23:30" --location "Test Room"
calendit query --start "today 23:00" --end "today 23:59" --format json
```
```expect
TC-LIVE-Event
```

### TC-LIVE-22 [ST]: 更新同期（manual）
```sh
calendit apply --in tests/data/live_update.md
calendit query --start "today 23:00" --format json
```
```expect
Applying changes to
```

### TC-LIVE-23 [ST]: 後片付け（sync, manual）
```sh
calendit apply --in tests/data/empty.md --sync
calendit query --start "today 23:00" --format json
```
```expect
Deleted (1):
```
