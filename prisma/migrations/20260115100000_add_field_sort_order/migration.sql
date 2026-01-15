-- AlterTable
ALTER TABLE "fields" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

-- Backfill per-user ordering based on existing creation order
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY "user_id" ORDER BY "created_at" ASC, id ASC) - 1 AS rn
  FROM "fields"
)
UPDATE "fields" f
SET "sort_order" = ranked.rn
FROM ranked
WHERE f.id = ranked.id;
