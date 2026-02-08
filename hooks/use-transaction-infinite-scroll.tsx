"use client"

import { useSearchParams } from "next/navigation"
import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react"

type TransactionLike = {
  id: string
}

type UseTransactionInfiniteScrollInput<T extends TransactionLike> = {
  transactions: T[]
  initialTotal: number
  initialCursor: string | null
  batchSize: number
}

type UseTransactionInfiniteScrollOutput<T extends TransactionLike> = {
  loadedTransactions: T[]
  total: number
  canLoadMore: boolean
  isLoadingMore: boolean
  loadError: string | null
  sentinelRef: RefObject<HTMLDivElement | null>
  loadMore: () => Promise<void>
}

type TransactionsResponse<T extends TransactionLike> = {
  transactions: T[]
  total: number
  nextCursor: string | null
}

type ActiveRequest = {
  id: number
  controller: AbortController
}

const PAGINATION_QUERY_KEYS = new Set(["page", "cursor", "limit"])

type SearchParamsLike = {
  forEach: (callbackfn: (value: string, key: string) => void) => void
}

const buildQueryKey = (searchParams: SearchParamsLike): string => {
  const entries: Array<[string, string]> = []

  searchParams.forEach((value, key) => {
    if (!PAGINATION_QUERY_KEYS.has(key)) {
      entries.push([key, value])
    }
  })

  entries.sort(([leftKey, leftValue], [rightKey, rightValue]) => {
    if (leftKey === rightKey) {
      return leftValue.localeCompare(rightValue)
    }
    return leftKey.localeCompare(rightKey)
  })

  return entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join("&")
}

const isAbortError = (error: unknown) =>
  error instanceof DOMException
    ? error.name === "AbortError"
    : typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as { name?: string }).name === "AbortError"

export function useTransactionInfiniteScroll<T extends TransactionLike>({
  transactions,
  initialTotal,
  initialCursor,
  batchSize,
}: UseTransactionInfiniteScrollInput<T>): UseTransactionInfiniteScrollOutput<T> {
  const searchParams = useSearchParams()
  const queryKey = useMemo(() => buildQueryKey(searchParams), [searchParams])
  const queryKeyRef = useRef(queryKey)
  queryKeyRef.current = queryKey

  const [loadedTransactions, setLoadedTransactions] = useState<T[]>(transactions)
  const [total, setTotal] = useState(initialTotal)
  const [nextCursor, setNextCursor] = useState<string | null>(initialCursor)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const activeRequestRef = useRef<ActiveRequest | null>(null)
  const requestIdRef = useRef(0)
  const previousQueryKeyRef = useRef(queryKey)

  const abortActiveRequest = useCallback(() => {
    if (activeRequestRef.current) {
      activeRequestRef.current.controller.abort()
      activeRequestRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      abortActiveRequest()
    }
  }, [abortActiveRequest])

  useEffect(() => {
    abortActiveRequest()
    setLoadedTransactions(transactions)
    setTotal(initialTotal)
    setNextCursor(initialCursor)
    setLoadError(null)
    setIsLoadingMore(false)
  }, [transactions, initialTotal, initialCursor, abortActiveRequest])

  useEffect(() => {
    if (previousQueryKeyRef.current !== queryKey) {
      abortActiveRequest()
      setIsLoadingMore(false)
      setLoadError(null)
      previousQueryKeyRef.current = queryKey
    }
  }, [queryKey, abortActiveRequest])

  const canLoadMore = useMemo(
    () => Boolean(nextCursor) && loadedTransactions.length < total,
    [nextCursor, loadedTransactions.length, total]
  )

  const loadMore = useCallback(async () => {
    if (!nextCursor || activeRequestRef.current) {
      return
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const controller = new AbortController()
    const requestQueryKey = queryKey
    activeRequestRef.current = { id: requestId, controller }
    setIsLoadingMore(true)
    setLoadError(null)

    try {
      const params = new URLSearchParams(searchParams.toString())
      params.delete("page")
      params.delete("cursor")
      params.delete("limit")
      params.set("cursor", nextCursor)
      params.set("limit", String(batchSize))

      const response = await fetch(`/api/transactions?${params.toString()}`, { signal: controller.signal })
      if (!response.ok) {
        throw new Error(`Failed to load transactions (${response.status})`)
      }

      const payload = (await response.json()) as TransactionsResponse<T>
      const isCurrentRequest = activeRequestRef.current?.id === requestId && queryKeyRef.current === requestQueryKey
      if (!isCurrentRequest) {
        return
      }

      setLoadedTransactions((previous) => {
        const seen = new Set(previous.map((transaction) => transaction.id))
        const nextPage = payload.transactions.filter((transaction) => !seen.has(transaction.id))
        return [...previous, ...nextPage]
      })
      setTotal(payload.total)
      setNextCursor(payload.nextCursor)
    } catch (error) {
      const isCurrentRequest = activeRequestRef.current?.id === requestId && queryKeyRef.current === requestQueryKey
      if (!isCurrentRequest) {
        return
      }
      if (isAbortError(error)) {
        return
      }

      console.error(error)
      setLoadError("Could not load more transactions.")
    } finally {
      if (activeRequestRef.current?.id === requestId) {
        activeRequestRef.current = null
        setIsLoadingMore(false)
      }
    }
  }, [nextCursor, queryKey, searchParams, batchSize])

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

  return {
    loadedTransactions,
    total,
    canLoadMore,
    isLoadingMore,
    loadError,
    sentinelRef,
    loadMore,
  }
}
