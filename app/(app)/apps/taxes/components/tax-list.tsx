"use client"

import { useState } from "react"
import { format, isBefore, startOfToday } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, Clock, Edit, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { PaymentButtonOnly } from "@/components/shared/payment-button-only"
import { PaymentHistoryDisplay } from "@/components/shared/payment-history-display"
import { DeleteModal } from "@/components/transactions/delete-file-modal"

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

interface TaxListProps {
  taxes: Tax[]
  onAddPayment: (taxId: string, amount: number, paidAt: Date, note?: string, proofOfPaymentFile?: File) => Promise<void>
  onEdit: (tax: Tax) => void
  onDelete: (taxId: string) => Promise<void>
}

export function TaxList({ taxes, onAddPayment, onEdit, onDelete }: TaxListProps) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [taxToDelete, setTaxToDelete] = useState<string | null>(null)

  // Group taxes by month
  const groupedTaxes = taxes.reduce((groups, tax) => {
    const monthKey = format(tax.dueDate, "yyyy-MM")
    if (!groups[monthKey]) {
      groups[monthKey] = []
    }
    groups[monthKey].push(tax)
    return groups
  }, {} as Record<string, Tax[]>)

  // Sort months (most recent first)
  const sortedMonths = Object.keys(groupedTaxes).sort().reverse()

  const handleAddPayment = async (taxId: string, amount: number, paidAt: Date, note?: string, proofOfPaymentFile?: File) => {
    await onAddPayment(taxId, amount, paidAt, note, proofOfPaymentFile)
  }

  const handleDeleteClick = (taxId: string) => {
    setTaxToDelete(taxId)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!taxToDelete) return
    
    try {
      await onDelete(taxToDelete)
      setDeleteModalOpen(false)
      setTaxToDelete(null)
    } catch {
      toast.error("Failed to delete tax")
    }
  }

  const getTaxStatus = (tax: Tax) => {
    const totalPaid = tax.payments.reduce((sum, payment) => sum + payment.amount, 0)
    const isFullyPaid = totalPaid >= tax.amount
    
    if (isFullyPaid) {
      return { status: "paid", color: "bg-green-100 text-green-800", icon: CheckCircle }
    }
    
    const today = startOfToday()
    const isOverdue = isBefore(tax.dueDate, today)
    
    if (isOverdue) {
      return { status: "overdue", color: "bg-red-100 text-red-800", icon: Clock }
    }
    
    return { status: "pending", color: "bg-yellow-100 text-yellow-800", icon: Clock }
  }

  const formatCurrency = (amount: number, currencyCode: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
    }).format(amount / 100)
  }

  return (
    <>
      <div className="space-y-6">
        {sortedMonths.map((monthKey) => {
          const monthTaxes = groupedTaxes[monthKey].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
          const monthDate = new Date(monthKey + "-01")
          
          return (
            <div key={monthKey} className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {format(monthDate, "MMMM yyyy")}
              </h3>
              
              <div className="grid gap-4">
                {monthTaxes.map((tax) => {
                  const { status, color, icon: StatusIcon } = getTaxStatus(tax)
                  const totalPaid = tax.payments.reduce((sum, payment) => sum + payment.amount, 0)
                  
                  return (
                    <Card key={tax.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-gray-900">{tax.type}</h4>
                              <Badge className={color}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {status === "paid" ? "Paid" : status === "overdue" ? "Overdue" : "Pending"}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                              <div>
                                <p className="font-medium">Amount</p>
                                <p className="font-semibold text-gray-900">
                                  {formatCurrency(tax.amount, tax.currencyCode)}
                                </p>
                              </div>
                              <div>
                                <p className="font-medium">Due Date</p>
                                <p>{format(tax.dueDate, "MMM dd, yyyy")}</p>
                              </div>
                              {tax.bankAccountNumber && (
                                <div>
                                  <p className="font-medium">Account</p>
                                  <p>{tax.bankAccountNumber}</p>
                                </div>
                              )}
                            </div>
                            
                            {tax.notes && (
                              <div className="mt-3">
                                <p className="text-sm text-gray-600">{tax.notes}</p>
                              </div>
                            )}
                          </div>
                          
                          <div className="ml-4">
                            {/* Action buttons row */}
                            <div className="flex items-center gap-2">
                              <PaymentButtonOnly
                                totalAmount={tax.amount}
                                currencyCode={tax.currencyCode}
                                totalPaid={totalPaid}
                                onAddPayment={(amount, paidAt, note, proofOfPaymentFile) => handleAddPayment(tax.id, amount, paidAt, note, proofOfPaymentFile)}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onEdit(tax)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteClick(tax.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Payment History at bottom of tax card */}
                        {tax.payments.length > 0 && (
                          <PaymentHistoryDisplay
                            payments={tax.payments}
                            totalAmount={tax.amount}
                            currencyCode={tax.currencyCode}
                          />
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )
        })}
        
        {taxes.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-500">No taxes added yet. Create your first tax obligation above.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setTaxToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Tax"
        description="Are you sure you want to delete this tax? This action cannot be undone."
      />
    </>
  )
}