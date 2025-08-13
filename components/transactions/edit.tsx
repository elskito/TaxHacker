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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { TransactionData } from "@/models/transactions"
import { Category, Currency, Field, Payment, Project, Transaction } from "@/prisma/client"
import { format } from "date-fns"
import { Loader2, Save, Trash2,  Check, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { startTransition, useActionState, useEffect, useMemo, useState } from "react"

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
  const [settleModalOpen, setSettleModalOpen] = useState(false)
  const [newPaymentAmount, setNewPaymentAmount] = useState("")
  const [newPaymentDate, setNewPaymentDate] = useState("")

  const extraFields = fields.filter((field) => field.isExtra)
  
  // Calculate payment totals
  const totalPaid = useMemo(() => {
    if (!transaction.payments) return 0
    return transaction.payments.reduce((sum, payment) => sum + payment.amount, 0)
  }, [transaction.payments])
  
  const pendingPaymentAmount = useMemo(() => {
    if (!newPaymentAmount) return 0
    return Math.round(parseFloat(newPaymentAmount) * 100)
  }, [newPaymentAmount])
  
  const totalPaidWithPending = useMemo(() => {
    return totalPaid + pendingPaymentAmount
  }, [totalPaid, pendingPaymentAmount])
  
  // Move computed values after formData state initialization

  const [formData, setFormData] = useState({
    name: transaction.name || "",
    merchant: transaction.merchant || "",
    description: transaction.description || "",
    total: transaction.total ? transaction.total / 100 : 0.0,
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

  useEffect(() => {
    if (saveState?.success) {
      router.back()
      setSettleModalOpen(false)
      setNewPaymentAmount("")
      setNewPaymentDate("")
    }
  }, [saveState, router])

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button
          variant={totalPaidWithPending >= (transaction.total || 0) ? "default" : "outline"}
          size="sm"
          className={`min-w-48 transition-all duration-200 ${totalPaidWithPending >= (transaction.total || 0) ? "bg-green-600 hover:bg-green-700 text-white shadow-sm" : "hover:border-gray-400"} ${pendingPaymentAmount > 0 && totalPaidWithPending < (transaction.total || 0) ? "p-6" : ""}`}
          onClick={() => setSettleModalOpen(true)}
          aria-label={`Payment status: ${totalPaidWithPending >= (transaction.total || 0) ? "Paid" : "Unpaid"}. Click to manage payments.`}
          aria-expanded={settleModalOpen}
          aria-haspopup="dialog"
          aria-describedby="payment-summary"
        >
          {totalPaidWithPending >= (transaction.total || 0) ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              {pendingPaymentAmount > 0 ? "Will be Paid" : "Paid"}
            </>
          ) : (
            <div id="payment-summary" className="flex flex-col items-center">
              <div className="flex items-center">
                <Plus className="h-4 w-4 mr-2" />
                Paid {(totalPaid / 100).toFixed(2)} / {((transaction.total || 0) / 100).toFixed(2)} {transaction.currencyCode}
              </div>
              {pendingPaymentAmount > 0 && (
                <div className="text-xs text-orange-600 mt-1">
                  +{(pendingPaymentAmount / 100).toFixed(2)} pending
                </div>
              )}
            </div>
          )}
        </Button>

        {/* Settlement Modal */}
        <Popover open={settleModalOpen} onOpenChange={setSettleModalOpen}>
          <PopoverTrigger asChild>
            <div />
          </PopoverTrigger>
          <PopoverContent className="w-full max-w-md sm:w-96 p-0" align="end">
            {/* Payment History Section */}
            {transaction.payments && transaction.payments.length > 0 && (
              <div className="p-4 border-b bg-gray-50">
                <h4 className="font-medium mb-3">Payment History</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {transaction.payments.map((payment) => (
                    <div key={payment.id} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">{format(new Date(payment.paidAt), "MMM d, yyyy")}</span>
                      <span className="font-medium">{(payment.amount / 100).toFixed(2)} {transaction.currencyCode}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span>Total Paid:</span>
                    <span>{(totalPaid / 100).toFixed(2)} {transaction.currencyCode}</span>
                  </div>
                  {(transaction.total || 0) - totalPaid > 0 && (
                    <div className="flex justify-between items-center text-sm text-orange-600">
                      <span>Remaining:</span>
                      <span>{(((transaction.total || 0) - totalPaid) / 100).toFixed(2)} {transaction.currencyCode}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {(transaction.total || 0) - totalPaid > 0 && (
              <div className="p-4 space-y-4">
                <h4 className="font-medium">Add Payment</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="payment-amount">
                  Amount to Pay
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    id="payment-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    max={(((transaction.total || 0) - totalPaid) / 100)}
                    value={newPaymentAmount}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
                        const numValue = parseFloat(value)
                        const maxAmount = ((transaction.total || 0) - totalPaid) / 100
                        if (value === "" || (!isNaN(numValue) && numValue <= maxAmount)) {
                          setNewPaymentAmount(value)
                        }
                      }
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm flex-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                    aria-describedby="payment-amount-error"
                  />
                  <span className="text-sm text-gray-500 whitespace-nowrap">
                    / {(((transaction.total || 0) - totalPaid) / 100).toFixed(2)} {transaction.currencyCode}
                  </span>
                </div>
                {newPaymentAmount && parseFloat(newPaymentAmount) > (((transaction.total || 0) - totalPaid) / 100) && (
                  <p id="payment-amount-error" className="text-xs text-red-600 mt-1" role="alert">
                    Amount cannot exceed remaining balance
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="payment-date">
                  Payment Date
                </label>
                <input
                  id="payment-date"
                  type="date"
                  value={newPaymentDate}
                  onChange={(e) => setNewPaymentDate(e.target.value)}
                  max={format(new Date(), "yyyy-MM-dd")}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm w-full"
                />
              </div>

              <div className="flex justify-between space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSettleModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    // Validation is already handled by disabled state
                    // The payment data is included in the form through hidden inputs
                    setSettleModalOpen(false)
                  }}
                  disabled={!newPaymentAmount || !newPaymentDate || parseFloat(newPaymentAmount) <= 0 || 
                           parseFloat(newPaymentAmount) > (((transaction.total || 0) - totalPaid) / 100)}
                >
                  Add to Transaction
                </Button>
              </div>
            </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
      
      <form action={saveAction} className="space-y-4">
        <input type="hidden" name="transactionId" value={transaction.id} />
        {newPaymentAmount && newPaymentDate && (
          <>
            <input type="hidden" name="newPaymentAmount" value={newPaymentAmount} />
            <input type="hidden" name="newPaymentDate" value={newPaymentDate} />
          </>
        )}

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

      {(fieldMap.vat_rate || fieldMap.vat) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          {fieldMap.vat_rate && (
            <FormInput
              title={fieldMap.vat_rate.name}
              type="number"
              step="0.01"
              name="vat_rate"
              defaultValue={(formData["vat_rate" as keyof typeof formData] as string) || ""}
              className="w-full"
              isRequired={fieldMap.vat_rate.isRequired}
            />
          )}

          {fieldMap.vat && (
            <FormInput
              title={fieldMap.vat.name}
              type="number"
              step="0.01"
              name="vat"
              defaultValue={(formData["vat" as keyof typeof formData] as string) || ""}
              isRequired={fieldMap.vat.isRequired}
              className="w-full"
            />
          )}
        </div>
      )}

      {extraFields.filter(field => field.code !== "vat_rate" && field.code !== "vat").length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {extraFields.filter(field => field.code !== "vat_rate" && field.code !== "vat").map((field) => {
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
