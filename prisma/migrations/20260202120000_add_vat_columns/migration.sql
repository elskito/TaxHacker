-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "vat" INTEGER;
ALTER TABLE "transactions" ADD COLUMN "vat_rate" DOUBLE PRECISION;

-- Backfill VAT data from extra JSON
UPDATE "transactions"
SET
    vat = CASE
        WHEN extra->>'vat' IS NOT NULL
             AND extra->>'vat' <> ''
        THEN ((extra->>'vat')::NUMERIC * 100)::INTEGER
        ELSE vat
    END,
    vat_rate = CASE
        WHEN extra->>'vat_rate' IS NOT NULL
             AND extra->>'vat_rate' <> ''
        THEN (extra->>'vat_rate')::DOUBLE PRECISION
        ELSE vat_rate
    END,
    extra = extra - 'vat' - 'vat_rate'
WHERE extra ?| ARRAY['vat', 'vat_rate'];

-- Update field definitions to treat VAT as standard fields
UPDATE "fields" SET "code" = 'vatRate', "is_extra" = false WHERE "code" = 'vat_rate';
UPDATE "fields" SET "is_extra" = false WHERE "code" = 'vat';
