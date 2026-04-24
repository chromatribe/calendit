# eventkit-bridge

常駐 **Unix ソケット**サーバ。`CALENDIT_EVENTKIT_BRIDGE=1` のとき `calendit` は `eventkit-helper` の代わりにここへ JSON 1 行リクエストを送る。TCC（カレンダー許可）は **このプロセス**（または起動元のターミナル）に付く。

## ビルド・起動

```bash
cd native/eventkit-bridge
swift build -c release
.build/release/eventkit-bridge serve
```

初回起動で **`bridge.token`** とソケットの親ディレクトリが作られる。

- **ソケット（既定）**: `~/Library/Application Support/calendit/eventkit-bridge.sock`（`CALENDIT_CONFIG_DIR` があればその下の同名ファイル）
- **トークン**: 同じディレクトリの `bridge.token`（`0600`）

カスタムソケット: `eventkit-bridge serve --socket /tmp/my.sock`（トークンファイルの場所は変わらない — `CALENDIT_CONFIG_DIR` / Application Support の `bridge.token` を読む）

## calendit 側

```bash
export CALENDIT_EVENTKIT_BRIDGE=1
calendit macos doctor
```

ブリッジに繋がらないときはエラーになる。従来の `eventkit-helper` に戻すには環境変数を外すか、`CALENDIT_EVENTKIT_BRIDGE_FALLBACK=1` を付ける（非推奨: IDE では再び `denied` になり得る）。

設計の全体は [docs/eventkit-bridge.md](../../docs/eventkit-bridge.md)。

## `.app` バンドル（TCC 用）

リポジトリのルートから、CLI でも同じビルドを実行できます:

```bash
calendit macos bridge build
```

上と同じく、**ad-hoc 署名付き .app**（Xcode 不要）:

```bash
./scripts/build-app-bundle.sh
```

成果物: `native/eventkit-bridge/.build/CalenditEventKitBridge.app`

- **初回**: `open .build/CalenditEventKitBridge.app` または Finder から起動 → **システム設定 → プライバシー → カレンダー** でこのアプリにフルアクセスを付与（`Info.plist` に `NSCalendarsFullAccessUsageDescription` あり）。
- **Dock に出さない**: `LSUIElement` を有効化済み。
- **Finder 起動**: 引数なしでも内部で `serve` と同等になる（`-psn_*` を除去）。

`/Applications` へコピーして使う場合: `cp -R .build/CalenditEventKitBridge.app /Applications/`

## LaunchAgent（ログイン時に常駐）

`.app` 内のバイナリを `launchd` から起動する（**ユーザー**セッション `gui/$UID`）。

```bash
./scripts/build-app-bundle.sh
./scripts/install-launchagent.sh
# 既定: .build/CalenditEventKitBridge.app/Contents/MacOS/eventkit-bridge
# 別パス: ./scripts/install-launchagent.sh /Applications/CalenditEventKitBridge.app/Contents/MacOS/eventkit-bridge
```

- **ログ**: `~/Library/Logs/calendit-eventkit-bridge.log` / `.err.log`
- **停止・アンインスト**: `./scripts/uninstall-launchagent.sh`

**注意**: `KeepAlive` ありのためクラッシュ時は再起動する。ブリッジを止めたいときは `uninstall-launchagent.sh` か `launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.chromatribe.calendit.eventkit-bridge.plist`。
