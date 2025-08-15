-- CreateTable
CREATE TABLE "taxes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tax_type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency_code" TEXT NOT NULL DEFAULT 'USD',
    "due_date" TIMESTAMP(3) NOT NULL,
    "bank_account_number" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "taxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tax_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL,
    "proof_of_payment_file" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "taxes_user_id_idx" ON "taxes"("user_id");

-- CreateIndex
CREATE INDEX "taxes_due_date_idx" ON "taxes"("due_date");

-- CreateIndex
CREATE INDEX "tax_payments_tax_id_idx" ON "tax_payments"("tax_id");

-- CreateIndex
CREATE INDEX "tax_payments_paid_at_idx" ON "tax_payments"("paid_at");

-- AddForeignKey
ALTER TABLE "taxes" ADD CONSTRAINT "taxes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_payments" ADD CONSTRAINT "tax_payments_tax_id_fkey" FOREIGN KEY ("tax_id") REFERENCES "taxes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
