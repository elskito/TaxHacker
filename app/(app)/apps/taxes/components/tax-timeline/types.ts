export type TimelinePayment = {
  id: string
  amount: number
  paidAt: string
  note?: string | null
  proofOfPaymentFile?: string | null
}

export type TimelineTax = {
  id: string
  type: string
  amount: number
  currencyCode: string
  dueDate: string
  bankAccountNumber?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
  payments: TimelinePayment[]
}

export type TimelineMonth = {
  id: string
  label: string
  startDate: string
  endDate: string
  isCurrent: boolean
  taxes: TimelineTax[]
}

export type ClientPayment = Omit<TimelinePayment, "paidAt"> & { paidAt: Date }

export type ClientTax = Omit<TimelineTax, "dueDate" | "createdAt" | "updatedAt" | "payments"> & {
  dueDate: Date
  createdAt: Date
  updatedAt: Date
  payments: ClientPayment[]
}

export type ClientMonth = Omit<TimelineMonth, "startDate" | "endDate" | "taxes"> & {
  startDate: Date
  endDate: Date
  taxes: ClientTax[]
}

export type CurrencyOption = { code: string; name: string }

export type MonthTotals = Record<string, Record<string, number>>

export type AddPaymentPayload = {
  taxId: string
  amount: number
  paidAt: Date
  note?: string
  proofOfPaymentFile?: File
}

export type AddPaymentHandler = (payload: AddPaymentPayload) => Promise<void> | void
