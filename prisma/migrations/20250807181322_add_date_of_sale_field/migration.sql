-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "date_of_sale" TIMESTAMP(3);

-- Update date_of_sale to match issued_at for existing records
UPDATE "transactions" SET "date_of_sale" = "issued_at" WHERE "issued_at" IS NOT NULL;
