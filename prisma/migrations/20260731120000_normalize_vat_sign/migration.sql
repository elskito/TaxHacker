-- VAT is always stored as a magnitude; the sign lives on total + type (credit notes)
UPDATE "transactions" SET "vat" = ABS("vat") WHERE "vat" < 0;
