# TokenItDown

> Drop in a file or a web page, get agent-ready Markdown out — and let your AI read it directly, for a fraction of the tokens.

**TokenItDown** is a fast, self-hostable platform that turns any document or web page into clean, LLM-ready Markdown — and goes past the conversion to deliver visible quality control, RAG-ready output, token economics, and native agent (MCP) access.

Built and maintained by **AnHourTec**.

## Vision

The conversion engine itself is commoditized. Our value is the workflow around it — the library, the repair loop, the RAG export, the agent integration, and the web-capture extension — packaged cleanly for both cloud users and self-hosters.

Two deployment targets from one codebase:

- **Cloud** — multi-tenant SaaS with managed processing, billing, and a hosted MCP endpoint.
- **Self-hosted** — a single `docker compose up`, all processing local, optional local-LLM mode, no data egress.

## Tech stack

- [Next.js 15](https://nextjs.org/) (App Router) + [React 19](https://react.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- Strict [TypeScript](https://www.typescriptlang.org/) with [ts-reset](https://github.com/total-typescript/ts-reset)
- [Radix UI](https://www.radix-ui.com/) + [CVA](https://cva.style/) for the design system
- [ESLint 9](https://eslint.org/) and [Prettier](https://prettier.io/)
- Testing: [Vitest](https://vitest.dev), [React Testing Library](https://testing-library.com/react), and [Playwright](https://playwright.dev/)
- [Storybook](https://storybook.js.org/) for component development
- [OpenTelemetry](https://opentelemetry.io/) observability and Kubernetes-compatible health checks
- [T3 Env](https://env.t3.gg/) for typed environment variables

## Requirements

- [Node.js](https://nodejs.org/) `>=20`
- [npm](https://www.npmjs.com/) (the project's package manager)

## Getting started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Scripts

| Command                 | Description                                  |
| ----------------------- | -------------------------------------------- |
| `npm run dev`           | Start the development server                 |
| `npm run build`         | Create a production build                    |
| `npm run start`         | Start the production server                  |
| `npm run lint`          | Run ESLint                                    |
| `npm run lint:fix`      | Run ESLint and auto-fix                       |
| `npm run prettier`      | Check formatting                              |
| `npm run prettier:fix`  | Format the codebase                           |
| `npm run test`          | Run unit & integration tests (Vitest)        |
| `npm run e2e:headless`  | Run end-to-end tests (Playwright)            |
| `npm run storybook`     | Start Storybook on port 6006                  |
| `npm run analyze`       | Build with the bundle analyzer enabled        |

## Deployment

TokenItDown is packaged with Docker. The self-hosted edition ships as a `docker compose` bundle (web + api + worker + Postgres + Redis + processing service) so it runs fully local with no data egress.

> Docker / `docker compose` setup is being added — see the project plan for the build phases.

## License

[MIT](./LICENSE) © AnHourTec
