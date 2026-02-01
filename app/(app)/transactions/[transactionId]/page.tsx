import { FormTextarea } from "@/components/forms/simple"
import TransactionEditForm from "@/components/transactions/edit"
import TransactionFiles from "@/components/transactions/transaction-files"
import TransactionSwitcher from "@/components/transactions/transaction-switcher"
import { Card } from "@/components/ui/card"
import { getCurrentUser } from "@/lib/auth"
import { incompleteTransactionFields } from "@/lib/stats"
import { getCategories } from "@/models/categories"
import { getCurrencies } from "@/models/currencies"
import { getFields } from "@/models/fields"
import { getFilesByTransactionId } from "@/models/files"
import { getProjects } from "@/models/projects"
import { getSettings } from "@/models/settings"
import { getTransactionById, getTransactions, TransactionFilters } from "@/models/transactions"
import Link from "next/link"
import { notFound } from "next/navigation"

const TRANSACTIONS_PER_PAGE = 500

const getFilterValue = (value?: string | string[] | number) => (Array.isArray(value) ? value[0] : value)

export default async function TransactionPage({
  params,
  searchParams,
}: {
  params: Promise<{ transactionId: string }>
  searchParams: Promise<TransactionFilters>
}) {
  const { transactionId } = await params
  const { page, ...filters } = await searchParams
  const rawPage = Number(getFilterValue(page) ?? 1)
  const currentPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1
  const user = await getCurrentUser()
  const transaction = await getTransactionById(transactionId, user.id)
  if (!transaction) {
    notFound()
  }

  const { transactions: navTransactions } = await getTransactions(user.id, filters, {
    limit: TRANSACTIONS_PER_PAGE,
    offset: (currentPage - 1) * TRANSACTIONS_PER_PAGE,
  })
  const switcherTransactions = navTransactions.map((navTransaction) => ({
    id: navTransaction.id,
    name: navTransaction.name,
    merchant: navTransaction.merchant,
    issuedAt: navTransaction.issuedAt,
    total: navTransaction.total,
    currencyCode: navTransaction.currencyCode,
    type: navTransaction.type,
  }))

  const files = await getFilesByTransactionId(transactionId, user.id)
  const categories = await getCategories(user.id)
  const currencies = await getCurrencies(user.id)
  const settings = await getSettings(user.id)
  const fields = await getFields(user.id)
  const projects = await getProjects(user.id)
  const incompleteFields = incompleteTransactionFields(fields, transaction)

  return (
    <div className="flex flex-col gap-4">
      <TransactionSwitcher
        currentId={transaction.id}
        transactions={switcherTransactions}
      />
      <div className="flex flex-col lg:flex-row flex-wrap items-stretch justify-center gap-4">
        <div className="w-full lg:w-1/2 flex-1 flex">
          <Card className="w-full flex flex-col flex-wrap justify-center items-start overflow-hidden bg-gradient-to-br from-violet-50/80 via-indigo-50/80 to-white border-violet-200/60">
            {incompleteFields.length > 0 && (
              <div className="w-full flex flex-col gap-1 rounded-md bg-yellow-50 p-5">
                <span>
                  Some fields are incomplete: <strong>{incompleteFields.map((field) => field.name).join(", ")}</strong>
                </span>
                <span className="text-xs text-muted-foreground">
                  You can decide which fields are required for you in{" "}
                  <Link href="/settings/fields" className="underline">
                    Fields settings
                  </Link>
                  .
                </span>
              </div>
            )}
            <div className="w-full p-5">
              <TransactionEditForm
                transaction={transaction}
                categories={categories}
                currencies={currencies}
                settings={settings}
                fields={fields}
                projects={projects}
              />

              {transaction.text && (
                <details className="mt-10">
                  <summary className="cursor-pointer text-sm font-medium">Recognized Text</summary>
                  <Card className="flex items-stretch p-2 max-w-6xl">
                    <div className="flex-1">
                      <FormTextarea
                        name="text"
                        defaultValue={transaction.text || ""}
                        hideIfEmpty={true}
                        className="w-full h-[400px]"
                      />
                    </div>
                  </Card>
                </details>
              )}
            </div>
          </Card>
        </div>

        <div className="w-full lg:w-1/2 lg:max-w-[400px] flex flex-col space-y-4">
          <TransactionFiles transaction={transaction} files={files} />
        </div>
      </div>
    </div>
  )
}
