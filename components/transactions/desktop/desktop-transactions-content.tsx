"use client"

import { TransactionList } from "@/components/transactions/list"
import { Field, Payment, Transaction } from "@/prisma/client"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
  const searchParams = useSearchParams()
  const [loadedTransactions, setLoadedTransactions] = useState<TransactionWithPayments[]>(transactions)
  const [total, setTotal] = useState(initialTotal)
  const [nextCursor, setNextCursor] = useState<string | null>(initialCursor)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setLoadedTransactions(transactions)
    setTotal(initialTotal)
    setNextCursor(initialCursor)
    setLoadError(null)
  }, [transactions, initialTotal, initialCursor])

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

  const canLoadMore = useMemo(
    () => Boolean(nextCursor) && loadedTransactions.length < total,
    [nextCursor, loadedTransactions.length, total]
  )

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) {
      return
    }

    setIsLoadingMore(true)
    setLoadError(null)

    try {
      const params = new URLSearchParams(searchParams.toString())
      params.delete("page")
      params.delete("cursor")
      params.set("cursor", nextCursor)
      params.set("limit", String(batchSize))

      const response = await fetch(`/api/transactions?${params.toString()}`)
      if (!response.ok) {
        throw new Error(`Failed to load transactions (${response.status})`)
      }

      const payload = (await response.json()) as {
        transactions: TransactionWithPayments[]
        total: number
        nextCursor: string | null
      }

      setLoadedTransactions((previous) => {
        const seen = new Set(previous.map((transaction) => transaction.id))
        const nextPage = payload.transactions.filter((transaction) => !seen.has(transaction.id))
        return [...previous, ...nextPage]
      })
      setTotal(payload.total)
      setNextCursor(payload.nextCursor)
    } catch (error) {
      console.error(error)
      setLoadError("Could not load more transactions.")
    } finally {
      setIsLoadingMore(false)
    }
  }, [nextCursor, isLoadingMore, searchParams, batchSize])

  useEffect(() => {
    if (!canLoadMore || !sentinelRef.current) {
      return
    }

    const target = sentinelRef.current
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore()
        }
      },
      { rootMargin: "600px 0px" }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [canLoadMore, loadMore])

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
