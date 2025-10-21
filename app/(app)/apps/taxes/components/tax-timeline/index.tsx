"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"


import { TaxEditDialog } from "../tax-edit-dialog"
import { addTaxPaymentAction, deleteTaxAction } from "../../actions"
import { MonthNavigation } from "./month-navigation"
import { MonthSection } from "./month-section"
import { calculateMonthTotals, cloneMonths, normalizeMonths, PREFETCH_BATCH_SIZE } from "./utils"
import type {
  AddPaymentHandler,
  ClientMonth,
  ClientTax,
  CurrencyOption,
  MonthTotals,
  TimelineMonth,
} from "./types"
import { MobileTimelineCarousel } from "./mobile-carousel"
import { DeleteModal } from "@/components/transactions/delete-file-modal"

interface TaxTimelineProps {
  initialMonths: TimelineMonth[]
  initialCursor: string | null
  currencies: CurrencyOption[]
  defaultCurrency?: string
}

interface FetchMonthsResponse {
  months: TimelineMonth[]
  nextCursor: string | null
}

export function TaxTimeline({ initialMonths, initialCursor, currencies, defaultCurrency }: TaxTimelineProps) {
  const router = useRouter()
  const normalizedInitialMonths = useMemo(() => normalizeMonths(initialMonths), [initialMonths])

  const [months, setMonths] = useState<ClientMonth[]>(() =>
    normalizedInitialMonths.slice(0, PREFETCH_BATCH_SIZE),
  )
  const [activeMonthId, setActiveMonthId] = useState<string | null>(normalizedInitialMonths[0]?.id ?? null)
  const [nextCursor, setNextCursor] = useState<string | null>(initialCursor)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [editingTax, setEditingTax] = useState<ClientTax | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [taxPendingDeletion, setTaxPendingDeletion] = useState<ClientTax | null>(null)

  const monthsRef = useRef<ClientMonth[]>(months)
  const isFetchingRef = useRef(false)
  const prefetchedMonthsRef = useRef<ClientMonth[]>(normalizedInitialMonths.slice(PREFETCH_BATCH_SIZE))
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    monthsRef.current = months
  }, [months])

  useEffect(() => {
    const visibleMonths = normalizedInitialMonths.slice(0, PREFETCH_BATCH_SIZE)
    const queuedMonths = normalizedInitialMonths.slice(visibleMonths.length)

    setMonths(visibleMonths)
    prefetchedMonthsRef.current = queuedMonths
    setNextCursor(initialCursor)

    if (visibleMonths[0]) {
      setActiveMonthId(visibleMonths[0].id)
    } else if (normalizedInitialMonths[0]) {
      setActiveMonthId(normalizedInitialMonths[0].id)
    } else {
      setActiveMonthId(null)
    }
  }, [initialCursor, normalizedInitialMonths])

  const appendNextBatch = useCallback(() => {
    if (prefetchedMonthsRef.current.length === 0) {
      return false
    }

    const nextBatch = prefetchedMonthsRef.current.splice(0, PREFETCH_BATCH_SIZE)
    if (nextBatch.length === 0) {
      return false
    }

    setMonths((prev) => [...prev, ...nextBatch])
    return true
  }, [])

  const goToMonth = useCallback((monthId: string) => {
    setActiveMonthId(monthId)

    if (typeof window === "undefined") {
      return
    }

    const isDesktop = window.matchMedia?.("(min-width: 1024px)").matches ?? false
    if (!isDesktop) {
      return
    }

    const selectorId = typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? CSS.escape(monthId)
      : monthId.replace(/"/g, '\\"')

    requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(`[data-month-id="${selectorId}"]`)
      if (!target) {
        return
      }

      const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
      target.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
        inline: "nearest",
      })
    })
  }, [])

  const fetchMoreMonths = useCallback(async () => {
    if (!nextCursor || isFetchingRef.current) return

    isFetchingRef.current = true
    setIsFetchingMore(true)

    try {
      const params = new URLSearchParams({ cursor: nextCursor })
      const response = await fetch(`/api/taxes/timeline?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error("Failed to load additional months")
      }

      const data: FetchMonthsResponse = await response.json()
      if (data.months.length === 0) {
        setNextCursor(null)
        return
      }

      const normalized = normalizeMonths(data.months)
      if (normalized.length > 0) {
        prefetchedMonthsRef.current = [...prefetchedMonthsRef.current, ...normalized]
        appendNextBatch()
      }
      setNextCursor(data.nextCursor)
    } catch (error) {
      console.error(error)
      toast.error("Unable to load more months at the moment.")
    } finally {
      setIsFetchingMore(false)
      isFetchingRef.current = false
    }
  }, [appendNextBatch, nextCursor])

  const loadMoreMonths = useCallback(() => {
    if (isFetchingRef.current) {
      return
    }

    const appended = appendNextBatch()
    if (appended) {
      return
    }

    if (nextCursor) {
      void fetchMoreMonths()
    }
  }, [appendNextBatch, fetchMoreMonths, nextCursor])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadMoreMonths()
          }
        })
      },
      { root: null, rootMargin: "200px", threshold: 0 },
    )

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [loadMoreMonths])

  const handleAddPayment = useCallback<AddPaymentHandler>(
    async ({ taxId, amount, paidAt, note, proofOfPaymentFile }) => {
      const previousState = cloneMonths(monthsRef.current)
      const optimisticPaymentId = `optimistic-${Date.now()}`
      const proofOfPaymentFileUuid = proofOfPaymentFile ? crypto.randomUUID() : undefined

      setMonths((prev) =>
        prev.map((month) => ({
          ...month,
          taxes: month.taxes.map((tax) => {
            if (tax.id !== taxId) return tax
            return {
              ...tax,
              payments: [
                ...tax.payments,
                {
                  id: optimisticPaymentId,
                  amount,
                  paidAt,
                  note: note ?? null,
                  proofOfPaymentFile: proofOfPaymentFileUuid ?? null,
                },
              ],
            }
          }),
        })),
      )

      try {
        const formData = new FormData()
        formData.append("amount", (amount / 100).toString())
        formData.append("paidAt", paidAt.toISOString())
        if (note) formData.append("note", note)
        if (proofOfPaymentFile) {
          formData.append("proofOfPaymentFile", proofOfPaymentFile)
        }

        await addTaxPaymentAction(taxId, formData, proofOfPaymentFileUuid)
        toast.success("Payment added successfully")
        startTransition(() => router.refresh())
      } catch (error) {
        console.error("Failed to add payment", error)
        setMonths(previousState)
        toast.error("Could not add payment")
        throw error
      }
    },
    [router, startTransition],
  )

  const handleDeleteTax = useCallback(
    async (taxId: string) => {
      const previousState = cloneMonths(monthsRef.current)
      const previousActiveMonthId = activeMonthId
      let nextActiveId: string | null | undefined

      setMonths((prev) => {
        const updated = prev
          .map((month) => {
            const filteredTaxes = month.taxes.filter((tax) => tax.id !== taxId)
            if (filteredTaxes.length === month.taxes.length) {
              return month
            }

            if (filteredTaxes.length === 0) {
              if (activeMonthId === month.id) {
                nextActiveId = undefined
              }
              return null
            }

            if (activeMonthId === month.id) {
              nextActiveId = month.id
            }

            return {
              ...month,
              taxes: filteredTaxes,
            }
          })
          .filter((month): month is ClientMonth => Boolean(month))

        if (nextActiveId === undefined) {
          nextActiveId = updated[0]?.id ?? null
        }

        return updated
      })

      if (nextActiveId !== undefined) {
        setActiveMonthId(nextActiveId)
      }

      try {
        await deleteTaxAction(taxId)
        toast.success("Tax deleted successfully")
        startTransition(() => router.refresh())
      } catch (error) {
        console.error("Failed to delete tax", error)
        setMonths(previousState)
        setActiveMonthId(previousActiveMonthId)
        toast.error("Could not delete tax")
        throw error
      }
    },
    [activeMonthId, router, startTransition],
  )

  const handleDeleteConfirm = useCallback(async () => {
    if (!taxPendingDeletion) return
    try {
      await handleDeleteTax(taxPendingDeletion.id)
      setDeleteModalOpen(false)
      setTaxPendingDeletion(null)
    } catch (error) {
      console.error("Delete confirmation failed", error)
    }
  }, [handleDeleteTax, taxPendingDeletion])

  const handleDeleteClick = useCallback((tax: ClientTax) => {
    setTaxPendingDeletion(tax)
    setDeleteModalOpen(true)
  }, [])

  const handleEditTax = useCallback((tax: ClientTax) => {
    if (tax.payments.length > 0) {
      return
    }
    setEditingTax(tax)
    setEditDialogOpen(true)
  }, [])

  const monthTotals = useMemo<MonthTotals>(
    () => calculateMonthTotals(months, defaultCurrency),
    [months, defaultCurrency],
  )

  useEffect(() => {
    if (!activeMonthId && months[0]) {
      setActiveMonthId(months[0].id)
    }
  }, [months, activeMonthId])

  if (months.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-muted-foreground/50 p-12 text-center text-sm text-muted-foreground">
        No taxes recorded yet. Add your first tax obligation to start the timeline.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="hidden lg:flex lg:items-start lg:gap-10">
        <MonthNavigation
          months={months}
          activeMonthId={activeMonthId}
          onSelectMonth={goToMonth}
          monthTotals={monthTotals}
        />

        <div className="relative flex-1">
          <div className="absolute left-6 top-0 hidden h-full w-px bg-border md:block lg:left-8" aria-hidden="true" />
          <div className="space-y-12">
            {months.map((month) => (
              <MonthSection
                key={month.id}
                month={month}
                isActive={month.id === activeMonthId}
                onAddPayment={handleAddPayment}
                onDelete={handleDeleteClick}
                onEdit={handleEditTax}
              />
            ))}
          </div>

          <div ref={sentinelRef} aria-hidden="true" className="h-4 w-full" />
        </div>
      </div>

      <div className="lg:hidden">
        <MobileTimelineCarousel
          months={months}
          activeMonthId={activeMonthId}
          onSelectMonth={goToMonth}
          onRequestMore={loadMoreMonths}
          onAddPayment={handleAddPayment}
          onDelete={handleDeleteClick}
          onEdit={handleEditTax}
        />
      </div>

      <TaxEditDialog
        tax={editingTax}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        currencies={currencies}
        defaultCurrency={defaultCurrency}
      />

      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setTaxPendingDeletion(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Tax"
        description="Are you sure you want to delete this tax? This action cannot be undone."
      />

      {(isPending || isFetchingMore) && (
        <p className="text-center text-xs text-muted-foreground">Updating timeline…</p>
      )}
    </div>
  )
}

export type { TimelineMonth } from "./types"
