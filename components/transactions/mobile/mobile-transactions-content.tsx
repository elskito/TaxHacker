"use client"

import { isFiltered, useTransactionFilters } from "@/hooks/use-transaction-filters"
import { useTransactionInfiniteScroll } from "@/hooks/use-transaction-infinite-scroll"
import { normalizePaymentState } from "@/lib/payment-state"
import { Category, Payment, Project, Transaction } from "@/prisma/client"
import { MobileFiltersSheet } from "./mobile-filters-sheet"
import { MobileGroupedList } from "./mobile-grouped-list"
import { MobileStatusTabs } from "./mobile-status-tabs"

type TransactionWithPayments = Transaction & { payments?: Payment[] }

export function MobileTransactionsContent({
  transactions,
  categories,
  projects,
  total: initialTotal,
  initialCursor,
  batchSize,
  serverTodayStart,
}: {
  transactions: TransactionWithPayments[]
  categories: Category[]
  projects: Project[]
  total: number
  initialCursor: string | null
  batchSize: number
  serverTodayStart: string
}) {
  const [filters, setFilters] = useTransactionFilters()
  const activeState = normalizePaymentState(filters.paymentState)
  const { loadedTransactions, total, canLoadMore, isLoadingMore, loadError, sentinelRef } =
    useTransactionInfiniteScroll<TransactionWithPayments>({
      transactions,
      initialTotal,
      initialCursor,
      batchSize,
    })

  return (
    <div className="relative flex flex-col gap-4 pb-[88px]">
      <MobileFiltersSheet categories={categories} projects={projects} total={total} />

      <MobileGroupedList transactions={loadedTransactions} serverTodayStart={serverTodayStart} />

      {loadedTransactions.length === 0 && isFiltered(filters) && (
        <p className="text-center text-xs text-muted-foreground">Try widening filters or switching tab.</p>
      )}

      {canLoadMore && (
        <div ref={sentinelRef} className="flex justify-center py-2 text-xs text-muted-foreground">
          {isLoadingMore ? "Loading more transactions..." : "Scroll to load more"}
        </div>
      )}

      {loadError && <p className="text-center text-xs text-destructive">{loadError}</p>}

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
