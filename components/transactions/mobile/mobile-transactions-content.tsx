"use client"

import { isFiltered, useTransactionFilters } from "@/hooks/use-transaction-filters"
import { normalizePaymentState } from "@/lib/payment-state"
import { Category, Field, Payment, Project, Transaction } from "@/prisma/client"
import { MobileFiltersSheet } from "./mobile-filters-sheet"
import { MobileGroupedList } from "./mobile-grouped-list"
import { MobileStatusTabs } from "./mobile-status-tabs"

type TransactionWithPayments = Transaction & { payments?: Payment[] }

export function MobileTransactionsContent({
  transactions,
  categories,
  projects,
  fields,
  total,
}: {
  transactions: TransactionWithPayments[]
  categories: Category[]
  projects: Project[]
  fields: Field[]
  total: number
}) {
  const [filters, setFilters] = useTransactionFilters()
  const activeState = normalizePaymentState(filters.paymentState)

  return (
    <div className="relative flex flex-col gap-4 pb-[88px]">
      <MobileFiltersSheet categories={categories} projects={projects} fields={fields} total={total} />

      <MobileGroupedList transactions={transactions} />

      {transactions.length === 0 && isFiltered(filters) && (
        <p className="text-center text-xs text-muted-foreground">Try widening filters or switching tab.</p>
      )}

      <MobileStatusTabs
        activeState={activeState}
        onChange={(paymentState) => {
          setFilters((prev) => ({
            ...prev,
            paymentState,
          }))
        }}
      />
    </div>
  )
}
