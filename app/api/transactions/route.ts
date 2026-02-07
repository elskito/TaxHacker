import { getCurrentUser } from "@/lib/auth"
import { decodeOffsetCursor, encodeOffsetCursor } from "@/lib/pagination-cursor"
import { normalizePaymentState } from "@/lib/payment-state"
import { getTransactions, TransactionFilters } from "@/models/transactions"
import { NextResponse } from "next/server"

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 500

const parseLimit = (value: string | null) => {
  if (!value) return DEFAULT_LIMIT
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT
  }
  return Math.min(parsed, MAX_LIMIT)
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const user = await getCurrentUser()

  const cursor = decodeOffsetCursor(url.searchParams.get("cursor"))
  const limit = parseLimit(url.searchParams.get("limit"))

  const filters: TransactionFilters = {
    search: url.searchParams.get("search") || undefined,
    dateFrom: url.searchParams.get("dateFrom") || undefined,
    dateTo: url.searchParams.get("dateTo") || undefined,
    ordering: url.searchParams.get("ordering") || undefined,
    categoryCode: url.searchParams.get("categoryCode") || undefined,
    projectCode: url.searchParams.get("projectCode") || undefined,
    type: url.searchParams.get("type") || undefined,
    paymentState: normalizePaymentState(url.searchParams.get("paymentState")),
  }

  const { transactions, total } = await getTransactions(user.id, filters, {
    limit,
    offset: cursor,
  })

  const nextCursor = cursor + transactions.length < total ? encodeOffsetCursor(cursor + transactions.length) : null

  return NextResponse.json({
    transactions,
    total,
    nextCursor,
  })
}
