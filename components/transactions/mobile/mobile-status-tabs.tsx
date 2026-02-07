"use client"

import { PaymentState } from "@/lib/payment-state"
import { cn } from "@/lib/utils"
import { CircleCheckBig, CircleDollarSign, CircleX, Clock3 } from "lucide-react"
import { ComponentType } from "react"

const tabs: Array<{
  code: PaymentState
  label: string
  icon: ComponentType<{ className?: string }>
}> = [
  { code: "all", label: "All", icon: CircleDollarSign },
  { code: "paid", label: "Paid", icon: CircleCheckBig },
  { code: "unpaid", label: "Unpaid", icon: CircleX },
  { code: "overdue", label: "Overdue", icon: Clock3 },
]

export function MobileStatusTabs({
  activeState,
  onChange,
}: {
  activeState: PaymentState
  onChange: (state: PaymentState) => void
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] md:hidden">
      <div className="grid grid-cols-4 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon

          return (
            <button
              key={tab.code}
              type="button"
              onClick={() => onChange(tab.code)}
              className={cn(
                "flex flex-col items-center justify-center rounded-md py-2 text-xs",
                activeState === tab.code ? "bg-accent text-accent-foreground" : "text-muted-foreground"
              )}
            >
              <Icon className="mb-1 h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
