import { MonthTotals, TimelineMonth, ClientMonth, ClientTax } from "./types"

export const PREFETCH_BATCH_SIZE = 8

const toClientTax = (tax: TimelineMonth["taxes"][number]): ClientTax => ({
  ...tax,
  dueDate: new Date(tax.dueDate),
  createdAt: new Date(tax.createdAt),
  updatedAt: new Date(tax.updatedAt),
  payments: tax.payments.map((payment) => ({
    ...payment,
    paidAt: new Date(payment.paidAt),
  })),
})

const toClientMonth = (month: TimelineMonth): ClientMonth => ({
  ...month,
  startDate: new Date(month.startDate),
  endDate: new Date(month.endDate),
  taxes: month.taxes.map(toClientTax),
})

const cloneTax = (tax: ClientTax): ClientTax => ({
  ...tax,
  dueDate: new Date(tax.dueDate),
  createdAt: new Date(tax.createdAt),
  updatedAt: new Date(tax.updatedAt),
  payments: tax.payments.map((payment) => ({
    ...payment,
    paidAt: new Date(payment.paidAt),
  })),
})

const cloneMonth = (month: ClientMonth): ClientMonth => ({
  ...month,
  startDate: new Date(month.startDate),
  endDate: new Date(month.endDate),
  taxes: month.taxes.map(cloneTax),
})

export const normalizeMonths = (months: TimelineMonth[]): ClientMonth[] => months.map(toClientMonth)

export const cloneMonths = (months: ClientMonth[]): ClientMonth[] => months.map(cloneMonth)

export const calculateMonthTotals = (
  months: ClientMonth[],
  defaultCurrency?: string,
): MonthTotals =>
  months.reduce<MonthTotals>((acc, month) => {
    const totalsForMonth = month.taxes.reduce<Record<string, number>>((currencyAcc, tax) => {
      const currencyCode = tax.currencyCode ?? defaultCurrency ?? "USD"
      currencyAcc[currencyCode] = (currencyAcc[currencyCode] ?? 0) + tax.amount
      return currencyAcc
    }, {})

    if (Object.keys(totalsForMonth).length > 0) {
      acc[month.id] = totalsForMonth
    }

    return acc
  }, {})
