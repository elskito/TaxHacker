-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "vat" INTEGER;
ALTER TABLE "transactions" ADD COLUMN "vat_rate" DOUBLE PRECISION;

-- Backfill VAT data from extra JSON
UPDATE "transactions"
SET "vat" = ROUND((extra->>'vat')::numeric * 100)
WHERE extra ? 'vat'
  AND (extra->>'vat') ~ '^-?\\d+(\\.\\d+)?$';

UPDATE "transactions"
SET "vat_rate" = (extra->>'vat_rate')::double precision
WHERE extra ? 'vat_rate'
  AND (extra->>'vat_rate') ~ '^-?\\d+(\\.\\d+)?$';

-- Remove migrated keys from extra (only when values were numeric)
UPDATE "transactions"
SET extra = extra - 'vat'
WHERE extra ? 'vat'
  AND (extra->>'vat') ~ '^-?\\d+(\\.\\d+)?$';

UPDATE "transactions"
SET extra = extra - 'vat_rate'
WHERE extra ? 'vat_rate'
  AND (extra->>'vat_rate') ~ '^-?\\d+(\\.\\d+)?$';

-- Update field definitions to treat VAT as standard fields
UPDATE "fields" SET "code" = 'vatRate', "is_extra" = false WHERE "code" = 'vat_rate';
UPDATE "fields" SET "is_extra" = false WHERE "code" = 'vat';
