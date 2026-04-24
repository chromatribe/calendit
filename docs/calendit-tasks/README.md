# calendit タスクシート（フォルダ案内）

業務プロジェクト「00_PMPM」で運用している `LNW_TASK_*` と同様、**1 プロダクト 1 マスタ**の進行台帳をこのリポジトリ内に置く。

**利用者・AI 向けのドキュメント目次:** [../README.md](../README.md)（親の `docs/README.md`）

## メインシート

- **[PRI_TASK_calendit.md](./PRI_TASK_calendit.md)** … 現況・予定・ネクストアクションの正。優先度と着手状況はここを更新する。

## 00_PMPM との対応

| 00_PMPM | calendit |
|---------|----------|
| `LNW_TASK_<題名>_YYYYMMDD.md` | `PRI_TASK_calendit.md`（リポジトリ単位で集約） |
| 議事録 `LNW_MTG_*` | 必要になったら本フォルダに `PRI_MTG_<題名>_YYYYMMDD.md` などで追加可能 |

## 更新タイミング

[`.cursor/rules/rule.mdc`](../../.cursor/rules/rule.mdc) §4 に従い、**仕様変更・実装・`spec` / `spec/history` の更新と同一作業単位**で `PRI_TASK_calendit.md` を更新する。

リリース方針の要約は [docs/roadmap.md](../roadmap.md)。詳細タスクは本フォルダのみを正とする。
