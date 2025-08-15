"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { TaxForm } from "./tax-form"
import { updateTaxAction } from "../actions"
import { toast } from "sonner"
import { TaxFormData } from "@/forms/taxes"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Tax {
  id: string
  type: string
  amount: number
  currencyCode: string
  dueDate: Date
  bankAccountNumber?: string | null
  notes?: string | null
}

interface TaxEditDialogProps {
  tax: Tax | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  currencies: { code: string; name: string }[]
  defaultCurrency?: string
}

export function TaxEditDialog({ tax, open, onOpenChange, onSuccess, currencies, defaultCurrency }: TaxEditDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (data: TaxFormData) => {
    if (!tax) return
    
    setIsLoading(true)
    try {
      const formData = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value instanceof Date ? value.toISOString() : String(value))
        }
      })
      
      await updateTaxAction(tax.id, formData)
      toast.success("Tax updated successfully")
      
      // Close dialog
      onOpenChange(false)
      // Force router refresh to ensure UI updates with updated tax data
      router.refresh()
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error("Failed to update tax:", error)
      toast.error("Failed to update tax")
    } finally {
      setIsLoading(false)
    }
  }

  if (!tax) return null

  const initialData = {
    id: tax.id,
    type: tax.type,
    amount: tax.amount,
    currencyCode: tax.currencyCode,
    dueDate: tax.dueDate,
    bankAccountNumber: tax.bankAccountNumber || undefined,
    notes: tax.notes || undefined,
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Tax Obligation</DialogTitle>
        </DialogHeader>
        
        <TaxForm
          initialData={initialData}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          currencies={currencies}
          defaultCurrency={defaultCurrency}
        />
      </DialogContent>
    </Dialog>
  )
}