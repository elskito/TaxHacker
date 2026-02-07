import { prisma } from "@/lib/db"
import { PaymentState, filterTransactionsByPaymentState, normalizePaymentState } from "@/lib/payment-state"
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
      const allTransactions = await prisma.transaction.findMany({
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

      const filteredTransactions = filterTransactionsByPaymentState(allTransactions, paymentState)

      if (!pagination) {
        return { transactions: filteredTransactions, total: filteredTransactions.length }
      }

      const paginatedTransactions = filteredTransactions.slice(
        pagination.offset,
        pagination.offset + pagination.limit
      )

      return { transactions: paginatedTransactions, total: filteredTransactions.length }
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
