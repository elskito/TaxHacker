import { TransactionsResponsiveLayout } from "@/components/transactions/transactions-responsive"
import { getCurrentUser } from "@/lib/auth"
import { isMobileUserAgent } from "@/lib/device"
import { encodeOffsetCursor } from "@/lib/pagination-cursor"
import { getCategories } from "@/models/categories"
import { getCurrencies } from "@/models/currencies"
import { getFields } from "@/models/fields"
import { getProjects } from "@/models/projects"
import { getSettings } from "@/models/settings"
import { getTransactions, TransactionFilters } from "@/models/transactions"
import { Metadata } from "next"
import { headers } from "next/headers"

export const metadata: Metadata = {
  title: "Transactions",
  description: "Manage your transactions",
}

const TRANSACTIONS_PER_PAGE = 500

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<TransactionFilters> }) {
  const filters: TransactionFilters = { ...(await searchParams) }
  delete filters.page
  const ua = (await headers()).get("user-agent")
  const initialIsMobile = isMobileUserAgent(ua)
  const user = await getCurrentUser()
  const { transactions, total } = await getTransactions(user.id, filters, {
    limit: TRANSACTIONS_PER_PAGE,
    offset: 0,
  })
  const categories = await getCategories(user.id)
  const currencies = await getCurrencies(user.id)
  const projects = await getProjects(user.id)
  const settings = await getSettings(user.id)
  const fields = await getFields(user.id)
  const initialCursor = transactions.length < total ? encodeOffsetCursor(transactions.length) : null
  const serverTodayStart = new Date()
  serverTodayStart.setHours(0, 0, 0, 0)
  const serverTodayStartISO = serverTodayStart.toISOString()

  return (
    <TransactionsResponsiveLayout
      transactions={transactions}
      categories={categories}
      currencies={currencies}
      projects={projects}
      settings={settings}
      fields={fields}
      total={total}
      initialCursor={initialCursor}
      batchSize={TRANSACTIONS_PER_PAGE}
      serverTodayStart={serverTodayStartISO}
      initialIsMobile={initialIsMobile}
    />
  )
}
