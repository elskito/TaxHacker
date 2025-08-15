import { prisma } from "@/lib/db"

export interface TaxPaymentData {
  amount: number
  paidAt: Date
  note?: string
}

export const createTaxPayment = async (
  taxId: string,
  userId: string,
  data: TaxPaymentData
) => {
  const startTime = Date.now()

  try {
    // Security: Verify user owns the tax before creating payment
    const tax = await prisma.tax.findFirst({
      where: { id: taxId, userId },
    })

    if (!tax) {
      throw new Error("Tax not found or access denied")
    }

    const payment = await prisma.taxPayment.create({
      data: {
        taxId,
        amount: data.amount,
        paidAt: data.paidAt,
        note: data.note,
      },
    })

    // Monitoring: Log payment creation for audit trail
    console.log(`Tax payment created: ${payment.id} for tax ${taxId} (${Date.now() - startTime}ms)`)

    return payment
  } catch (error) {
    console.error(`Tax payment creation failed for tax ${taxId}:`, error)
    throw error
  }
}

export const getTaxPaymentsByTaxId = async (taxId: string) => {
  return await prisma.taxPayment.findMany({
    where: { taxId },
    orderBy: { paidAt: "asc" },
  })
}

export const getTotalPaidAmount = async (taxId: string): Promise<number> => {
  const result = await prisma.taxPayment.aggregate({
    where: { taxId },
    _sum: { amount: true },
  })
  
  return result._sum.amount || 0
}

export const deleteTaxPayment = async (paymentId: string, userId: string) => {
  // Security: Verify user owns the tax before deleting payment
  const payment = await prisma.taxPayment.findFirst({
    where: { 
      id: paymentId,
      tax: {
        userId
      }
    },
  })

  if (!payment) {
    throw new Error("Payment not found or access denied")
  }

  return await prisma.taxPayment.delete({
    where: { id: paymentId },
  })
}