# calendit をはじめから動かす（非エンジニア向け・省略なし）

**`npm install -g` だけ済ませた**ところから、いちばん短い導線だけ知りたい場合は **[install.md](./install.md)** を先にどうぞ。  
**導入〜起動〜登録の骨格だけ**先に把握したい場合は、短くまとまった **[beginner-guide-ja.md](./beginner-guide-ja.md)** を先に読んでもかまいません。ここからは、手順の**欠落**を作らないように **省略せず**進めます。

この文書は、**プログラムを書いたことがなくても**、画面の指示どおりにコマンドをコピーして貼り付ければ **カレンダーに接続し、予定を取得できる** ところまでを説明します。  
途中で「意味が分からない語」が出たら、その場の小見出しを読んでから続けてください。

---

## 0. このガイドのゴール

最後まで終えると、次ができるようになります。

1. パソコンに **calendit** というコマンド（または同じ動作をするコマンド）を用意する。  
2. **Google**、**Microsoft Outlook（Outlook.com / Microsoft 365 等）**、または **この Mac に入っているカレンダー（macOS）** のいずれかに接続する。  
3. 「仕事用」「プライベート用」など、**用途ごとの登録（コンテキスト）** を 1 つ以上作る。  
4. **今日の予定を画面に表示する**（またはファイルに保存する）。  
5. （任意）開発者や AI が使う **自動テスト `npm test`** を一度実行し、「環境が壊れていない」ことを確認する。

---

## 1. 事前に知っておくこと（5 分で読める）

### 1.1 calendit とは

**ターミナル**（黒い画面や文字だけの画面）から、カレンダーの予定を **調べたり、追加したり、ファイルと同期したり** するための公式ツールです。  
ブラウザでログインする操作（Google / Outlook）は **初回だけ** 必要です。macOS のカレンダーを使う場合は、**この Mac の「プライバシー」設定で許可**が必要です。

### 1.2 なぜターミナルなのか

開発者や **Cursor・Antigravity など「ターミナルが使える AI」** が、あなたの代わりに同じコマンドを実行して作業できるようにするためです。あなた自身がターミナルに慣れなくても、この文書の **コピー用の行だけ** を順に実行すれば進めます。

### 1.3 用語（ここだけ押さえる）

| 用語 | 意味 |
|------|------|
| **ターミナル** | macOS では「ターミナル.app」、Windows では「コマンド プロンプト」や PowerShell など。文字を打ってコンピュータに指示を出す窓です。 |
| **コマンド** | 1 行の指示。Enter キーで実行されます。 |
| **カレントディレクトリ** | いまターミナルが「どのフォルダを見ているか」。`cd` というコマンドで移動します。 |
| **リポジトリ** | このツールのソースコードと説明書が入ったフォルダ一式（Git で取得するか、ZIP で入手します）。 |
| **コンテキスト** | calendit 内部の名前。「この名前を選ぶと、このカレンダーをこのアカウントで触る」というセットです。`--set 名前` で指定します。 |

### 1.4 次に必要なもの

- **macOS または Windows など** Node.js が動くパソコン（以降の例は **macOS のターミナル** を想定しますが、Windows でも手順はほぼ同じです）。  
- **インターネット接続**（ログインと API のため）。  
- 使いたいサービスに応じて: **Google アカウント** または **Microsoft アカウント**、または **この Mac のみ（EventKit）**。

---

## 2. Node.js を用意する（必須）

calendit は **Node.js** という実行環境の上で動きます。**バージョン 18 以上**が必要です。

### 2.1 すでに入っているか確認する

ターミナルを開き、次の **1 行まるごと** をコピーして貼り付け、Enter を押します。

```bash
node --version
```

- **`v18.0.0` より新しい数字**（例: `v20.10.0`）が表示されれば **2.3 へ進んでよい**です。  
- `command not found` や `v16.x` など **18 未満**なら、**2.2** を実行してください。

### 2.2 Node.js をインストールする（未インストールまたは古い場合）

次のどちらか **1 つだけ** 行えば十分です。

**方法 A（公式サイトから）**

1. ブラウザで [https://nodejs.org/](https://nodejs.org/) を開く。  
2. **LTS** と書かれた版をダウンロードする。  
3. インストーラの画面の指示どおりに進める（「次へ」で問題ないことが多い）。  
4. インストールが終わったら **ターミナルをいったん閉じて、もう一度開く**（これが重要です）。  
5. もう一度 `node --version` を実行し、18 以上であることを確認する。

**方法 B（すでに Homebrew を使っている人向け・上級）**

```bash
brew install node@20
```

（パスを通す手順は Homebrew の表示に従ってください。分からなければ **方法 A** を使ってください。）

### 2.3 npm があるか確認する

Node.js と一緒に **npm** が入ります。次を実行します。

```bash
npm --version
```

数字が表示されれば OK です。

---

## 3. calendit のファイルを手元に用意する

**どちらか一方**でかまいません。

### 3.1 方法 A: Git でクローンする（推奨・開発・AI 作業向け）

1. **Git** が入っているか確認します。

```bash
git --version
```

バージョンが表示されれば OK。`command not found` の場合は、[https://git-scm.com/](https://git-scm.com/) から Git をインストールしてから続けます。

2. 置きたい親フォルダに移動します（例: ホームの下の `Projects` を作る場合）。

```bash
mkdir -p ~/Projects
cd ~/Projects
```

3. リポジトリを取得します（**URL は実際のリポジトリに合わせてください**。公式例を下に書きます）。

```bash
git clone https://github.com/chromatribe/calendit.git
cd calendit
```

4. 以降のコマンドは、説明に **「リポジトリのルート」** と書いてあるときは、必ず **`calendit` フォルダの中** で実行してください。確認するには:

```bash
pwd
ls
```

`package.json` という名前のファイルが見えていれば、たいていルートで正しいです。

### 3.2 方法 B: ZIP をダウンロードする

1. GitHub のページで **Code → Download ZIP**。  
2. 展開してできたフォルダの名前を `calendit` にし、ターミナルでその中に移動します。

```bash
cd ~/Downloads/calendit
```

（フォルダの場所は環境に合わせて読み替えてください。）

---

## 4. 依存関係のインストールとビルド（必ずルートで）

リポジトリのルート（`package.json` がある場所）で、次を **順番に** 実行します。

### 4.1 パッケージのインストール

**初回・ロックファイルを信頼できるとき（CI や再現性重視）:**

```bash
npm ci
```

`npm ci` が「package-lock がない」などで失敗したら、代わりに次を使います。

```bash
npm install
```

どちらも **数分かかることがあります**。エラーが出たら、赤い英文の最後の数行をメモして、検索するか開発者に渡してください。

### 4.2 ビルド（コンパイル）

```bash
npm run build
```

エラーなく終われば成功です。ここで失敗する場合は、Node のバージョンが 18 以上か再確認してください。

---

## 5. `calendit` コマンドを実行する方法（3 通り）

「`calendit` と打てない」場合のために、**3 通り**書きます。**どれか 1 つ**を選べば十分です。

### 5.1 方法 1: `npm link`（おすすめ・ルートで一度だけ）

リポジトリのルートで:

```bash
npm link
```

成功後、**どのフォルダからでも** 次のように打てるようになります。

```bash
calendit --version
```

バージョン文字列が表示されれば成功です。

### 5.2 方法 2: 毎回フルパスで `node` を使う（リンク不要）

リポジトリのルートにいるとき:

```bash
node "$(pwd)/dist/index.js" --version
```

別のフォルダにいるときは、`/Users/あなたの名前/.../calendit` のように **絶対パス**に置き換えます。

```bash
node /絶対パス/calendit/dist/index.js --version
```

この文書のあとの例では、短く **`calendit`** と書きますが、**あなたが選んだ方法**に読み替えてください（`node .../dist/index.js` に置き換えても同じです）。

### 5.3 方法 3: npm に公開されたパッケージをグローバルインストールする

**リポジトリを使わず**、npm にパッケージがある場合のみ使えます。

```bash
npm install -g calendit
calendit --version
```

グローバル版とローカル開発版を **混ぜない** ように注意してください（設定ファイルの場所は同じルールですが、バージョンがずれると説明と違う動きをすることがあります）。

---

## 6. 設定ファイルはどこに保存されるか

- **何も設定しない場合**: 多くの環境で `~/.config/calendit/` に `config.json` やトークンが保存されます。  
- **別の場所にまとめたい場合**: ターミナルで次を実行してから `calendit` を使います（**同じターミナル窓**で続けることが重要です）。

```bash
export CALENDIT_CONFIG_DIR="$HOME/.calendit-myprofile"
mkdir -p "$CALENDIT_CONFIG_DIR"
```

以降、そのターミナルでは **すべての設定とログイン情報** がこのフォルダに入ります。  
**テスト用にきれいな状態から試したい** ときも、この方法がおすすめです。

---

## 7. どのカレンダーに接続するか選ぶ

次の **いずれか 1 つ** だけ選んでください（複数も後から追加できますが、初回は 1 つで十分です）。

| 選択 | 向いている人 | 事前準備の文書 |
|------|----------------|----------------|
| **Google** | Gmail / Google カレンダーを使っている | [setup_google.md](./setup_google.md) |
| **Outlook** | Outlook.com / Microsoft 365 のカレンダー | [setup_outlook.md](./setup_outlook.md) |
| **macOS** | この Mac の「カレンダー.app」の予定だけでよい | 下記 **9 章** と [eventkit-bridge.md](./eventkit-bridge.md)（上級） |

---

## 8-A. Google で始める（最短のコマンド列）

### 8-A.1 クラウド側の準備（画面操作が多い）

**省略しません。** 次の文書を **上から順に** 実行してください（ブラウザでのクリックが中心です）。

- **[setup_google.md](./setup_google.md)**  
  - プロジェクト作成  
  - Google Calendar API の有効化  
  - OAuth 同意画面  
  - **デスクトップアプリ** タイプの OAuth クライアント作成  
  - JSON のダウンロード  

JSON ファイルが手元の「ダウンロード」フォルダにある状態にしてから、次へ進みます。

### 8-A.2 calendit に Google の鍵を登録する

ダウンロードした JSON の **フルパス** に置き換えて実行します。

```bash
calendit config set-google --file "$HOME/Downloads/client_secret_....json"
```

画面上の質問（元ファイルを消すか等）には、**自分の判断**で `y` または `n` を入力します。

### 8-A.3 コンテキスト名とカレンダーを登録する

`my-google` は好きな名前に変えてかまいません。`--account` は **ログインする Gmail アドレス** にします。

```bash
calendit config set-context my-google \
  --service google \
  --calendar primary \
  --account "you@gmail.com"
```

- **`primary`**: いわゆる「メインの Google カレンダー」です。まずはこれで問題ありません。

### 8-A.4 ブラウザでログインする

**重要:** Google と Outlook のログインは、**どちらもポート 3000** を使います。**同時に 2 つを実行しないでください**。

```bash
calendit auth login google --set my-google
```

ブラウザが開いたら、Google の画面に従い **許可** します。ターミナルに完了のメッセージが出たら成功です。

### 8-A.5 動作確認（予定を表示）

```bash
calendit query --set my-google --start today --format md
```

予定がなくてもエラーにならなければ成功です。ファイルに保存する例:

```bash
calendit query --set my-google --start today --end 7d --format md --out ~/Desktop/week.md
```

### 8-A.6 接続状態を一覧で見る

```bash
calendit accounts status
```

`CONNECTION` が `OK` に近い表示であればよいです。

---

## 8-B. Outlook で始める（最短のコマンド列）

### 8-B.1 クラウド側の準備

**省略しません。** 次を **上から順に** 行ってください。

- **[setup_outlook.md](./setup_outlook.md)**  
  - Entra でアプリ登録  
  - リダイレクト URI に **`http://localhost:3000`**  
  - API 権限（`Calendars.ReadWrite` など）  

クライアント ID（長い GUID）をメモしてから次へ進みます。

### 8-B.2 calendit に Outlook のクライアント ID を登録する

```bash
calendit config set-outlook --id "ここにアプリケーションIDを貼る"
```

### 8-B.3 コンテキストを作る

```bash
calendit config set-context my-outlook \
  --service outlook \
  --calendar primary \
  --account "you@outlook.com"
```

### 8-B.4 ログインする

**Google のログインを同時に走らせないでください。**

```bash
calendit auth login outlook --set my-outlook
```

### 8-B.5 動作確認

```bash
calendit query --set my-outlook --start today --format md
calendit accounts status
```

---

## 9. macOS の「カレンダー.app」だけで始める（この Mac のみ）

**macOS 以外ではこの章は使えません。**

### 9.0 いちばん早い道（推奨）

1. [eventkit-bridge.md](./eventkit-bridge.md) の手順どおり **CalenditEventKitBridge.app** を用意し、起動する（または `calendit macos bridge start`）。初回は **システム設定 → カレンダー** でこのアプリにアクセスを許可する。  
2. 次を実行し、カレンダーとコンテキスト名を選ぶ（**9.1〜9.5 の手作業の代わり**になります）。

```bash
calendit macos setup
```

ブリッジが起動していれば、**`CALENDIT_EVENTKIT_BRIDGE=1` を毎回 `export` しなくても**（`~/Library/Application Support/calendit` にトークンとソケットが揃っていれば）`calendit` は自動でブリッジ経由を選びます。IDE 内ターミナルでも `accounts status` と `query` が同じ経路になりやすくなります。常にヘルパー子プロセスだけ使う場合は `calendit config set-macos-transport helper` または `CALENDIT_EVENTKIT_BRIDGE=0` を参照（[commands.md](./commands.md) の `macos` 節）。

### 9.1 EventKit ヘルパーをビルドする

ターミナルで次を **順に** 実行します（`cd` はリポジトリのルートからの相対パスです）。

```bash
cd native/eventkit-helper
swift build -c release
cd ../..
```

ビルドが成功すると、実行ファイルは例えば次にできます（パスは環境で少し違うことがあります）。

`native/eventkit-helper/.build/release/eventkit-helper`

### 9.2 ヘルパーの場所を環境変数で教える（推奨）

**毎回** 同じターミナルで使うなら（`pwd` はリポジトリルートで実行した前提の例です）:

```bash
export CALENDIT_EVENTKIT_HELPER="$PWD/native/eventkit-helper/.build/release/eventkit-helper"
```

永続化したい場合は、`~/.zshrc` の末尾に同じ行を追加します（エディタの使い方は省略しません: `nano ~/.zshrc` で開き、貼り付けて保存）。

### 9.3 診断する

```bash
calendit macos doctor
```

- **`calendarAccess` が `authorized`**: カレンダーへのアクセスが許可されています。  
- **`denied`**: **システム設定 → プライバシーとセキュリティ → カレンダー** で、**ターミナル** または **Cursor**、または **CalenditEventKitBridge.app** にチェックを入れます。  
- **Cursor の内蔵ターミナル** では許可が付きにくいことがあります。その場合は [commands.md](./commands.md) の **`calendit macos external`** の説明に従い、**ターミナル.app** 側で実行してください。

### 9.4 カレンダー一覧から ID をコピーする

```bash
calendit macos list-calendars
```

表の **`CALENDAR_ID`** の列に出る **長い英数字** を 1 つコピーします（これが `calendarIdentifier` です）。

### 9.5 コンテキストを登録する

`PASTE_ID_HERE` をさきほどコピーした ID に置き換えます。

```bash
calendit config set-context my-mac \
  --service macos \
  --calendar "PASTE_ID_HERE" \
  --account "local"
```

### 9.6 動作確認

```bash
calendit query --set my-mac --start today --format md
calendit accounts status
```

### 9.7（上級）常駐ブリッジと配布

ビルド・`.app`・ログイン項目の手順は **[eventkit-bridge.md](./eventkit-bridge.md)** にあります。ブリッジ起動中は、多くの環境で **環境変数なし**でも `calendit` がソケットを見つけて同じトランスポートに揃います。ヘルパーのみ使う従来ルート（9.1〜9.6）と併記できます。

---

## 10. よく使う次の一歩（予定の追加・ファイル反映）

### 10.1 1 件だけ追加（ドライラン）

**実際には書き込みません。** 確認だけします。

```bash
calendit add --set my-google --summary "テスト予定" --start "today 18:00" --end "today 18:30" --dry-run
```

問題なければ **`--dry-run` を外して** 同じコマンドをもう一度実行すると、本当に追加されます（**Google の例では `my-google` を自分のコンテキスト名に**読み替えてください）。

### 10.2 Markdown ファイルをカレンダーに反映する

1. `query` でファイルを出すか、自分で Markdown を用意します。  
2. 必ず **`--dry-run` で差分確認** してから本番を実行します。

```bash
calendit apply --set my-google --in ./week.md --dry-run
calendit apply --set my-google --in ./week.md
```

書式の詳細は **[commands.md](./commands.md)** の `apply` を参照してください。

---

## 11. 「テスト操作」— 自動テスト `npm test` とは

開発者・AI が、**実際の Google に触れずに** 動作を確認するためのスイートです。**あなたが API を設定しなくても**、リポジトリのルートで次を実行すれば動きます。

```bash
npm test
```

- **時間がかかります**（数十秒〜数分）。  
- 失敗した場合は、画面に **どのテストが失敗したか** が表示されます。そのブロックをコピーして issue に貼るとよいです。  
- このテストは **モック**（偽のカレンダー）を使うため、**あなたの本番の予定は増えません**。

---

## 12. 実際の Google / Outlook で最終確認したい人へ

自動テストとは別に、**本物の API** で手順を追うチェックリストがあります。

- **[manual-local-smoke.md](./manual-local-smoke.md)**

---

## 13. 困ったとき・もっと詳しく

| 内容 | 文書 |
|------|------|
| すべてのサブコマンドとオプション | [commands.md](./commands.md) |
| AI / 開発者向けの構成と環境変数 | [for-ai-agents.md](./for-ai-agents.md) |
| コードの構造とテストの追加方法 | [development.md](./development.md) |
| ドキュメントの地図 | [README.md](./README.md)（このフォルダの目次） |
