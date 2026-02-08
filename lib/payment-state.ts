export type PaymentState = "all" | "paid" | "unpaid" | "overdue"
const paymentStates: PaymentState[] = ["all", "paid", "unpaid", "overdue"]

type PaymentLike = {
  amount?: number | null
}

type TransactionPaymentStateInput = {
  total?: number | null
  dueDate?: Date | string | null
  payments?: PaymentLike[] | null
}

const startOfToday = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

const resolveTodayStart = (todayStart?: Date | string | null) => {
  if (todayStart instanceof Date) {
    return Number.isNaN(todayStart.getTime()) ? startOfToday() : todayStart
  }
  if (typeof todayStart === "string") {
    const parsed = new Date(todayStart)
    return Number.isNaN(parsed.getTime()) ? startOfToday() : parsed
  }
  return startOfToday()
}

const isPastDue = (dueDate?: Date | string | null, todayStart?: Date | string | null) => {
  if (!dueDate) return false
  const parsedDueDate = new Date(dueDate)
  if (Number.isNaN(parsedDueDate.getTime())) return false

  return parsedDueDate < resolveTodayStart(todayStart)
}

export const getTransactionPaymentState = (
  transaction: TransactionPaymentStateInput,
  options?: { todayStart?: Date | string | null }
): Exclude<PaymentState, "all"> => {
  const totalAmount = transaction.total ?? 0
  const paidAmount =
    transaction.payments?.reduce((sum, payment) => sum + (typeof payment?.amount === "number" ? payment.amount : 0), 0) ??
    0

  // Empty-value transactions are considered paid, so they don't show as overdue/unpaid.
  if (totalAmount <= 0 || paidAmount >= totalAmount) {
    return "paid"
  }

  if (isPastDue(transaction.dueDate, options?.todayStart)) {
    return "overdue"
  }

  return "unpaid"
}

export const matchesPaymentState = (transaction: TransactionPaymentStateInput, paymentState: PaymentState) => {
  if (paymentState === "all") return true
  return getTransactionPaymentState(transaction) === paymentState
}

export const filterTransactionsByPaymentState = <T extends TransactionPaymentStateInput>(
  transactions: T[],
  paymentState: PaymentState
) => {
  if (paymentState === "all") {
    return transactions
  }

  return transactions.filter((transaction) => matchesPaymentState(transaction, paymentState))
}

export const normalizePaymentState = (value: string | undefined | null): PaymentState => {
  if (!value) return "all"
  return paymentStates.includes(value as PaymentState) ? (value as PaymentState) : "all"
}
