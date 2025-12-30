# Session deduplication SQL (recommended)

Use these statements to clean existing duplicates and enforce the single active session invariant at the database level. The canonical survivor favors sessions with a selected game and, after that, the newest `started_at` (or `created_at` when `started_at` is null).

```sql
-- 1) Clean up existing duplicates by ending non-canonical active sessions
WITH ranked AS (
  SELECT
    id,
    table_id,
    game_id,
    started_at,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY table_id
      ORDER BY (game_id IS NULL), COALESCE(started_at, created_at) DESC, id DESC
    ) AS rn
  FROM sessions
  WHERE ended_at IS NULL
)
UPDATE sessions s
SET ended_at = NOW()
FROM ranked r
WHERE s.id = r.id
  AND r.rn > 1;

-- 2) Enforce the invariant going forward with a partial unique index
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS sessions_one_active_per_table_idx
  ON sessions(table_id)
  WHERE ended_at IS NULL;
```
