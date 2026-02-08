"use client"

import { ExportTransactionsDialog } from "@/components/export/transactions"
import { UploadButton } from "@/components/files/upload-button"
import { DesktopTransactionsCount } from "@/components/transactions/desktop/desktop-transactions-count"
import { DesktopTransactionsContent } from "@/components/transactions/desktop/desktop-transactions-content"
import { TransactionSearchAndFilters } from "@/components/transactions/filters"
import { MobileSidebarToggle } from "@/components/transactions/mobile/mobile-sidebar-toggle"
import { MobileTransactionsContent } from "@/components/transactions/mobile/mobile-transactions-content"
import { NewTransactionDialog } from "@/components/transactions/new"
import { Button } from "@/components/ui/button"
import { useIsMobile } from "@/hooks/use-mobile"
import { Category, Field, Payment, Project, Transaction } from "@/prisma/client"
import { Download, Plus, Upload } from "lucide-react"

type TransactionWithPayments = Transaction & { payments?: Payment[] }

type TransactionsResponsiveLayoutProps = {
  transactions: TransactionWithPayments[]
  categories: Category[]
  projects: Project[]
  fields: Field[]
  total: number
  initialCursor: string | null
  batchSize: number
  serverTodayStart: string
}

export function TransactionsResponsiveLayout({
  transactions,
  categories,
  projects,
  fields,
  total,
  initialCursor,
  batchSize,
  serverTodayStart,
}: TransactionsResponsiveLayoutProps) {
  const isMobile = useIsMobile()

  return isMobile ? (
    <MobileLayout
      transactions={transactions}
      categories={categories}
      projects={projects}
      total={total}
      initialCursor={initialCursor}
      batchSize={batchSize}
      serverTodayStart={serverTodayStart}
    />
  ) : (
    <DesktopLayout
      transactions={transactions}
      categories={categories}
      projects={projects}
      fields={fields}
      total={total}
      initialCursor={initialCursor}
      batchSize={batchSize}
    />
  )
}

type MobileLayoutProps = {
  transactions: TransactionWithPayments[]
  categories: Category[]
  projects: Project[]
  total: number
  initialCursor: string | null
  batchSize: number
  serverTodayStart: string
}

function MobileLayout({
  transactions,
  categories,
  projects,
  total,
  initialCursor,
  batchSize,
  serverTodayStart,
}: MobileLayoutProps) {
  return (
    <div className="-mt-[60px]">
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
          batchSize={batchSize}
          serverTodayStart={serverTodayStart}
        />
      </main>
    </div>
  )
}

type DesktopLayoutProps = {
  transactions: TransactionWithPayments[]
  categories: Category[]
  projects: Project[]
  fields: Field[]
  total: number
  initialCursor: string | null
  batchSize: number
}

function DesktopLayout({
  transactions,
  categories,
  projects,
  fields,
  total,
  initialCursor,
  batchSize,
}: DesktopLayoutProps) {
  return (
    <div>
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
          batchSize={batchSize}
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
  )
}
