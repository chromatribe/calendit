# calendit

**ターミナルから** Google カレンダー、Microsoft Outlook（Graph）、および **この Mac のカレンダー（EventKit）** の予定を、**調べる・追加する・Markdown などのファイルと同期する** ためのコマンドラインツール（CLI）です。

ライセンス: **ISC**（[LICENSE](LICENSE)）。  
作者: **chromatribe - s.ohara**（ivis.klain@chromatri.be）

## インストールから始める

1. **Node.js 18 以上**を用意する。  
2. ターミナルで **`npm install -g calendit`。**  
3. **`calendit --version`** で動作確認。  
4. カレンダー接続の手順は、リポ内の [docs/install.md](docs/install.md)（**インストール直後の次の一手**）を開く。npm 同梱に `docs` は**含まれない**ため、**Git なし**なら下記「初回ラリー」の URL から進めてかまいません。

**npm でグローバル導入した直後（AI / Cursor の初回ラリー用）** — 同梱されない `docs/` を **GitHub 上の次の 1 本**から辿ってください（**リポジトリを clone していない場合も有効**）:

- **初回ラリー（対話用プレイブック）:** <https://github.com/chromatribe/calendit/blob/main/docs/ai-onboarding-rally.md>
- **生テキスト URL:** <https://raw.githubusercontent.com/chromatribe/calendit/main/docs/ai-onboarding-rally.md>

`npm install` 直後のターミナルにも、同じ URL を 1 行表示する `postinstall` があります（`package.json`）。

---

## 目的（なぜこのツールがあるか）

1. **人間**が、エディタとターミナルだけで予定をファイル（Markdown 等）として扱えるようにする。  
2. **AI エージェント**（Cursor、Antigravity、GitHub Copilot、その他「ターミナルでコマンドを実行できる」開発支援ツール）が、**同じコマンド**を繰り返し安全に実行できるようにする。  
3. **複数のカレンダー環境**（仕事用 Google、個人用 Outlook、Mac ローカルなど）を **名前付きコンテキスト** で切り替える。

---

## 主な機能

| 機能 | 説明 |
|------|------|
| **query** | 指定期間の予定を **Markdown / CSV / JSON** で表示またはファイル出力 |
| **apply** | ファイルの内容をカレンダーに反映（ID があれば更新、なければ新規。**同期モード**でファイルに無い予定の削除も可） |
| **add** | 1 件の予定を対話なしで追加（`--dry-run` で確認のみ） |
| **cal** | カレンダー一覧・作成・削除（macOS コンテキストでは一部未対応） |
| **config** | API クレデンシャル、コンテキスト、UI 言語の保存 |
| **auth / accounts** | OAuth ログイン、全コンテキストの **接続状態一覧** |
| **macos** | EventKit 診断（`doctor`）、カレンダー一覧、IDE 向け **Terminal.app 委譲**（`external`） |

---

## ドキュメント（必読の順）

**非エンジニアでも動かせる手順**から、**コマンド一覧**、**AI 向けの構造化情報**まで、すべて **`docs/`** にあります。

| 順 | 文書 | 内容 |
|----|------|------|
| 0a | **[docs/install.md](docs/install.md)** | **インストールから:** `npm install -g` → 起動確認 → 次の一手（**clone して `docs` を手元に置ける人**向け） |
| 0b | **初回ラリー**（npm `-g` では `docs` 未同梱）: **[ai-onboarding-rally.md on GitHub](https://github.com/chromatribe/calendit/blob/main/docs/ai-onboarding-rally.md)** | **AI / Cursor 向け:** Google / Outlook / macOS の**分岐**と、次のコマンドの幹。リポ clone なしで参照可 |
| 1 | **[docs/README.md](docs/README.md)** | `docs/` 全体の目次（**リポジトリを手元に clone した人向け**相対パス） |
| 1b | **[docs/beginner-guide-ja.md](docs/beginner-guide-ja.md)** | **非エンジニア向け（日本語）:** 導入 → 起動 → 登録に集中した全体の地図（詳細は `getting-started` へ） |
| 2 | **[docs/getting-started.md](docs/getting-started.md)** | **省略なし:** Node の確認 → 取得 → ビルド → Google / Outlook / macOS のどれかでログイン → カレンダー登録 → 動作確認 → `npm test` |
| 3 | **[docs/commands.md](docs/commands.md)** | **コマンド早見表** + 各サブコマンドのオプション |
| 4 | **[docs/for-ai-agents.md](docs/for-ai-agents.md)** | リポジトリ構成、環境変数、テスト契約、OAuth の落とし穴 |

プロバイダ別のクラウドコンソール操作:

- [docs/setup_google.md](docs/setup_google.md)  
- [docs/setup_outlook.md](docs/setup_outlook.md)  

macOS 常駐ブリッジ（上級）:

- [docs/eventkit-bridge.md](docs/eventkit-bridge.md)  
- [native/eventkit-helper/README.md](native/eventkit-helper/README.md)  
- [native/eventkit-bridge/README.md](native/eventkit-bridge/README.md)  

開発・テストの内部仕様:

- [docs/ux-evaluation.md](docs/ux-evaluation.md)（**UX 検証**の始め方: `npm test` → `npm run ux:link` 等）  
- [docs/development.md](docs/development.md)  
- [docs/tests.md](docs/tests.md)  

---

## 開発環境向けクイックコマンド（最短）

**前提:** Node.js **18 以上**、Git。

```bash
git clone https://github.com/chromatribe/calendit.git
cd calendit
npm ci    # 失敗したら npm install
npm run build
npm run ux:link  # ビルド + npm link（`npm link` だけでも可）
calendit --version
```

以降の **人間向けの詳細な手順** は **[docs/getting-started.md](docs/getting-started.md)** に集約しています（**ここでは省略しません**。README からリンク先へ誘導します）。

---

## 自動テスト

```bash
npm test
```

`docs/tests.md` に定義されたケースを実行します（実カレンダーは触らない **モック** が既定）。

---

## その他おすすめ記載（本 README で触れる項目）

| 項目 | 参照先 |
|------|--------|
| 仕様の要約 | [spec/spec.md](spec/spec.md) |
| 版ごとの変更履歴 | [spec/history/](spec/history/) |
| ロードマップ | [docs/roadmap.md](docs/roadmap.md) |
| 手動スモーク（実 API） | [docs/manual-local-smoke.md](docs/manual-local-smoke.md) |
| 変更ログ（ドキュメント） | [docs/changelog.md](docs/changelog.md) |

---

## バッジ

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
