import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"
function createUtcMonthWindow(date: Date) {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()

  const monthStart = new Date(Date.UTC(year, month, 1))
  const nextMonthStart = new Date(Date.UTC(year, month + 1, 1))
  const monthEnd = new Date(nextMonthStart.getTime() - 1)

  return { monthStart, nextMonthStart, monthEnd }
}

function getUtcMonthKey(date: Date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

function getUtcMonthLabel(date: Date) {
  return date.toLocaleString("en-US", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  })
}

export interface CreateTaxData {
  type: string
  amount: number
  currencyCode: string
  dueDate: Date
  bankAccountNumber?: string
  notes?: string
}

export interface UpdateTaxData extends Partial<CreateTaxData> {
  id: string
}


export interface AddTaxPaymentData {
  taxId: string
  amount: number
  paidAt: Date
  note?: string
  proofOfPaymentFile?: string
}

export interface TaxTimelinePayment {
  id: string
  amount: number
  paidAt: string
  note?: string | null
  proofOfPaymentFile?: string | null
}

export interface TaxTimelineTax {
  id: string
  type: string
  amount: number
  currencyCode: string
  dueDate: string
  bankAccountNumber?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
  payments: TaxTimelinePayment[]
}

export interface TaxTimelineMonth {
  id: string
  label: string
  startDate: string
  endDate: string
  isCurrent: boolean
  taxes: TaxTimelineTax[]
}

export interface TaxTimelineResponse {
  months: TaxTimelineMonth[]
  nextCursor: string | null
}

export interface GetTaxTimelineParams {
  cursor?: string
  limit?: number
  userId?: string
}

export async function getTaxes(userId?: string) {
  const user = userId || (await getCurrentUser())?.id
  if (!user) throw new Error("User not found")

  return await prisma.tax.findMany({
    where: { userId: user },
    include: {
      payments: {
        orderBy: { paidAt: "asc" },
      },
    },
    orderBy: [
      { dueDate: "asc" },
      { createdAt: "desc" }
    ]
  })
}

export async function getTaxTimeline({ cursor, limit = 4, userId }: GetTaxTimelineParams = {}): Promise<TaxTimelineResponse> {
  const user = userId || (await getCurrentUser())?.id
  if (!user) throw new Error("User not found")

  const sanitizedLimit = Math.max(1, Math.min(limit, 12))
  const cursorDate = cursor ? createUtcMonthWindow(new Date(cursor)).monthStart : null

  const monthRows = cursorDate
    ? await prisma.$queryRaw<{ month_start: Date }[]>`
        SELECT date_trunc('month', "due_date") AS month_start
        FROM "taxes"
        WHERE "user_id" = ${user}::uuid AND "due_date" < ${cursorDate}
        GROUP BY 1
        ORDER BY month_start DESC
        LIMIT ${sanitizedLimit}
      `
    : await prisma.$queryRaw<{ month_start: Date }[]>`
        SELECT date_trunc('month', "due_date") AS month_start
        FROM "taxes"
        WHERE "user_id" = ${user}::uuid
        GROUP BY 1
        ORDER BY month_start DESC
        LIMIT ${sanitizedLimit}
      `

  if (monthRows.length === 0) {
    return { months: [], nextCursor: null }
  }

  const monthsData: TaxTimelineMonth[] = []

  const currentMonthKey = getUtcMonthKey(new Date())

  for (const row of monthRows) {
    const { monthStart, nextMonthStart, monthEnd } = createUtcMonthWindow(new Date(row.month_start))

    const taxes = await prisma.tax.findMany({
      where: {
        userId: user,
        dueDate: {
          gte: monthStart,
          lt: nextMonthStart,
        },
      },
      include: {
        payments: {
          select: {
            id: true,
            amount: true,
            paidAt: true,
            note: true,
            proofOfPaymentFile: true,
          },
          orderBy: { paidAt: "asc" },
        },
      },
      orderBy: [
        { dueDate: "asc" },
        { createdAt: "desc" },
      ],
    })

    monthsData.push({
      id: getUtcMonthKey(monthStart),
      label: getUtcMonthLabel(monthStart),
      startDate: monthStart.toISOString(),
      endDate: monthEnd.toISOString(),
      isCurrent: getUtcMonthKey(monthStart) === currentMonthKey,
      taxes: taxes.map((tax) => ({
        id: tax.id,
        type: tax.type,
        amount: tax.amount,
        currencyCode: tax.currencyCode,
        dueDate: tax.dueDate.toISOString(),
        bankAccountNumber: tax.bankAccountNumber,
        notes: tax.notes,
        createdAt: tax.createdAt.toISOString(),
        updatedAt: tax.updatedAt.toISOString(),
        payments: tax.payments.map((payment) => ({
          id: payment.id,
          amount: payment.amount,
          paidAt: payment.paidAt.toISOString(),
          note: payment.note,
          proofOfPaymentFile: payment.proofOfPaymentFile,
        })),
      })),
    })
  }

  const nextCursor = monthRows.length === sanitizedLimit
    ? new Date(monthRows[monthRows.length - 1].month_start).toISOString()
    : null

  return {
    months: monthsData,
    nextCursor,
  }
}

export async function getTaxById(id: string, userId?: string) {
  const user = userId || (await getCurrentUser())?.id
  if (!user) throw new Error("User not found")

  return await prisma.tax.findFirst({
    where: { 
      id,
      userId: user 
    },
    include: {
      payments: {
        orderBy: { paidAt: "asc" },
      },
    },
  })
}

export async function createTax(data: CreateTaxData) {
  const user = await getCurrentUser()
  if (!user) throw new Error("User not found")

  return await prisma.tax.create({
    data: {
      ...data,
      userId: user.id
    }
  })
}

export async function updateTax(data: UpdateTaxData) {
  const user = await getCurrentUser()
  if (!user) throw new Error("User not found")

  const { id, ...updateData } = data
  
  return await prisma.tax.update({
    where: { 
      id,
      userId: user.id 
    },
    data: {
      ...updateData,
      updatedAt: new Date()
    }
  })
}


export async function addTaxPayment(data: AddTaxPaymentData) {
  const user = await getCurrentUser()
  if (!user) throw new Error("User not found")

  // Use database transaction for data consistency
  return await prisma.$transaction(async (prisma) => {
    // Security: Verify user owns the tax
    const tax = await prisma.tax.findFirst({
      where: { id: data.taxId, userId: user.id },
      include: { payments: true },
    })

    if (!tax) {
      throw new Error("Tax not found or access denied")
    }

    // Validate payment amount doesn't exceed remaining balance
    const totalPaid = tax.payments.reduce((sum, payment) => sum + payment.amount, 0)
    const remainingAmount = tax.amount - totalPaid
    
    if (data.amount > remainingAmount) {
      throw new Error(`Payment amount (${data.amount / 100}) exceeds remaining balance (${remainingAmount / 100})`)
    }

    // Create the payment within transaction
    
    const payment = await prisma.taxPayment.create({
      data: {
        taxId: data.taxId,
        amount: data.amount,
        paidAt: data.paidAt,
        note: data.note,
        proofOfPaymentFile: data.proofOfPaymentFile,
      }
    })
    

    return payment
  })
}


export async function deleteTax(id: string) {
  const user = await getCurrentUser()
  if (!user) throw new Error("User not found")

  // Delete the tax (this will cascade delete all payments due to schema)
  const result = await prisma.tax.delete({
    where: { 
      id,
      userId: user.id 
    }
  })

  return result
}

export async function getTaxStats(userId?: string) {
  const user = userId || (await getCurrentUser())?.id
  if (!user) throw new Error("User not found")

  // Use parallel queries for better performance
  const [taxes, paymentAggregates] = await Promise.all([
    prisma.tax.findMany({
      where: { userId: user },
      select: { 
        id: true, 
        amount: true, 
        dueDate: true 
      },
    }),
    prisma.taxPayment.groupBy({
      by: ['taxId'],
      _sum: { amount: true },
      where: {
        tax: { userId: user }
      }
    })
  ])

  // Create a lookup for payment totals
  const paymentTotals = new Map(
    paymentAggregates.map(p => [p.taxId, p._sum.amount || 0])
  )

  const totalTaxes = taxes.length
  let paidTaxes = 0
  let overdueTaxes = 0
  let totalAmount = 0

  const today = new Date()

  for (const tax of taxes) {
    totalAmount += tax.amount
    
    const totalPaid = paymentTotals.get(tax.id) || 0
    const isFullyPaid = totalPaid >= tax.amount
    
    if (isFullyPaid) {
      paidTaxes++
    } else if (tax.dueDate < today) {
      overdueTaxes++
    }
  }

  return {
    totalTaxes,
    paidTaxes,
    overdueTaxes,
    pendingTaxes: totalTaxes - paidTaxes,
    totalAmount
  }
}
