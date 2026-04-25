# calendit テストケース & 期待動作 (v1.20260425.6)

このドキュメントでは、ツールの品質を担保するためのテストケースを定義します。  
`src/test_runner.ts` は本ファイルを解析し、記載されたコマンドの出力に期待文字列が含まれるかを検証します。

## テストマップ（仕様トレーサビリティ）

| 仕様セクション (`spec/spec.md`) | 対応テストケース ID |
|---|---|
| 1. 概要/起動 | `TC-INST-*`, `TC-INST-ACC-01` |
| 2.1 認証・アカウント状態 | `TC-SETUP-*`, `TC-AUTH-01`〜`TC-AUTH-05`, `TC-ACCOUNTS-01`, `TC-ERR-01`, `TC-ERR-02` |
| 2.2 予定/カレンダー操作 | `TC-QRY-*`, `TC-APPLY-*`, `TC-ADD-*`, `TC-CAL-*` |
| 2.6 UI 言語（ローカライズ） | `TC-I18N-01`〜`TC-I18N-03` |
| 2.7 エラー表示とログ（診断） | `TC-ERR-META-01`（`DEBUG=calendit` 時の `ErrorMeta` 行） |
| 2.4 安全性 | `TC-APPLY-04`, `TC-CAL-02`, `TC-ERR-04`, `TC-ERR-05` |
| 2.5 入出力フォーマット | `TC-QRY-04`, `TC-QRY-05`, `TC-FORMAT-*` |
| 4. コンテキスト | `TC-CTX-*` |
| 5. 同期ロジック | `TC-APPLY-01`〜`TC-APPLY-06`, `TC-LIVE-23` |

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
2026
```
（`package.json` の `version` は npm 公開向け [semver](https://semver.org/)。`2026.4.24` のよう `2026` を含めばよい。）

### TC-INST-02 [EP]: `--help` が主要コマンドを含む
```sh
calendit --help
```
```expect
query
```

### TC-INST-ACC-01 [EP]: `--help` に `accounts` コマンドが含まれる
```sh
calendit --help
```
```expect
accounts
```

### TC-INST-ONBOARD-01 [EP]: `--help` に `onboard` が含まれる
```sh
calendit --help
```
```expect
onboard
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

### TC-AUTH-01 [EP]: `auth status` がコンテキストとトークン状態を表示
```sh
calendit config set-google --id "dummy-id" --secret "dummy-secret"
calendit config set-context demo --service google --calendar primary --account user@example.com
calendit auth status
```
```expect
NOT LOGGED IN
```

### TC-ACCOUNTS-01 [EP]: `accounts status` が全コンテキストの CONNECTION 列を表示
```sh
calendit config set-google --id "dummy-id" --secret "dummy-secret"
calendit config set-context demo2 --service google --calendar primary --account acc@example.com
calendit accounts status
```
```expect
CONNECTION
```

### TC-AUTH-02 [BVA]: Google トークン `expiry_date` が未来なら TOKEN は OK
（`CALENDIT_CONFIG_DIR` はテストランナーが注入。コンテキスト名とトークンファイル名を一致させる。）
```sh
calendit config set-google --id "dummy-id" --secret "dummy-secret"
calendit config set-context auth-tok-ok --service google --calendar primary --account tc-auth-02@local
printf '%s' '{"expiry_date":2524608000000}' > "$CALENDIT_CONFIG_DIR/google_token_auth-tok-ok.json"
calendit auth status
```
```expect
OK
```

### TC-AUTH-03 [BVA]: Google トークンが期限切れかつリフレッシュなしなら EXPIRED
```sh
calendit config set-context auth-tok-exp --service google --calendar primary --account tc-auth-03@local
printf '%s' '{"expiry_date":1000}' > "$CALENDIT_CONFIG_DIR/google_token_auth-tok-exp.json"
calendit auth status
```
```expect
EXPIRED
```

### TC-AUTH-04 [EP]: Google 期限切れでも `refresh_token` があれば TOKEN は OK
（期待文字列はコンテキスト名のみ。当該行の TOKEN は `OK` になる。）
```sh
calendit config set-context ctx-auth-refresh-9f2d --service google --calendar primary --account tc-auth-04@local
printf '%s' '{"expiry_date":1000,"refresh_token":"dummy-refresh"}' > "$CALENDIT_CONFIG_DIR/google_token_ctx-auth-refresh-9f2d.json"
calendit auth status
```
```expect
ctx-auth-refresh-9f2d
```

### TC-AUTH-05 [EP]: Outlook コンテキストで API クレデンシャル未設定なら CONNECTION は NOT CONFIGURED
（共有 `CALENDIT_CONFIG_DIR` では先に走る `set-outlook` 等で `outlook_creds` が残ると `NOT LOGGED IN` になるため、`outlook_creds` を含まない `config.json` を直書きしてから `accounts status` を検証する。検証後に `set-outlook` で後続 TC が前提とする Outlook 設定を戻す。）
```sh
printf '%s' '{"contexts":{"tc-auth-05-ol":{"service":"outlook","calendarId":"primary","accountId":"tc-auth-05@local"}},"google_creds":{"id":"dummy-id","secret":"dummy-secret"},"ui":{"locale":"en","localePromptCompleted":true}}' > "$CALENDIT_CONFIG_DIR/config.json"
calendit accounts status
calendit config set-outlook --id "dummy-client-id"
```
```expect
NOT CONFIGURED
```

### TC-SETUP-O-02 [EG]: Outlook 設定（id 欠落）
```sh
calendit config set-outlook
```
```expect-fail
required option '--id <id>' not specified
```

### TC-CONFIG-M-01 [EP]: `set-macos-transport` が成功メッセージを返す
```sh
calendit config set-google --id "dummy-id" --secret "dummy-secret"
calendit config set-macos-transport auto
```
```expect
EventKit default transport
```

---

## UI 言語（ローカライズ）

### TC-I18N-01 [EP]: `config set-locale` が成功メッセージを返す
```sh
calendit config set-google --id "dummy-id" --secret "dummy-secret"
calendit config set-locale ja
```
```expect
UI locale set to 'ja'.
```

### TC-I18N-02 [EP]: `--help` に `--locale` が載る
```sh
calendit --help
```
```expect
--locale
```

### TC-I18N-03 [EG]: 不正な `set-locale` は失敗する
```sh
calendit config set-google --id "dummy-id" --secret "dummy-secret"
calendit config set-locale xx
```
```expect-fail
Invalid locale
```

---

## エラー診断ログ

### TC-ERR-META-01 [ST]: `DEBUG=calendit` 時に ErrorMeta が debug に出る
（2 行目のみ `DEBUG=calendit` を付与し、不正サービスで `ValidationError` 発生時に `ErrorMeta` が出力されることを確認する。）
```sh
calendit config set-google --id "dummy-id" --secret "dummy-secret"
DEBUG=calendit calendit config set-context tc-err-meta-bad --service fax --calendar primary
```
```expect-fail
ErrorMeta
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
Service must be 'google', 'outlook', or 'macos'.
```

### TC-CTX-DEL-01 [EP]: コンテキスト削除（正常）
```sh
calendit config set-context tmp-ctx --service google --calendar "primary"
calendit config delete-context tmp-ctx
```
```expect
Context 'tmp-ctx' deleted.
```

### TC-CTX-DEL-02 [EG]: 存在しないコンテキスト削除
```sh
calendit config delete-context not-existing-ctx
```
```expect-fail
Context 'not-existing-ctx' was not found.
```

### TC-CTX-03 [EG]: 未定義コンテキスト参照
```sh
calendit query --set notfound --dry-run
```
```expect-fail
Context 'notfound' was not found.
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

### TC-APPLY-05 [ST]: 日付移動のみ（取得範囲外だと新規扱い＋警告）
```sh
calendit apply --set work --in tests/data/tc_apply_move_target_only.md --dry-run
```
```expect
was not found in the fetched range
```

### TC-APPLY-06 [ST]: 日付移動（`--start` / `--end` で既存 ID を解決して更新）
```sh
calendit apply --set work --in tests/data/tc_apply_move_target_only.md --start 2026-04-12 --end 2026-04-20 --dry-run
```
```expect
Updated (1):
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
Invalid date/time format
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
