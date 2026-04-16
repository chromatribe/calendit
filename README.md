# calendit 🗓️

ターミナルから Google / Outlook カレンダーを自在に操るための CLI ツール。
人間のための Markdown 管理と、AI エージェントのための JSON 管理を両立します。

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

## 🌟 特徴

- **Markdown 同期**: カレンダーの予定を Markdown で書き出し、メモ帳感覚で編集して一括反映。
- **コンテキスト管理**: 「仕事」「プライベート」などの用途（カレンダーID、認証アカウント）を `--set` 一つで切り替え。
- **マルチアカウント対応**: 複数の Google / Outlook アカウントを個別に認証し、シームレスに使い分け可能。
- **堅牢なエラーハンドリング**: 詳細なエラーメッセージと改善のためのヒントを提供。
- **自律的テスティング**: 期待動作をドキュメント化し、AI が自ら検証・修正を行う高度な開発フロー。
- **macOS 最適化**: 永続的なトークン管理とローカル時刻の完全サポート。

## 🚀 クイックスタート

### 1. インストール

```bash
git clone https://github.com/YOUR_USERNAME/calendit.git
cd calendit
npm install
npm run build
# パスを通す（任意）
npm link
```

### 2. 認証設定

各サービスのセットアップガイドに従って、API 認証情報を設定します。

- **Google**: [docs/setup_google.md](docs/setup_google.md)
- **Outlook**: [docs/setup_outlook.md](docs/setup_outlook.md)

```bash
# Google の設定例
calendit config set-google --id YOUR_CLIENT_ID --secret YOUR_CLIENT_SECRET
calendit auth login google

# Outlook の設定例
calendit config set-outlook --id YOUR_CLIENT_ID
calendit auth login outlook
```

### 3. コンテキストの設定

用途に応じたカレンダーを「コンテキスト」として登録します。

```bash
# 仕事用カレンダーの登録
calendit config set-context work --service google --calendar primary
```

### 4. 基本操作

```bash
# 今日の予定を Markdown に書き出す
calendit query --set work --format md --out today.md

# 予定をカレンダーに反映（新規作成・更新）
# --dry-run で変更内容を事前に確認できます
calendit apply --in today.md --dry-run

# 単発の予定を追加
calendit add --summary "ランチミーティング" --start "today 12:00" --set work
```

## 📖 詳細ドキュメント

- [コマンドリファレンス](docs/commands.md)
- [Google カレンダー セットアップガイド](docs/setup_google.md)
- [Outlook カレンダー セットアップガイド](docs/setup_outlook.md)
- [開発者向けガイド (テスト・設計)](docs/development.md)

## 🛠️ 開発者向け

### テストの実行

```bash
npm test
```

`docs/tests.md` に定義されたテストケースに基づき、自律的に検証が走ります。

## 📄 ライセンス

ISC License. 詳細は [LICENSE](LICENSE) を参照してください。
