# calendit を使う（非エンジニア向け：導入 → 起動 → 登録）

プログラムの経験は不要です。ここでは **「導入」「起動」「登録」** に力を入れ、画面の手順とコマンドのコピー先だけ分かれば進められるよう順にまとめています。用語の詳解や、クラウドコンソール（Google / Microsoft）の画面操作の**省略なし版**は **[getting-started.md](./getting-started.md)** へ誘導します。

**この文書の流れ（全体像）**

```mermaid
flowchart LR
  A[1 導入] --> B[2 起動]
  B --> C[3 登録]
  C --> D[4 予定の表示]
```

1. **導入** — 必要なアプリ（Node.js）を入れ、`calendit` というコマンドを手元のパソコンに用意する。  
2. **起動** — ターミナルで `calendit` が動くことを確かめる。  
3. **登録** — 使うカレンダー（Google / Outlook / この Mac）を選び、**コンテキスト**（用途ごとの名前）と紐づける。  
4. **表示** — 今日の予定などを取り出す（本文末の手順で触れます）。  
5. **再インストール** — 壊したと感じるとき、バージョン上げ、設定のやり直し。必要なときだけ **[§5](#5-再インストール)** へ。

---

## 0. あらかじめ知っておく3つの言葉

| 言葉 | ここでの意味（これだけ覚えれば足ります） |
|------|------------------------------------------|
| **ターミナル** | 文字を打ってコンピュータに命令する窓。macOS なら「ターミナル.app」。 |
| **コマンド** | 1 行の命令。行末で Enter を押すと実行されます。 |
| **コンテキスト** | calendit 内部の「名前付きの紐づき」。`work` や `home` など、**好きな英数字**を付け、「その名前を選べば、あの Google カレンダーに接続する」といった**セット**のことです。`--set その名前` で使い分けます。 |

---

## 1. 導入

### 1.1 必要なもの

- **macOS または Windows** など、普通の PC（macOS 上で「この Mac のカレンダーだけ使う」場合の説明を含みます。Windows では **Google または Outlook** 経由になります）。  
- **インターネット**（初回のログインや、クラウドのカレンダー取得用）。  
- 使うサービスに合わせた **Google または Microsoft アカウント**、または（macOS のみ）**この Mac に保存されている予定**。

### 1.2 Node.js を入れる

calendit は **Node.js** 上で動きます。バージョン **18 以上**が必要です。ターミナルを開き、次の **1 行**をそのまま貼り付けて Enter してください。

```bash
node --version
```

- `v18.0.0` より新しければ、**1.3** へ。  
- 「見つかりません」や **17 以下**なら、公式サイト [https://nodejs.org/](https://nodejs.org/) から **LTS** をインストールし、**ターミナルを一度閉じてから開き直し**、もう一度上の行を実行してください。  

詳しい画面付きの説明は [getting-started.md の第 2 章](./getting-started.md#2-nodejs-を用意する必須) です。

### 1.3 `calendit` を手元に用意する

**まずは次の一択** — パッケージが [npm](https://www.npmjs.com/package/calendit) にあるなら、**いちばん早い**のはグローバル導入です。手順の**短い版**は [install.md](./install.md) も参照してください。

```bash
npm install -g calendit
calendit --version
```

以降、ソースを触る・別の入れ方をする場合の**どれか一つ**で足ります。開発でソースを扱う場合は**下表の B** など、**npm 以外**の入れ方を選びます。

| 方法 | 向いている人 | 要約 |
|------|--------------|------|
| **A. グローバル `npm install`（推奨・上記）** | まず使ってみる、npm から入れたい。 | `npm install -g calendit` のあと、どこでも `calendit` と打てることが多い。 |
| **B. リポジトリをクローン** | ソースが GitHub などにある。AI やドキュメントが示す `calendit` フォルダがある。 | フォルダの中で `npm install` → `npm run build`。これで `calendit` は **`node パス/dist/index.js` の形**で起動するか、後述のエイリアスを付ける。 |
| **C. 圧縮版を展開** | 配布 ZIP などの場合。 | 同梱の `README` に従い、通常は B と同様に `npm install` やビルドがある。 |

**B でリポジトリのルートにいる**ときの定番の流れ（コピー用。パスは自分の `calendit` フォルドに合わせて変えてください）:

```bash
cd /あなたの置き場所/calendit
npm install
npm run build
node "$(pwd)/dist/index.js" --version
```

バージョン（年や番号）が表示されれば **導入は成功**です。毎回長い `node` のパスを打ちたくない場合は、次の **1.4** を行うか、ショートカット的に以下のように**そのターミナルだけ**で有効にできます。

```bash
alias calendit='node /あなたの置き場所/calendit/dist/index.js'
```

（エイリアスを永続化する手順は OS やシェルによって違います。まずは「開いたターミナルで 1 回」でも構いません。）  

**他の導入パターン**（`npm link` や `PATH` への追加）は、より詳しく [getting-started.md 第 4〜5 章](./getting-started.md#4-依存関係のインストールとビルド) にあります。

---

## 2. 起動

### 2.1 起動 = 「バージョンとヘルプが出る」こと

`calendit` が**どの形**で入ったかに応じ、次の **どちらか**を試します。

- **グローバル導入の場合**  

```bash
calendit --version
calendit --help
```

- **リポジトリで `node dist/index.js` だけ使う場合**（リポジトリのルートで）  

```bash
node dist/index.js --version
node dist/index.js --help
```

- **エイリアス**を付けた場合は、代わりに `calendit` と打ちます。  

`--version` に数字のような表記が出て、`--help` に `query` や `config` などの一覧が出れば **起動成功**です。

### 2.2 起動直後の「初回のエラー」について

`config.json` など**まだ設定を一度も作っていない**とき、あるコマンドは「設定を読めない」旨を出すことがあります。それは失敗ではなく、**このあと 3. で登録すれば解消**する前段階のメッセージのことが多いです。心配なら、まずは **2.1** の表示だけを確認し、[getting-started 第 6 章](./getting-started.md#6-設定ファイルはどこに保存されるか)で保存場所を合わせても構いません。

### 2.3 「`calendit` という文字が通らない」

- `command not found`：グローバルに入れていなければ **2.1** の `node フルパス/dist/index.js` か **エイリアス**を使います。  
- **別のフォルダ**に移動しすぎている：リポジトリ使いの方は、もう一度 `cd` で `calendit` フォルダ（`package.json` がある階層）に戻ります。

---

## 3. 登録（ここが本丸です）

**登録** = 「**どのカレンダー**を、**どの名前**で扱うか」calendit に教える作業です。大きく **3 経路**から選びます。途中で戻ることはできます。よく分からなければ **Google かこの Mac** のどちらか 1 本に絞るのが安全です。

| 何を使いたいか | 心当たり | この文書の節 |
|----------------|----------|--------------|
| **Google カレンダー** | Gmail や職場の G Suite など | **3.1** |
| **Microsoft（Outlook 系）** | outlook.com や M365 など | **3.2** |
| **この Mac の予定だけ** | 「カレンダー.app」に入っている日付。クラウドは要らない | **3.3**（**macOS のみ**） |

**共通：コンテキスト名**は `my-work` のように **英字・数字・ハイフン**など、無難な 1 語（または区切られた名前）にしてください。`--set この名前` で後から毎回指定します。

### 3.1 Google カレンダーで始める

**大まかな手順**だけここに書きます。クラウド側の**アプリ登録や JSON の取り扱い**の細かい画面操作は、必ず **[setup_google.md](./setup_google.md)** および [getting-started 8-A 章](./getting-started.md#8-a-google-で始める最短のコマンド列) の順に進めてください。要点だけ箇条書きします。

1. Google Cloud 側で API やデスクトップ用 OAuth クライアントを作り、JSON をダウンロードする。  
2. 次を、JSON のパスに合わせて実行する（`…` の部分を実在のファイル名に）。  

```bash
calendit config set-google --file "$HOME/Downloads/client_secret_…….json"
```

3. コンテキスト（名前）とカレンダー ID を紐づける（例: `my-google` とプライマリ）。  

```bash
calendit config set-context my-google \
  --service google \
  --calendar primary \
  --account "you@gmail.com"
```

4. ブラウザでログインする。  

```bash
calendit auth login google --set my-google
```

5. **Google のログインと Microsoft のログインを同時に起動しないでください**（同じ待ち受けポートのため、片方を終えてからもう片方、と [getting-started](./getting-started.md) に明記あり）。

**動作確認**（登録の仕上げ）は [§4](#4-初めての予定の表示) へ。

### 3.2 Microsoft（Outlook 系）で始める

Entra（旧 Azure）での登録、クライアント ID、権限、リダイレクト `http://localhost:3000` など、**手順の正本**は **[setup_outlook.md](./setup_outlook.md)** と [getting-started 8-B 章](./getting-started.md#8-b-outlook-で始める最短のコマンド列) です。ここでは**順番**だけ示します。

1. Microsoft 側でアプリを作り、クライアント ID（長い文字列）を控える。  
2. 次を実行する。  

```bash
calendit config set-outlook --id "ここにクライアントID"
```

3. コンテキストを作る。  

```bash
calendit config set-context my-outlook \
  --service outlook \
  --calendar primary \
  --account "you@outlook.com"
```

4. ログイン。  

```bash
calendit auth login outlook --set my-outlook
```

5. 動作確認は [§4](#4-初めての予定の表示) へ。

### 3.3 この Mac のカレンダーだけ（EventKit / macOS）

**Windows では使えません。** この Mac 内の「カレンダー.app」に着いている予定にだけ触れたい、というときの経路です。

**ここは OS の都合で「100% 自動化できない」**部分があります。初回にだけ、**システムの「プライバシー」**で、ブリッジ用のアプリ（または `calendit` が内部で起動するヘルパー）に**カレンダーへのアクセス**を許可する必要が出ることがあります。ダイアログが出るか、**システム設定 → プライバシーとセキュリティ → カレンダー**から許可するかは環境次第です。これは**仕様**であり、コマンドだけで消すことはできません。

**おすすめ（Cursor や IDE 内のターミナルで使う方）**

1. **EventKit ブリッジ** `CalenditEventKitBridge.app` を、配布手順に従い入手し `/Applications` などに置く（**または** **`calendit macos bridge fetch`** — GitHub から `native/eventkit-bridge` を取り、説明・目安容量・**確認プロンプト**のあと展開し、希望なら同じ流れで **Swift ビルド**まで。続けて **`macos bridge build` 相当**の場合も。グローバル `npm` だけの環境向け。git 一式を clone する代わりに、**`bridge build`** だけ行う従来手段も [native/eventkit-bridge の README](../native/eventkit-bridge/README.md)）。**`npm` 同梱に Swift ソースはない**点は同じ。概略は [eventkit-bridge.md](./eventkit-bridge.md) および [commands.md](./commands.md)）。  
2. ターミナルでブリッジ用アプリを起動する:  

```bash
calendit macos bridge start
```

3. 初回は OS の許可画面に従い、**カレンダーへのアクセス**を有効にする。  
4. ウィザードで、カレンダー選択とコンテキスト登録をまとめて行う:  

```bash
calendit macos setup
```

ウィザードは、起動直後の待ち合わせ（ブリッジの準備）や、利用可能なカレンダー一覧のなかから選ぶ、といった**対話**を行い、内部で `config set-context` などに相当する設定を勧めます。ブリッジのソケットとトークンが揃っていれば、**毎回 `export CALENDIT_EVENTKIT_BRIDGE=1` する必要はありません**（自動でブリッジを優先しやすい挙動です。上級者向けの上書きは [commands.md](./commands.md) の `config set-macos-transport` や `CALENDIT_EVENTKIT_BRIDGE=0` を参照）。

**手作業に近い従来の道**（ヘルパーを自前でビルドし、環境変数で通す等）は、長くなるため **[getting-started 第 9 章](./getting-started.md#9-macos-のカレンダーappだけで始めるこの-mac-のみ)** に任せます。迷ったら、上の **1〜4 のステップ**（当節）と [§4](#4-初めての予定の表示) を優先してください。

### 3.4 登録の最後：一覧で接続状況を見る

すべての経路で、設定の最後の確認に使えます（まだ片方のサービスしか登録していなければ、その行だけ出ます）。

```bash
calendit accounts status
```

- クラウド: `TOKEN` や `CONNECTION` が、説明文に従い **正常に近い表示**（例: `OK` など）になっているか。  
- macOS + ブリッジ: ブリッジ経路で通っている場合、**`OK (bridge)`** など、カレンダー接続の説明の列に **ブリッジ**であることが分かる表記になる場合があります。これは**カレンダー ID の間違い**とは別の（トランスポートの）話なので、表示が分かれます。

---

## 4. 初めての予定の表示

3. まで終わり、**コンテキスト名**を `my-google` など、自分が付けたものに合わせて、次の `--set` のあとに置き換えてください。

```bash
calendit query --set my-google --start today --format md
```

予定が 0 件でも、**エラーが出なければ成功**のことが多いです。Mac のみの方は、同様に `my-google` ではなく **自分が `macos setup` などで付けたコンテキスト名**にします。ファイルに出す例:

```bash
calendit query --set my-google --start today --end 7d --format md --out ~/Desktop/this-week.md
```

**コマンドの一覧**や、ほかのオプションは [commands.md](./commands.md) を参照してください。

---

## 5. 再インストール

**いつ**バージョンを上げ直したい、動きが以前と違う、**設定だけまっさらに**したい、は別の作業です。下で目的に分けて書いています。**削除**は戻せません。大切なデータがあるフォルダは、消す前に**別名でコピー**（例: デスクトップに `calendit-backup-日付`）しておくと安心です。

### 5.1 いつ行うとよいか

| 状況 | 主に行う作業（下の小見出し） |
|------|-----------------------------|
| `calendit` の**プログラム自体**を入れ直したい（git で更新、npm の更新） | **5.2** リポジトリ型 / **5.3** グローバル型 |
| **さっきの設定**は忘れて、**一から** Google / Outlook ログインやコンテキストを作り直したい | **5.4 設定のリセット**（ログイントークンも消えます） |
| **Node.js 自体**が壊れている、とインストーラが言う | 公式 [nodejs.org](https://nodejs.org/) の LTS を入れ直し、**ターミナル全体をいったん閉じる**。そのあと [§1.2](#12-nodejs-を入れる) から。 |
| **Mac の EventKit ブリッジ**（`.app` / 常駐）がおかしい | **5.5** |

**「うまくいかない」だけで迷う場合**は、まず [§6](#6-よく詰まる所非エンジニア向け短い対処表) の表。それでも分からなければ、**5.4 は最後の手段**として、バックアップのうえで設定だけ消す、が現実的です。

### 5.2 リポジトリから使っている場合（`git clone` した `calendit` フォルダ）

1. ターミナルで、そのフォルダ（`package.json` がある階層）に移動する。  
2. **最新化したい人だけ**、Git が使えるなら `git pull`（分からなければスキップ可）。  
3. いったん依存を入れ直し、再ビルドする。

```bash
cd /あなたの置き場所/calendit
# 任意: git pull
rm -rf node_modules
npm install
npm run build
node dist/index.js --version
```

バージョン表示が出れば、**[§2](#2-起動)** と **[§3](#3-登録ここが本丸です)** のとおり、動作確認と登録を続けられます。設定ファイルは、消していなければ**そのまま**残ります（設定もやり直したい場合は **5.4** をあわせて行う）。

### 5.3 グローバル `npm` で入れた場合

```bash
npm uninstall -g calendit
npm install -g calendit
calendit --version
```

会社の PC で **社内の npm ミラー**を使うなど、**通常と違う**ところに入れている場合は、部署の手順のまま、同じコマンドで **上書き**されるか**管理者**に聞いてください。設定（`~/.config/calendit` など）が自動では消えません。

### 5.4 設定のリセット（「**最初から**やり直す」用）

- **消えるものの例**（既定の保存場所の場合）: `~/.config/calendit/` 内の `config.json`、**Google / Outlook のログイントークン**、ロケール設定、コンテキスト一覧 など。  
- **代わりに** `CALENDIT_CONFIG_DIR` を**別フォルダ**に付け替え、古い方を残したまま**新プロファイル**を始める方法は、[getting-started 第 6 章](./getting-started.md#6-設定ファイルはどこに保存されるか) を利用してください。削除より安全なことが多いです。

**既定のまま 1 か所**に入っている想定で、**丸ごと消して**一から出直す手順（**自己責任**。コピーは先に！）:

```bash
# 中身の確認（任意。Finder でも可）
ls -la ~/.config/calendit
```

不要なら、ターミナルで上のフォルダ**ごと**消します（`rm` の前にバックアップ先へコピー推奨）。

```bash
rm -rf "$HOME/.config/calendit"
```

**ブリッジ**用の `bridge.token` やソケットは、多くの場合 **`~/Library/Application Support/calendit/`** 側（または `CALENDIT_CONFIG_DIR` 利用時はその中）にあり、**5.4 の `~/.config/calendit` だけでは足りない**場合があります。ブリッジ周りもまっさらに近づけたいときは、以下を理解したうえで、不要なら該当ファイルを消す、または [eventkit-bridge.md](./eventkit-bridge.md) の **セキュリティ**とパス表を確認してください。迷う場合は、**5.4 はせず** `CALENDIT_CONFIG_DIR` で新フォルダだけ作る、をおすすめします。

**消したあと**は、もう一度 [§3](#3-登録ここが本丸です) から、Google ファイル登録、Outlook の ID 登録、`macos setup` などを行い、ログインをやり直します。

### 5.5 macOS の EventKit ブリッジ（.app や常駐）の入れ直し

- **いったん止めたい**: メニューがあれば終了。Dock に出なければ「アクティビティモニタ」で `eventkit` / `Calendit` など**関係しそいそうな**名前を**自分で**確認してから終了（誤ったプロセスを止めないよう注意）。  
- **LaunchAgent でログイン起動**している場合: [native/eventkit-bridge の README](../native/eventkit-bridge/README.md) の **LaunchAgent** 節（`uninstall-launchagent.sh` / `install-launchagent.sh`）に従い、止めてから必要なら入れ直す。  
- **.app 本体**を**入れ直す**（ビルドし直す、ZIP を取り直す）あと、**初回 TCC**や **`calendit macos bridge start` → `macos setup`** は [§3.3](#33-この-mac-のカレンダーだけeventkit--macos) どおり、もう一度通る必要があることがあります。

### 5.6 入れ直したあと

1. [§2](#2-起動) で `calendit --version` または `node dist/index.js --version`。  
2. [§3.4](#34-登録の最後一覧で接続状況を見る) で `calendit accounts status`。  
3. 問題なければ [§4](#4-初めての予定の表示) の `query`。**設定を消した直後**は 3. の登録をやり直し済みか確認。

---

## 6. よく詰まる所（非エンジニア向け・短い対処表）

| 起きること | 先に思う原因 | 行うとよいこと |
|------------|--------------|----------------|
| `command not found: calendit` | グローバル未インストール、PATH に無い | **2.1** の `node …/dist/index.js` に切り替える。または `alias`。 |
| Google/Outlook ログインが同時に失敗する | 両方を一緒に開いた | **一度**片方のログインを最後まで終える（[getting-started 注意書き](./getting-started.md#8-a-4-ブラウザでログインする)）。 |
| Mac の `accounts` だけ常に悪い | ブリッジ未起動、または権限 | **3.3** の `macos bridge start` → 許可。それでも出るなら [eventkit-bridge.md](./eventkit-bridge.md) と [for-ai-agents.md](./for-ai-agents.md) の注意。 |
| 設定の場所が分からない | 複数プロファイルを作りたい、テスト用に分けたい | [getting-started 第 6 章](./getting-started.md#6-設定ファイルはどこに保存されるか) の `CALENDIT_CONFIG_DIR`。**ブリッジ用のトークン**と保存場所の関係は [eventkit-bridge.md](./eventkit-bridge.md) を併覧。 |
| もっと一つずつ段階を追いたい | この文書の濃度では足りない | **[getting-started.md](./getting-started.md)** 全文（省略なし手順） |
| バージョン上げ・設定リセット・ブリッジの入れ直し | 導入のやり直しが必要 | **[§5](#5-再インストール)**（バックアップのうえで） |

---

## 7. 次に進む

| 次に読むもの | 向いている状況 |
|--------------|----------------|
| いまの節 [§5](#5-再インストール) | 再インストール、設定リセット、ブリッジの入れ直し（この文書内） |
| [getting-started.md](./getting-started.md) | 上級の導入・テスト、npm test、**省略なし**の全工程 |
| [commands.md](./commands.md) | 全サブコマンドの表と例 |
| [docs/README.md](./README.md) | ドキュメント全体の地図 |

**開発者**や **AI エージェント**用の、パスと環境変数のまとまりは [for-ai-agents.md](./for-ai-agents.md) を使ってください。

---

（この文書を読んでも、OS のバージョンや企業のセキュリティ方針で画面が違うことがあります。そのときは [getting-started.md](./getting-started.md) の該当章、または [changelog.md](./changelog.md) で製品版の表記揺れを追ってください。）
