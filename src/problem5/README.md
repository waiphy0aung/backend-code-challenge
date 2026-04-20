# Problem 5 — Books CRUD API

An Express + TypeScript CRUD API backed by Prisma + SQLite, validated with Zod, and documented with OpenAPI / Swagger UI.

## Quick start

From the **repository root**:

```bash
npm install
npm run dev
```

The script generates the Prisma client, pushes the schema into `./dev.db`, and boots the server on port 3000.

Useful URLs:

- API root: <http://localhost:3000>
- Swagger UI: <http://localhost:3000/docs>
- OpenAPI JSON: <http://localhost:3000/openapi.json>
- Health: <http://localhost:3000/health>

## Run the tests

```bash
npm run test:p5
```

Integration tests use a separate `test.db` and reset between cases.

## Project layout

```
src/problem5/
├── prisma/
│   └── schema.prisma          # Book model + indexes
├── server.ts                  # Entry point, graceful shutdown
├── app.ts                     # Express factory (testable)
├── db.ts                      # Prisma client singleton
├── openapi.ts                 # Spec built from Zod schemas
├── routes/
│   └── books.ts               # CRUD handlers
├── schemas/
│   └── book.ts                # Zod schemas (validation + OpenAPI)
├── middleware/
│   ├── asyncHandler.ts        # Wraps async handlers, forwards rejections to errorHandler
│   └── errorHandler.ts        # Centralised error handling
├── scripts/
│   └── setupDb.ts             # Applies schema via `prisma db push`
├── tests/
│   └── books.integration.test.ts
```

**Why Zod-backed OpenAPI?** One source of truth. The same schema validates requests and generates the docs — they can't drift apart.

## API reference

### `Book` shape

```json
{
  "id": 1,
  "title": "The Pragmatic Programmer",
  "author": "Andy Hunt",
  "genre": "OTHER",
  "publishedYear": 1999,
  "status": "AVAILABLE",
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

- `genre` ∈ `FICTION | NON_FICTION | SCIENCE | HISTORY | BIOGRAPHY | OTHER` (default `OTHER`)
- `status` ∈ `AVAILABLE | CHECKED_OUT` (default `AVAILABLE`)

---

### `POST /books` — Create

```bash
curl -X POST http://localhost:3000/books \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Sapiens",
    "author": "Yuval Noah Harari",
    "genre": "HISTORY",
    "publishedYear": 2011
  }'
```

`201 Created` → the created book. `400` on validation error.

---

### `GET /books` — List

| Query param     | Type   | Description                               |
|-----------------|--------|-------------------------------------------|
| `genre`         | enum   | Filter by genre                           |
| `status`        | enum   | Filter by status                          |
| `author`        | string | Author contains (partial match)           |
| `q`             | string | Title contains (partial match)            |
| `yearFrom`      | int    | Lower bound on `publishedYear` (inclusive) |
| `yearTo`        | int    | Upper bound on `publishedYear` (inclusive) |
| `limit`         | int    | 1–100, default 20                         |
| `offset`        | int    | ≥ 0, default 0                            |

```bash
curl "http://localhost:3000/books?genre=SCIENCE&yearFrom=1980&yearTo=2000"
```

Response:

```json
{
  "data": [ /* Book[] */ ],
  "meta": { "total": 42, "limit": 20, "offset": 0 }
}
```

`yearFrom > yearTo` is rejected with `400`.

---

### `GET /books/:id` — Fetch one

```bash
curl http://localhost:3000/books/1
```

`200` → book. `404` → `{ "error": "Book 1 not found" }`.

---

### `PATCH /books/:id` — Partial update

Any subset of `title`, `author`, `genre`, `publishedYear`, `status`. Empty body is rejected with `400`.

```bash
curl -X PATCH http://localhost:3000/books/1 \
  -H "Content-Type: application/json" \
  -d '{"status": "CHECKED_OUT"}'
```

---

### `DELETE /books/:id`

```bash
curl -X DELETE http://localhost:3000/books/1
```

`204 No Content` on success, `404` if the id doesn't exist.

---

## Error responses

All errors share a common shape:

```json
{ "error": "Human-readable message" }
```

Validation errors include a `details` array pinpointing offending fields:

```json
{
  "error": "Validation failed",
  "details": [
    { "path": "title",  "message": "title is required" },
    { "path": "genre",  "message": "Invalid enum value..." }
  ]
}
```

## Design decisions

- **SQLite via Prisma** — zero-setup local dev; swapping to Postgres is a one-line change in `schema.prisma`.
- **String enums instead of Prisma enums** — SQLite doesn't support native enum types; Zod validates allowed values at the application layer.
- **No service layer** — the CRUD is thin. Adding a service layer would be indirection without benefit. If business logic grows, that's where to introduce one.
- **Factory pattern for the Express app** — lets supertest run requests in-process without binding to a port.
- **`contains` for text search** — SQLite's `LIKE` is case-sensitive by default. For Postgres, swap to `ILIKE` or trigram indexes.
