"use client"

import { getTransactionPaymentState } from "@/lib/payment-state"
import { calcTotalPerCurrency } from "@/lib/stats"
import { formatCurrency } from "@/lib/utils"
import { Payment, Transaction } from "@/prisma/client"
import { format } from "date-fns"
import { useRouter, useSearchParams } from "next/navigation"
import { useMemo } from "react"

type TransactionWithPayments = Transaction & { payments?: Payment[] }

type MonthGroup = {
  key: string
  label: string
  transactions: TransactionWithPayments[]
}

const getPrimaryDate = (transaction: TransactionWithPayments) => {
  const candidate = transaction.issuedAt ?? transaction.dueDate ?? transaction.dateOfSale ?? transaction.createdAt
  const parsed = candidate instanceof Date ? candidate : new Date(candidate)
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed
}

const formatSectionTotal = (transactions: TransactionWithPayments[]) => {
  const totals = calcTotalPerCurrency(transactions)
  const parts = Object.entries(totals).map(([currency, value]) => formatCurrency(value, currency))
  return parts.length > 0 ? parts.join(" · ") : "0"
}

const formatAmount = (transaction: TransactionWithPayments) => {
  if (typeof transaction.convertedTotal === "number" && transaction.convertedCurrencyCode) {
    return formatCurrency(transaction.convertedTotal, transaction.convertedCurrencyCode)
  }

  if (typeof transaction.total === "number" && transaction.currencyCode) {
    return formatCurrency(transaction.total, transaction.currencyCode)
  }

  return "-"
}

const getStatusLabel = (transaction: TransactionWithPayments, todayStart?: string) =>
  getTransactionPaymentState(transaction, { todayStart }).toUpperCase()

export function MobileGroupedList({
  transactions,
  serverTodayStart,
}: {
  transactions: TransactionWithPayments[]
  serverTodayStart: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const groupedTransactions = useMemo(() => {
    const groups = new Map<string, MonthGroup>()

    for (const transaction of transactions) {
      const baseDate = getPrimaryDate(transaction)
      const monthKey = format(baseDate, "yyyy-MM")
      const monthLabel = format(baseDate, "LLLL yyyy").toUpperCase()

      if (!groups.has(monthKey)) {
        groups.set(monthKey, {
          key: monthKey,
          label: monthLabel,
          transactions: [],
        })
      }

      groups.get(monthKey)!.transactions.push(transaction)
    }

    return [...groups.values()]
  }, [transactions])

  const onRowClick = (transactionId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("page")
    params.delete("cursor")
    const query = params.toString()
    router.push(query ? `/transactions/${transactionId}?${query}` : `/transactions/${transactionId}`)
  }

  if (transactions.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-md border px-6 text-center text-sm text-muted-foreground">
        No transactions found for the current filters.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-md border">
      {groupedTransactions.map((group) => (
        <section key={group.key} className="border-b last:border-b-0">
          <div className="flex items-center justify-between border-b bg-muted/20 px-3 py-2 text-xs font-medium text-muted-foreground">
            <span>{group.label}</span>
            <span>{formatSectionTotal(group.transactions)}</span>
          </div>

          {group.transactions.map((transaction) => {
            const primaryDate = getPrimaryDate(transaction)
            const title = transaction.name?.trim() || transaction.merchant?.trim() || transaction.invoiceId || "Untitled"
            const subtitleParts = [formatAmount(transaction), format(primaryDate, "d/MM/yyyy")]

            if (transaction.invoiceId) {
              subtitleParts.push(`#${transaction.invoiceId}`)
            }

            return (
              <button
                key={transaction.id}
                type="button"
                onClick={() => onRowClick(transaction.id)}
                className="flex w-full items-start justify-between gap-4 border-b px-3 py-3 text-left last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{subtitleParts.join(" · ")}</div>
                </div>
                <div className="pt-0.5 text-xs text-muted-foreground">{getStatusLabel(transaction, serverTodayStart)}</div>
              </button>
            )
          })}
        </section>
      ))}
    </div>
  )
}
