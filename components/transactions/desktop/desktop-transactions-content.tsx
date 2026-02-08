"use client"

import { TransactionList } from "@/components/transactions/list"
import { useTransactionInfiniteScroll } from "@/hooks/use-transaction-infinite-scroll"
import { Field, Payment, Transaction } from "@/prisma/client"
import { useEffect } from "react"
import { DESKTOP_COUNT_EVENT } from "./desktop-transactions-count"

type TransactionWithPayments = Transaction & { payments?: Payment[] }

export function DesktopTransactionsContent({
  transactions,
  total: initialTotal,
  initialCursor,
  batchSize,
  fields,
}: {
  transactions: TransactionWithPayments[]
  total: number
  initialCursor: string | null
  batchSize: number
  fields: Field[]
}) {
  const { loadedTransactions, total, canLoadMore, isLoadingMore, loadError, sentinelRef, loadMore } =
    useTransactionInfiniteScroll<TransactionWithPayments>({
      transactions,
      initialTotal,
      initialCursor,
      batchSize,
    })

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(DESKTOP_COUNT_EVENT, {
        detail: {
          loaded: loadedTransactions.length,
          total,
        },
      })
    )
  }, [loadedTransactions.length, total])

  return (
    <div className="flex flex-col gap-4">
      {loadedTransactions.length > 0 && <TransactionList transactions={loadedTransactions} fields={fields} />}

      {canLoadMore && (
        <div ref={sentinelRef} className="flex justify-center py-2 text-xs text-muted-foreground">
          {isLoadingMore ? "Loading more transactions..." : "Scroll to load more"}
        </div>
      )}

      {loadError && (
        <div className="flex items-center justify-center gap-2 py-1 text-xs">
          <p className="text-destructive">{loadError}</p>
          <button
            type="button"
            onClick={() => void loadMore()}
            className="font-medium text-muted-foreground underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  )
}
