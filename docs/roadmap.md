# 開発ロードマップ

機能の**進行管理・チェックリスト・優先度**は **[docs/calendit-tasks/PRI_TASK_calendit.md](./calendit-tasks/PRI_TASK_calendit.md)** を正とする。本ファイルではリリースの要約とバージョニング方針のみを載せる。  
利用者向けドキュメントの地図は **[docs/README.md](./README.md)**（初回手順は **[getting-started.md](./getting-started.md)**）。

## 要約

- **v1.1.0（次期）**: macOS EventKit 連携と横断 `accounts status` は実装済み。残りは Google / Outlook の複数アカウント手順のドキュメント化・検証、および認証状態の利用者向け説明の整理。
- **v1.2.0 以降**: Homebrew tap、`fzf` による `query` フィルタ、複数コンテキスト横断 `query`、WebDAV/CalDAV など（詳細はタスクシート）。**EventKit 常駐ブリッジ**の MVP（ソケット + `CALENDIT_EVENTKIT_BRIDGE`）は [docs/eventkit-bridge.md](./eventkit-bridge.md) 参照。.app / 公証は未。

---

## バージョニング方針

| 種別 | バージョン例 | 基準 |
|---|---|---|
| パッチ | `1.0.x` | バグ修正・ドキュメント修正 |
| マイナー | `1.x.0` | 後方互換性のある新機能追加 |
| メジャー | `x.0.0` | 破壊的変更（コマンド構文変更等） |
