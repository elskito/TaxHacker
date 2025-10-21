import { memo } from "react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

import { TaxCard } from "./tax-card"
import type { AddPaymentHandler, ClientMonth, ClientTax } from "./types"

interface MonthSectionProps {
  month: ClientMonth
  isActive: boolean
  onAddPayment: AddPaymentHandler
  onDelete: (tax: ClientTax) => void
  onEdit: (tax: ClientTax) => void
}

const MonthSectionComponent = ({ month, isActive, onAddPayment, onDelete, onEdit }: MonthSectionProps) => {
  return (
    <section
      data-month-id={month.id}
      className={cn(
        "relative scroll-mt-32 pl-6 pr-2 transition-all duration-300 ease-out lg:pl-14",
        isActive ? "scale-100 opacity-100" : "scale-[0.99] opacity-85",
      )}
    >
      <span
        className={cn(
          "absolute left-1.5 top-2 hidden h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border-2 bg-background text-xs font-semibold shadow-sm lg:flex lg:left-1",
          isActive ? "border-primary text-primary" : "border-border text-muted-foreground",
        )}
        aria-hidden="true"
      >
        {month.label.trim().charAt(0)}
      </span>

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3
            className={cn(
              "text-2xl font-semibold text-foreground transition-colors",
              isActive ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {month.label}
          </h3>
        </div>
      </header>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {month.taxes.map((tax) => (
          <TaxCard
            key={tax.id}
            tax={tax}
            isActive={isActive}
            onAddPayment={onAddPayment}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        ))}

        {month.taxes.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No taxes recorded for this month yet.
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  )
}

export const MonthSection = memo(MonthSectionComponent)
