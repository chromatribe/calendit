# calendit テストケース & 期待動作 (v01.16)

このドキュメントでは、ツールの品質を担保するためのテストケースを定義します。
`test_runner.ts` は本ファイルを直接解析し、記載されたコマンドを実行して期待される出力が含まれているかを検証します。

## テストステータス要約

| テストID | 内容 | ステータス | 判定日 |
| :--- | :--- | :---: | :--- |
| **TC-00-INSTALL** | インストール直後の挙動 | ✅ Success | 2026-04-12 |
| **TC-00-SETUP** | 初回セットアップ (Google/Outlook) | ✅ Success | 2026-04-12 |
| **TC-05-CONTEXT** | コンテキスト管理と切替 | ✅ Success | 2026-04-12 |
| **TC-FORMAT** | 各種フォーマットの一貫性 | ✅ Success | 2026-04-12 |
| **TC-COMP-CRUD** | 共通プロバイダ互換性 (CRUD) | ✅ Success | 2026-04-12 |
| **TC-LIVE-01** | 実動作: 予定の作成・確認 | ✅ Success | 2026-04-12 |
| **TC-26** | 意地悪: 日付を跨ぐ予定 (深夜) | ✅ Success | 2026-04-12 |

---

## 導入 & セットアップ (Onboarding)

### TC-00-INSTALL: 初期状態の検証
設定ファイルが全くない状態での挙動を確認します。
```sh
# TEST_FRESH_INSTALL=true 環境で実行
calendit query
```
```expect-fail
Failed to load configuration. Run 'calendit --help' for setup instructions.
```

### TC-00-SETUP-GOOGLE: Google 認証設定
```sh
calendit config set-google --id "dummy-id" --secret "dummy-secret"
```
```expect
Google credentials saved to config.
```

### TC-00-SETUP-OUTLOOK: Outlook 認証設定
```sh
calendit config set-outlook --id "dummy-client-id"
```
```expect
Outlook credentials saved to config.
```

---

## コンテキスト管理 (Contexts)

### TC-05-CONTEXT-SET: コンテキストの作成
```sh
calendit config set-context work --service google --calendar "primary" --account "work-user"
```
```expect
Context 'work' saved.
```

### TC-06-CONTEXT-SWITCH: コンテキスト指定でのクエリ
```sh
calendit query --set work --dry-run
```
```expect
Fetching events for primary
```

---

## フォーマット一貫性 (Formats)

### TC-FORMAT-CSV: CSV 形式での出力と適用
```sh
calendit query --start today --format csv --out tests/data/temp_test.csv
calendit apply --in tests/data/temp_test.csv --dry-run
```
```expect
Applying changes to
```

### TC-FORMAT-JSON: JSON 形式での出力と適用
```sh
calendit query --start today --format json --out tests/data/temp_test.json
calendit apply --in tests/data/temp_test.json --dry-run
```
```expect
Applying changes to
```

---

## 共通プロバイダ・コンプライアンス (Provider Compliance)

> [!TIP]
> 以下のテストは `CALENDIT_TEST_CONTEXT` を切り替えることで、どのプロバイダでも同様にパスする必要があります。

### TC-COMP-ADD: 予定の基本追加 (Dry Run)
```sh
calendit add --summary "Compliance Test" --start "tomorrow 10:00" --dry-run
```
```expect
✅ [Dry Run] Event would be added: "Compliance Test"
```

### TC-COMP-CAL-LIST: カレンダー一覧 (Dry Run)
```sh
calendit cal list
```
```expect
--- Available Calendars ---
```

### TC-COMP-VALID: 日付を跨ぐ予定のバリデーション (Success想定へ変更)
```sh
calendit add --summary "Cross-Day Test" --start "22:00" --end "02:00" --dry-run
```
```expect
✅ [Dry Run] Event would be added: "Cross-Day Test"
```

---

## 基本機能 & 詳細出力検証 (Legacy)

### TC-01: タイムゾーン不一致の解消
```sh
calendit query --start today --format json
```
```expect
+09:00
```

### TC-10: 同一ファイル内の ID 重複検知
```sh
calendit apply --in tests/data/tc10_duplicate_id.md --dry-run
```
```expect-fail
Duplicate ID found
```

### TC-11: 日付を跨ぐ予定の自動調整 (旧: バリデーション)
```sh
calendit apply --in tests/data/tc11_invalid_time.md --dry-run
```
```expect
Applying changes to
```

### TC-13: プライマリカレンダーの削除保護
```sh
calendit cal delete primary
```
```expect-fail
cannot be deleted
```

### TC-17: 空ファイルの適用 (詳細出力: 変更なし)
```sh
calendit apply --in tests/data/empty.md
```
```expect
No changes detected.
```

---

## エッジケース（意地悪なテスト）

### TC-14: 限界文字数負荷テスト (詳細出力検証)
```sh
calendit add --summary "LongTitle-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" --start "tomorrow 10:00" --dry-run
```
```expect
✅ [Dry Run] Event would be added: "LongTitle-AAAAA
```

### TC-15: 破損したフォーマットへの耐性
```sh
calendit apply --in tests/data/tc15_malformed.md --dry-run
```
```expect
Skip: Line matches event pattern
```

### TC-16: Unicode & Emoji ストレス
```sh
calendit add --summary "📅 Meeting 🚀 ⚡️" --start "tomorrow 15:00" --dry-run
```
```expect
✅ [Dry Run] Event would be added: "📅 Meeting 🚀 ⚡️"
```

### TC-20: 矛盾した時刻設定 (未来開始・過去終了)
```sh
calendit add --summary "Paradox" --start "2026-05-01T10:00" --end "2026-04-01T10:00" --dry-run
```
```expect-fail
Invalid time range
```

### TC-26: 日付を跨ぐ予定 (深夜 22:00 - 02:00)
```sh
calendit apply --in tests/data/tc26_boundary.md --dry-run
```
```expect
Applying changes to
```

### TC-27: 巨大な説明文 (8KB)
```sh
calendit add --summary "HugeDesc" --start "tomorrow 12:00" --description "A..." --dry-run
```
```expect
✅ [Dry Run] Event would be added: "HugeDesc"
```

---

## 実動作検証 (Live Testing)

> [!CAUTION]
> 実際にカレンダーに書き込みを行います。--dry-run 無しで実行されます。

### TC-LIVE-21: 単発予定の作成と確認
```sh
calendit add --summary "TC-LIVE-Event" --start "today 23:00" --end "today 23:30" --location "Test Room"
calendit query --start "today 23:00" --end "today 23:59" --format json
```
```expect
TC-LIVE-Event
```

### TC-LIVE-22: 実機での更新同期 (Mock想定: Created/Updated)
```sh
calendit apply --in tests/data/live_update.md
calendit query --start "today 23:00" --format json
```
```expect
Applying changes to
```

### TC-LIVE-23: 後片付け (Syncモードによる削除)
```sh
calendit apply --in tests/data/empty.md --sync
calendit query --start "today 23:00" --format json
```
```expect
Deleted (1):
  - TC-LIVE-Update
```
