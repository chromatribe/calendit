# 開発ロードマップ

## v1.1.0（次期リリース予定）

### 1. 認証・コンテキストの状態一覧（`auth status` コマンド）

**背景**

現状の `calendit config check` はコンテキストの定義（サービス名・カレンダー ID）を表示するのみで、トークンの有効性は確認しない。ログイン済みかどうかをひと目で確認できるコマンドが必要。

**実装予定の出力例**

```
$ calendit auth status

CONTEXT    SERVICE   CALENDAR     ACCOUNT                   TOKEN
--------   -------   ----------   -----------------------   --------
crmt       google    primary      ivis.klain@chromatri.be   OK
lnw        google    10_LNW       ivis.klain@chromatri.be   OK
home       outlook   primary      ivis.klain@outlook.com    OK
work       outlook   primary      work@example.com          NOT LOGGED IN
```

**チェック内容**

| サービス | トークン保存場所 | 有効性の判定方法 |
|---|---|---|
| Google | `~/.config/calendit/google_token_<context>.json` | ファイル存在 + `expiry_date` が現在時刻より未来 |
| Outlook | `~/.config/calendit/msal_cache.json`（Keychain 管理） | `getAllAccounts()` でコンテキストの `accountId` に一致するアカウントの有無 |

---

### 2. 同一サービスで複数アカウント接続

**現状**

| サービス | 複数アカウント | 状況 |
|---|---|---|
| Google | 可能 | コンテキストごとに別トークンファイルが作成される |
| Outlook | 可能 | MSAL キャッシュに複数アカウントを共存できる |

現時点でもコマンド上は複数アカウントの登録が可能だが、手順が未ドキュメント。`v1.1.0` でドキュメント整備と動作検証を行う。

**Google で2アカウントを使う手順（整備予定）**

```bash
# アカウントAでログイン → crmt コンテキストへ紐づけ
calendit auth login google --set crmt
calendit config set-context crmt \
  --service google --calendar primary --account crmt

# アカウントBでログイン → personal コンテキストへ紐づけ
calendit auth login google --set personal
calendit config set-context personal \
  --service google --calendar primary --account personal

# それぞれ別アカウントで query できる
calendit query --set crmt
calendit query --set personal
```

**Outlook で2アカウントを使う手順（整備予定）**

```bash
# アカウントAでログイン（ブラウザで account-a@outlook.com を選択）
calendit auth login outlook
calendit config set-context home \
  --service outlook --calendar primary --account account-a@outlook.com

# アカウントBでログイン（ブラウザで account-b@outlook.com を選択）
calendit auth login outlook
calendit config set-context work \
  --service outlook --calendar primary --account account-b@outlook.com
```

> **注意**: Outlook は MSAL の共有キャッシュを使うため、コンテキストの `--account` に正確なメールアドレスを指定しないと意図しないアカウントが選択される場合がある。

---

## v1.2.0 以降（将来検討）

| 機能 | 概要 |
|---|---|
| Homebrew tap | `brew install chromatribe/tap/calendit` でインストール可能にする |
| `query` 対話フィルタ | `fzf` 連携による予定の絞り込み・コピー |
| 横断 query | 複数コンテキストをまとめて query し、マージ表示する |
| WebDAV / CalDAV 対応 | iCloud・Nextcloud などへの対応（要調査） |

---

## バージョニング方針

| 種別 | バージョン例 | 基準 |
|---|---|---|
| パッチ | `1.0.x` | バグ修正・ドキュメント修正 |
| マイナー | `1.x.0` | 後方互換性のある新機能追加 |
| メジャー | `x.0.0` | 破壊的変更（コマンド構文変更等） |
