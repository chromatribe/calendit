# ローカル実地スモークテスト（手動）

モック（`CALENDIT_MOCK`）では検証できない OAuth・Microsoft Graph・EventKit・OS 権限・`localhost:3000` コールバックなどを、ローカルで確認するためのチェックリストです。  
自動回帰は `npm test`（[tests.md](tests.md) 駆動）を参照してください。

**まだ calendit をインストールしていない場合:** 先に **[getting-started.md](./getting-started.md)** を完了してください。

---

## ステップバイステップ：全体の流れ

最初から順に進めればよい順序です。`<...>` は自分の値に置き換えます。

### フェーズ 0 — リポジトリと CLI の準備

1. ターミナルでリポジトリのルートに移動する。  
   `cd /path/to/calendit`
2. 依存関係を入れる。  
   `npm ci` または `npm install`
3. ビルドする。  
   `npm run build`
4. このあと使う `calendit` は次のどちらかに統一する。  
   - `node dist/index.js`（毎回フルパスでも可）  
   - または `npm link` 済みならパスが通った `calendit`  
   以降の例では `calendit` と書くが、未リンクなら `node dist/index.js` に読み替える。

### フェーズ 1 — 自動テスト（モック・設定は触らない）

5. ロケールとテストを CI と同じ流れで回す。  
   `npm run check:locales && npm test`
6. すべて成功したら、コードの回帰は一通り OK。ここでは **`CALENDIT_MOCK` は付けなくてよい**（`npm test` が子プロセスに自動で付ける）。

### フェーズ 2 — 実 API の手動スモーク（プロバイダを 1 つ選ぶ）

**共通の前準備**

7. 実カレンダーに触るので、ターミナルで **`CALENDIT_MOCK` を設定していない**ことを確認する。消すときは **zsh/bash のシェルで** `unset CALENDIT_MOCK` と**その一行だけ**を入力する（プロンプトやログをまとめて貼ると `command not found: cocone@MBP14` のように誤実行になる）。確認は `echo "[$CALENDIT_MOCK]"` で空なら OK。シェルを触らずに一回だけ外したい場合は `env -u CALENDIT_MOCK node dist/index.js <サブコマンド>...` でもよい。
8. 本番設定を汚したくない場合は、専用の設定ディレクトリを用意する。  
   `export CALENDIT_CONFIG_DIR="$(pwd)/.calendit-smoke"`  
   初回は空のディレクトリを `mkdir -p` してから上記を実行。
9. Google と Outlook のログインは **どちらも `localhost:3000` を使う**。一方の `auth login` が動いているあいだに、もう一方を同時に走らせない。

**Google を試す場合 → セクション「ML-G-01」の表を 1 行目から順に実行**

10. 表の 1 → 2 → … と進め、各ステップで「期待する振る舞い」列どおりか確認する。

**Outlook を試す場合 → セクション「ML-O-01」の表を同様に上から順に実行**

11. Azure アプリにリダイレクト URI `http://localhost:3000` が登録されているか事前に確認する。

**macOS のローカルカレンダーを試す場合 → セクション「ML-M-01」の表を上から順に実行**

12. Swift でヘルパーをビルドし、`CALENDIT_EVENTKIT_HELPER` を export してから `macos doctor` へ進む。
13. システム設定の「カレンダー」権限で、使っているターミナル（または Node）を許可する。

### フェーズ 3 — 書き込み（任意）

14. **テスト用カレンダー**にだけ、セクション「ML-WRITE-01」の表を実行する。まず必ず `--dry-run` で確認してから本番 `add` に進む。

### フェーズ 4 — 問題が出たら報告

15. セクション「フィードバックするときの書き方」に沿って、ケース ID（`ML-G-01` の何番目など）、コマンド、期待と実際、環境をまとめる。

---

## 前提

| 項目 | 内容 |
|------|------|
| ビルド | リポジトリルートで `npm run build` が成功していること |
| CLI の起き方 | 開発時: `node dist/index.js` または `npx calendit`（`bin/cli.js` は `dist/index.js` を読み込む） |
| モック | **手動実地では `CALENDIT_MOCK` を付けない**（未設定で実プロバイダに接続） |
| 設定ディレクトリ | 省略時は既定の設定ディレクトリ。隔離したい場合は `CALENDIT_CONFIG_DIR` を一時パスに設定してから手順を実行 |
| ポート | Google / Outlook の `auth login` はどちらも **`http://localhost:3000` に一時 HTTP サーバーを立てる**。同時に両方のログインを走らせない |

---

## フィードバックするときの書き方

不具合報告は次を含めると修正が早いです。

1. **ケース ID** — 本書の `ML-*`、または [tests.md](tests.md) の `TC-LIVE-*`
2. **実行コマンド** — コピペ可能な 1 行（環境変数があればそれも）
3. **期待したこと** / **実際の出力**（ログ抜粋で可）
4. **環境** — OS、Node 版、`CALENDIT_MOCK` の有無、使用プロバイダ（google / outlook / macos）

---

## 破壊的操作について

`apply`（特に `--sync`）、カレンダー削除、本番 `add`（`--dry-run` なし）は**テスト用カレンダー／テスト用コンテキスト**に限定してください。`primary` への書き込みテストはデータ消失リスクがあります。

---

## ML-G-01: Google — 設定から読み取りまで

| # | 手順 | 期待する振る舞い |
|---|------|------------------|
| 1 | `calendit config set-google --id "<OAuthクライアントID>" --secret "<シークレット>"` | 成功メッセージ（設定保存） |
| 2 | `calendit config set-context <名前> --service google --calendar primary --account "<識別子>"` | コンテキスト保存の表示 |
| 3 | `calendit auth login google --set <名前>` | ブラウザまたはログに認証 URL。`localhost:3000` でコールバック後、ターミナルに完了メッセージ |
| 4 | `calendit accounts status` | 当該コンテキストの CONNECTION / TOKEN がログイン済みを示す（例: OK 系） |
| 5 | `calendit config check` | Google credentials が OK と分かる行 |
| 6 | `calendit cal list --set <名前>` | カレンダー一覧が表示される |
| 7 | `calendit query --set <名前> --start today --format md` | エラーなく取得ログ（例: Fetching events）と予定または空表示 |

**失敗時のヒント**: クライアント ID/シークレット未設定、`localhost:3000` が他プロセスで占有、ブラウザで許可しなかった、3 分以内に完了しなかった（タイムアウト）。

---

## ML-O-01: Outlook — 設定から読み取りまで

| # | 手順 | 期待する振る舞い |
|---|------|------------------|
| 1 | `calendit config set-outlook --id "<Azure アプリのクライアント ID>"`（既定テナント以外なら `--tenant <tenantId>`） | Outlook credentials 保存の表示 |
| 2 | `calendit config set-context <名前> --service outlook --calendar primary --account "<識別子>"` | コンテキスト保存 |
| 3 | `calendit auth login outlook --set <名前>` | ブラウザで Microsoft 認証。コールバック後に完了メッセージ |
| 4 | `calendit accounts status` | Outlook コンテキストが接続済みを示す |
| 5 | `calendit query --set <名前> --start today --format json` | 取得処理が走り、JSON または空配列 |

**失敗時のヒント**: Azure でリダイレクト URI `http://localhost:3000` が許可されているか、Google ログインとポート競合していないか。

---

## ML-M-01: macOS EventKit — ヘルパーから query まで

| # | 手順 | 期待する振る舞い |
|---|------|------------------|
| 1 | `cd native/eventkit-helper && swift build -c release` | ビルド成功 |
| 2 | （推奨）`export CALENDIT_EVENTKIT_HELPER="<リポジトリ>/native/eventkit-helper/.build/release/eventkit-helper"` | 以降の `calendit` からヘルパーが解決される |
| 3 | `calendit macos doctor` | 権限・ヘルパー存在の診断（問題なければ成功に近いメッセージ） |
| 4 | `calendit macos list-calendars`（必要なら `--json`） | `calendarIdentifier` が得られる |
| 5 | システム設定 → プライバシーとセキュリティ → **カレンダー** で、ターミナル / Node にアクセス許可 | 拒否されていると一覧・取得が失敗する |
| 6 | `calendit config set-context <名前> --service macos --calendar "<list-calendars の ID>" --account "local"` | コンテキスト保存 |
| 7 | `calendit query --set <名前> --start today --format md` | エラーなく取得 |

**失敗時のヒント**: [native/eventkit-helper/README.md](../native/eventkit-helper/README.md) の解決順（`CALENDIT_EVENTKIT_HELPER`）、ヘルパー未ビルド、カレンダー権限。

---

## ML-M-02: EventKit 常駐ブリッジ — `.app` と LaunchAgent（任意）

[docs/eventkit-bridge.md](eventkit-bridge.md) の前提で、ソケット経由（`CALENDIT_EVENTKIT_BRIDGE=1`）をログイン時に常駐させる場合の手順です。

| # | 手順 | 期待する振る舞い |
|---|------|------------------|
| 1 | `cd native/eventkit-bridge && ./scripts/build-app-bundle.sh` | `.build/CalenditEventKitBridge.app` が生成される |
| 2 | `./scripts/install-launchagent.sh`（必要なら `APP_PATH=...` で上書き） | `~/Library/LaunchAgents/com.chromatribe.calendit.eventkit-bridge.plist` が置かれ、`launchctl bootstrap` が成功する |
| 3 | ログアウト／再起動するか、`launchctl print gui/$(id -u)/com.chromatribe.calendit.eventkit-bridge` で状態を確認 | ジョブがロードされている |
| 4 | `export CALENDIT_EVENTKIT_BRIDGE=1` のうえ `calendit macos doctor` | `transport: "bridge"` などブリッジ経由の診断が通る |
| 5 | 不要なら `./scripts/uninstall-launchagent.sh` | `bootout` と plist 削除が成功する |

**失敗時のヒント**: [../native/eventkit-bridge/README.md](../native/eventkit-bridge/README.md)、`~/Library/Logs/calendit-eventkit-bridge.log` / `.err.log`。

---

## ML-WRITE-01: 書き込み（任意・テスト用カレンダーのみ）

| # | 手順 | 期待する振る舞い |
|---|------|------------------|
| 1 | 上記いずれかのプロバイダで **テスト用** コンテキストを用意 | — |
| 2 | `calendit add --set <ctx> --summary "Smoke" --start "today 22:00" --end "today 22:15" --dry-run` | Dry run で追加内容が表示される |
| 3 | 問題なければ `--dry-run` を外して実行 | 成功メッセージ。実カレンダーに予定が現れる |
| 4 | `calendit query` で同時間帯を検索 | 作成した summary が含まれる |

---

## `docs/tests.md` の TC-LIVE との対応

| ID | 内容（要約） | 備考 |
|----|----------------|------|
| TC-LIVE-21 | `add` で予定作成 → `query` で同一イベント名が見える | `CALENDIT_RUN_LIVE=true npm test` でランナーに含める（子プロセスは依然 `CALENDIT_MOCK=true`）。**実 Google/Outlook/EventKit では** `CALENDIT_MOCK` を付けず、同じコマンド列を手動で実行する |
| TC-LIVE-22 | `apply` で更新 → `query` で確認 | 同上 |
| TC-LIVE-23 | `apply --sync` と空ファイルで削除系 | 同上。データ削除に注意 |

`npm test` の通常実行では `TC-LIVE-*` はスキップされます（実カレンダーを汚さないため）。実地では上表 **ML-WRITE-01** や [tests.md](tests.md) 記載のコマンドを、**専用コンテキスト**で手動実行してください。

---

## 関連ドキュメント

- [tests.md](tests.md) — 自動テストケース定義
- [development.md](development.md) — `npm test` とモックの説明
- [../native/eventkit-helper/README.md](../native/eventkit-helper/README.md) — EventKit ヘルパー
- [eventkit-bridge.md](eventkit-bridge.md) / [../native/eventkit-bridge/README.md](../native/eventkit-bridge/README.md) — 常駐ブリッジ・`.app`・LaunchAgent
