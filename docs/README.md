# calendit ドキュメント（目次）

このフォルダには、**プログラムを書けない人でも順に読めば動かせる説明**から、**コマンドの網羅**、**AI（Cursor / Antigravity 等）向けの機械可読な情報**までを置いています。  
**npm から入れただけ**の人は、まず **[install.md](./install.md)**（インストール → 次の一手）から。

迷ったら **次の順番** で読んでください。

---

## 1. まず読む（全体像・目的）

| 文書 | 誰向け | 内容 |
|------|--------|------|
| [ルートの README.md](../README.md) | 全員 | アプリの目的・主な機能・リポジトリでの始め方へのリンク |
| この `README.md`（いま読んでいるファイル） | 全員 | `docs/` の地図（どれをいつ読むか） |

---

## 2. 使い方（ゼロからカレンダー登録・動作確認まで）

| 文書 | 内容 |
|------|------|
| **[install.md](./install.md)** | **インストールから:** `npm install -g` → `calendit --version` → 次のドキュ（初回ラリー / getting-started への導線） |
| **[beginner-guide-ja.md](./beginner-guide-ja.md)** | **非エンジニア向け（日本語）。** 導入（Node / 入手）→ 起動（バージョン確認）→ **登録**（Google / Outlook / この Mac）に厚めの分量。**再インストール・設定リセット**（§5）。全体の地図とよく詰まる所の表。詳細手順は下の `getting-started` から深掘り |
| **[getting-started.md](./getting-started.md)** | **最重要（省略なし）。** Node の確認 → 取得 → インストール → ビルド → `calendit` の起動方法 → Google / Outlook / macOS のどれか一方を選んで API 登録 → ログイン → コンテキスト（カレンダー）登録 → 予定の取得・テスト → 自動テスト `npm test` の意味まで、**手順化** |

補助（プロバイダ別のクラウドコンソール操作はこちらが詳しいです）。

| 文書 | 内容 |
|------|------|
| [setup_google.md](./setup_google.md) | Google Cloud Console での API 有効化・OAuth クライアント作成 |
| [setup_outlook.md](./setup_outlook.md) | Microsoft Entra ID でのアプリ登録・権限・リダイレクト URI |
| [quickstart_google.md](./quickstart_google.md) | Google に絞った短い手順（グローバル `npm install -g` 利用者向け）。**初めての方は [getting-started.md](./getting-started.md) を先に読むことを推奨** |
| [ux-evaluation.md](./ux-evaluation.md) | **UX 検証:** `git clone` → `npm ci` / `npm test` → `npm run ux:link` または `pack` 経由のグローバル試用 |
| [publishing.md](./publishing.md) | **npm 公開:** `npm login` → `npm publish`（メンテナー・バージョンの注意） |

---

## 3. コマンド一覧（リファレンス）

| 文書 | 内容 |
|------|------|
| **[commands.md](./commands.md)** | 先頭に **コマンド早見表**、以下にサブコマンドごとのオプション・例 |

---

## 4. AI（エージェント）向け

| 文書 | 内容 |
|------|------|
| **[ai-onboarding-rally.md](./ai-onboarding-rally.md)** | 初回ラリー: Google / Outlook / macOS 分岐と次コマンド。npm `-g` 向け [GitHub 上の同文書](https://github.com/chromatribe/calendit/blob/main/docs/ai-onboarding-rally.md) — `calendit onboard` も同趣旨 |
| **[for-ai-agents.md](./for-ai-agents.md)** | リポジトリ構成、設定パス、環境変数一覧、テストの仕組み、OAuth 時の注意、よくある失敗と読むべきファイル |
| [calendit-google.md](./calendit-google.md) | Google 操作に特化したエージェント向けメモ（Cursor ルール用フロントマタ付き） |
| [development.md](./development.md) | アーキテクチャ、エラー階層、テストランナー、`tests.md` の書き方 |
| [tests.md](./tests.md) | 自律テストケース定義（`npm test` がここを読む） |

---

## 5. macOS カレンダー（EventKit）・ブリッジ

| 文書 | 内容 |
|------|------|
| [eventkit-bridge.md](./eventkit-bridge.md) | 常駐ブリッジ、ソケット、`.app` / LaunchAgent、環境変数 |
| [manual-local-smoke.md](./manual-local-smoke.md) | 実 API・権限・手動スモークのチェックリスト |

ネイティブ実装の README:

| パス | 内容 |
|------|------|
| [../native/eventkit-helper/README.md](../native/eventkit-helper/README.md) | EventKit ヘルパーのビルド |
| [../native/eventkit-bridge/README.md](../native/eventkit-bridge/README.md) | 常駐ブリッジのビルド・`.app` |

---

## 6. プロダクト管理・履歴

| 文書 | 内容 |
|------|------|
| [roadmap.md](./roadmap.md) | ロードマップ |
| [changelog.md](./changelog.md) | 変更ログ |
| [calendit-tasks/](./calendit-tasks/) | 優先タスク・バックログ |

---

## 7. 仕様の正（コードとセット）

| 文書 | 内容 |
|------|------|
| [../spec/spec.md](../spec/spec.md) | 製品仕様の要約 |
| [../spec/history/](../spec/history/) | 版ごとの詳細変更履歴 |
