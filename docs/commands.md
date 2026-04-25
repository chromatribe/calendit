# コマンドリファレンス

`calendit` の主要なコマンドとオプションの解説です。

**トップレベル:** `onboard` · `auth` · `accounts` · `macos` · `config` · `query` · `apply` · `add` · `cal`

**はじめて使う方:** 手順の全体像は **[getting-started.md](./getting-started.md)**（省略なし）。**初回の対話用ラリー:** **[ai-onboarding-rally.md](./ai-onboarding-rally.md)** · **`calendit onboard`。** **AI / エージェント:** **[for-ai-agents.md](./for-ai-agents.md)**。

---

## `onboard` — 初回セットアップ（ドキュ URL と次のコマンド）

対話的に **Google / Outlook / この Mac（EventKit）** のいずれかを選び、[ai-onboarding-rally.md](./ai-onboarding-rally.md) への **GitHub / raw リンク**と、その分岐で使う**代表的な `calendit` コマンド**を標準出力に出します。標準入出力が TTY でない（CI 等）ときは、**3 分岐すべて**を出します。

```bash
calendit onboard
```

**参照（npm `-g` で `docs/` が手元に無い場合）:**  
<https://github.com/chromatribe/calendit/blob/main/docs/ai-onboarding-rally.md>

---

## コマンド早見表（一覧）

下表の「詳細」はこのファイル内の見出しへジャンプする目安です（同じ内容を **省略せず** 各節に書いています）。

| グループ | サブコマンド | 何ができるか |
|----------|----------------|--------------|
| （トップ） | `onboard` | 初回: プロバイダ選択 → ラリー用 URL と次のコマンド列を表示（非 TTY では全分岐） |
| （トップ） | `--help` `--version` `--verbose` `--locale` `--debug-dump` | ヘルプ・版表示・ログ・言語・ログファイル |
| `auth` | `login google` / `login outlook` | ブラウザで OAuth ログイン（**localhost:3000**。Google と Outlook を**同時**に走らせない） |
| `auth` | `status` | `accounts status` と同じ表（非推奨名） |
| `accounts` | `status` | 全コンテキストの SERVICE / CALENDAR / ACCOUNT / **CONNECTION** |
| `macos` | `doctor` | OS・ヘルパー・TCC（カレンダー権限）の JSON 診断 |
| `macos` | `list-calendars` | EventKit のカレンダー一覧（`--json` 可） |
| `macos` | `external <doctor\|list-calendars\|shell>` | **ターミナル.app** 経由で実行（IDE 内の TCC 問題の回避） |
| `config` | `set-locale <en\|ja>` | UI 言語の保存 |
| `config` | `set-google` | Google OAuth クライアントの登録（`--file` 推奨） |
| `config` | `set-outlook` | Outlook アプリ（クライアント）ID の登録 |
| `config` | `check` | 設定ファイルの場所・コンテキスト一覧など |
| `config` | `set-context <名前>` | **カレンダー登録**（`--service` `--calendar` `[--account]`） |
| `config` | `delete-context <名前>` | コンテキスト削除 |
| `query` | （本体） | 予定の照会（`--set` `--start` `--end` `--format` `--out`） |
| `apply` | （本体） | ファイルから予定を反映（`--in` `--set` `--start` `--end` `--sync` `--dry-run`） |
| `add` | （本体） | 1 件追加（`--summary` `--start` `[--end]` 等） |
| `cal` | `list` `add` `delete` | カレンダー一覧・作成・削除（macOS コンテキストでは add/delete 未対応） |

---

## 共通オプション

```
calendit [--verbose] [--debug-dump <file>] [--locale <code>] [--version] [--help] <command> ...
```

| オプション | 説明 |
|---|---|
| `--verbose` | デバッグログを有効にします。 |
| `--debug-dump <file>` | ログを指定ファイルに書き出しつつ verbose 相当にします。 |
| `--locale <code>` | この実行だけ UI 言語を上書きします（`en` / `ja`。設定の `config set-locale` より優先）。 |
| `--version` | バージョンを表示します。 |
| `--help` | ヘルプを表示します。 |

`DEBUG=calendit` を付けて実行すると、`--verbose` と同様にデバッグログが有効になります（`ErrorMeta` 行など）。

---

## `auth` — 認証管理

### `auth login <service>`

ブラウザを開いて OAuth2 認証を行い、トークンをローカルに保存します。Google / Outlook はどちらも **`http://localhost:3000`** でコールバックを受け取るため、**同時に 2 つの `auth login` は走らせない**でください。

| 引数 / オプション | 説明 |
|---|---|
| `<service>` | `google` または `outlook` |
| `--set <context>` | ログイン情報を特定のコンテキストに紐付けます |
| `--account <id>` | トークンファイル名に使用するカスタム識別子 |

**使用例:**

```bash
calendit auth login google
calendit auth login outlook --set work
```

### `auth status`

全コンテキストの接続状態を表示します。**`calendit accounts status` と同じ内容**です（後者の利用が推奨）。

---

## `accounts` — アカウント状態（全サービス）

### `accounts status`

各コンテキストのサービス（google / outlook / macos）、カレンダー、アカウント、接続・トークン状態を表形式で表示します。macOS（EventKit）コンテキストの **`ACCOUNT` 列**は `macos list-calendars` の **SOURCE**（カレンダーが属するソース名）と揃えます。

```bash
calendit accounts status
```

---

## `macos` — macOS カレンダー（EventKit）ヘルパー

**macOS のみ**動作します。OAuth ではなく、ローカルの Calendar.app データストアにアクセスします。EventKit への経路の優先順位は、**`CALENDIT_EVENTKIT_BRIDGE` 環境変数**、続いて **`config.json` の `eventkit.defaultTransport`**（`config set-macos-transport`）、最後に **未設定時の自動**（`~/Library/Application Support/calendit` に `bridge.token` かつ有効な `eventkit-bridge.sock` があるとブリッジを使用。IDE 内ターミナルでも、ブリッジ起動中なら TCC の主体をブリッジに取れる。ヘルパー専用にしたいときは `CALENDIT_EVENTKIT_BRIDGE=0` または `config set-macos-transport helper`）。`service: macos` 利用前の詳細は [eventkit-bridge.md](./eventkit-bridge.md) および [getting-started.md](./getting-started.md) 第9章。

### `macos bridge fetch`

GitHub 上の **リポジトリ全体の `tar.gz`**（既定: `package.json` の `repository` から解決、ブランチは `CALENDIT_EVENTKIT_FETCH_REF`、既定 `main`）を取得し、**`native/eventkit-bridge` だけ**を展開する。展開先は原則、**`CALENDIT_CONFIG_DIR` 未使用時は** `~/Library/Application Support/calendit/fetched-eventkit-bridge/`（`CALENDIT_CONFIG_DIR` 使用時はその**同じ**データディレクトリ配下）。npm 全体インストールだけの環境向け。ダウンロード**前**に説明・おおよそサイズ（`HEAD` で取れた場合）・展開先を出し、**confirm** を挟む。対話式でない場合は `--yes` が必要。

| オプション | 説明 |
|------------|------|
| `--force` | 既存の展開先があっても上書き取得 |
| `--yes` | ダウンロード前の確認をスキップ（非対話・CI 向け） |
| `--build` | 取得**成功後**、**Swift ビルド**（`.app` 生成）の確認をスキップし、そのまま `build-app-bundle.sh` 相当を実行 |
```bash
calendit macos bridge fetch
calendit macos bridge fetch -y
calendit macos bridge fetch -y -b
```

`CALENDIT_EVENTKIT_FETCH_URL` で **https の `github.com` 系** URL を上書き可。

### `macos bridge build`

`native/eventkit-bridge` を Swift ビルドし、`build-app-bundle.sh` と同じ手順で **`CalenditEventKitBridge.app`** を `.build` に生成する。**上記 `bridge fetch` 後**、または**git リポジトリのフル作業木**、または **`CALENDIT_EVENTKIT_BRIDGE_ROOT` で指せる**ときに使える。グローバル `npm install -g` のパッケージには Swift ソースは同梱されない（**`bridge fetch` で補完**可）。**Xcode / Command Line Tools**（`swift`）と **codesign** が通る必要がある。

```bash
calendit macos bridge build
```

### `macos bridge start`

`CalenditEventKitBridge.app` を `open` で起動（ブリッジ常駐をこのマシンで初めて使うとき、または一度止めたあと）。候補パス: `CALENDIT_EVENTKIT_BRIDGE_APP`（絶対パス）、`~/Applications` および `/Applications/CalenditEventKitBridge.app`、リポジトリ内 `native/eventkit-bridge/.build/CalenditEventKitBridge.app`（ソースからの開発時）。見つからなければインストール案内を出して終了する。

```bash
calendit macos bridge start
```

### `macos setup`

対話: 診断 → 必要ならブリッジ起動案内 / `bridge start` → システム設定のカレンダー許可（TCC）の案内 → カレンダー選択 → コンテキスト名 → `config set-context` まで。初回向け。終了 `Ctrl+C` 可。

```bash
calendit macos setup
```

### `macos doctor`

OS・ヘルパー・カレンダー（TCC）権限の診断結果を JSON で表示します。

```bash
calendit macos doctor
```

### `macos list-calendars`

EventKit 上のカレンダー一覧を表示します。`config set-context --service macos --calendar <id>` には、ここで得た **calendarIdentifier** を使います。

| オプション | 説明 |
|---|---|
| `--json` | 表の代わりに生 JSON を出力 |

```bash
calendit macos list-calendars
calendit macos list-calendars --json
```

### `macos external` — ターミナル.app 経由で実行（IDE 向け）

Cursor / VS Code の**統合ターミナル**では、カレンダー（TCC）の許可ダイアログが出ず `doctor` が `denied` になりやすい。次のコマンドは **AppleScript でターミナル.app** を開き、**同じ `cwd`** で `calendit macos …` を実行する（許可はターミナル側に付く）。ターミナルに既にウィンドウがあれば **同じウィンドウ（前面の window 1）** に流し込み、毎回別ウィンドウにはしない（タブが増えるかはターミナル.app の設定による）。

| 例 | 説明 |
|---|---|
| `calendit macos external doctor` | ターミナルで `macos doctor` を実行 |
| `calendit macos external list-calendars` | ターミナルで一覧 |
| `calendit macos external list-calendars --json` | JSON 出力 |
| `calendit macos external shell` | ターミナルでログインシェルを開く（`cd` は現在のプロジェクト、`CALENDIT_*` を引き継ぎ）。**`query` / `apply` など macos コンテキストの本番操作はここで実行**（IDE 内の Node からだと TCC が付かないことがある）。 |

`CALENDIT_CONFIG_DIR` と `CALENDIT_EVENTKIT_HELPER` が IDE のセッションにだけある場合は、このコマンドが生成するシェル行に **`export` として引き継ぎ**ます（`~/.zshrc` 等に書いた値はターミナル側でそのまま使われます）。

### `CALENDIT_EVENTKIT_BRIDGE`（常駐ブリッジ）

`native/eventkit-bridge` を起動（または `.app` から起動）すると、**同一マシン上の Unix ソケット**経由で EventKit を呼び出せる。

| 値 | 意味 |
|----|------|
| （**未指定**、macOS） | **`bridge.token` と、存在する有効な Unix ソケット**が同じデータディレクトリにあれば **自動でブリッジ**を使う。なければ `eventkit-helper` 子プロセス。 |
| `0` / `false` / `no` / `off` | **常に** `eventkit-helper` 子プロセス（IDE では TCC により失敗しやすい） |
| `1` / `true` 等 | 必ず **既定**ソケットへ接続（トークン欠落はエラー、見つかるまで他へ逃げない） |
| `auto` | 上記「未指定」と同じ挙動（他ツール用に明示可） |
| `unix:/path/to.sock` または `unix:///path/to.sock` | 任意ソケットパス |

データディレクトリは原則 `~/Library/Application Support/calendit/`。`CALENDIT_CONFIG_DIR` があるとブリッジのトークン/ソケットも**その下**（`~/.config/calendit` の `config.json` とはディレクトリが異なる）。概要は [eventkit-bridge.md](./eventkit-bridge.md)。起動: **`calendit macos bridge start`** または [getting-started.md](./getting-started.md)。

ブリッジに接続できないとエラーになる。`eventkit-helper` へ **自動退避**するのは **`CALENDIT_EVENTKIT_BRIDGE_FALLBACK=1` のみ**（IDE では再び `denied` になり得る）。

### `config set-macos-transport` — EventKit 既定（永続）

**シェルに `CALENDIT_EVENTKIT_BRIDGE` が何も入っていないとき**だけ効く: `config.json` に `eventkit: { "defaultTransport": "auto" | "bridge" | "helper" }` を保存。`auto` は未設定に近い挙動（上表の「未指定」= 自動ブリッジ＋helper フォールバック可）。

```bash
calendit config set-macos-transport auto
```

**常駐ブリッジ**の全体設計・手動検証リスト: [eventkit-bridge.md](./eventkit-bridge.md)。

**`.app` / ログイン常駐**: `native/eventkit-bridge/scripts/build-app-bundle.sh` と `install-launchagent.sh`（詳細は同 [eventkit-bridge.md](./eventkit-bridge.md) §10）。

---

## `config` — 設定管理

認証情報とコンテキストは **`CALENDIT_CONFIG_DIR` があればその配下**、なければ `~/.config/calendit/config.json` に保存されます。

### `config set-locale <code>`

UI 言語を永続化します。

| 引数 | 説明 |
|---|---|
| `<code>` | `en` または `ja` |

```bash
calendit config set-locale ja
```

### `config set-google`

Google API の認証情報を設定します。

| オプション | 説明 |
|---|---|
| `--file <path>` | GCP からダウンロードした JSON ファイルを指定 (**推奨**) |
| `--id <id>` | クライアント ID を手動入力 |
| `--secret <secret>` | クライアントシークレットを手動入力 |

`--file` または `--id` と `--secret` の組み合わせが必要です。

**使用例:**

```bash
calendit config set-google --file ~/Downloads/client_secret.json
calendit config set-google --id "123.apps.googleusercontent.com" --secret "GOCSPX-xxx"
```

### `config set-outlook`

Outlook (Microsoft Graph) の認証情報を設定します。

| オプション | 説明 |
|---|---|
| `--id <id>` | アプリケーション (クライアント) ID (**必須**) |
| `--tenant <id>` | テナント ID（デフォルト: `common`） |

```bash
calendit config set-outlook --id "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
calendit config set-outlook --id "..." --tenant "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### `config check`

Google / Outlook のクレデンシャル有無、登録コンテキスト一覧、設定ファイルの場所、UI ロケールなどを要約表示します。

```bash
calendit config check
```

### `config set-context <name>`

カレンダーの用途（コンテキスト）を保存します。1 つのコンテキストが「サービス + カレンダー ID + アカウント」のセットを表します。

| オプション | 説明 |
|---|---|
| `--service <service>` | `google` / `outlook` / `macos` (**必須**) |
| `--calendar <id>` | カレンダー ID (**必須**)。Google/Outlook で通常は `primary`。`macos` のときは `calendit macos list-calendars` の **calendarIdentifier** |
| `--account <id>` | 使用する認証アカウントの識別子（トークン紐付け用。macos では任意のラベル可） |

**使用例:**

```bash
calendit config set-context work --service google --calendar primary --account "you@example.com"
calendit config set-context home --service outlook --calendar primary
calendit config set-context local --service macos --calendar "<EventKitのcalendarIdentifier>" --account "local"
```

### `config delete-context <name>`

登録済みのコンテキストを削除します。

```bash
calendit config delete-context work
```

---

## `query` — 予定の照会

カレンダーから予定を取得して出力します。

| オプション | 説明 |
|---|---|
| `--set <name>` | 使用するコンテキスト名 |
| `--calendar <id>` | コンテキストの既定を上書きするカレンダー ID |
| `--start <date>` | 開始日時（後述の日時形式） |
| `--end <date>` | 終了日時 |
| `--format <fmt>` | `md`（デフォルト）, `csv`, `json` |
| `--out <file>` | ファイルへ出力するパス |
| `--dry-run` | プレビュー（query では実質ノーオペ） |

**日時の指定形式（例）:**

| 入力例 | 意味 |
|---|---|
| `--start` 省略 | 内部では「今日」の日付が開始として使われ、終了は既定でその約 24 時間後 |
| `today` | 今日 |
| `tomorrow` | 明日 |
| `today 10:00` | 今日の 10 時 |
| `2026-05-01` | 指定日 |
| `7d` / `2w` / `1m` | 今日からの相対期間（日・週・月） |

**使用例:**

```bash
calendit query --set work
calendit query --set work --start today --format json --out this_week.json
calendit query --set work --start 7d --format md --out week.md
```

---

## `apply` — 予定の適用

ファイルの内容をカレンダーに反映します。ファイル内に `(ID: ...)` が含まれていれば**更新**、なければ**新規作成**します。

`listEvents` する**取得期間**は、入力に含まれる予定の日付から自動計算した範囲と、`--start` / `--end` で指定した範囲（`query` と同じ日付解釈、例: `7d`、ISO 日付）を**和集合**にとったものです。Markdown を「移動先の日付だけ」に直した直後は自動範囲が狭くなり、既存 ID を取り逃すことがあるため、そのときは `query` で出した期間と同じく `--start` / `--end` を付けて既存行を解決します。

| オプション | 説明 |
|---|---|
| `--in <file>` | 入力ファイル（`.md`, `.csv`, `.json`）**必須** |
| `--set <name>` | 使用するコンテキスト名 |
| `--calendar <id>` | コンテキストの既定を上書きするカレンダー ID |
| `--start <iso>` | 任意: 取得期間の開始（`query` と同形式。`--end` と併用。`7d` 等の相対のみで `--end` 省略可） |
| `--end <iso>` | 任意: 取得期間の終了。`--start` なしに指定できない |
| `--sync` | ファイルに**ない**予定をカレンダーから削除して完全同期 |
| `--dry-run` | 実際の変更を行わず差分を表示 |

**使用例:**

```bash
calendit apply --in week.md --set work --dry-run
calendit apply --in week.md --set work
calendit apply --in events.csv --set work
calendit apply --in week.md --set work --sync --dry-run
calendit apply --in move.md --set work --start 2026-04-12 --end 2026-05-02 --dry-run
```

---

## `add` — 予定の追加

単発の予定を素早く追加します。

| オプション | 説明 |
|---|---|
| `--summary <text>` | タイトル (**必須**) |
| `--start <datetime>` | 開始 (**必須**) |
| `--end <datetime>` | 終了（省略時は開始の 1 時間後） |
| `--location <text>` | 場所 |
| `--description <text>` | 説明 |
| `--attendees <emails>` | カンマ区切りの参加者メール（macOS EventKit では環境により無視されることがあります） |
| `--set <name>` | 使用するコンテキスト名 |
| `--calendar <id>` | コンテキストの既定を上書きするカレンダー ID |
| `--dry-run` | 追加せずプレビュー |

**使用例:**

```bash
calendit add --summary "ランチ" --start "today 12:00" --end "today 13:00" --set work
calendit add --summary "レビュー" --start "tomorrow 10:00" --location "会議室A" --set work --dry-run
calendit add --summary "夜間作業" --start "22:00" --end "02:00" --set work
```

---

## `cal` — カレンダー管理

サービスに登録されているカレンダー（サブカレンダー）を操作します。**`service: macos` のコンテキストでは `cal add` / `cal delete` は未対応**です（API がエラーになります）。一覧（`cal list`）は利用できます。

### `cal list`

| オプション | 説明 |
|---|---|
| `--set <name>` | 使用するコンテキスト名 |

```bash
calendit cal list --set work
```

### `cal add <name>`

新しいカレンダーを作成します（Google / Outlook で利用可能）。

```bash
calendit cal add "プロジェクトX" --set work
```

### `cal delete <id>`

カレンダーを削除します。プライマリカレンダー（`primary`）は削除できません。

| オプション | 説明 |
|---|---|
| `--set <name>` | 使用するコンテキスト名 |
| `--force` | 確認プロンプトをスキップ |

```bash
calendit cal delete abc@group.calendar.google.com --set work
calendit cal delete abc@group.calendar.google.com --set work --force
```

---

## 環境変数（よく使うもの）

| 変数 | 説明 |
|---|---|
| `CALENDIT_CONFIG_DIR` | 設定・トークンを置くディレクトリ（未設定時は `~/.config/calendit`） |
| `CALENDIT_MOCK` | `true` のとき実 API の代わりにモック（`npm test` が自動設定） |
| `CALENDIT_EVENTKIT_HELPER` | EventKit ヘルパー実行ファイルへの絶対パス |
| `CALENDIT_LOCALE` | UI ロケール（テスト等で使用） |
| `DEBUG=calendit` | デバッグログ有効 |

---

## 関連ドキュメント

- [README.md](./README.md) — `docs/` の目次
- [getting-started.md](./getting-started.md) — ゼロからの手順（省略なし）
- [for-ai-agents.md](./for-ai-agents.md) — AI 向けリファレンス
- [development.md](development.md) — ビルド・テスト
- [manual-local-smoke.md](manual-local-smoke.md) — 実 API 手動スモーク
- [quickstart_google.md](quickstart_google.md) — Google 短縮手順（グローバル npm 利用者向け）
