# コマンドリファレンス

`calendit` の主要なコマンドとオプションの解説です。

## 共通オプション

```
calendit [--verbose] [--version] [--help] <command>
```

- `--verbose`: デバッグログを出力します。トラブルシューティング時に便利です。
- `--version`: バージョンを表示します。
- `--help`: ヘルプを表示します。

---

## `auth` — 認証管理

### `auth login <service>`

ブラウザを開いて OAuth2 認証を行い、トークンをローカルに保存します。

| オプション | 説明 |
|---|---|
| `service` | `google` または `outlook` |
| `--set <context>` | ログイン情報を特定のコンテキストに紐付けます |
| `--account <id>` | トークンファイル名に使用するカスタム識別子 |

**使用例:**

```bash
# Google アカウントにログイン
calendit auth login google

# work コンテキストに紐付けて Outlook ログイン
calendit auth login outlook --set work
```

---

## `config` — 設定管理

認証情報とコンテキストをローカルの `~/.config/calendit/config.json` に保存します。

### `config set-google`

Google API の認証情報を設定します。

| オプション | 説明 |
|---|---|
| `--file <path>` | GCP からダウンロードした JSON ファイルを指定 (**推奨**) |
| `--id <id>` | クライアントID を手動入力 |
| `--secret <secret>` | クライアントシークレットを手動入力 |

**使用例:**

```bash
# JSON ファイルから自動設定（ファイルは設定後に削除可能）
calendit config set-google --file ~/Downloads/client_secret.json

# 手動で直接入力
calendit config set-google --id "123.apps.googleusercontent.com" --secret "GOCSPX-xxx"
```

### `config set-outlook`

Outlook (Microsoft Graph) の認証情報を設定します。

| オプション | 説明 |
|---|---|
| `--id <id>` | アプリケーション (クライアント) ID (**必須**) |
| `--tenant <id>` | テナントID (デフォルト: `common`) |

**使用例:**

```bash
calendit config set-outlook --id "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### `config set-context <name>`

カレンダーの用途（コンテキスト）を保存します。1つのコンテキストが「サービス + カレンダーID + アカウント」のセットを表します。

| オプション | 説明 |
|---|---|
| `--service <service>` | `google` または `outlook` (**必須**) |
| `--calendar <id>` | カレンダーID (**必須**、通常は `primary`) |
| `--account <id>` | 使用する認証アカウントの識別子 |

**使用例:**

```bash
# 仕事用 Google カレンダーを "work" コンテキストとして登録
calendit config set-context work --service google --calendar primary

# 個人の Outlook カレンダーを "home" コンテキストとして登録
calendit config set-context home --service outlook --calendar primary

# 特定カレンダーIDを指定して登録
calendit config set-context lnw \
  --service google \
  --calendar "c_xxxx@group.calendar.google.com" \
  --account "yourname@example.com"
```

### `config delete-context <name>`

登録済みのコンテキストを削除します。

**使用例:**

```bash
# "work" コンテキストを削除
calendit config delete-context work
```

---

## `query` — 予定の照会

カレンダーから予定を取得して出力します。

| オプション | 説明 |
|---|---|
| `--set <name>` | 使用するコンテキスト名 |
| `--start <date>` | 開始日（後述の日時形式を参照） |
| `--end <date>` | 終了日 |
| `--format <fmt>` | 出力形式: `md`（デフォルト）, `csv`, `json` |
| `--out <file>` | ファイルに出力する場合のパス |
| `--dry-run` | プレビューモード |

**日時の指定形式:**

| 入力例 | 意味 |
|---|---|
| `today` | 今日（デフォルト） |
| `tomorrow` | 明日 |
| `today 10:00` | 今日の10時 |
| `2026-05-01` | 指定日 |
| `7d` | 今日から7日間 |
| `2w` | 今日から2週間 |
| `1m` | 今日から30日間 |

**使用例:**

```bash
# 今日の予定を Markdown で表示
calendit query --set work

# 今週の予定を JSON で出力
calendit query --set work --start today --format json --out this_week.json

# 7日間の予定を Markdown ファイルに保存
calendit query --set work --start 7d --format md --out week.md
```

---

## `apply` — 予定の適用

ファイルの内容をカレンダーに反映します。ファイル内に `(ID: ...)` が含まれていれば**更新**、なければ**新規作成**します。

| オプション | 説明 |
|---|---|
| `--in <file>` | 入力ファイルパス (**必須**): `.md`, `.csv`, `.json` |
| `--set <name>` | 使用するコンテキスト名 |
| `--sync` | ファイルに**ない**予定をカレンダーから削除して完全同期 |
| `--dry-run` | 実際の変更を行わずに差分を表示 |

**使用例:**

```bash
# Markdown ファイルの内容を反映（まず dry-run で確認）
calendit apply --in week.md --set work --dry-run
calendit apply --in week.md --set work

# CSV ファイルを使ってバルク登録
calendit apply --in events.csv --set work

# ファイルとカレンダーを完全に同期（ファイルにない予定は削除）
calendit apply --in week.md --set work --sync --dry-run
```

---

## `add` — 予定の追加

単発の予定を素早く追加します。

| オプション | 説明 |
|---|---|
| `--summary <text>` | 予定のタイトル (**必須**) |
| `--start <datetime>` | 開始日時 (**必須**): `HH:mm`, `today HH:mm`, `tomorrow HH:mm`, ISO 8601 |
| `--end <datetime>` | 終了日時（省略時は開始の1時間後） |
| `--location <text>` | 場所 |
| `--description <text>` | 説明 |
| `--set <name>` | 使用するコンテキスト名 |
| `--dry-run` | 実際に追加せずプレビュー |

**使用例:**

```bash
# 今日の12時にランチを追加
calendit add --summary "ランチミーティング" --start "today 12:00" --end "today 13:00" --set work

# 明日の予定を追加（--dry-run で確認）
calendit add --summary "週次レビュー" --start "tomorrow 10:00" --location "会議室A" --set work --dry-run

# 深夜をまたぐ予定（22:00〜翌02:00）
calendit add --summary "夜間作業" --start "22:00" --end "02:00" --set work
```

---

## `cal` — カレンダー管理

サービスに登録されているカレンダー（サブカレンダー）自体を操作します。

### `cal list`

利用可能なカレンダーの一覧を表示します。

```bash
calendit cal list --set work
# --- Available Calendars ---
# - 仕事用 (ID: abc@group.calendar.google.com) [Primary]
# - チーム共有 (ID: xyz@group.calendar.google.com)
```

### `cal add <name>`

新しいカレンダーを作成します。

```bash
calendit cal add "プロジェクトX" --set work
```

### `cal delete <id>`

カレンダーを削除します。プライマリカレンダーは削除不可です。

```bash
# 確認プロンプトあり
calendit cal delete abc@group.calendar.google.com --set work

# 確認をスキップ
calendit cal delete abc@group.calendar.google.com --set work --force
```
