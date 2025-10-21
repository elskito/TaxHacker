import { memo, useMemo } from "react"

import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/currency"

import type { ClientMonth, MonthTotals } from "./types"

interface MonthNavigationProps {
  months: ClientMonth[]
  activeMonthId: string | null
  onSelectMonth: (monthId: string) => void
  monthTotals: MonthTotals
}

const MonthNavigationComponent = ({
  months,
  activeMonthId,
  onSelectMonth,
  monthTotals,
}: MonthNavigationProps) => {
  const totalsByMonth = useMemo(() => monthTotals, [monthTotals])

  if (months.length === 0) {
    return null
  }

  return (
    <aside className="lg:w-[240px] lg:flex-shrink-0 lg:sticky lg:top-4 lg:h-fit lg:self-start">
      <div className="space-y-3">
        {months.map((month) => {
          const isActive = month.id === activeMonthId
          const monthTotals = totalsByMonth[month.id]
          const totalsDisplay = monthTotals
            ? Object.entries(monthTotals)
                .sort(([currencyA], [currencyB]) => currencyA.localeCompare(currencyB))
                .map(([currency, total]) => formatCurrency(total, currency))
                .join(" · ")
            : null

          return (
            <button
              key={month.id}
              data-month-nav={month.id}
              type="button"
              onClick={() => onSelectMonth(month.id)}
              className={cn(
                "w-full rounded-xl border px-4 py-3 text-left transition-all",
                isActive
                  ? "border-primary bg-primary/10 shadow-md"
                  : "border-transparent bg-muted/40 hover:bg-muted",
              )}
            >
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className={cn("font-semibold", isActive ? "text-primary" : "text-muted-foreground")}>
                  {month.label}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {month.isCurrent && <span className="font-medium text-primary">Current month</span>}
                {totalsDisplay && <span className="font-semibold text-foreground">{totalsDisplay}</span>}
                <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {month.taxes.length}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </aside>
  )
}

export const MonthNavigation = memo(MonthNavigationComponent)
