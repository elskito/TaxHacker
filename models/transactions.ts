import { prisma } from "@/lib/db"
import { PaymentState, normalizePaymentState } from "@/lib/payment-state"
import { Field, Prisma, Transaction } from "@/prisma/client"
import { cache } from "react"
import { getFields } from "./fields"
import { deleteFile } from "./files"

export type TransactionData = {
  name?: string | null
  description?: string | null
  merchant?: string | null
  invoiceId?: string | null
  total?: number | null
  vat?: number | null
  vatRate?: number | null
  currencyCode?: string | null
  convertedTotal?: number | null
  convertedCurrencyCode?: string | null
  type?: string | null
  items?: TransactionData[] | undefined
  note?: string | null
  files?: string[] | undefined
  extra?: Record<string, unknown>
  categoryCode?: string | null
  projectCode?: string | null
  issuedAt?: Date | string | null
  dueDate?: Date | string | null
  dateOfSale?: Date | string | null
  text?: string | null
  [key: string]: unknown
}

export type TransactionFilters = {
  search?: string
  dateFrom?: string
  dateTo?: string
  ordering?: string
  categoryCode?: string
  projectCode?: string
  type?: string
  paymentState?: PaymentState
  page?: number
}

export type TransactionPagination = {
  limit: number
  offset: number
}

export type TransactionWithRelations = Prisma.TransactionGetPayload<{
  include: {
    category: true
    project: true
    payments: true
  }
}>

type TransactionIdRow = {
  id: string
}

type CountRow = {
  count: bigint | number | string
}

type SqlOrdering = {
  column: Prisma.Sql
  direction: Prisma.Sql
}

const SQL_ORDERABLE_COLUMNS: Record<string, string> = {
  id: `t."id"`,
  name: `t."name"`,
  description: `t."description"`,
  merchant: `t."merchant"`,
  invoiceId: `t."invoice_id"`,
  total: `t."total"`,
  vat: `t."vat"`,
  vatRate: `t."vat_rate"`,
  currencyCode: `t."currency_code"`,
  convertedTotal: `t."converted_total"`,
  convertedCurrencyCode: `t."converted_currency_code"`,
  type: `t."type"`,
  note: `t."note"`,
  categoryCode: `t."category_code"`,
  projectCode: `t."project_code"`,
  issuedAt: `t."issued_at"`,
  dueDate: `t."due_date"`,
  dateOfSale: `t."date_of_sale"`,
  createdAt: `t."created_at"`,
  updatedAt: `t."updated_at"`,
}

const startOfToday = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

const parseCount = (value: bigint | number | string | null | undefined) => {
  if (typeof value === "bigint") {
    return Number(value)
  }
  if (typeof value === "number") {
    return value
  }
  if (typeof value === "string") {
    return Number(value)
  }
  return 0
}

const orderRecordsByIds = <T extends { id: string }>(records: T[], orderedIds: string[]) => {
  const recordsById = new Map(records.map((record) => [record.id, record]))
  return orderedIds.map((id) => recordsById.get(id)).filter((record): record is T => Boolean(record))
}

const resolveSqlOrdering = (filters?: TransactionFilters): SqlOrdering => {
  const { field, direction } = resolveTransactionOrdering(filters)
  const column = SQL_ORDERABLE_COLUMNS[field] ?? SQL_ORDERABLE_COLUMNS.issuedAt
  const directionSql = direction === "asc" ? "ASC" : "DESC"

  return {
    column: Prisma.raw(column),
    direction: Prisma.raw(directionSql),
  }
}

const buildPaymentStateWhereSql = (userId: string, filters: TransactionFilters | undefined, paymentState: PaymentState) => {
  const clauses: Prisma.Sql[] = [Prisma.sql`t."user_id" = ${userId}::uuid`]

  if (filters?.search) {
    const search = `%${filters.search}%`
    clauses.push(Prisma.sql`(
      COALESCE(t."name", '') ILIKE ${search}
      OR COALESCE(t."merchant", '') ILIKE ${search}
      OR COALESCE(t."description", '') ILIKE ${search}
      OR COALESCE(t."note", '') ILIKE ${search}
      OR COALESCE(t."text", '') ILIKE ${search}
    )`)
  }

  if (filters?.dateFrom) {
    clauses.push(Prisma.sql`t."issued_at" >= ${new Date(filters.dateFrom)}`)
  }

  if (filters?.dateTo) {
    clauses.push(Prisma.sql`t."issued_at" <= ${new Date(filters.dateTo)}`)
  }

  if (filters?.categoryCode && filters.categoryCode !== "-") {
    clauses.push(Prisma.sql`t."category_code" = ${filters.categoryCode}`)
  }

  if (filters?.projectCode && filters.projectCode !== "-") {
    clauses.push(Prisma.sql`t."project_code" = ${filters.projectCode}`)
  }

  if (filters?.type) {
    clauses.push(Prisma.sql`t."type" = ${filters.type}`)
  }

  if (paymentState === "paid") {
    clauses.push(
      Prisma.sql`(
        COALESCE(t."total", 0)::bigint <= 0
        OR COALESCE(pt."paid_amount", 0)::bigint >= COALESCE(t."total", 0)::bigint
      )`
    )
  } else if (paymentState === "overdue") {
    const todayStart = startOfToday()
    clauses.push(
      Prisma.sql`(
        COALESCE(t."total", 0)::bigint > 0
        AND COALESCE(pt."paid_amount", 0)::bigint < COALESCE(t."total", 0)::bigint
        AND t."due_date" < ${todayStart}
      )`
    )
  } else if (paymentState === "unpaid") {
    const todayStart = startOfToday()
    clauses.push(
      Prisma.sql`(
        COALESCE(t."total", 0)::bigint > 0
        AND COALESCE(pt."paid_amount", 0)::bigint < COALESCE(t."total", 0)::bigint
        AND (t."due_date" IS NULL OR t."due_date" >= ${todayStart})
      )`
    )
  }

  return Prisma.join(clauses, " AND ")
}

const getPaymentStateTransactionIds = async ({
  userId,
  filters,
  paymentState,
  pagination,
  includeTotal,
}: {
  userId: string
  filters?: TransactionFilters
  paymentState: Exclude<PaymentState, "all">
  pagination?: TransactionPagination
  includeTotal?: boolean
}): Promise<{ ids: string[]; total?: number }> => {
  const whereSql = buildPaymentStateWhereSql(userId, filters, paymentState)
  const { column, direction } = resolveSqlOrdering(filters)

  const fromSql = Prisma.sql`
    FROM "transactions" t
    LEFT JOIN (
      SELECT "transaction_id", COALESCE(SUM("amount"), 0)::bigint AS "paid_amount"
      FROM "payments"
      GROUP BY "transaction_id"
    ) pt ON pt."transaction_id" = t."id"
    WHERE ${whereSql}
  `

  const paginationSql = pagination
    ? Prisma.sql`LIMIT ${pagination.limit} OFFSET ${pagination.offset}`
    : Prisma.empty

  const idRows = await prisma.$queryRaw<TransactionIdRow[]>(Prisma.sql`
    SELECT t."id"
    ${fromSql}
    ORDER BY ${column} ${direction}, t."id" ${direction}
    ${paginationSql}
  `)

  if (!includeTotal) {
    return { ids: idRows.map((row) => row.id) }
  }

  const countRows = await prisma.$queryRaw<CountRow[]>(Prisma.sql`
    SELECT COUNT(*)::bigint AS "count"
    ${fromSql}
  `)

  return {
    ids: idRows.map((row) => row.id),
    total: parseCount(countRows[0]?.count),
  }
}

const getPaymentStateTransactionWindowIds = async ({
  userId,
  transactionId,
  filters,
  paymentState,
  windowSize,
}: {
  userId: string
  transactionId: string
  filters?: TransactionFilters
  paymentState: Exclude<PaymentState, "all">
  windowSize: number
}): Promise<string[]> => {
  const size = Math.max(1, windowSize)
  const prevCount = Math.floor((size - 1) / 2)
  const nextCount = size - prevCount - 1
  const whereSql = buildPaymentStateWhereSql(userId, filters, paymentState)
  const { column, direction } = resolveSqlOrdering(filters)

  const idRows = await prisma.$queryRaw<TransactionIdRow[]>(Prisma.sql`
    WITH filtered AS (
      SELECT
        t."id",
        ROW_NUMBER() OVER (ORDER BY ${column} ${direction}, t."id" ${direction}) AS "rn"
      FROM "transactions" t
      LEFT JOIN (
        SELECT "transaction_id", COALESCE(SUM("amount"), 0)::bigint AS "paid_amount"
        FROM "payments"
        GROUP BY "transaction_id"
      ) pt ON pt."transaction_id" = t."id"
      WHERE ${whereSql}
    ),
    target AS (
      SELECT
        f."rn" AS "current_rn",
        (SELECT COUNT(*)::bigint FROM filtered) AS "total_count"
      FROM filtered f
      WHERE f."id" = ${transactionId}
    ),
    bounds AS (
      SELECT
        GREATEST(
          1,
          LEAST(
            target."current_rn" - ${prevCount},
            target."total_count" - ${size} + 1
          )
        ) AS "start_rn",
        LEAST(
          target."total_count",
          GREATEST(
            target."current_rn" + ${nextCount},
            ${size}
          )
        ) AS "end_rn"
      FROM target
    )
    SELECT f."id"
    FROM filtered f
    CROSS JOIN bounds b
    WHERE f."rn" BETWEEN b."start_rn" AND b."end_rn"
    ORDER BY f."rn"
  `)

  return idRows.map((row) => row.id)
}

const buildTransactionWhere = (userId: string, filters?: TransactionFilters): Prisma.TransactionWhereInput => {
  const where: Prisma.TransactionWhereInput = { userId }

  if (filters) {
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { merchant: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
        { note: { contains: filters.search, mode: "insensitive" } },
        { text: { contains: filters.search, mode: "insensitive" } },
      ]
    }

    if (filters.dateFrom || filters.dateTo) {
      where.issuedAt = {
        gte: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
        lte: filters.dateTo ? new Date(filters.dateTo) : undefined,
      }
    }

    if (filters.categoryCode) {
      where.categoryCode = filters.categoryCode
    }

    if (filters.projectCode) {
      where.projectCode = filters.projectCode
    }

    if (filters.type) {
      where.type = filters.type
    }
  }

  return where
}

const resolveTransactionOrdering = (filters?: TransactionFilters) => {
  if (filters?.ordering) {
    const isDesc = filters.ordering.startsWith("-")
    const field = isDesc ? filters.ordering.slice(1) : filters.ordering
    return { field, direction: isDesc ? "desc" : "asc" } as const
  }
  return { field: "issuedAt", direction: "desc" } as const
}

const buildTransactionOrderBy = (
  filters?: TransactionFilters
): Prisma.TransactionOrderByWithRelationInput[] => {
  const { field, direction } = resolveTransactionOrdering(filters)
  const primary = { [field]: direction } as Prisma.TransactionOrderByWithRelationInput
  const tiebreaker = { id: direction } as Prisma.TransactionOrderByWithRelationInput
  return [primary, tiebreaker]
}

const reverseOrderBy = (
  orderBy: Prisma.TransactionOrderByWithRelationInput[]
): Prisma.TransactionOrderByWithRelationInput[] =>
  orderBy.map((order) => {
    const [key, value] = Object.entries(order)[0]
    const direction = value === "asc" ? "desc" : "asc"
    return { [key]: direction } as Prisma.TransactionOrderByWithRelationInput
  })

export const getTransactions = cache(
  async (
    userId: string,
    filters?: TransactionFilters,
    pagination?: TransactionPagination
  ): Promise<{
    transactions: TransactionWithRelations[]
    total: number
  }> => {
    const where = buildTransactionWhere(userId, filters)
    const orderBy = buildTransactionOrderBy(filters)
    const paymentState = normalizePaymentState(filters?.paymentState)

    if (paymentState !== "all") {
      const { ids, total } = await getPaymentStateTransactionIds({
        userId,
        filters,
        paymentState,
        pagination,
        includeTotal: true,
      })

      if (ids.length === 0) {
        return { transactions: [], total: total ?? 0 }
      }

      const transactions = await prisma.transaction.findMany({
        where: { userId, id: { in: ids } },
        include: {
          category: true,
          project: true,
          payments: {
            orderBy: { paidAt: "asc" },
          },
        },
      })

      return {
        transactions: orderRecordsByIds(transactions, ids),
        total: total ?? ids.length,
      }
    }

    if (pagination) {
      const total = await prisma.transaction.count({ where })
      const transactions = await prisma.transaction.findMany({
        where,
        include: {
          category: true,
          project: true,
          payments: {
            orderBy: { paidAt: "asc" },
          },
        },
        orderBy,
        take: pagination?.limit,
        skip: pagination?.offset,
      })
      return { transactions, total }
    } else {
      const transactions = await prisma.transaction.findMany({
        where,
        include: {
          category: true,
          project: true,
          payments: {
            orderBy: { paidAt: "asc" },
          },
        },
        orderBy,
      })
      return { transactions, total: transactions.length }
    }
  }
)

export const getTransactionNavWindow = cache(
  async (
    userId: string,
    transactionId: string,
    filters?: TransactionFilters,
    windowSize = 500
  ): Promise<Transaction[]> => {
    const paymentState = normalizePaymentState(filters?.paymentState)

    if (paymentState !== "all") {
      const windowIds = await getPaymentStateTransactionWindowIds({
        userId,
        transactionId,
        filters,
        paymentState,
        windowSize,
      })
      if (windowIds.length === 0) {
        const fallback = await prisma.transaction.findUnique({ where: { id: transactionId, userId } })
        return fallback ? [fallback] : []
      }

      const windowTransactions = await prisma.transaction.findMany({
        where: { userId, id: { in: windowIds } },
      })

      return orderRecordsByIds(windowTransactions, windowIds)
    }

    const where = buildTransactionWhere(userId, filters)
    const orderBy = buildTransactionOrderBy(filters)
    const current = await prisma.transaction.findFirst({
      where: { ...where, id: transactionId },
    })

    if (!current) {
      const fallback = await prisma.transaction.findUnique({ where: { id: transactionId, userId } })
      return fallback ? [fallback] : []
    }

    const size = Math.max(1, windowSize)
    const prevCount = Math.floor((size - 1) / 2)
    const nextCount = size - prevCount - 1

    const [prev, next] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: reverseOrderBy(orderBy),
        cursor: { id: transactionId },
        skip: 1,
        take: prevCount,
      }),
      prisma.transaction.findMany({
        where,
        orderBy,
        cursor: { id: transactionId },
        skip: 1,
        take: nextCount,
      }),
    ])

    return [...prev.reverse(), current, ...next]
  }
)

export const getTransactionById = cache(async (id: string, userId: string): Promise<Transaction | null> => {
  return await prisma.transaction.findUnique({
    where: { id, userId },
    include: {
      category: true,
      project: true,
      payments: {
        orderBy: { paidAt: "asc" },
      },
    },
  })
})

export const getTransactionsByFileId = cache(async (fileId: string, userId: string): Promise<Transaction[]> => {
  return await prisma.transaction.findMany({
    where: { files: { array_contains: [fileId] }, userId },
  })
})

export const createTransaction = async (userId: string, data: TransactionData): Promise<Transaction> => {
  const { invoiceId, ...rest } = data
  const { standard, extra } = await splitTransactionDataExtraFields(rest, userId)
  const normalizedInvoiceId = typeof invoiceId === "string" ? invoiceId.trim() : invoiceId

  return await prisma.transaction.create({
    data: {
      ...standard,
      invoiceId: normalizedInvoiceId ? normalizedInvoiceId : null,
      extra: extra,
      items: data.items as Prisma.InputJsonValue,
      userId,
    },
  })
}

export const updateTransaction = async (id: string, userId: string, data: TransactionData): Promise<Transaction> => {
  const { invoiceId, ...rest } = data
  const { standard, extra } = await splitTransactionDataExtraFields(rest, userId)
  const normalizedInvoiceId = typeof invoiceId === "string" ? invoiceId.trim() : invoiceId

  return await prisma.transaction.update({
    where: { id, userId },
    data: {
      ...standard,
      ...(normalizedInvoiceId !== undefined ? { invoiceId: normalizedInvoiceId ? normalizedInvoiceId : null } : {}),
      extra: extra,
      items: data.items ? (data.items as Prisma.InputJsonValue) : [],
    },
  })
}

export const updateTransactionFiles = async (id: string, userId: string, files: string[]): Promise<Transaction> => {
  return await prisma.transaction.update({
    where: { id, userId },
    data: { files },
  })
}

export const deleteTransaction = async (id: string, userId: string): Promise<Transaction | undefined> => {
  const transaction = await getTransactionById(id, userId)

  if (transaction) {
    const files = Array.isArray(transaction.files) ? transaction.files : []

    for (const fileId of files as string[]) {
      if ((await getTransactionsByFileId(fileId, userId)).length <= 1) {
        await deleteFile(fileId, userId)
      }
    }

    return await prisma.transaction.delete({
      where: { id, userId },
    })
  }
}

export const bulkDeleteTransactions = async (ids: string[], userId: string) => {
  return await prisma.transaction.deleteMany({
    where: { id: { in: ids }, userId },
  })
}

const splitTransactionDataExtraFields = async (
  data: TransactionData,
  userId: string
): Promise<{ standard: TransactionData; extra: Prisma.InputJsonValue }> => {
  const fields = await getFields(userId)
  const fieldMap = fields.reduce(
    (acc, field) => {
      acc[field.code] = field
      return acc
    },
    {} as Record<string, Field>
  )

  const standard: TransactionData = {}
  const extra: Record<string, unknown> = {}

  Object.entries(data).forEach(([key, value]) => {
    const fieldDef = fieldMap[key]
    if (fieldDef) {
      if (fieldDef.isExtra) {
        extra[key] = value
      } else {
        standard[key] = value
      }
    }
  })

  return { standard, extra: extra as Prisma.InputJsonValue }
}
