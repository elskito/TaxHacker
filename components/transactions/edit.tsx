"use client"

import { deleteTransactionAction, saveTransactionAction } from "@/app/(app)/transactions/actions"
import { ItemsDetectTool } from "@/components/agents/items-detect"
import ToolWindow from "@/components/agents/tool-window"
import { FormError } from "@/components/forms/error"
import TransactionBasicInfo from "@/components/transactions/transaction-basic-info"
import TransactionDates from "@/components/transactions/transaction-dates"
import { FormSelectCategory } from "@/components/forms/select-category"
import { FormSelectCurrency } from "@/components/forms/select-currency"
import { FormSelectProject } from "@/components/forms/select-project"
import { FormSelectType } from "@/components/forms/select-type"
import { FormInput, FormTextarea, FormSelect, FormCheckbox } from "@/components/forms/simple"
import { DeleteModal } from "@/components/transactions/delete-file-modal"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { PaymentButtonOnly } from "@/components/shared/payment-button-only"
import { TransactionData } from "@/models/transactions"
import { Category, Currency, Field, Payment, Project, Transaction } from "@/prisma/client"
import { format } from "date-fns"
import { CheckCircle, Loader2, Save, Trash2 } from "lucide-react"
import { formatCurrency } from "@/lib/currency"
import { useRouter } from "next/navigation"
import { startTransition, useActionState, useMemo, useState } from "react"

export default function TransactionEditForm({
  transaction,
  categories,
  projects,
  currencies,
  fields,
  settings,
}: {
  transaction: Transaction & { payments?: Payment[] }
  categories: Category[]
  projects: Project[]
  currencies: Currency[]
  fields: Field[]
  settings: Record<string, string>
}) {
  const router = useRouter()
  const [deleteState, deleteAction, isDeleting] = useActionState(deleteTransactionAction, null)
  const [saveState, saveAction, isSaving] = useActionState(saveTransactionAction, null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [showPaymentHistory, setShowPaymentHistory] = useState(false)

  const extraFields = fields.filter((field) => field.isExtra && field.code !== "vat" && field.code !== "vatRate")
  
  // Calculate payment totals
  const totalPaid = useMemo(() => {
    if (!transaction.payments) return 0
    return transaction.payments.reduce((sum, payment) => sum + payment.amount, 0)
  }, [transaction.payments])
  
  const isFullyPaid = useMemo(() => {
    const remaining = (transaction.total || 0) - totalPaid
    return remaining <= 0
  }, [transaction.total, totalPaid])
  
  // VAT fallbacks for legacy extra fields

  const extraVat = transaction.extra?.["vat"]
  const extraVatRate = transaction.extra?.["vat_rate"] ?? transaction.extra?.["vatRate"]
  const parsedExtraVat =
    typeof extraVat === "number" ? extraVat : typeof extraVat === "string" ? parseFloat(extraVat) : NaN
  const parsedExtraVatRate =
    typeof extraVatRate === "number" ? extraVatRate : typeof extraVatRate === "string" ? parseFloat(extraVatRate) : NaN
  const vatValue =
    transaction.vat !== null && transaction.vat !== undefined
      ? transaction.vat / 100
      : Number.isFinite(parsedExtraVat)
        ? parsedExtraVat
        : ""
  const vatRateValue =
    transaction.vatRate ?? (Number.isFinite(parsedExtraVatRate) ? parsedExtraVatRate : "")

  const [formData, setFormData] = useState({
    name: transaction.name || "",
    merchant: transaction.merchant || "",
    description: transaction.description || "",
    total: transaction.total ? transaction.total / 100 : 0.0,
    vat: vatValue,
    vatRate: vatRateValue,
    currencyCode: transaction.currencyCode || settings.default_currency,
    convertedTotal: transaction.convertedTotal ? transaction.convertedTotal / 100 : 0.0,
    convertedCurrencyCode: transaction.convertedCurrencyCode,
    type: transaction.type || "expense",
    categoryCode: transaction.categoryCode || settings.default_category,
    projectCode: transaction.projectCode || settings.default_project,
    issuedAt: transaction.issuedAt ? format(transaction.issuedAt, "yyyy-MM-dd") : "",
    dueDate: transaction.dueDate ? format(transaction.dueDate, "yyyy-MM-dd") : "",
    dateOfSale: transaction.dateOfSale ? format(transaction.dateOfSale, "yyyy-MM-dd") : "",
    note: transaction.note || "",
    items: transaction.items || [],
    ...extraFields.reduce(
      (acc, field) => {
        const value = transaction.extra?.[field.code as keyof typeof transaction.extra]
        if (field.type === "boolean") {
          acc[field.code] = value === "true" || value === true
        } else {
          acc[field.code] = value || ""
        }
        return acc
      },
      {} as Record<string, string | boolean>
    ),
  })

  // Extract complex logic into computed values
  const shouldShowCurrencyConversion = useMemo(() => {
    return formData.convertedTotal !== null && 
           (formData.currencyCode !== settings.default_currency || formData.convertedTotal !== 0)
  }, [formData.convertedTotal, formData.currencyCode, settings.default_currency])

  const shouldShowConvertedCurrencySelect = useMemo(() => {
    return (!formData.convertedCurrencyCode || formData.convertedCurrencyCode !== settings.default_currency) && 
           (formData.currencyCode !== settings.default_currency || formData.convertedTotal !== 0)
  }, [formData.convertedCurrencyCode, formData.currencyCode, settings.default_currency, formData.convertedTotal])

  const fieldMap = useMemo(() => {
    return fields.reduce(
      (acc, field) => {
        acc[field.code] = field
        return acc
      },
      {} as Record<string, Field>
    )
  }, [fields])

  const handleDelete = () => {
    startTransition(() => {
      deleteAction(transaction.id)
      router.back()
    })
    setDeleteModalOpen(false)
  }

  const openDeleteModal = () => {
    setDeleteModalOpen(true)
  }

  const handleAddPayment = async (amount: number, paidAt: Date, note?: string, proofOfPaymentFile?: File) => {
    // Create form data to submit with the payment
    const formData = new FormData(document.querySelector('form') as HTMLFormElement)
    formData.set('newPaymentAmount', (amount / 100).toString())
    formData.set('newPaymentDate', format(paidAt, 'yyyy-MM-dd'))
    if (note) {
      formData.set('newPaymentNote', note)
    }
    if (proofOfPaymentFile) {
      formData.append('proofOfPaymentFile', proofOfPaymentFile)
    }
    
    // Submit the form with the payment data
    startTransition(() => {
      saveAction(formData)
    })
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-4 gap-4">
        <div className="min-w-0">
          {transaction.invoiceId && (
            <div className="text-sm">
              <div className="text-xs text-muted-foreground">Invoice ID</div>
              <div className="font-mono text-sm text-slate-900 truncate">{transaction.invoiceId}</div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          {isFullyPaid ? (
            <Popover open={showPaymentHistory} onOpenChange={setShowPaymentHistory}>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant="default"
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white shadow-sm min-w-48"
                >
                  <CheckCircle className="h-4 w-4" />
                  Paid
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full max-w-md sm:w-96 p-0" align="end">
                {transaction.payments && transaction.payments.length > 0 && (
                  <div className="p-4 bg-gray-50">
                    <h4 className="font-medium mb-3">Payment History</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {transaction.payments.map((payment) => (
                        <div key={payment.id} className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">{format(new Date(payment.paidAt), "MMM d, yyyy")}</span>
                          <span className="font-medium">
                            {formatCurrency(payment.amount, transaction.currencyCode || 'USD')}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between items-center text-sm font-medium">
                        <span>Total Paid:</span>
                        <span>{formatCurrency(totalPaid, transaction.currencyCode || 'USD')}</span>
                      </div>
                    </div>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          ) : (
            <PaymentButtonOnly
              totalAmount={transaction.total || 0}
              currencyCode={transaction.currencyCode || 'USD'}
              totalPaid={totalPaid}
              onAddPayment={handleAddPayment}
              className="min-w-48"
              showProofOfPayment={false}
            />
          )}
        </div>
      </div>
      
      <form action={saveAction} className="space-y-4">
        <input type="hidden" name="transactionId" value={transaction.id} />

      <div className="flex flex-col lg:flex-row gap-4 mb-4">
        <TransactionBasicInfo transaction={transaction} fields={fields} />
        <TransactionDates transaction={transaction} fields={fields} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        <FormInput
          title={fieldMap.total.name}
          type="number"
          step="0.01"
          name="total"
          defaultValue={formData.total.toFixed(2)}
          className="w-full"
          isRequired={fieldMap.total.isRequired}
        />

        {shouldShowCurrencyConversion && (
          <FormInput
            title={`Total converted to ${formData.convertedCurrencyCode || "UNKNOWN CURRENCY"}`}
            type="number"
            step="0.01"
            name="convertedTotal"
            defaultValue={formData.convertedTotal.toFixed(2)}
            isRequired={fieldMap.convertedTotal.isRequired}
            className="w-full"
          />
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <FormSelectCurrency
          title={fieldMap.currencyCode.name}
          name="currencyCode"
          value={formData.currencyCode}
          onValueChange={(value) => {
            setFormData({ ...formData, currencyCode: value })
          }}
          currencies={currencies}
          isRequired={fieldMap.currencyCode.isRequired}
        />

        {shouldShowConvertedCurrencySelect && (
          <FormSelectCurrency
            title="Convert to"
            name="convertedCurrencyCode"
            defaultValue={formData.convertedCurrencyCode || settings.default_currency}
            currencies={currencies}
            isRequired={fieldMap.convertedCurrencyCode.isRequired}
          />
        )}

        <FormSelectType
          title={fieldMap.type.name}
          name="type"
          defaultValue={formData.type}
          isRequired={fieldMap.type.isRequired}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <FormSelectCategory
          title={fieldMap.categoryCode.name}
          categories={categories}
          name="categoryCode"
          defaultValue={formData.categoryCode}
          isRequired={fieldMap.categoryCode.isRequired}
        />

        <FormSelectProject
          title={fieldMap.projectCode.name}
          projects={projects}
          name="projectCode"
          defaultValue={formData.projectCode}
          isRequired={fieldMap.projectCode.isRequired}
        />
      </div>

      <FormTextarea
        title={fieldMap.note.name}
        name="note"
        defaultValue={formData.note}
        className="h-24"
        isRequired={fieldMap.note.isRequired}
      />

      {(fieldMap.vatRate || fieldMap.vat) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          {fieldMap.vatRate && (
            <FormInput
              title={fieldMap.vatRate.name}
              type="number"
              step="0.01"
              name="vatRate"
              defaultValue={typeof formData.vatRate === "number" ? formData.vatRate.toString() : formData.vatRate}
              className="w-full"
              isRequired={fieldMap.vatRate.isRequired}
            />
          )}

          {fieldMap.vat && (
            <FormInput
              title={fieldMap.vat.name}
              type="number"
              step="0.01"
              name="vat"
              defaultValue={typeof formData.vat === "number" ? formData.vat.toFixed(2) : formData.vat}
              isRequired={fieldMap.vat.isRequired}
              className="w-full"
            />
          )}
        </div>
      )}

      {extraFields.filter(field => field.code !== "vatRate" && field.code !== "vat").length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {extraFields.filter(field => field.code !== "vatRate" && field.code !== "vat").map((field) => {
            if (field.type === "select" && field.options && Array.isArray(field.options)) {
              const selectItems = (field.options as string[]).map((option: string) => ({
                code: option,
                name: option
              }))
              
              return (
                <FormSelect
                  key={field.code}
                  title={field.name}
                  name={field.code}
                  items={selectItems}
                  value={(formData[field.code as keyof typeof formData] as string) || ""}
                  onValueChange={(value) => {
                    setFormData({ ...formData, [field.code]: value })
                  }}
                  isRequired={field.isRequired}
                  placeholder={`Select ${field.name.toLowerCase()}`}
                  emptyValue="Not Defined"
                />
              )
            }
            
            if (field.type === "boolean") {
              return (
                <FormCheckbox
                  key={field.code}
                  title={field.name}
                  name={field.code}
                  defaultChecked={formData[field.code as keyof typeof formData] as boolean}
                  onChange={(checked) => {
                    setFormData({ ...formData, [field.code]: checked })
                  }}
                  isRequired={field.isRequired}
                />
              )
            }
            
            return (
              <FormInput
                key={field.code}
                type={field.type === "number" ? "number" : "text"}
                title={field.name}
                name={field.code}
                defaultValue={(formData[field.code as keyof typeof formData] as string) || ""}
                isRequired={field.isRequired}
                className={field.type === "number" ? "max-w-36" : ""}
              />
            )
          })}
        </div>
      )}

      {formData.items && Array.isArray(formData.items) && formData.items.length > 0 && (
        <ToolWindow title="Detected items">
          <ItemsDetectTool data={formData as TransactionData} />
        </ToolWindow>
      )}

      <div className="flex justify-between space-x-4 pt-6">
        <Button type="button" onClick={openDeleteModal} variant="destructive" disabled={isDeleting}>
          <>
            <Trash2 className="h-4 w-4" />
            {isDeleting ? "⏳ Deleting..." : "Delete "}
          </>
        </Button>

        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Transaction
            </>
          )}
        </Button>
      </div>

      <div>
        {deleteState?.error && <FormError>{deleteState.error}</FormError>}
        {saveState?.error && <FormError>{saveState.error}</FormError>}
      </div>

      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Transaction"
        description="Are you sure? This will delete the transaction with all the files permanently"
      />
      </form>
    </div>
  )
}
