# Contributing to TokenItDown

Thanks for your interest in improving TokenItDown! This guide covers how to get set
up, the conventions we follow, and what we look for in a pull request.

By participating you agree to keep the project a welcoming, harassment-free space.

## Ways to contribute

- **Report a bug** — open an issue with steps to reproduce, what you expected, and
  what happened. For conversion bugs, include the source file/URL type (not the file
  itself if it's sensitive) and the output you got.
- **Report an agent / MCP compatibility issue** — tell us which agent or editor
  (Claude Code, Codex, Cursor, Gemini, Windsurf, Cline, VS Code, …), the transport
  (stdio or hosted HTTP), and the exact install snippet you used. Compatibility
  reports are especially valuable since the goal is to work with *every* agent.
- **Propose a feature** — open an issue first so we can align on scope before you
  build. See [docs/PLAN.md](./docs/PLAN.md) for the roadmap.
- **Send a pull request** — see below.

Check the [open issues](../../issues) for things to work on; anything tagged
`good first issue` is a good place to start.

## Development setup

**Package manager is npm** — never pnpm or yarn.

```bash
# 1. Install deps (a better-auth peer requires legacy-peer-deps)
npm install --legacy-peer-deps

# 2. Configure env
cp .env.example .env        # fill in BETTER_AUTH_SECRET, MARKITDOWN_SERVICE_TOKEN, DB creds…

# 3. Bring up Postgres, Redis and the MarkItDown processing service
docker compose up -d postgres redis markitdown

# 4. Run the web app (auto-creates the DB + applies migrations)
npm run dev
```

The Python processing service lives in `server/`:

```bash
cd server && python3.12 -m venv .venv
./.venv/bin/pip install -r requirements-dev.txt
```

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for how the pieces fit together.

## Project conventions

- **Imports** are absolute from the project root (e.g. `import { Button } from "@/components/ui/button"`).
- **Environment variables** go through `env.mjs` (typed + validated). Add new vars to
  its schema — never read `process.env` directly in app code.
- **Components** ship with a colocated test and, for UI primitives, a Storybook story.
- **Every route gets a loading skeleton shaped like that page** — not a generic
  rectangle. Page-shaped skeletons live in `components/ui/page-skeletons.tsx`.
- **Stay narrow:** do what the change needs and finish it — no unrelated refactors,
  no `TODO`s left where working code belongs.

## Tests — write one, run it

Every change with testable behavior needs a test, and the suite must pass before you
open a PR.

```bash
npx vitest run          # unit & integration (web)
npm run e2e:headless    # end-to-end (Playwright)
npm run typecheck       # tsc, strict
npm run lint            # ESLint
cd server && ./.venv/bin/python -m pytest    # processing service + MCP
```

For UI changes, verify the rendered result in a real browser — don't rely on the code
looking correct.

## Pull requests

1. Branch off `main`.
2. Keep each PR focused on a single topic; split unrelated work into separate PRs.
3. Make sure `typecheck`, `lint`, and the test suites pass.
4. Write clear commit messages (we follow
   [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`,
   `docs:`, `refactor:`, …) and describe the *why* in the PR body.
5. Update docs (`README.md`, `docs/`) when behavior or setup changes.

## Security

Found a vulnerability? **Please don't open a public issue.** Email the maintainers at
`security@anhourtec.com` (or use GitHub's private security advisory) and give us a
reasonable window to ship a fix before disclosure.

## License

By contributing, you agree that your contributions are licensed under the project's
[MIT License](./LICENSE).
