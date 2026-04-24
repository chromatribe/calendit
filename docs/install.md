# インストール（ここから始める）

**最終更新の前提:** ターミナル（macOS の「ターミナル」、Windows の PowerShell 等）が使えること。

## 1. Node.js 18 以上

```bash
node --version
```

`v18` 未満や「command not found」なら、まず [Node.js 公式 LTS](https://nodejs.org/) から入れ、**ターミナルを開き直して**もう一度確認します。手順の細部は [getting-started 第2章](./getting-started.md#2-nodejs-を用意する必須) へ。

## 2. `calendit` をグローバルに入れる

```bash
npm install -g calendit
```

インストール直後、ターミナルに **初回ラリー**の GitHub への 1 行案内が出る場合があります（`package.json` の `postinstall`）。**同梱の `docs/` はありません** — 同じ案内先はルート [README.md](../README.md) にもある URL です。

## 3. 起動の確認

```bash
calendit --version
calendit --help
```

## 4. 次の一手（登録・カレンダー接続）

- **会話付きの最初の道筋（AI / Cursor 向けの流れ）:** リポ外でも読める **[ai-onboarding-rally（GitHub）](https://github.com/chromatribe/calendit/blob/main/docs/ai-onboarding-rally.md)**。ターミナルだけ先にすすめるなら **`calendit onboard`**。  
- **人間向け（省略なし、画面操作の細部）:** [getting-started.md](./getting-started.md)  
- **難易度低めの全体地図（日本語）:** [beginner-guide-ja.md](./beginner-guide-ja.md)

**登録ができたかの確認**は `calendit accounts status` です（詳細は [commands.md](./commands.md)）。

---

**開発者向け（ソース clone）:** リポジトリ上では `npm ci` → `npm run build` や `npm run ux:link` 等 — [ux-evaluation.md](./ux-evaluation.md)。
