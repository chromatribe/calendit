# [Log] calendit プロダクトタスクシート

**最終更新**: 2026-04-24  
**対象リリース目安**: v1.1.0（次期） / v1.2.0 以降

---

## 背景・現状の課題

- CLI で Google / Outlook / macOS（EventKit）にまたがるカレンダー操作を行う。コンテキストと認証状態が増えるほど、「何ができていて何が残っているか」を一箇所で追いづらくなる。
- `docs/roadmap.md` と `docs/development.md` にロードマップ系の記述が分散しており、優先度の単一の情報源がなかった。

## ゴール・成果指標（Definition of Done）

- **運用**: 着手順と残タスクの「正」が本ファイルに集約され、`spec/spec.md` は仕様の正として二重管理を最小化する。
- **v1.1.0**: macOS EventKit 経路・横断 `accounts status` が利用可能で、Google / Outlook の複数アカウント利用手順がドキュメント化され検証済みであること。
- **品質**: 変更に伴い `spec/history/`（新規はルートの `[MajorVersion].YYYYmmdd.[Sequence].md`、旧形式は `old/` 参照）と `docs/tests.md` の更新方針（既存ルール）を満たす。

---

## 現況（サマリ）

| 区分 | 内容 |
|------|------|
| 実装済み（コア） | Google / Outlook CRUD、`query` / `apply` / `add`、コンテキスト、Dry Run / Sync、自律テスト（`docs/tests.md`）、カスタムエラー階層 |
| 実装済み（i18n） | `src/locales/en.json` / `ja.json`、`t()`、`--locale` / `config set-locale`、初回のみ言語選択（config なし時）、`gen:locales` / `check:locales`、CI |
| 実装済み（認証・可視化） | `calendit auth status`、横断 **`calendit accounts status`**（同一表・推奨ログ）、トークン列の意味は仕様・コマンドヘルプ参照 |
| 実装済み（macOS） | `service: macos`、`native/eventkit-helper`、`calendit macos doctor` / `list-calendars`（履歴: `2026-0419-01.01` 相当） |
| 未完了（v1.1.0） | Google / Outlook の複数アカウント手順の**ドキュメント整備**と**動作検証** |

---

## 予定（マイルストーン）

### v1.1.0

#### macOS（EventKit）・横断ステータス

- [x] `service: macos` コンテキストと `native/eventkit-helper`
- [x] `calendit macos doctor` / `list-calendars`
- [x] `calendit accounts status`（`CONNECTION` 列を含む横断表示）
- [x] `auth status` を同一系の表示方針に整合（`accounts` を推奨するログ方針含む）

#### 認証・コンテキスト状態一覧

- [x] `calendit auth status` 実装（当初要件の「一覧表示」は `accounts status` が主担当）
- [x] 利用者向けドキュメントに、トークン確認の考え方（Google ファイル + `expiry_date`、Outlook MSAL + `accountId` 一致）を短く掲載する（例: `docs/commands.md` または README リンク）

**当初要件メモ（出力イメージ）**

```
$ calendit auth status

CONTEXT    SERVICE   CALENDAR     ACCOUNT                   TOKEN
--------   -------   ----------   -----------------------   --------
crmt       google    primary      user@example.com        OK
```

#### 同一サービスで複数アカウント

| サービス | 複数アカウント | 現状 |
|----------|----------------|------|
| Google | 可能 | コンテキストごとに別トークンファイル |
| Outlook | 可能 | MSAL キャッシュに複数アカウント共存 |

- [x] **Google**: 2 アカウント利用手順をドキュメント化（ログイン → `set-context` → `query` の流れ）
- [x] **Outlook**: 2 アカウント利用手順をドキュメント化（`--account` に正確なメールが必要な注意を含む）
- [x] 上記手順の**動作検証**（Google・Outlookそれぞれ最低1パス）

### v1.2.0 以降（ロードマップ由来）

- [ ] Homebrew tap（`brew install chromatribe/tap/calendit` 想定）
- [ ] `query` 対話フィルタ（`fzf` 連携）
- [ ] 横断 `query`（複数コンテキストのマージ表示）
- [ ] WebDAV / CalDAV 対応（iCloud・Nextcloud 等、要調査）
- [x] **EventKit 常駐ブリッジ（MVP）** — [native/eventkit-bridge/](../../native/eventkit-bridge/) + `CALENDIT_EVENTKIT_BRIDGE` / [docs/eventkit-bridge.md](../eventkit-bridge.md)。未: `.app` 化・公証・メニューバー

### バックログ（優先度付き・旧 development.md より統合）

| 優先度 | 項目 | 概要 |
|--------|------|------|
| 高 | 重複予定の検知 | 同時刻の予定重複の警告表示 |
| 中 | JSON 中間形式の標準化 | AI が読み書きしやすいメタデータ構造 |
| 中 | 繰り返し予定のサポート | 週次・月次などの CRUD |
| 中 | 双方向同期の強化 | ローカル Markdown とリモートの完全同期・conflict 解決 |
| 中 | Web 会議連携 | Meet / Teams / Zoom URL 自動生成 |
| 中 | 対話オンボーディング（`onboard`） | 認証〜カレンダー選択までのウィザード（メッセージは `locales` 経由で統一） |
| 中 | EventKit 常駐ブリッジ（.app / 配布） | MVP + **ローカル .app 組立・LaunchAgent スクリプト** 済。残: Developer ID・公証・cask |
| 低 | `cal edit` コマンド | カレンダー名の変更 |

※バックログのマイルストーン割当は、着手時に本セクションまたは v1.2.0 節へ移動する。

---

## 作業ログ・決定事項

- **2026-04-21**: プロダクトタスクシートを `docs/calendit-tasks/PRI_TASK_calendit.md` に新設。`docs/roadmap.md` の詳細項目と `docs/development.md` のロードマップ表を本ファイルへ統合。ロードマップ文書は要約＋バージョニング方針に薄型化。
- **2026-04-23**: UI ローカライズ基盤（英語既定・初回言語対話・`CALENDIT_LOCALE` / `--locale`）、ロケール整合チェック・`CONTRIBUTING.md`・CI。残タスクは全コマンドの文言を `locales` へ移す第 2 波とオンボーディング。
- **2026-04-24**: `docs/tests.md` の i18n・認証・`ErrorMeta` 系 TC と `spec` §2.7（エラー表示とログ）を同期。`handleError` の診断 JSON とテストランナーの `calendit` 置換を調整（`DEBUG=calendit` と両立）。EventKit **常駐ブリッジ**案を [docs/eventkit-bridge.md](../eventkit-bridge.md) に整理し、v1.2 系バックログへ追加（当面は `macos external`）。
- **2026-04-24**: EventKit ブリッジ **MVP 実装**（[native/eventkit-bridge/](../../native/eventkit-bridge/) Swift サーバ、`CALENDIT_EVENTKIT_BRIDGE` + [src/core/eventkitHelper.ts](../../src/core/eventkitHelper.ts)）。
- **2026-04-24**: ブリッジ **`CalenditEventKitBridge.app` 組立**と **LaunchAgent** インストールスクリプト（[spec/history/old/2026-0424-01.03.md](../../spec/history/old/2026-0424-01.03.md)）。
- **2026-04-24**: EventKit **ブリッジ自動採用**（未指定で token+ソケット存在時）、`config set-macos-transport`、`macos bridge start` / `macos setup`、接続リトライ・`OK (bridge)` 表示（[spec/history/old/2026-0424-01.05.md](../../spec/history/old/2026-0424-01.05.md)）。
- **2026-04-24**: `npm` 向け `package.json#version` を [semver](https://semver.org/) 準拠（`2026.4.24` 等）に揃え、`files` 白リスト・`prepack` で tarball を 50MB+ から圧縮。clone 直後は `npm run build` 必須。詳細 [spec/history/old/2026-0424-01.06.md](../../spec/history/old/2026-0424-01.06.md)。
- **2026-04-24**: **`calendit macos bridge build`**（Swift ブリッジ `.app` 組立、`build-app-bundle.sh` 委譲）。[spec/history/old/2026-0424-01.07.md](../../spec/history/old/2026-0424-01.07.md)
- **2026-04-24**: **`calendit macos bridge fetch`**（GitHub 取得・説明+サイズ+確認、任意ビルド）。 [spec/history/old/2026-0424-01.08.md](../../spec/history/old/2026-0424-01.08.md)
- **2026-04-25**: **ドキュメント再構築**（非エンジニア向け校正・GitHub向け装飾・AIセクション分離）。製品バージョン `1.20260425.3`。 [spec/history/1.20260425.3.md](../../spec/history/1.20260425.3.md)
- **2026-04-25**: **開発ルールの同期・更新**（メジャーバージョン更新基準の明記、`.cursor` / `.agents` 同期）。製品バージョン `1.20260425.05`。 [spec/history/1.20260425.05.md](../../spec/history/1.20260425.05.md)
- **2026-04-25**: **徹底テスト用シナリオ集の策定**（ツール・AI・タスクリスト連携）。製品バージョン `1.20260425.06`。 [spec/history/1.20260425.06.md](../../spec/history/1.20260425.06.md)
- **2026-04-25**: **`apply` 同期レンジ・Google `timeZone`・移動時 WARN**（`query` 期間パース集約含む）。 [spec/history/1.20260425.4.md](../../spec/history/1.20260425.4.md)
- **2026-04-25**: **Outlook `cal list` がカレンダーグループ配下も網羅**（Graph の `calendarGroups` + ページング、ID 重複排除）。製品バージョン `1.20260425.6`。 [spec/history/1.20260425.6.md](../../spec/history/1.20260425.6.md)
- **2026-04-25**: **変更履歴ファイルの命名**: `spec/history` は `[MajorVersion].YYYYmmdd.[Sequence].md`、H1 はファイル名（`.md` 除く）と一致（`.cursor/rules/rule.mdc` §1）。
- **2026-04-26**: **Outlook 複数 MSAL アカウント時の誤フォールバック修正**（`accountId` 照合の正規化、`ACCOUNT MISMATCH`、一致なし時は API 呼び出し前にエラー）。製品バージョン `1.20260426.1`。 [spec/history/1.20260426.1.md](../../spec/history/1.20260426.1.md)
- **2026-04-26**: **EventKit ブリッジ**: `bridge start` が fetch/build 先の `.build/.app` を検出、ビルド後に `~/Applications`・`/Applications` へコピー試行（env でスキップ可）。製品バージョン `1.20260426.2`。 [spec/history/1.20260426.2.md](../../spec/history/1.20260426.2.md)
- **2026-04-26**: **`macos doctor` / eventkit-helper パス**: パッケージルートからのヘルパー解決、`doctor` でブリッジソケット表示と bridge+d denied 時の TCC ヒント。製品バージョン `1.20260426.3`。 [spec/history/1.20260426.3.md](../../spec/history/1.20260426.3.md)
- **2026-04-26**: **テスト環境の構築・シナリオ策定**: Google/Outlook/macOS の全テスト用コンテキスト設定完了。徹底テスト用シナリオ集（[docs/comprehensive-test-scenarios.md](../comprehensive-test-scenarios.md)）を策定。

---

## 🚀 次回以降のタスク

### 1. 徹底テストの実施とブラッシュアップ
- [ ] **シナリオ A-1 (リスケ)**: 曖昧な指定からの時刻更新テスト
- [ ] **シナリオ A-2 (横断検索)**: Google × Outlook の空き時間マージ
- [ ] **シナリオ T-1 (デッドライン)**: Unified Todo からの締切プロット
- [ ] **シナリオ T-2 (作業枠確保)**: 空き時間への自動アサイン
- [ ] **AI振る舞いの言語化**: テスト結果に基づき [docs/for-ai-agents.md](../for-ai-agents.md) を更新

### 2. インフラ・公開準備
- [ ] Homebrew tap 対応の検討
- [ ] `query` の対話フィルタ（`fzf` 風）実装検討

---

## 一時メモ（整理対象）

- （なし）

---

## ネクストアクション

- [ ] 複数アカウント（Google / Outlook）手順のドキュメント執筆・掲載先決定 | v1.1.0
- [ ] 上記手順の実機検証 | v1.1.0
- [ ] トークン／認証状態の利用者向け短い説明をドキュメントへ追記 | v1.1.0

---

## 参照

- [spec/spec.md](../../spec/spec.md)
- [spec/history/](../../spec/history/)
- [docs/tests.md](../tests.md)
- [docs/roadmap.md](../roadmap.md)（バージョニング方針・リリース要約）
- [docs/eventkit-bridge.md](../eventkit-bridge.md)（EventKit 常駐ブリッジ設計メモ）
- [docs/development.md](../development.md)（アーキテクチャ・テスト手順）
