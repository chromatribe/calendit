# EventKit 常駐ブリッジ（設計メモ）

**関連:** 初回の macOS セットアップ手順は **[getting-started.md](./getting-started.md) 第 9 章** · ドキュメント目次は **[README.md](./README.md)** · AI 向けは **[for-ai-agents.md](./for-ai-agents.md)**

**目的**: IDE（Cursor / VS Code）の統合ターミナルや任意の `node` 起動元からでも、**一度だけカレンダー（TCC）を許可したプロセス**経由で EventKit を使えるようにする。現状の **`calendit macos external …`** はターミナル.app への委譲で十分なことが多いが、**常駐ブリッジ**は「許可の主体」と「CLI の起動元」を完全に分離する。

**ステータス**: **リポジトリ内 MVP 実装済み**（Swift 常駐ソケット + Node `runEventkitHelper` 統合）。`.app` 化・公証・メニューバーは未着手。

---

## 1. 解決したいこと

| 課題 | 現状 | ブリッジ後の狙い |
|------|------|------------------|
| TCC が親アプリに紐づく | Cursor 内 `node` → `eventkit-helper` は `denied` になりやすい | ブリッジ **.app** が EventKit を保持し、CLI は **ローカル IPC のみ** |
| `external` の運用負荷 | 毎回ターミナルに切り替える | ブリッジ起動後は **どこからでも同じソケット**へ JSON リクエスト |
| 配布 | `eventkit-helper` は単体バイナリ | ブリッジは **署名・公証**を別途検討（配布形態による） |

---

## 2. アーキテクチャ案

### 2.1 プロセスモデル

```text
[任意のターミナル / Cursor]  calendit (node)
        │  HTTP or Unix domain socket (127.0.0.1 / ~/.calendit/…)
        ▼
[常駐] CalenditEventKitBridge.app（または menubar 非表示デーモン）
        │  in-process EventKit
        ▼
    EKEventStore（TCC はこの .app に付与）
```

- **ブリッジ**: Swift（既存 `eventkit-helper` のロジックを流用 or 共有フレームワーク化）。
- **CLI**: [src/core/eventkitHelper.ts](../src/core/eventkitHelper.ts) が **`CALENDIT_EVENTKIT_BRIDGE`** 設定時は **Unix ソケット**へ JSON 1 行を送り、未設定時は従来どおり `eventkit-helper` を `spawn` する。

### 2.2 トランスポート比較

| 方式 | メリット | デメリット |
|------|----------|------------|
| **Unix domain socket** | 127.0.0.1 よりファイルパーミッションで締めやすい、ポート競合なし | パス管理・Windows は対象外でよい |
| **localhost HTTP** | デバッグしやすい、`curl` で手動検証可能 | ポート占有・誤公開リスク（バインドは 127.0.0.1 のみ必須） |

**推奨（macOS 専用）**: まず **Unix socket**（例: `~/Library/Application Support/calendit/eventkit-bridge.sock`）＋単純 **JSON 1 行 / フレーミング** か **length-prefixed JSON**。HTTP は第 2 段でよい。

### 2.3 プロトコル（最小）

既存 `eventkit-helper` サブコマンドと **意味を揃える**（実装はブリッジ内で EK を直接呼んでもよい）。

| メソッド / パス | ペイロード | 応答 |
|-----------------|------------|------|
| `doctor` | なし | 現行 `DoctorResponse` と同等 JSON |
| `list-calendars` | なし | 現行 `ListCalendarsResponse` |
| `list-events` | `{ calendarId, start, end }` | 現行と同等 |
| `create-event` / `update-event` / `delete-event` | 現行 stdin JSON と同等 | 現行と同等 |

**バージョン**: リクエストは `{"v":1,"op":"…","token":"…","body":{…}}`。`body` はオペレーションごとに省略可または中身は下表。

**実装済みレスポンス**: 成功時は **現行 `eventkit-helper` の stdout と同一形状の JSON 1 行**（末尾改行）。失敗時は `{"ok":false,"error":"…","code":n,"bridgeError":true}`。`doctor` の成功 JSON には **`"transport":"bridge"`** を付与（ヘルパー直実行との区別用）。

| `op` | `body` | 備考 |
|------|--------|------|
| `doctor` | `{}` | |
| `list-calendars` | `{}` | |
| `list-events` | `calendarId`, `start`, `end`（ISO 文字列） | |
| `create-event` | stdin JSON と同形 | |
| `update-event` | stdin JSON と同形 | |
| `delete-event` | `calendarId`, `eventId` | 成功時 `{"ok":true}` |

---

## 3. セキュリティ

- **バインド**: Unix ソケット（ファイルパス）。同一ユーザーのローカルのみ想定。
- **認証**: サーバ起動時に **ランダムトークン**を `bridge.token` に **`0600`** で書き込み。リクエストの **`token` フィールド**と照合。CLI は同パスを読む。トークン・ソケットの **ディレクトリ**は `CALENDIT_CONFIG_DIR` があればその配下、なければ `~/Library/Application Support/calendit/`（実装は Swift / TypeScript で一致）。
- **同一ユーザー**: ブリッジはログインユーザー専用。`sudo` での共有は想定外（別ユーザーのカレンダーは別ブリッジ）。
- **レート制限**: 任意（ローカル乱用対策は低優先度）。

---

## 4. ユーザー体験（想定）

1. 初回のみ: `CalenditEventKitBridge` を **Finder から起動**、または `open -a CalenditEventKitBridge` → カレンダー許可ダイアログ → メニューバーに「接続中」アイコン。
2. `calendit` は `CALENDIT_EVENTKIT_BRIDGE=1` または `unix:///path/to.sock` を見て **常にブリッジ経由**。
3. ブリッジ未起動時: CLI は **明確なエラー**（「ブリッジを起動してください」＋ `open` コマンド例）＋現状どおり `external` へのフォールバック案内も可。

---

## 5. 配布・署名

- **オプション A（開発者向け）**: Xcode でローカルビルドし、自分の Mac にだけ置く（Developer ID 署名は任意）。
- **オプション B（一般向け）**: Apple Developer Program で **Developer ID + 公証**、GitHub Releases に `.dmg` / `.zip`。
- **Entitlements**: `com.apple.security.personal-information.calendars` 等、**Info.plist** に `NSCalendarsFullAccessUsageDescription`（文言は英日）。

`calendit` 本体（npm）はブリッジを同梱しない選択もあり得る（**別リポジトリ / 別アーティファクト**でリリースし、ドキュメントでリンク）。

---

## 6. `calendit` 側（実装済み）

1. **[src/core/eventkitHelper.ts](../src/core/eventkitHelper.ts)** — 既定: macOS で同じデータディレクトリに **`bridge.token` かつ有効な** `eventkit-bridge.sock` があると**自動でブリッジ**。`CALENDIT_EVENTKIT_BRIDGE=0` 等は常に子プロセス `eventkit-helper`。`=1` / `unix:…` は従来どおり明示。`config.json` の `eventkit.defaultTransport` や **`CALENDIT_EVENTKIT_BRIDGE_FALLBACK=1`** によるヘルパー退避の意味は [commands.md](./commands.md) 参照。
2. **起動** — **`calendit macos bridge start`** で .app の `open`、または [getting-started.md](./getting-started.md) §9.0 / `calendit macos setup`。
3. **`macos doctor`**: ブリッジ経由時は JSON に `transport":"bridge"`（`query` / `accounts status` と同じ解決が走る）。

4. **テスト**: CI はブリッジなしのまま。結合は下記手動チェックリスト。

---

## 7. 段階的ロールアウト

| フェーズ | 内容 | 状況 |
|----------|------|------|
| **0–1（MVP）** | CLI 常駐・Unix ソケット・JSON 1 行・全 `eventkit-helper` オペレーション・トークン・Node 統合 | **済（本リポジトリ）** |
| **2** | `.app` 化・`NSCalendars*`・ローカル ad-hoc 署名・**LaunchAgent スクリプト** | **一部済**（[native/eventkit-bridge/scripts/](../../native/eventkit-bridge/scripts/)・`build-app-bundle.sh` / `install-launchagent.sh`）。**公証・Developer ID・メニューバー**は未 |
| **3** | Homebrew cask、ヘルスチェック UI 等 | 未 |

---

## 8. 手動検証チェックリスト

1. **ターミナル.app** で `cd native/eventkit-bridge && swift build -c release && .build/release/eventkit-bridge serve` を実行し、カレンダー許可を付与する。
2. 別ターミナル（Cursor 内でも可）で `calendit macos doctor` — ブリッジが listen 中なら JSON に `transport":"bridge"`（未指定でも、トークン+ソケットが揃い自動ブリッジ）が含まれること。従来どおり `export CALENDIT_EVENTKIT_BRIDGE=1` を付けた検証も可。
3. `calendit macos list-calendars --json` および `service: macos` の `query` が動くこと。
4. ブリッジを `Ctrl+C` で止めたあと、同コマンドが接続エラーになること。
5. **`npm test`** は `CALENDIT_EVENTKIT_BRIDGE` を付けず **従来どおり 55 件程度成功**すること。
6. **（任意）** `scripts/build-app-bundle.sh` → `open .build/CalenditEventKitBridge.app` でカレンダー許可 → `scripts/install-launchagent.sh` → 再起動ログイン後も `calendit macos doctor`（`CALENDIT_EVENTKIT_BRIDGE=1`）が通ること。

---

## 9. 既存 `external` との関係

- **併存**: ブリッジ未導入ユーザーは **`macos external`** のまま。
- **優先順位案**: `CALENDIT_EVENTKIT_BRIDGE` > 直接 `eventkit-helper` >（将来）自動起動は避ける（TCC の再現性が落ちる）。

---

## 10. `.app` と LaunchAgent（リポジトリ内スクリプト）

- **`scripts/build-app-bundle.sh`**: `CalenditEventKitBridge.app` を `.build/` に生成し `codesign -s -`（開発用）。
- **`scripts/install-launchagent.sh`**: `~/Library/LaunchAgents/com.chromatribe.calendit.eventkit-bridge.plist` を書き、`launchctl bootstrap gui/$UID` で読み込み。`RunAtLoad` + `KeepAlive`。
- **`scripts/uninstall-launchagent.sh`**: `bootout` + plist 削除。

Bundle ID / LaunchAgent Label: **`com.chromatribe.calendit.eventkit-bridge`**。

---

## 11. オープン課題

- **Developer ID 署名・公証**（配布用 `.dmg` / cask）。
- メニューバー（終了・状態表示）の要否。
- 複数 `calendit` バージョンとブリッジの **プロトコル互換**。

---

## 参照

- [native/eventkit-bridge/README.md](../native/eventkit-bridge/README.md)（ビルド・起動）
- [native/eventkit-helper/README.md](../native/eventkit-helper/README.md)（現行ヘルパー・`external`）
- [docs/commands.md](./commands.md)（`macos external`・ブリッジ環境変数）
