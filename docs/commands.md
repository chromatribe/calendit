# コマンドリファレンス

`calendit` の主要なコマンドとオプションの解説です。

## 共通オプション

- `--verbose`: デバッグログを出力します。
- `--version`: バージョンを表示します。
- `--help`: ヘルプを表示します。

---

## `auth` - 認証管理

各サービスへのログインを行います。

### `login <service>`
ブラウザを開いて OAuth2 認証を行います。

- `service`: `google` または `outlook`
- `--set <context>`: ログイン情報を特定のコンテキストに紐付けます。
- `--account <id>`: トークンファイル名に使用するカスタム識別子を指定します。

---

## `config` - 設定管理

認証情報やコンテキストの設定を行います。

### `set-google`
Google API のクライアントIDとシークレットを設定します。

- `--id <id>`: クライアントID
- `--secret <secret>`: クライアントシークレット
- `--file <path>`: Google Cloud からダウンロードした JSON ファイルから設定します。

### `set-outlook`
Outlook (Microsoft Graph) のクライアントIDを設定します。

- `--id <id>`: アプリケーション (クライアント) ID
- `--tenant <id>`: テナントID (デフォルト: `common`)

### `set-context <name>`
カレンダーの用途（コンテキスト）を保存します。

- `name`: コンテキスト名 (例: `work`, `private`)
- `--service <service>`: `google` または `outlook`
- `--calendar <id>`: カレンダーID (通常は `primary`)
- `--account <id>`: 使用する認証アカウントの識別子

---

## `query` - 予定の照会

カレンダーから予定を取得して出力します。

- `--set <name>`: 使用するコンテキスト
- `--start <date>`: 開始日 (YYYY-MM-DD, `today`, `tomorrow`, `7d` など)
- `--end <date>`: 終了日
- `--format <fmt>`: 出力形式 (`md`, `csv`, `json`)
- `--out <file>`: ファイルに出力する場合のパス
- `--dry-run`: プレビューモード

---

## `apply` - 予定の適用

ファイルの内容をカレンダーに反映します。

- `--in <file>`: 入力ファイルパス (MD, CSV, JSON)
- `--set <name>`: 使用するコンテキスト
- `--sync`: ファイルにない予定をカレンダーから削除します（同期モード）
- `--dry-run`: 実際の変更を行わずに差分を表示します

---

## `add` - 予定の追加

単発の予定を素早く追加します。

- `--summary <text>`: 予定のタイトル
- `--start <datetime>`: 開始日時 (`today 10:00`, `tomorrow 15:00` など)
- `--end <datetime>`: 終了日時
- `--location <text>`: 場所
- `--description <text>`: 説明
- `--set <name>`: 使用するコンテキスト

---

## `cal` - カレンダー管理

カレンダー自体の操作を行います。

### `list`
利用可能なカレンダーの一覧を表示します。

### `add <name>`
新しいカレンダーを作成します。

### `delete <id>`
カレンダーを削除します（プライマリカレンダーは削除不可）。
