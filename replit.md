# AgentGuard

AgentGuard supervises customer-support AI responses with policy checks, long-term experience memory, and human feedback.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite + Tailwind CSS + TanStack Query + Wouter

## Where things live

- `artifacts/agentguard` — dashboard, run flow, memory explorer, alerts, learning effect, evaluation, and settings
- `artifacts/api-server/src/services/agentguard.ts` — worker/supervisor orchestration, policy retrieval, local memory ranking, feedback learning, metrics
- `artifacts/api-server/src/routes/agentguard.ts` — AgentGuard API routes
- `lib/db/src/schema/agentguard.ts` — persistent PostgreSQL tables
- `lib/api-spec/openapi.yaml` — source-of-truth API contract
- `artifacts/agentguard/src/index.css` — visual tokens and application theme

## Architecture decisions

- The primary acceptance path is persisted PostgreSQL data: interactions, policies, memories, feedback, and activity survive service restarts.
- Worker, supervisor, and memory retrieval are separate service-level steps even in fallback mode, so a live provider can be added without changing the product surface.
- Fallback mode is explicit in settings and every run result; it never claims deterministic output is live LLM output.
- Memory retrieval uses contextual token overlap plus category weighting locally, and only stores curated seed experiences or explicit human corrections.

## Product

AgentGuard provides a control-room dashboard for running arbitrary customer-support requests through a worker agent, support policy layer, contextual experience memory, independent supervisor review, final revision, and human feedback. It includes searchable memory, supervisor alerts, learning-effect metrics, evaluation scenarios, and runtime settings.

## User preferences

No project-specific preferences recorded.

## Gotchas

- The app's web build requires workflow-provided `PORT` and `BASE_PATH`; use the managed web workflow instead of calling the Vite build directly without those variables.
- The API currently runs in Local Fallback mode because managed AI integration credentials are not available in this workspace.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
