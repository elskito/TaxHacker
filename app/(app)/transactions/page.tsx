import { ExportTransactionsDialog } from "@/components/export/transactions"
import { UploadButton } from "@/components/files/upload-button"
import { DesktopTransactionsCount } from "@/components/transactions/desktop/desktop-transactions-count"
import { TransactionSearchAndFilters } from "@/components/transactions/filters"
import { DesktopTransactionsContent } from "@/components/transactions/desktop/desktop-transactions-content"
import { MobileSidebarToggle } from "@/components/transactions/mobile/mobile-sidebar-toggle"
import { MobileTransactionsContent } from "@/components/transactions/mobile/mobile-transactions-content"
import { NewTransactionDialog } from "@/components/transactions/new"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth"
import { encodeOffsetCursor } from "@/lib/pagination-cursor"
import { getCategories } from "@/models/categories"
import { getFields } from "@/models/fields"
import { getProjects } from "@/models/projects"
import { getTransactions, TransactionFilters } from "@/models/transactions"
import { Download, Plus, Upload } from "lucide-react"
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

  return (
    <>
      <div className="-mt-[60px] md:hidden">
        <header className="sticky top-0 z-30 border-b bg-background">
          <div className="flex items-center justify-between px-4 py-3">
            <MobileSidebarToggle />
            <span className="text-lg font-bold">Transactions</span>
            <NewTransactionDialog>
              <Button size="icon">
                <Plus />
              </Button>
            </NewTransactionDialog>
          </div>
        </header>
        <main className="px-4 py-4">
          <MobileTransactionsContent
            transactions={transactions}
            categories={categories}
            projects={projects}
            total={total}
            initialCursor={initialCursor}
            batchSize={TRANSACTIONS_PER_PAGE}
          />
        </main>
      </div>

      <div className="hidden md:block">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex flex-row gap-3 md:gap-5">
            <span className="text-3xl font-bold tracking-tight">Transactions</span>
            <DesktopTransactionsCount initialLoaded={transactions.length} initialTotal={total} />
          </h2>
          <div className="flex gap-2">
            <ExportTransactionsDialog fields={fields} categories={categories} projects={projects} total={total}>
              <Button variant="outline">
                <Download />
                <span className="hidden md:block">Export</span>
              </Button>
            </ExportTransactionsDialog>
            <NewTransactionDialog>
              <Button>
                <Plus /> <span className="hidden md:block">Add Transaction</span>
              </Button>
            </NewTransactionDialog>
          </div>
        </header>

        <TransactionSearchAndFilters categories={categories} projects={projects} fields={fields} />

        <main>
          <DesktopTransactionsContent
            transactions={transactions}
            total={total}
            initialCursor={initialCursor}
            batchSize={TRANSACTIONS_PER_PAGE}
            fields={fields}
          />

          {transactions.length === 0 && (
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-2">
              <p className="text-muted-foreground">
                You don&apos;t seem to have any transactions yet. Let&apos;s start and create the first one!
              </p>
              <div className="mt-8 flex flex-row gap-5">
                <UploadButton>
                  <Upload /> Analyze New Invoice
                </UploadButton>
                <NewTransactionDialog>
                  <Button variant="outline">
                    <Plus />
                    Add Manually
                  </Button>
                </NewTransactionDialog>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}
