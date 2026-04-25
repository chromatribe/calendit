# AI エージェント向けリファレンス（Cursor / Antigravity / 類似ツール）

この文書は **人間向けの手順書（[getting-started.md](./getting-started.md)）を読まないと分からない文脈**を、構造化データに近い形でまとめたものです。  
ユーザーが「ドキュメントを読め」と言った場合は **まず [docs/README.md](./README.md)**、操作手順は **getting-started.md**、コマンドの網羅は **commands.md** を優先してください。

---

## 1. リポジトリの役割（1 文）

`calendit` は **Node.js + TypeScript の CLI** で、Google Calendar / Microsoft Graph（Outlook）/ **macOS EventKit** に対し、`query`・`apply`・`add`・`cal` などのサブコマンドを提供する。

---

## 2. ディレクトリとエントリ（探索の起点）

| パス | 役割 |
|------|------|
| `src/index.ts` | CLI エントリ。`commander` でサブコマンド登録、中央エラーハンドラ |
| `src/commands/*.ts` | 各サブコマンド（`auth` `accounts` `config` `query` `apply` `add` `cal` `macos`） |
| `src/commands/shared.ts` | `getServiceForContext` 等、コマンド間共有 |
| `src/core/config.ts` | 設定ディレクトリ解決、`config.json` 読み書き |
| `src/core/auth.ts` | OAuth（Google / Outlook） |
| `src/core/eventkitHelper.ts` | EventKit: **ブリッジ解決**（`CALENDIT_EVENTKIT_BRIDGE` 未指定なら macOS で `bridge.token`+有効ソケットがあれば自動ブリッジ、`=0` で常に `eventkit-helper`）→ 失敗時は `CALENDIT_EVENTKIT_BRIDGE_FALLBACK=1` でのみヘルパー spawn |
| `src/core/eventkitEnvFromConfig.ts` | `loadOptional` 後に `eventkit.defaultTransport` を `process.env` に反映（シェル未設定時のみ） |
| `src/core/macosBridgeApp.ts` | `CalenditEventKitBridge.app` 候補パス（`macos bridge start`）、fetch/build 先 `.build` の解決、ビルド後の `~/Applications`・`/Applications` コピー補助 |
| `src/services/*.ts` | `GoogleCalendarService` `OutlookCalendarService` `MacosCalendarService` `MockCalendarService` |
| `src/core/accountStatus.ts` | `accounts status` の行生成（macOS の ACCOUNT 列は `list-calendars` の `sourceTitle`） |
| `native/eventkit-helper/` | Swift バイナリ `eventkit-helper`（子プロセス） |
| `native/eventkit-bridge/` | Swift 常駐ブリッジ（Unix ソケット + `bridge.token`） |
| `docs/tests.md` | **自律テストの正**。`src/test_runner.ts` がパースして実行 |
| `spec/spec.md` | 製品仕様の要約（バージョン表記あり） |
| `spec/history/*.md` | 版ごとの変更ログ（旧命名 `YYYY-mmdd-XX.XX` は [`spec/history/old/`](../spec/history/old/)） |

---

## 3. 実行とビルド（エージェントがコマンドを打つとき）

| コマンド | 意味 |
|----------|------|
| `npm ci` / `npm install` | 依存インストール |
| `npm run build` | `gen:locales` → `tsc` → ロケールコピー。**テストも本番もビルド後の `dist/` を前提** |
| `npm test` | **`npm run build` の後**に `src/test_runner.ts` を実行。子プロセスに `CALENDIT_MOCK=true` 等を付与 |
| `node dist/index.js --help` | サブコマンド一覧（ビルド済み必須） |
| `npm link`（ルートで） | `calendit` を PATH に（開発時） |

非エンジニア向けの冗長手順: **[getting-started.md](./getting-started.md)**。

---

## 4. 設定・データの保存場所

| リソース | 既定パス | 上書き環境変数 |
|----------|----------|----------------|
| `config.json`・各種トークン | `~/.config/calendit/` | `CALENDIT_CONFIG_DIR` |
| ブリッジソケット・`bridge.token` | `~/Library/Application Support/calendit/`（`CALENDIT_CONFIG_DIR` 未設定時） | `CALENDIT_CONFIG_DIR` でベースディレクトリが変わる（`eventkitHelper.ts` の `defaultCalenditDataDir()`） |

**エージェント注意:** ユーザーの本番設定を壊さないため、実験では `export CALENDIT_CONFIG_DIR=...` を明示することが多い。

---

## 5. 環境変数（一覧）

| 変数 | 用途 |
|------|------|
| `CALENDIT_CONFIG_DIR` | 設定・トークン・（データディレクトリ連動の）ブリッジ配置の基準 |
| `CALENDIT_MOCK` | `true` でモックサービス（`npm test` が自動設定） |
| `CALENDIT_EVENTKIT_HELPER` | `eventkit-helper` バイナリの絶対パス |
| `CALENDIT_EVENTKIT_BRIDGE` | 未指定: macOS で token+ソケットが揃いブリッジ可なら**自動**使用。`0`/`false`/`off`…は常に **helper** 子プロセス。`1`/`true`/`unix:...` は従来どおり**明示**ブリッジ |
| `CALENDIT_EVENTKIT_BRIDGE_APP` | `macos bridge start` が開く **`.app` バンドル**の絶対パス（任意上書き） |
| `CALENDIT_EVENTKIT_BRIDGE_ROOT` | `macos bridge build` の探索先: `Package.swift` がある **`native/eventkit-bridge` 相当**の絶対パス（フルリポ以外に置いたソース用） |
| `CALENDIT_EVENTKIT_BRIDGE_FALLBACK` | `1` のときブリッジ失敗後にヘルパー spawn を試す |
| `CALENDIT_LOCALE` | UI ロケール（テストで `en` 等） |
| `CALENDIT_SKIP_LOCALE_PROMPT` | テストで初回ロケール質問をスキップ |
| `DEBUG=calendit` | デバッグログ（`--verbose` 相当） |

---

## 6. OAuth・ネットワークの制約（バグを出しやすい点）

- Google と Outlook のデバイスフロー / ローカルコールバックは **`http://localhost:3000`** を使用する。**同時に 2 つの `auth login` を走らせない**（ドキュメント・コード双方で言及）。  
- **macOS TCC**: Cursor / VS Code の統合ターミナルでは `doctor` が `denied` になりやすい。対策: **常駐ブリッジ** + `calendit macos bridge start` / `macos setup`、`calendit macos external ...`、または [eventkit-bridge.md](./eventkit-bridge.md) の `.app`。

---

## 7. テストランナー契約（`docs/tests.md`）

- Markdown 内の `### TC-...` がテストケース。  
- ` ```sh ` ブロックが実行コマンド。  
- ` ```expect ` が成功時に stdout/stderr に含まれるべき文字列。  
- ` ```expect-fail ` は失敗期待。  
- 詳細は **[development.md](./development.md)**。

---

## 8. バージョンと履歴（変更をコミットするとき）

- `package.json` の `version`  
- `spec/spec.md` の現在バージョン行  
- `docs/tests.md` のタイトル行のバージョン  
- `spec/history/[MajorVersion].YYYYmmdd.[Sequence].md`（ファイル名＝H1 先頭行。例: `1.20260425.6.md` → `# 1.20260425.6`。`Sequence` に先頭ゼロを付けない）  

方針は **development.md** の「バージョン管理」節と [.cursor/rules/rule.mdc](../.cursor/rules/rule.mdc) §1 に従う。

---

## 9. 人間向けドキュメントとの役割分担

**初回の「Google / Outlook / macOS どれか」から対話を始める（Cursor ラリー）**ときは、まず **[ai-onboarding-rally.md](./ai-onboarding-rally.md)** を幹にする。下表は、それ以外の目的別の参照先（技術解説はこのファイル §5–§8 や `commands.md`）。

| ニーズ | 読むファイル |
|--------|----------------|
| 初回対話の分岐と次のコマンド（AI 用） | [ai-onboarding-rally.md](./ai-onboarding-rally.md)（GitHub 閲覧: <https://github.com/chromatribe/calendit/blob/main/docs/ai-onboarding-rally.md>） |
| ゼロからの操作手順 | [getting-started.md](./getting-started.md) |
| サブコマンド網羅 | [commands.md](./commands.md) |
| Google Cloud の画面操作 | [setup_google.md](./setup_google.md) |
| Azure の画面操作 | [setup_outlook.md](./setup_outlook.md) |
| 実 API 手動スモーク | [manual-local-smoke.md](./manual-local-smoke.md) |
| ブリッジ設計・LaunchAgent | [eventkit-bridge.md](./eventkit-bridge.md) |
| Google 特化ルール（Cursor） | [calendit-google.md](./calendit-google.md) |

---

## 10. `apply` で予定の日付を変えたい（移動）とき

- 入力 Markdown の日付だけが変わると、`listEvents` する**期間**が入力行の日付に合わせて**狭まる**ため、まだカレンダー上に旧日付で残っている予定（ID は同じ）が取得範囲外になり、**更新ではなく新規扱い**に落ちる。同一ファイル内に**同じ ID を2行**置くとバリデーションで弾かれる。
- 対策: 直前の `query --start … --end …` と**同じ期間**を `calendit apply --in … --start … --end …` に付け、旧日付を含めて既存イベントを解決する。意図しない新規分岐のときは WARN が出る。

---

## 11. よくあるタスク → 最初に見るファイル

| タスク | ファイル |
|--------|----------|
| 初回ラリーの要約（CLI から同じ URL を出す） | `calendit onboard` |
| 新コマンドやオプション追加 | `src/commands/*.ts` → `commands.md` |
| 接続状態表示の変更 | `src/core/accountStatus.ts` / `authStatus.ts` |
| EventKit トランスポート変更 | `src/core/eventkitHelper.ts` |
| 新テストケース | `docs/tests.md` |
