"use client"

import { DateRangePicker } from "@/components/forms/date-range-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { isActiveFilterEntry, isFiltered } from "@/hooks/use-transaction-filters"
import { TransactionFilters } from "@/models/transactions"
import { Category, Project } from "@/prisma/client"
import { format } from "date-fns"
import { SlidersHorizontal, X } from "lucide-react"
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react"

const countActiveFilters = (filters: TransactionFilters) =>
  Object.entries(filters).filter(([key, value]) => key !== "ordering" && isActiveFilterEntry(key, value)).length

export function MobileFiltersSheet({
  categories,
  projects,
  total,
  filters,
  setFilters,
}: {
  categories: Category[]
  projects: Project[]
  total: number
  filters: TransactionFilters
  setFilters: Dispatch<SetStateAction<TransactionFilters>>
}) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState(filters.search || "")

  useEffect(() => {
    setSearchQuery(filters.search || "")
  }, [filters.search])

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters])

  const handleFilterChange = (name: keyof TransactionFilters, value: string | undefined) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const applySearchFilter = () => {
    handleFilterChange("search", searchQuery)
    setOpen(false)
  }

  const clearSearchFilter = () => {
    setSearchQuery("")
    handleFilterChange("search", "")
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </Button>
        <span className="text-xs text-muted-foreground">
          {activeFilterCount > 0 ? `${activeFilterCount} active filters` : `${total} transactions`}
        </span>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl px-4 pb-8 pt-8">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>Refine transactions and export using the current query.</SheetDescription>
          </SheetHeader>

          <div className="mt-6 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  value={searchQuery}
                  placeholder="Search transactions..."
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      applySearchFilter()
                    }
                  }}
                  className="pr-10"
                />
                {searchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={clearSearchFilter}
                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    title="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Button type="button" variant="outline" onClick={applySearchFilter}>
                Apply
              </Button>
            </div>

            <Select
              value={filters.categoryCode || "-"}
              onValueChange={(value) => handleFilterChange("categoryCode", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-">All categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.code} value={category.code}>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: category.color }} />
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {projects.length > 1 && (
              <Select
                value={filters.projectCode || "-"}
                onValueChange={(value) => handleFilterChange("projectCode", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">All projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.code} value={project.code}>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: project.color }} />
                        {project.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div>
              <DateRangePicker
                defaultDate={{
                  from: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
                  to: filters.dateTo ? new Date(filters.dateTo) : undefined,
                }}
                onChange={(date) => {
                  handleFilterChange("dateFrom", date?.from ? format(date.from, "yyyy-MM-dd") : undefined)
                  handleFilterChange("dateTo", date?.to ? format(date.to, "yyyy-MM-dd") : undefined)
                }}
              />
            </div>

            {isFiltered(filters) && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setFilters({})
                  setSearchQuery("")
                }}
                className="justify-start text-muted-foreground"
              >
                <X className="h-4 w-4" />
                Clear all filters
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
