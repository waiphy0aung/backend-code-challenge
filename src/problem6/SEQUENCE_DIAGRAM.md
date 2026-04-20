# Sequence Diagram — `POST /score` execution

Covers the happy path and two rejection branches (401, 429).

```mermaid
sequenceDiagram
    autonumber
    participant B as Browser
    participant API as Score API
    participant DB as Postgres
    participant SSE as SSE Broadcaster
    participant C as Connected Clients

    B->>API: POST /score<br/>Authorization: Bearer <jwt>

    Note over API: JWT middleware verifies token
    alt token invalid / expired
        API-->>B: 401 Unauthorized
    end

    Note over API: Rate limiter checks per-user counter
    alt rate limit exceeded
        API-->>B: 429 Too Many Requests
    end

    API->>DB: UPDATE users SET score = score + 1<br/>WHERE id = $userId
    DB-->>API: new score

    API->>DB: SELECT top 10 ORDER BY score DESC
    DB-->>API: top-10 rows

    API-->>B: 200 OK { newScore }

    API->>SSE: broadcast(top10)
    SSE->>C: event: scoreboard<br/>data: { scores: [...] }
```

## Notes on the flow

- **Auth runs first** — unauthenticated floods are rejected at the edge before any DB work.
- **Rate limiting comes after auth** so the counter is keyed on the real `userId` from the JWT, not a spoofable IP.
- **Score update and top-10 read happen in sequence** — keeping them separate from the broadcast means the client's response doesn't wait on SSE work.
- **The browser gets its response immediately**; the SSE broadcast fires after. The user's own UI updates via both the API response and the SSE event — neither blocks the other.

JWT verification and rate limiting are shown as `Note over API` because both are Express middleware running inside the same process as the route handler, not separate services.
