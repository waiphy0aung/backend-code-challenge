# 99Tech Code Challenge — Backend

Monorepo with solutions to Problems 4, 5, and 6.

## Contents

| Problem | Path                               | Summary                                                                                                          |
|---------|------------------------------------|------------------------------------------------------------------------------------------------------------------|
| 4       | [`src/problem4`](./src/problem4)   | Three TypeScript implementations of `sum_to_n` with complexity notes and Jest unit tests.                        |
| 5       | [`src/problem5`](./src/problem5)   | Express + TypeScript CRUD API for books, backed by Prisma + SQLite, validated with Zod, documented via OpenAPI.  |
| 6       | [`src/problem6`](./src/problem6)   | Architecture spec for a live top-10 scoreboard module: API contract, execution flow, threat model, rejected alternatives. |

## Prerequisites

- Node.js ≥ 18
- npm ≥ 9

## Setup

```bash
npm install
```

## Run

```bash
# Problem 5 API server (generates Prisma client, sets up SQLite dev.db, starts server)
npm run dev
```

Then visit:

- API: <http://localhost:3000>
- Swagger UI: <http://localhost:3000/docs>

## Test

```bash
npm test           # everything
npm run test:p4    # only Problem 4
npm run test:p5    # only Problem 5
```

## Per-problem documentation

- [Problem 4 source](./src/problem4/sumToN.ts) — all three implementations with inline complexity analysis.
- [Problem 5 README](./src/problem5/README.md) — API reference, curl examples, architecture notes.
- [Problem 6 README](./src/problem6/README.md) — architecture spec (start here) + [sequence diagram](./src/problem6/SEQUENCE_DIAGRAM.md).
