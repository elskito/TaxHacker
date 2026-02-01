"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn, formatCurrency } from "@/lib/utils"
import { format } from "date-fns"
import { ArrowLeft, ArrowRight, ChevronsUpDown, Search } from "lucide-react"
import { useMemo, useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export type TransactionSwitchItem = {
  id: string
  name: string | null
  merchant: string | null
  issuedAt: Date | string | null
  total: number | null
  currencyCode: string | null
  type: string | null
  page?: number
}

const TYPE_STYLES: Record<string, string> = {
  income: "bg-emerald-500",
  expense: "bg-rose-500",
  other: "bg-slate-400",
}

const getTransactionLabel = (transaction: TransactionSwitchItem) => {
  const label = transaction.name?.trim() || transaction.merchant?.trim()
  return label && label.length > 0 ? label : "Untitled transaction"
}

const getTransactionDateLabel = (transaction: TransactionSwitchItem) => {
  if (!transaction.issuedAt) return "No date"
  const issuedAt = new Date(transaction.issuedAt)
  if (Number.isNaN(issuedAt.getTime())) return "No date"
  return format(issuedAt, "MMM d, yyyy")
}

const getTransactionTotalLabel = (transaction: TransactionSwitchItem) => {
  if (transaction.total === null || transaction.total === undefined || !transaction.currencyCode) {
    return "No total"
  }
  return formatCurrency(transaction.total, transaction.currencyCode)
}

const isEditableTarget = (target: EventTarget | null) => {
  if (!target || !(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  if (tag === "input" || tag === "textarea" || tag === "select") return true
  if (target.isContentEditable) return true
  return Boolean(
    target.closest(
      '[role="combobox"], [role="listbox"], [aria-haspopup="listbox"], [data-radix-select-trigger]'
    )
  )
}

export default function TransactionSwitcher({
  currentId,
  transactions,
  stripPageParam = false,
}: {
  currentId: string
  transactions: TransactionSwitchItem[]
  stripPageParam?: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)

  const currentIndex = useMemo(
    () => transactions.findIndex((transaction) => transaction.id === currentId),
    [transactions, currentId]
  )

  const prevTransaction = currentIndex > 0 ? transactions[currentIndex - 1] : null
  const nextTransaction = currentIndex >= 0 && currentIndex < transactions.length - 1
    ? transactions[currentIndex + 1]
    : null

  const filteredTransactions = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return transactions.slice(0, 40)
    return transactions
      .filter((transaction) => {
        const label = getTransactionLabel(transaction).toLowerCase()
        const merchant = transaction.merchant?.toLowerCase() || ""
        return label.includes(trimmed) || merchant.includes(trimmed)
      })
      .slice(0, 40)
  }, [transactions, query])

  const navigateTo = useCallback(
    (id: string, page?: number) => {
      const params = new URLSearchParams(searchParams.toString())
      if (stripPageParam) {
        params.delete("page")
      } else if (typeof page === "number") {
        if (page > 1) {
          params.set("page", String(page))
        } else {
          params.delete("page")
        }
      }
      const href = params.toString() ? `/transactions/${id}?${params.toString()}` : `/transactions/${id}`
      router.push(href)
    },
    [router, searchParams, stripPageParam]
  )

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      if (isEditableTarget(event.target)) return

      if (event.key === "ArrowLeft") {
        if (prevTransaction) {
          event.preventDefault()
          navigateTo(prevTransaction.id, prevTransaction.page)
        }
      }

      if (event.key === "ArrowRight") {
        if (nextTransaction) {
          event.preventDefault()
          navigateTo(nextTransaction.id, nextTransaction.page)
        }
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [prevTransaction, nextTransaction, navigateTo])

  return (
    <TooltipProvider>
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 border-slate-200 bg-white">
                <Search className="h-4 w-4" />
                Jump to
                <ChevronsUpDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0">
              <div className="border-b px-3 py-2">
                <div className="flex items-center gap-2 rounded-md border bg-white px-2">
                  <Search className="h-4 w-4 text-slate-400" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search name or merchant"
                    className="border-0 px-0 focus-visible:ring-0"
                  />
                </div>
              </div>
              <div className="max-h-72 overflow-auto">
                {filteredTransactions.length === 0 && (
                  <div className="px-4 py-6 text-sm text-slate-500">No matches found.</div>
                )}
                {filteredTransactions.map((transaction) => (
                  <button
                    key={transaction.id}
                    type="button"
                    onClick={() => {
                      navigateTo(transaction.id, transaction.page)
                      setOpen(false)
                    }}
                    className={cn(
                      "w-full px-4 py-3 text-left transition hover:bg-slate-50",
                      transaction.id === currentId && "bg-slate-100"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            TYPE_STYLES[transaction.type || "other"] || TYPE_STYLES.other
                          )}
                        />
                        <div>
                          <div className="text-sm font-medium text-slate-900">{getTransactionLabel(transaction)}</div>
                          <div className="text-xs text-slate-500">{getTransactionDateLabel(transaction)}</div>
                        </div>
                      </div>
                      <div className="text-xs font-semibold text-slate-600">{getTransactionTotalLabel(transaction)}</div>
                    </div>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 border-slate-200 bg-white"
                  onClick={() => prevTransaction && navigateTo(prevTransaction.id, prevTransaction.page)}
                  disabled={!prevTransaction}
                  aria-label="Previous transaction"
                >
                  <ArrowLeft />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Previous (Left)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 border-slate-200 bg-white"
                  onClick={() => nextTransaction && navigateTo(nextTransaction.id, nextTransaction.page)}
                  disabled={!nextTransaction}
                  aria-label="Next transaction"
                >
                  <ArrowRight />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Next (Right)</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
