# npm に公開する

**前提:** パッケージ名 `calendit` は [npm](https://www.npmjs.com/package/calendit) に既にあり、メンテナーは `chromatribe`（[package.json](../package.json) の author と一致）です。別アカウントの場合は **権限の付与**（`npm owner add`）か **スコープ名**（例: `@chromatribe/calendit`）を検討してください。

## 1. ログイン

```bash
npm whoami
```

未ログインなら（401 等）:

```bash
npm login
```

2FA 有効なアカウントの場合、OTP の入力を求められます。

## 2. ローカルで最終確認

`prepack` が **そのまま `npm test`（ビルド＋テスト）**を走らせます。先に通しておくと失敗しにくいです。

```bash
npm ci
npm test
```

## 3. 公開

リポジトリのルートで:

```bash
npm publish
```

- **初回でない**場合、[`package.json`](../package.json) の **`version` を**未使用の値に**上げて**から（[development.md](./development.md) のバージョン規則に従う）コミットし、再度 `npm publish` します。  
- 同じ `version` は**再 publish 不可**です。

`--dry-run` で tarball の内容だけ見る例:

```bash
npm publish --dry-run
```

## 4. 公開後の確認

```bash
npm view calendit version
npm view calendit dist-tags
```

他人のマシンでは（しばらく反映待ちのあと）:

```bash
npm install -g calendit@<版>
calendit --version
```

グローバル更新だけなら:

```bash
npm install -g calendit@latest
calendit --version
```

### `latest` タグが期待する版を指さないとき

レジストリ上で複数のバージョン形式が混在すると、`npm install -g calendit@latest` が意図しない版になることがあります。必要ならメンテナーが **`latest` を付け替え**ます。

```bash
npm dist-tag add calendit@<公開した版> latest
```

## 5. よくある失敗

| 症状 | 対処 |
|------|------|
| `npm whoami` が 401 | `npm login`（2FA なら OTP） |
| `PUT .../calendit` が **404** | 未ログイン・別アカウント・または **`npm owner ls calendit`** に自分が載っていない（オーナーに `npm owner add <あなたのユーザー名> calendit` を依頼） |
| `version` の自動修正警告 | [SemVer 2.0.0](https://semver.org/) では `MAJOR.MINOR.PATCH` の各数値に**先頭ゼロを付けない**。[`package.json`](../package.json) の `version` を **正規化後**（例: `1.20260425.6`）にしておくと警告を避けられる |
| 同じ version は再 publish 不可 | 失敗した `--dry-run` でも version が取られた場合は未使用の版へ上げる |

## 参考

- トラブル: [npm publish のドキュメント](https://docs.npmjs.com/cli/v10/commands/npm-publish)  
- 失敗しがち: 未ログイン、バージョン重複、`prepack` 内のテスト失敗、2FA 未入力
