"use client"

import { format } from "date-fns"
import { formatCurrency } from "@/lib/currency"
import { Download } from "lucide-react"
import Link from "next/link"

interface Payment {
  id: string
  amount: number
  paidAt: Date
  note?: string | null
  proofOfPaymentFile?: string | null
}

interface PaymentHistoryDisplayProps {
  payments: Payment[]
  totalAmount: number
  currencyCode: string
  className?: string
}

export function PaymentHistoryDisplay({
  payments,
  totalAmount,
  currencyCode,
  className = "",
}: PaymentHistoryDisplayProps) {

  if (payments.length === 0) {
    return null
  }

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0)
  const remaining = totalAmount - totalPaid


  return (
    <div className={`mt-3 p-3 bg-gray-50 rounded-lg min-w-[280px] ${className}`}>
      <h5 className="text-sm font-medium text-gray-700 mb-2">Payment History</h5>
      <div className="space-y-2 text-xs">
        {payments.map((payment) => (
          <div key={payment.id} className="border-b border-gray-200 pb-2 last:border-b-0">
            <div className="flex justify-between items-center gap-4 mb-1">
              <span className="text-gray-600 flex-shrink-0">{format(payment.paidAt, "MMM d, yyyy")}</span>
              <div className="flex items-center gap-2">
                {payment.proofOfPaymentFile && (
                  <Link 
                    href={`/files/download/${payment.proofOfPaymentFile}`}
                    prefetch={false}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                    title="Download proof of payment"
                  >
                    <Download className="h-3 w-3" />
                  </Link>
                )}
                <span className="font-medium">{formatCurrency(payment.amount, currencyCode)}</span>
              </div>
            </div>
            
            {payment.note && (
              <div className="text-gray-500 text-xs mb-1">
                Note: {payment.note}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 pt-2 border-t space-y-1">
        <div className="flex justify-between items-center gap-4 text-xs font-medium">
          <span className="flex-shrink-0">Total Paid:</span>
          <span className="text-right">{formatCurrency(totalPaid, currencyCode)}</span>
        </div>
        {remaining > 0 && (
          <div className="flex justify-between items-center gap-4 text-xs text-orange-600">
            <span className="flex-shrink-0">Remaining:</span>
            <span className="text-right">{formatCurrency(remaining, currencyCode)}</span>
          </div>
        )}
      </div>
    </div>
  )
}