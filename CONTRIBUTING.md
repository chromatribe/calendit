# Contributing to calendit

## Development setup

- Node.js 18 or newer
- Clone the repository and run `npm install`, then `npm run build` (required after each clone; the published `npm` package does not run a post-install build from `src/`)

## Build

- `npm run build` — runs `gen:locales`, TypeScript compile, and copies `src/locales/*.json` into `dist/locales` for the compiled CLI.

## Tests

- `npm test` runs a full build, then executes `src/test_runner.ts` against `docs/tests.md`. The runner invokes the compiled `dist/index.js` (not `ts-node` on `src/`) so behavior matches production.
- Test subprocesses use `CALENDIT_LOCALE=en` and `CALENDIT_SKIP_LOCALE_PROMPT=1` by default.

## User-visible strings (i18n)

- **Do not** embed user-facing copy in source as raw Japanese/English strings for features you add or change. Add or update keys in [`src/locales/en.json`](src/locales/en.json) (master) and [`src/locales/ja.json`](src/locales/ja.json) with the **same key tree**, then run `npm run gen:locales` (or `npm run build`, which runs it) to refresh [`src/generated/locale-keys.ts`](src/generated/locale-keys.ts).
- Use `t('domain.section.key', { var })` from [`src/core/i18n.ts`](src/core/i18n.ts) with keys from the generated `LocaleKey` type.
- **Key naming**: prefer `domain.section.name` (e.g. `errors.config.fileNotFound`, `config.cmd.googleSaved`).
- **Adding a language**: add `src/locales/<code>.json` mirroring `en.json`, extend `SUPPORTED_UI_LOCALES` in `src/core/i18n.ts`, and wire the locale in `config` / commander as needed.
- **AI agent communication** in Japanese for plans and reviews is a separate convention; see [`.cursor/rules/rule.mdc`](.cursor/rules/rule.mdc).

## Locale parity CI

- `npm run check:locales` verifies that every key in `en.json` exists in `ja.json` (and vice versa). Run it before pushing.

## UX evaluation (from scratch)

- **Flow:** [docs/ux-evaluation.md](docs/ux-evaluation.md) — `npm test` まで緑にしてから `npm run ux:link` で `calendit` を手元のグローバルに載せ替え、操作感を試す。  
- **Pack sanity:** `npm run pack:check`（`prepack` がテスト付き — 公開 tarball を作る前の確認用）。

## Publishing to npm

- **手順:** [docs/publishing.md](docs/publishing.md)（`npm login` → `npm test` / `prepack` → `npm publish`）。
