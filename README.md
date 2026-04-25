<div align="center">
  <h1>🗓️ calendit</h1>
  <p><b>ターミナルから Google / Outlook / Mac のカレンダーを自在に操るCLIツール</b></p>
  
  [![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
  [![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
  [![npm version](https://img.shields.io/npm/v/calendit.svg)](https://www.npmjs.com/package/calendit)
</div>

<br>

> **calendit (カレンディット)** は、黒い画面（ターミナル）から、あなたのカレンダーの予定を調べたり、追加したり、Markdownなどのファイルと同期するためのコマンドラインツールです。
> 人間にとっても、AIエージェントにとっても、使いやすく設計されています。

## ✨ 何ができるの？（主な機能）

- 🔍 **予定の確認**: 指定した期間の予定を **Markdown**, **CSV**, **JSON** 形式でスッと表示できます。
- 📝 **予定の一括反映**: テキストファイルに書いた予定を、そのままカレンダーにまとめて登録・更新できます。
- ⚡️ **サクッと追加**: `--summary "ランチ" --start "12:00"` のように1行で予定を追加できます。
- 🔄 **アカウント切り替え**: 仕事用のGoogle、個人のOutlook、このMac専用のカレンダーなどを、名前（コンテキスト）で簡単に使い分けられます。
- 🛡️ **安全設計**: 間違えてカレンダーを消さないよう、変更前の確認や `--dry-run`（テスト実行）が用意されています。

---

## 🧍 初めての方・一般ユーザー向け

プログラムの知識がなくても大丈夫です。以下の**3ステップ**で使い始められます！

### 1. インストール
Node.js (バージョン18以上) が入っているパソコンのターミナルで、次のコマンドを実行するだけです。

```bash
npm install -g calendit
```

> [!TIP]
> インストールができたら `calendit --version` で動作を確認してみましょう。

### 2. 初期設定（使い方ガイド）
インストールが終わったら、どのカレンダーと繋ぐかを設定します。
図解付きで分かりやすく解説した**初心者向けガイド**をご用意しました。こちらを見ながら進めてください！

👉 **[初心者向けガイド（日本語）を読む](docs/beginner-guide-ja.md)**

---

## 🤖 AI・エージェント向け（Cursor / GitHub Copilot 等）

AIエージェント（LLM）が自律的にカレンダーを操作する能力を持たせたい場合は、以下のドキュメントを参照してください。

- **[AI・エージェント向け 初回オンボーディングラリー](docs/ai-onboarding-rally.md)**
  - エージェントが最初に読み込むべき「対話用プレイブック」です。
- **[AIエージェント向けリファレンス](docs/for-ai-agents.md)**
  - リポジトリの構成、環境変数、テストの仕組み、OAuthの注意点など、機械可読な構造化情報を提供しています。

---

## 💻 開発者向け

本リポジトリのソースコードを利用して、自分でビルドしたり開発に参加したりする場合はこちら。

<details>
<summary><b>開発環境のセットアップ（クリックして展開）</b></summary>

Node.js 18以上とGitが必要です。

```bash
git clone https://github.com/chromatribe/calendit.git
cd calendit
npm ci
npm run build
npm run ux:link
calendit --version
```
> 以降のより詳細な手順は [getting-started.md](docs/getting-started.md) に集約しています。

### 自動テスト
```bash
npm test
```
</details>

---

## 📚 ドキュメント一覧

使い方やトラブルシューティングなど、すべてのドキュメントは `docs/` フォルダにあります。
目的に合わせてお読みください。

👉 **[ドキュメント目次 (docs/README.md)](docs/README.md)**

---

<div align="center">
  <small>ライセンス: ISC | 作者: chromatribe - s.ohara (ivis.klain@chromatri.be)</small>
</div>
