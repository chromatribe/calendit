# Google カレンダー クイックスタート

このガイドでは `calendit` を使って Google カレンダーを操作できる状態にするまでを、コピペで完結するよう記述します。

---

## 前提条件

- Node.js 18 以上がインストールされていること
- Google Cloud Console で OAuth 認証情報（JSON）を取得済みであること
  - 取得方法: [docs/setup_google.md](./setup_google.md)

---

## Step 1: インストール

```bash
npm install -g calendit
```

インストール確認：

```bash
calendit --version
# 例: 2026-0416-01.02
```

---

## Step 2: Google 認証情報を登録

Google Cloud Console からダウンロードした JSON ファイル（`client_secret_xxx.json`）を指定します。

```bash
calendit config set-google --file "/path/to/client_secret_xxx.apps.googleusercontent.com.json"
```

成功すると以下が表示されます：

```
[INFO] Successfully extracted credentials from ...json
[INFO] Google credentials saved to config.
```

---

## Step 3: コンテキストを作成

コンテキスト = 「どのカレンダーをどのアカウントで操作するか」の設定です。

```bash
calendit config set-context google-main \
  --service google \
  --calendar primary \
  --account yourname@gmail.com
```

| オプション | 説明 |
|---|---|
| `google-main` | コンテキスト名（任意の名前でOK） |
| `--calendar primary` | Googleの「マイカレンダー」を指定 |
| `--account` | あなたのGmailアドレス |

---

## Step 4: Google 認証（ブラウザ）

```bash
calendit auth login google --set google-main
```

ブラウザが自動で開きます。Googleアカウントでログインして「許可」をクリックすると：

```
[INFO] Google authentication complete for account 'google-main'!
```

---

## Step 5: 動作確認

今日の予定を取得してみます：

```bash
# Markdown 形式で表示
calendit query --set google-main --start today --format md

# JSON 形式で出力
calendit query --set google-main --start today --format json
```

予定一覧が表示されればセットアップ完了です。

---

## よく使うコマンド

```bash
# 今週の予定を表示
calendit query --set google-main --start today --end 7d --format md

# 予定を新規追加
calendit add --set google-main \
  --summary "ミーティング" \
  --start "2026-05-01 10:00" \
  --end "2026-05-01 11:00"

# Markdownファイルから一括追加・更新
calendit apply --set google-main --in schedule.md --dry-run
calendit apply --set google-main --in schedule.md

# 設定状態の確認
calendit config check
```

---

## Markdown フォーマット例

`calendit query --format md` で出力されるフォーマット、そのまま `apply` でも使えます：

```markdown
# 予定一覧

## 2026-05-01
- [ ] **定例ミーティング** (10:00 - 11:00) (ID: xxxxxxxxxxxxx)
  - 議題: 週次レビュー

## 2026-05-02
- [ ] **新規予定**（IDなし = 新規作成）(14:00 - 15:00)
```

> **ポイント**: ID があれば更新、なければ新規作成として処理されます。

---

## トラブルシューティング

| エラー | 対処 |
|---|---|
| `Google credentials saved` が出ない | JSONファイルのパスを確認 |
| ブラウザが開かない | 表示されるURLを手動でブラウザに貼る |
| `No access, refresh token...` | `calendit auth login google --set google-main` を再実行 |
| `Invalid time range` | 終了時刻が開始時刻より後になっているか確認 |
| 認証がタイムアウト | 3分以内にブラウザで承認する |

---

## 参考リンク

- [コマンドリファレンス](./commands.md)
- [Google Cloud Console セットアップ詳細](./setup_google.md)
- [GitHub](https://github.com/chromatribe/calendit)
- [npm](https://www.npmjs.com/package/calendit)
