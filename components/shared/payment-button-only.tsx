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
import { DollarSign, CheckCircle, Upload, FileText } from "lucide-react"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/currency"

interface PaymentButtonOnlyProps {
  totalAmount: number
  currencyCode: string
  totalPaid: number
  onAddPayment: (amount: number, paidAt: Date, note?: string, proofOfPaymentFile?: File) => void
  className?: string
}

export function PaymentButtonOnly({
  totalAmount,
  currencyCode,
  totalPaid,
  onAddPayment,
  className = "",
}: PaymentButtonOnlyProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [newPaymentAmount, setNewPaymentAmount] = useState("")
  const [newPaymentDate, setNewPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [newPaymentNote, setNewPaymentNote] = useState("")
  const [proofOfPaymentFile, setProofOfPaymentFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const remaining = totalAmount - totalPaid
  const isFullyPaid = remaining <= 0

  const resetForm = () => {
    setNewPaymentAmount("")
    setNewPaymentDate(format(new Date(), "yyyy-MM-dd"))
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
        variant="outline"
        className={`flex items-center gap-2 bg-green-50 text-green-700 border-green-200 ${className}`}
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
        size="sm"
        className={`flex items-center gap-2 ${className}`}
        onClick={() => {
          resetForm()
          setIsOpen(true)
        }}
      >
        <DollarSign className="h-4 w-4" />
        Mark as Paid
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
              <span className="text-sm text-gray-500 whitespace-nowrap">
                / {formatCurrency(remaining, currencyCode)}
              </span>
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