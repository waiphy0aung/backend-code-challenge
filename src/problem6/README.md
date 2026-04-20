# Problem 6 — Live Scoreboard Module

## Purpose

A backend module that maintains a top-10 leaderboard, accepts authenticated score-increment requests when users complete actions, and pushes live updates to connected browsers.

---

## Requirements (from the brief)

1. Website shows the top 10 user scores.
2. Board updates live (no refresh).
3. Users complete actions that trigger an API call to increment their score.
4. Malicious users must not be able to increase scores without authorisation.

---

## Scope

**In scope:**

- `POST /score` — authenticated score increment.
- `GET /scoreboard` — top-10 snapshot.
- `GET /scoreboard/stream` — live updates via Server-Sent Events.
- JWT auth and rate-limiting middleware.
- Database schema for scores.

**Out of scope:**

- User registration and login — an existing auth service issues the JWTs we verify.
- Defining what a valid "action" is — the caller of `POST /score` is responsible for verifying the action actually happened.

---

## API Contract

### `POST /score`

Increments the authenticated user's score by 1.

**Headers**

- `Authorization: Bearer <JWT>` — required.

**Response** — `200 OK`

```json
{ "userId": "user_123", "newScore": 42 }
```

**Errors**

| Status | Reason                             |
|--------|------------------------------------|
| 401    | Missing, expired, or invalid JWT   |
| 429    | Per-user rate limit exceeded       |

---

### `GET /scoreboard`

Returns the current top 10. Public, no auth required.

**Response** — `200 OK`

```json
{
  "scores": [
    { "rank": 1, "userId": "alice", "displayName": "Alice", "score": 99 },
    { "rank": 2, "userId": "bob",   "displayName": "Bob",   "score": 87 }
  ]
}
```

---

### `GET /scoreboard/stream`

Server-Sent Events endpoint. The browser opens one long-lived connection; the server pushes the updated top-10 whenever it changes. The initial snapshot is sent on connect so clients don't need a separate `GET /scoreboard` call.

**Response** — `text/event-stream`

```
event: scoreboard
data: {"scores":[ ... ]}
```

Client usage:

```javascript
const es = new EventSource("/scoreboard/stream");
es.addEventListener("scoreboard", (e) => {
  const { scores } = JSON.parse(e.data);
  renderScoreboard(scores);
});
```

---

## Data Model

One table is enough.

```sql
CREATE TABLE users (
  id            TEXT         PRIMARY KEY,
  display_name  TEXT         NOT NULL,
  score         INTEGER      NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_score_desc ON users (score DESC);
```

Top-10 query:

```sql
SELECT id, display_name, score FROM users
ORDER BY score DESC LIMIT 10;
```

The index turns this into an index-range scan rather than a full sort.

---

## Execution Flow

See [`SEQUENCE_DIAGRAM.md`](./SEQUENCE_DIAGRAM.md).

**Happy path for `POST /score`:**

1. Browser sends `POST /score` with the user's JWT.
2. JWT middleware verifies the token and attaches `userId` from its claims. Rejects with `401` if invalid.
3. Rate-limit middleware checks the per-user counter. Rejects with `429` if exceeded.
4. Handler runs `UPDATE users SET score = score + 1 WHERE id = $userId`.
5. Handler reads the new top-10.
6. Handler returns `200` with the user's new score.
7. If the top-10 changed, an event is published on the in-process bus, and the SSE broadcaster pushes the new payload to every connected client.

---

## Security

The brief calls out malicious users. Concrete threats:

| #  | Threat                                                         | Mitigation                                                                                                 |
|----|----------------------------------------------------------------|------------------------------------------------------------------------------------------------------------|
| 1  | Client submits a score for another user                        | The incremented user is **always** the JWT claim's subject. Any `userId` in the body is ignored.           |
| 2  | Unauthenticated caller hits `POST /score`                      | JWT middleware rejects with `401` before the handler runs.                                                 |
| 3  | Expired or tampered token                                      | Signature + expiry checked on every request; short-lived tokens (15 min) limit the blast radius.           |
| 4  | Script hammers `POST /score` with a valid token                | Per-user rate limit (10 req/min via `express-rate-limit`). Abuse results in `429`s, not score inflation.   |
| 5  | Fake action — client claims to have completed something they didn't | Out of scope for this module. The caller of `POST /score` is responsible for verifying the action occurred. Documented here so the integrating team knows where the responsibility sits. |

---

## What we're deliberately NOT doing (and why)

The brief explicitly warns against over-engineering. These were considered and rejected:

| Alternative                          | Why not                                                                                                  |
|--------------------------------------|----------------------------------------------------------------------------------------------------------|
| **WebSockets instead of SSE**        | Updates are one-way (server → client). SSE is lighter, auto-reconnects, works over plain HTTP.           |
| **Redis pub/sub for broadcasting**   | Only needed when running multiple API instances. At single-instance scale, the in-process event bus is fine. |
| **Kafka or event streaming**         | Massive overkill for a single `UPDATE` per request.                                                      |
| **Separate microservice for scoring** | The logic is ~20 lines. A service boundary costs more in ops than it saves.                              |
| **Materialised top-10 cache**        | Premature. The indexed query is sub-millisecond up to millions of rows. Add a cache when measurement justifies it. |

---

## Improvements for later

1. **Horizontal scaling** — when traffic needs multiple API instances, swap the in-process event bus for Redis pub/sub so SSE broadcasts fan out across instances.
2. **Audit log** — persist each score change with timestamp and IP for fraud investigation.
3. **Admin endpoints** — manual score correction with a separate admin role in the JWT.
4. **Observability** — metrics for `POST /score` latency, rate-limit rejections, SSE connection count.
