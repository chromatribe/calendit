# eventkit-helper

macOS の **EventKit** を呼び出す小さな CLI。`calendit` の `service: macos` コンテキストから子プロセスとして実行される。

## ビルド

リポジトリルートから:

```bash
cd native/eventkit-helper
swift build -c release
```

実行ファイルの典型パス:

`native/eventkit-helper/.build/release/eventkit-helper`

## calendit からの解決順

1. 環境変数 **`CALENDIT_EVENTKIT_HELPER`**（実行ファイルへの絶対パス）
2. 上記のリポジトリ相対パス（開発時）

## サブコマンド（概要）

| サブコマンド | 用途 |
|---|---|
| `doctor` | EventKit 利用可否・権限の簡易診断 |
| `list-calendars` | 利用可能なカレンダーと `calendarIdentifier` |
| `list-events` / `create-event` / `update-event` / `delete-event` | 予定の読み書き（stdin JSON 等。詳細は `Sources/main.swift`） |

初回は **システム設定 → プライバシーとセキュリティ → カレンダー** で、**実際に EventKit を呼んだプロセスの「前面アプリ」**（多くの場合は起動元のターミナルまたは IDE）にカレンダーアクセスを許可する必要がある。

### Cursor / VS Code などの統合ターミナルについて

macOS は「誰が子プロセスとして `eventkit-helper` を起動したか」のチェーンで許可を紐づける。**ターミナル.app** から実行すると、一覧に **ターミナル** が載りやすい。**Cursor の統合ターミナル** から実行した場合は本来 **Cursor.app** に紐づくが、Electron 系アプリの子プロセスでは、システムの許可ダイアログが前面に出ず **`requestAccess` が `false`（= `calendarAccess: denied`）のまま** 終わることがある。その結果、**システム設定のカレンダー一覧に Cursor が一度も現れない**ことがある。

**実用的な回避策（Cursor / VS Code からワンコマンド）**

- **`calendit macos external doctor`** / **`list-calendars`**（`--json` 可）/ **`shell`**（対話シェル）を実行すると、AppleScript で **ターミナル.app** が開く。既にウィンドウがあれば **同じウィンドウ** にコマンドを流し込み、毎回別ウィンドウにはしない（タブが増えるかはターミナル側の設定による）。システムのカレンダー許可はターミナルに付くため、IDE 統合ターミナルで `denied` のときの受け皿になる。**`query` や `apply` を macos コンテキストで使う場合も `external shell` で開いたターミナルから実行する**と、起動チェーンがターミナルになり EventKit が通りやすい。
- 手動でやる場合: **ターミナル.app** で `calendit macos doctor` / `list-calendars` を実行し、「フルアクセス」を許可する。
- 以降、**実際に EventKit を呼ぶ `calendit` の起動元**がターミナル（または上記 `external` が開いたターミナル）である必要がある。IDE 内の `node` だけだと引き続き `denied` になり得る。

**Cursor 側でどうしても試す場合**

- Cursor を最前面にしてから再実行し、別デスクトップや背面にダイアログが出ていないか確認する。
- それでもダメなときは、他アプリのカレンダー許可も消えるため注意のうえ **`tccutil reset Calendar`** でカレンダー権限だけリセットし、**Cursor のターミナルから** もう一度 `doctor` を試す（環境・macOS のバージョンによっては改善しないこともある）。

## 常駐ブリッジ（実装済み MVP）

IDE に依存せず EventKit を使う **常駐プロセス + Unix ソケット** は **[native/eventkit-bridge/](../eventkit-bridge/)** と **`CALENDIT_EVENTKIT_BRIDGE`**（[docs/eventkit-bridge.md](../../docs/eventkit-bridge.md)）。
