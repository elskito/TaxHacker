import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth"

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