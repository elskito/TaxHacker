import { TransactionsResponsiveLayout } from "@/components/transactions/transactions-responsive"
import { getCurrentUser } from "@/lib/auth"
import { encodeOffsetCursor } from "@/lib/pagination-cursor"
import { getCategories } from "@/models/categories"
import { getFields } from "@/models/fields"
import { getProjects } from "@/models/projects"
import { getTransactions, TransactionFilters } from "@/models/transactions"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Transactions",
  description: "Manage your transactions",
}

const TRANSACTIONS_PER_PAGE = 500

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<TransactionFilters> }) {
  const filters: TransactionFilters = { ...(await searchParams) }
  delete filters.page
  const user = await getCurrentUser()
  const { transactions, total } = await getTransactions(user.id, filters, {
    limit: TRANSACTIONS_PER_PAGE,
    offset: 0,
  })
  const categories = await getCategories(user.id)
  const projects = await getProjects(user.id)
  const fields = await getFields(user.id)
  const initialCursor = transactions.length < total ? encodeOffsetCursor(transactions.length) : null
  const serverTodayStart = new Date()
  serverTodayStart.setHours(0, 0, 0, 0)
  const serverTodayStartISO = serverTodayStart.toISOString()

  return (
    <TransactionsResponsiveLayout
      transactions={transactions}
      categories={categories}
      projects={projects}
      fields={fields}
      total={total}
      initialCursor={initialCursor}
      batchSize={TRANSACTIONS_PER_PAGE}
      serverTodayStart={serverTodayStartISO}
    />
  )
}
