import { prisma } from "@/lib/db"
import { Payment } from "@/prisma/client"

export type PaymentData = {
  amount: number
  paidAt: Date
  note?: string
}

export const createPayment = async (
  transactionId: string,
  userId: string,
  data: PaymentData
): Promise<Payment> => {
  const startTime = Date.now()

  try {
    // Security: Verify user owns the transaction before creating payment
    const transaction = await prisma.transaction.findFirst({
      where: { id: transactionId, userId },
    })

    if (!transaction) {
      throw new Error("Transaction not found or access denied")
    }

    const payment = await prisma.payment.create({
      data: {
        transactionId,
        amount: data.amount,
        paidAt: data.paidAt,
        note: data.note,
      },
    })

    // Monitoring: Log payment creation for audit trail
    console.log(`Payment created: ${payment.id} for transaction ${transactionId} (${Date.now() - startTime}ms)`)

    return payment
  } catch (error) {
    console.error(`Payment creation failed for transaction ${transactionId}:`, error)
    throw error
  }
}

export const getPaymentsByTransactionId = async (
  transactionId: string
): Promise<Payment[]> => {
  return await prisma.payment.findMany({
    where: { transactionId },
    orderBy: { paidAt: "asc" },
  })
}

export const getTotalPaidAmount = async (transactionId: string): Promise<number> => {
  const result = await prisma.payment.aggregate({
    where: { transactionId },
    _sum: { amount: true },
  })
  return result._sum.amount || 0
}

export const deletePayment = async (paymentId: string): Promise<Payment> => {
  return await prisma.payment.delete({
    where: { id: paymentId },
  })
}