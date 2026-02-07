"use client"

import { isFiltered, useTransactionFilters } from "@/hooks/use-transaction-filters"
import { normalizePaymentState } from "@/lib/payment-state"
import { Category, Field, Payment, Project, Transaction } from "@/prisma/client"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { MobileFiltersSheet } from "./mobile-filters-sheet"
import { MobileGroupedList } from "./mobile-grouped-list"
import { MobileStatusTabs } from "./mobile-status-tabs"

type TransactionWithPayments = Transaction & { payments?: Payment[] }

export function MobileTransactionsContent({
  transactions,
  categories,
  projects,
  fields,
  total: initialTotal,
  initialCursor,
  batchSize,
}: {
  transactions: TransactionWithPayments[]
  categories: Category[]
  projects: Project[]
  fields: Field[]
  total: number
  initialCursor: string | null
  batchSize: number
}) {
  const [filters, setFilters] = useTransactionFilters()
  const searchParams = useSearchParams()
  const activeState = normalizePaymentState(filters.paymentState)
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
    <div className="relative flex flex-col gap-4 pb-[88px]">
      <MobileFiltersSheet categories={categories} projects={projects} fields={fields} total={total} />

      <MobileGroupedList transactions={loadedTransactions} />

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
