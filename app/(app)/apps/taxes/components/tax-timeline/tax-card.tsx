import { memo, useMemo } from "react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PaymentButtonOnly } from "@/components/shared/payment-button-only"
import { PaymentHistoryDisplay } from "@/components/shared/payment-history-display"

import type { AddPaymentHandler, ClientTax } from "./types"

interface TaxCardProps {
  tax: ClientTax
  isActive: boolean
  onAddPayment: AddPaymentHandler
  onDelete: (tax: ClientTax) => void
  onEdit: (tax: ClientTax) => void
}

const TaxCardComponent = ({ tax, isActive, onAddPayment, onDelete, onEdit }: TaxCardProps) => {
  const totalPaid = useMemo(
    () => tax.payments.reduce((sum, payment) => sum + payment.amount, 0),
    [tax.payments],
  )

  const hasPayments = tax.payments.length > 0
  const formattedDueDate = format(tax.dueDate, "MMM dd, yyyy")

  return (
    <Card
      className={cn(
        "border border-border/60 transition-shadow",
        isActive ? "shadow-md" : "shadow-sm",
        "h-full",
      )}
    >
      <CardContent className="flex h-full flex-col p-6">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Tax type</p>
            <h4 className="text-lg font-semibold text-foreground">{tax.type}</h4>
          </div>

          <div className="grid gap-4 text-sm sm:grid-cols-2 sm:gap-x-12 sm:gap-y-6">
            <div>
              <p className="font-medium text-muted-foreground">Due date</p>
              <p className="whitespace-nowrap text-base font-semibold text-foreground">{formattedDueDate}</p>
            </div>
            {tax.bankAccountNumber && (
              <div>
                <p className="font-medium text-muted-foreground">Account</p>
                <p className="break-all text-foreground">{tax.bankAccountNumber}</p>
              </div>
            )}
          </div>

          {tax.notes && (
            <div className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">{tax.notes}</div>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <PaymentButtonOnly
            totalAmount={tax.amount}
            currencyCode={tax.currencyCode}
            totalPaid={totalPaid}
            onAddPayment={(amountValue, paidAtValue, noteValue, proof) =>
              onAddPayment({
                taxId: tax.id,
                amount: amountValue,
                paidAt: paidAtValue,
                note: noteValue,
                proofOfPaymentFile: proof ?? undefined,
              })
            }
            className="w-full"
          />
          {!hasPayments && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(tax)}
              className="w-full justify-center"
              type="button"
            >
              Edit
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDelete(tax)}
            className="w-full justify-center"
            type="button"
          >
            Delete
          </Button>
        </div>

        {tax.payments.length > 0 && (
          <PaymentHistoryDisplay
            payments={tax.payments}
            totalAmount={tax.amount}
            currencyCode={tax.currencyCode}
            className="mt-6"
          />
        )}
      </CardContent>
    </Card>
  )
}

export const TaxCard = memo(TaxCardComponent)
