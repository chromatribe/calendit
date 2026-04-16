# 開発者向けガイド

`calendit` の設計思想と開発フローについての解説です。

## アーキテクチャ

`calendit` は以下の 3 層構造で設計されています。

1.  **CLI Layer (`src/commands/`)**: `commander.js` を使用したコマンド定義とユーザー入力の受付。
2.  **Core Layer (`src/core/`)**:
    - `Applier`: 予定の差分計算と適用ロジック。
    - `Formatter`: Markdown/CSV/JSON と内部モデルの相互変換。
    - `ConfigManager`: 設定の永続化と型安全なアクセス。
    - `AuthManager`: OAuth2 認証フローの制御。
3.  **Service Layer (`src/services/`)**: `ICalendarService` インターフェースを介した各プロバイダ (Google/Outlook) の API 実装。

## エラーハンドリング

独自の `CalendarError` 階層を導入しており、エラーの種類に応じた適切なメッセージと「ヒント」をユーザーに提供します。

- `ConfigError`: 設定不備
- `AuthError`: 認証失敗
- `ValidationError`: 入力値の不整合
- `ApiError`: API 通信エラー

## テスト

### 自律的テスト環境

`docs/tests.md` に Markdown 形式でテストケースが定義されています。`src/test_runner.ts` はこのファイルを解析し、記載されたコマンドを実際に実行して出力を検証します。

```bash
npm test
```

### モックサービス

テスト実行時は環境変数 `CALENDIT_MOCK=true` が自動的に設定され、実際の API を叩かずに `src/services/mock.ts` を使用して動作を検証します。

## バージョン管理

バージョン番号は `YYYY-mmdd-[Sequence]` 形式 (例: `2026-0416-01.02`) で管理されています。
重要な変更を行う際は、`spec/spec.md` の更新と `spec/history/` への詳細記録が義務付けられています。
