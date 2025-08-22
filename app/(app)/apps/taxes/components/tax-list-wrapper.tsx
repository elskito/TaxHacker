"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { TaxList } from "./tax-list"
import { TaxEditDialog } from "./tax-edit-dialog"
import { deleteTaxAction, addTaxPaymentAction } from "../actions"
import { toast } from "sonner"

interface TaxPayment {
  id: string
  amount: number
  paidAt: Date
  note?: string | null
  proofOfPaymentFile?: string | null
}

interface Tax {
  id: string
  type: string
  amount: number
  currencyCode: string
  dueDate: Date
  bankAccountNumber?: string | null
  notes?: string | null
  payments: TaxPayment[]
  createdAt: Date
  updatedAt: Date
}

interface TaxListWrapperProps {
  taxes: Tax[]
  currencies: { code: string; name: string }[]
  defaultCurrency?: string
}

export function TaxListWrapper({ taxes: initialTaxes, currencies, defaultCurrency }: TaxListWrapperProps) {
  const router = useRouter()
  const [taxes, setTaxes] = useState(initialTaxes)
  const [editingTax, setEditingTax] = useState<Tax | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  // Update local state when props change (for server-side updates)
  useEffect(() => {
    setTaxes(initialTaxes)
  }, [initialTaxes])

  const handleAddPayment = async (taxId: string, amount: number, paidAt: Date, note?: string, proofOfPaymentFile?: File) => {
    try {
      // Generate file UUID if file is present (for optimistic update)
      const fileUuid = proofOfPaymentFile ? crypto.randomUUID() : undefined
      
      // Create optimistic payment for immediate UI update
      const newPayment = {
        id: `optimistic-${Date.now()}`, // Temporary ID
        amount,
        paidAt,
        note: note || null,
        proofOfPaymentFile: fileUuid || null
      }

      // Optimistically update UI first
      setTaxes(prevTaxes => 
        prevTaxes.map(tax => 
          tax.id === taxId 
            ? { ...tax, payments: [...tax.payments, newPayment] }
            : tax
        )
      )

      // Prepare form data for server action
      const formData = new FormData()
      formData.append("amount", (amount / 100).toString())
      formData.append("paidAt", paidAt.toISOString())
      if (note) formData.append("note", note)
      if (proofOfPaymentFile) {
        formData.append("proofOfPaymentFile", proofOfPaymentFile)
      }
      
      // Call server action to persist to database
      await addTaxPaymentAction(taxId, formData, fileUuid)
      
      toast.success("Payment added successfully")
      
    } catch (error) {
      console.error("Failed to add payment:", error)
      toast.error("Failed to add payment")
      
      // Revert optimistic update on error
      setTaxes(initialTaxes)
      throw error
    }
  }

  const handleEdit = (tax: Tax) => {
    setEditingTax(tax)
    setEditDialogOpen(true)
  }

  const handleDelete = async (taxId: string) => {
    try {
      // Optimistic update - immediately remove tax from UI
      setTaxes(prevTaxes => prevTaxes.filter(tax => tax.id !== taxId))
      
      await deleteTaxAction(taxId)
      toast.success("Tax deleted successfully")
      
      // No need for router.refresh() since optimistic update already removed the tax
    } catch (error) {
      console.error("Failed to delete tax:", error)
      toast.error("Failed to delete tax")
      
      // Revert optimistic update on error
      setTaxes(initialTaxes)
      throw error
    }
  }

  return (
    <>
      <TaxList
        taxes={taxes}
        onAddPayment={handleAddPayment}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      
      <TaxEditDialog
        tax={editingTax}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        currencies={currencies}
        defaultCurrency={defaultCurrency}
      />
    </>
  )
}