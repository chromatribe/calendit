# AI 向け初回ラリー（Cursor / ターミナル）

**目的:** `npm install -g calendit` の直後から、**同じ会話の中**で、プロバイダの確定 → 設定 → 接続確認 → `calendit accounts status` まで案内する。人間向けの**省略なし**手順は [getting-started.md](./getting-started.md) を、技術深掘りは [for-ai-agents.md](./for-ai-agents.md) を併用する。

**GitHub で開く（npm 同梱に `docs` は入らない）:**  
<https://github.com/chromatribe/calendit/blob/main/docs/ai-onboarding-rally.md>

**生 URL（エージェントにそのまま渡す）:**  
<https://raw.githubusercontent.com/chromatribe/calendit/main/docs/ai-onboarding-rally.md>

---

## 会話の前提（必ず先頭で確認する）

1. **利用するのはどれか 1 つ**（初回）: **Google カレンダー** / **Microsoft Outlook（Graph）** / **この Mac のみ（EventKit / カレンダー.app）**。  
2. **OAuth** が要るのは **Google** と **Outlook** だけ。 **macOS** では **OAuth ではなく、プライバシー（TCC）と常駐ブリッジ／ヘルパー**の話になる。  
3. **表示名**（例: カレンダー上の「太郎のカレンダー」）をユーザーが言う場合、**`set-context` には `calendarIdentifier`（`CALENDAR_ID`）** を使う。人が見えるタイトル行だけに依存しない。  
4. **Google / Outlook** のデバイスフローは **`http://localhost:3000` を共有**する。**同時に 2 つの `auth login`（Google と Outlook）を走らせない。**

---

## ステップ 0: エージェントが毎回見る「ゴール定義」

- **必須の最終コマンド:** `calendit accounts status`  
- **成功の目安:** 少なくとも 1 つのコンテキストが表示され、`CONNECTION` が分かる状態（`OK` 等。文言は [commands.md](./commands.md) および実装に従う）。  
- 追加で動作確認するなら: `calendit query --set <context> --start today --format md`（失敗しなければ可）。

---

## 分岐 A: Google

1. **画面手順**はユーザーと一緒に、**[setup_google.md](./setup_google.md) を上から**（Cloud Console、OAuth 同意、デスクトップ用クライアント、JSON 取得）。  
2. クレデンシャル登録:

   ```bash
   calendit config set-google --file "$HOME/Downloads/取得した.json"
   ```

3. コンテキスト（名前は好きに置き換え可。まず `primary` で始めてよい）:

   ```bash
   calendit config set-context my-google \
     --service google \
     --calendar primary \
     --account "user@gmail.com"
   ```

   別カレンダーに合わせるなら、先に `calendit cal list`（**Google 用**）等で **カレンダー ID** を確認し、`--calendar` に入れる。  
4. ログイン:

   ```bash
   calendit auth login google --set my-google
   ```

5. 確認: `calendit accounts status`

---

## 分岐 B: Outlook

1. **画面手順**は [setup_outlook.md](./setup_outlook.md) を上から（Entra 登録、`http://localhost:3000`、必要な API 権限）。  
2. クレデンシャル:

   ```bash
   calendit config set-outlook --id "<アプリケーション (クライアント) ID>"
   ```

3. コンテキスト:

   ```bash
   calendit config set-context my-outlook \
     --service outlook \
     --calendar primary \
     --account "user@outlook.com"
   ```

4. ログイン（**Google 側の `auth login` と同時に走らせない**）:

   ```bash
   calendit auth login outlook --set my-outlook
   ```

5. 確認: `calendit accounts status`

---

## 分岐 C: macOS（EventKit / 例: 表示名「太郎のカレンダー」）

1. **最短:** [getting-started.md](./getting-started.md) の **9 章**のとおり、ブリッジ起動可能なら **`calendit macos setup`** 対話に任せる。事前に [eventkit-bridge.md](./eventkit-bridge.md) で **CalenditEventKitBridge.app** を用意し、`calendit macos bridge start` 等を済ませてもよい（TCC・IDE については [for-ai-agents.md](./for-ai-agents.md) §6）。  
2. ソース取得〜ビルドが要る場合の例: `calendit macos bridge fetch`（確認プロンプトあり。詳細は [eventkit-bridge.md](./eventkit-bridge.md) および [commands.md](./commands.md)）。  
3. ローカル **カレンダー一覧**（**`CALENDAR_ID` = `calendarIdentifier`** 列）:

   ```bash
   calendit macos list-calendars
   ```

   表の **TITLE** が「太郎のカレンダー」などユーザーが言う名前に相当する行を探し、同じ行の **CALENDAR_ID** を採用する。  
4. コンテキスト（例）:

   ```bash
   calendit config set-context work-macos \
     --service macos \
     --calendar "ここに CALENDAR_ID"
   ```

5. **macOS コンテキストの OAuth ログインは不要。** 確認: `calendit accounts status`

---

## ステップ 2: よく使う補助コマンド

| 目的 | コマンド |
|------|----------|
| 設定の目視 | `calendit config check` |
| 全コンテキストの状態 | `calendit accounts status` |

---

## 3. このラリー文書の位置づけ

| 文書 | 役割 |
|------|------|
| このファイル | **対話の分岐と次に打つコマンド**の幹（AI がそのまま追う） |
| [getting-started.md](./getting-started.md) | 人向け**省略なし**の一連手順 |
| [setup_google.md](./setup_google.md) / [setup_outlook.md](./setup_outlook.md) | クラウド**コンソールの画面操作** |
| [for-ai-agents.md](./for-ai-agents.md) | リポジトリ、環境変数、テスト、OAuth 落とし穴の**技術リファレンス** |
| [commands.md](./commands.md) | サブコマンド**網羅** |

**CLI から同じ導線を要約表示:** `calendit onboard`（各分岐のリンクと次のコマンドを出す）
