# UX 検証の始め方（Git / npm）

手元または検証用マシンで、**1 から** `calendit` の操作感（初回導線・`onboard`・`accounts status` など）を試すための**最小手順**です。詳しいカレンダー接続は [getting-started.md](./getting-started.md) へ。

## 前提

- **Node.js 18 以上**（推奨: 20。リポジトリ直下の [`.nvmrc`](../.nvmrc) を `nvm use` 等に使える）
- **Git**（リポジトリを取得する場合）

## 1. ソースを手元に置く

```bash
git clone https://github.com/chromatribe/calendit.git
cd calendit
```

（すでに clone 済みなら、そのディレクトリで続ける。UX 用の作業は `ux/日付-お題` など**別ブランチ**を切ってもよい。）

## 2. 依存とビルド・テスト

```bash
npm ci
npm test
```

`npm test` が通ること（グリーン）を、**UX セッションの出発点**にする。

## 3. グローバルに「ローカル版」として指す（推奨）

レジストリを経由せず、**いまのソース**を `calendit` コマンドで実行したいとき:

```bash
npm run ux:link
# または: npm run build && npm link
```

別ターミナルで:

```bash
calendit --version
calendit --help
calendit onboard
```

検証が終わったら（必要なら）:

```bash
npm unlink -g calendit
```

## 4. npm パッケージ中身の確認（レジストリ配布のシミュレーション手前）

`prepack` で `npm test` が走る設定なので、**本番に近い tarball**を作る前に中身だけ確認:

```bash
npm run pack:check
```

実 tarball を出して「`npm install -g` 相当」を試す例（bash）:

```bash
npm pack
npm install -g "./calendit-"*.tgz
calendit --version
# あとで: npm uninstall -g calendit
```

## 5. 公開 `npm` から入れた体験に寄せる場合

```bash
npm install -g calendit
```

初回の案内は `postinstall` または [ルート README](../README.md) の **初回ラリー** URL を参照。`docs/` は同梱されないため、**GitHub 上の** [ai-onboarding-rally.md](https://github.com/chromatribe/calendit/blob/main/docs/ai-onboarding-rally.md) を開く。

## 6. 注意（秘密情報）

- **OAuth 用の JSON やトークン**をリポジトリに**コミットしない**（`~/.config/calendit` 等に保存される想定）。
