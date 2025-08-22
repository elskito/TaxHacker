"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FormInput } from "@/components/forms/simple"
import { FormSelectCurrency } from "@/components/forms/select-currency"
import { taxFormSchema, TaxFormData } from "@/forms/taxes"
import { toast } from "sonner"
import { formatDateForInput } from "@/lib/field-utils"

interface TaxFormProps {
  initialData?: Partial<TaxFormData & { id?: string }>
  onSubmit: (data: TaxFormData) => Promise<void>
  isLoading?: boolean
  currencies: { code: string; name: string }[]
  defaultCurrency?: string
}

export function TaxForm({ initialData, onSubmit, isLoading, currencies, defaultCurrency }: TaxFormProps) {
  const [formData, setFormData] = useState({
    type: initialData?.type || "",
    amount: initialData?.amount ? (initialData.amount / 100).toString() : "",
    currencyCode: initialData?.currencyCode || defaultCurrency || "USD",
    dueDate: initialData?.dueDate || undefined,
    bankAccountNumber: initialData?.bankAccountNumber || "",
    notes: initialData?.notes || "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    try {
      const validatedData = taxFormSchema.parse(formData)
      await onSubmit(validatedData)
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'issues' in error) {
        const fieldErrors: Record<string, string> = {}
        const zodError = error as { issues: { path: string[]; message: string }[] }
        zodError.issues.forEach((issue: { path: string[]; message: string }) => {
          if (issue.path.length > 0) {
            fieldErrors[issue.path[0]] = issue.message
          }
        })
        setErrors(fieldErrors)
      } else {
        toast.error("Failed to save tax")
      }
    }
  }

  const handleInputChange = (field: string, value: string | Date | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="type">Tax Type *</Label>
          <Input
            id="type"
            type="text"
            value={formData.type}
            onChange={(e) => handleInputChange("type", e.target.value)}
            placeholder="e.g., Income Tax, VAT, Corporate Tax"
          />
          {errors.type && <p className="text-sm text-red-500">{errors.type}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => handleInputChange("amount", e.target.value)}
            placeholder="0.00"
          />
          {errors.amount && <p className="text-sm text-red-500">{errors.amount}</p>}
        </div>

        <div className="space-y-2">
          <FormSelectCurrency
            title="Currency *"
            name="currencyCode"
            currencies={currencies}
            value={formData.currencyCode}
            onValueChange={(value) => handleInputChange("currencyCode", value)}
            isRequired
          />
          {errors.currencyCode && <p className="text-sm text-red-500">{errors.currencyCode}</p>}
        </div>

        <div className="space-y-2">
          <FormInput
            title="Due Date *"
            type="date"
            name="dueDate"
            value={formatDateForInput(formData.dueDate || null)}
            onChange={(e) => handleInputChange("dueDate", e.target.value ? new Date(e.target.value) : undefined)}
            isRequired
          />
          {errors.dueDate && <p className="text-sm text-red-500">{errors.dueDate}</p>}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="bankAccountNumber">Bank Account Number</Label>
          <Input
            id="bankAccountNumber"
            type="text"
            value={formData.bankAccountNumber}
            onChange={(e) => handleInputChange("bankAccountNumber", e.target.value)}
            placeholder="Account number for tax payment"
          />
          {errors.bankAccountNumber && <p className="text-sm text-red-500">{errors.bankAccountNumber}</p>}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleInputChange("notes", e.target.value)}
            placeholder="Additional notes about this tax..."
            rows={3}
          />
          {errors.notes && <p className="text-sm text-red-500">{errors.notes}</p>}
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : initialData?.id ? "Update Tax" : "Add Tax"}
        </Button>
      </div>
    </form>
  )
}