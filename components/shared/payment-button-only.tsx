"use client"

import { useState, useRef } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog"
import { CheckCircle, Upload, FileText, Plus } from "lucide-react"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/currency"

interface PaymentButtonOnlyProps {
  totalAmount: number
  currencyCode: string
  totalPaid: number
  onAddPayment: (amount: number, paidAt: Date, note?: string, proofOfPaymentFile?: File) => void
  className?: string
  showProofOfPayment?: boolean
  defaultDate?: string
}

export function PaymentButtonOnly({
  totalAmount,
  currencyCode,
  totalPaid,
  onAddPayment,
  className = "",
  showProofOfPayment = true,
  defaultDate,
}: PaymentButtonOnlyProps) {
  const initialPaymentDate = defaultDate || format(new Date(), "yyyy-MM-dd")
  const [isOpen, setIsOpen] = useState(false)
  const [newPaymentAmount, setNewPaymentAmount] = useState("")
  const [newPaymentDate, setNewPaymentDate] = useState(initialPaymentDate)
  const [newPaymentNote, setNewPaymentNote] = useState("")
  const [proofOfPaymentFile, setProofOfPaymentFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const remaining = totalAmount - totalPaid
  const isFullyPaid = remaining <= 0

  const resetForm = () => {
    setNewPaymentAmount("")
    setNewPaymentDate(initialPaymentDate)
    setNewPaymentNote("")
    setProofOfPaymentFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleAddPayment = async () => {
    try {
      const amountValue = parseFloat(newPaymentAmount)
      if (isNaN(amountValue) || amountValue <= 0) {
        toast.error("Please enter a valid payment amount")
        return
      }
      
      const amount = Math.round(amountValue * 100)
      const paidAt = new Date(newPaymentDate)
      
      if (isNaN(paidAt.getTime())) {
        toast.error("Please enter a valid payment date")
        return
      }
      
      const note = newPaymentNote.trim() || undefined


      await onAddPayment(amount, paidAt, note, proofOfPaymentFile || undefined)
      
      // Reset form and close dialog
      resetForm()
      setIsOpen(false)
    } catch (error) {
      console.error("Failed to add payment:", error)
      toast.error("Failed to add payment. Please try again.")
    }
  }

  const canAddPayment = () => {
    if (!newPaymentAmount || !newPaymentDate) return false
    const amount = parseFloat(newPaymentAmount)
    return amount > 0 && amount <= (remaining / 100)
  }

  if (isFullyPaid) {
    // For fully paid taxes, just show the status button (no popover)
    return (
      <Button
        size="sm"
        variant="default"
        className={`flex items-center gap-2 bg-green-600 hover:bg-green-600 text-white shadow-sm disabled:bg-green-600 disabled:text-white disabled:opacity-100 ${className}`}
        disabled
      >
        <CheckCircle className="h-4 w-4" />
        Paid
      </Button>
    )
  }

  // For unpaid taxes, show the payment button with dialog
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={`min-w-48 transition-all duration-200 hover:border-gray-400 ${className}`}
        onClick={() => {
          resetForm()
          setIsOpen(true)
        }}
      >
        <div className="flex flex-col items-center">
          <div className="flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            Paid {formatCurrency(totalPaid, currencyCode)} / {formatCurrency(totalAmount, currencyCode)}
          </div>
        </div>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount to Pay
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                step="0.01"
                min="0"
                max={remaining / 100}
                value={newPaymentAmount}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
                    const numValue = parseFloat(value)
                    const maxAmount = remaining / 100
                    if (value === "" || (!isNaN(numValue) && numValue <= maxAmount)) {
                      setNewPaymentAmount(value)
                    }
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm flex-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
              <button
                type="button"
                onClick={() => setNewPaymentAmount((remaining / 100).toString())}
                className="text-sm text-blue-600 hover:text-blue-800 whitespace-nowrap underline-offset-2 hover:underline transition-colors"
                title="Click to set amount to remaining balance"
              >
                / {formatCurrency(remaining, currencyCode)}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Date
            </label>
            <input
              type="date"
              value={newPaymentDate}
              onChange={(e) => setNewPaymentDate(e.target.value)}
              max={format(new Date(), "yyyy-MM-dd")}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm w-full"
            />
          </div>


          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note (optional)
            </label>
            <input
              type="text"
              value={newPaymentNote}
              onChange={(e) => setNewPaymentNote(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm w-full"
              placeholder="Payment reference, bank transfer details..."
            />
          </div>

          {showProofOfPayment && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Proof of Payment (optional)
              </label>
              <div className="relative">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    setProofOfPaymentFile(file)
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  accept="image/*,.pdf"
                />
                {proofOfPaymentFile ? (
                  <div className="flex items-center justify-between p-3 border-2 border-green-200 bg-green-50 rounded-lg transition-all w-full">
                    <div className="flex items-center space-x-3 min-w-0 flex-1 pr-2">
                      <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <FileText className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-green-800 truncate" title={proofOfPaymentFile.name}>
                          {proofOfPaymentFile.name}
                        </p>
                        <p className="text-xs text-green-600">
                          {(proofOfPaymentFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer">
                    <div className="text-center">
                      <div className="w-10 h-10 mx-auto mb-3 bg-blue-100 rounded-full flex items-center justify-center">
                        <Upload className="w-5 h-5 text-blue-600" />
                      </div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Upload proof of payment</p>
                      <p className="text-xs text-gray-500">PNG, JPG, or PDF up to 10MB</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          </div>
          
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm()
                setIsOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddPayment}
              disabled={!canAddPayment()}
            >
              Add Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}