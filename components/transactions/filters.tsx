"use client"

import { DateRangePicker } from "@/components/forms/date-range-picker"
import { ColumnSelector } from "@/components/transactions/fields-selector"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { isFiltered, useTransactionFilters } from "@/hooks/use-transaction-filters"
import { TransactionFilters } from "@/models/transactions"
import { Category, Field, Project } from "@/prisma/client"
import { X } from "lucide-react"
import { useEffect, useState } from "react"

export function TransactionSearchAndFilters({
  categories,
  projects,
  fields,
}: {
  categories: Category[]
  projects: Project[]
  fields: Field[]
}) {
  const [filters, setFilters] = useTransactionFilters()
  const [searchValue, setSearchValue] = useState(filters.search ?? "")

  const handleFilterChange = <K extends keyof TransactionFilters>(name: K, value: TransactionFilters[K]) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  useEffect(() => {
    setSearchValue(filters.search ?? "")
  }, [filters.search])

  const clearSearch = () => {
    setSearchValue("")
    handleFilterChange("search", "")
  }

  return (
    <div className="mb-4 flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <div className="relative min-w-[200px] flex-1">
          <Input
            placeholder="Search transactions..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleFilterChange("search", searchValue)
              }
            }}
            className="w-full pr-10"
          />
          {searchValue && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={clearSearch}
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Select value={filters.categoryCode} onValueChange={(value) => handleFilterChange("categoryCode", value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="-">All categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.code} value={category.code}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color }} />
                  {category.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {projects.length > 1 && (
          <Select value={filters.projectCode} onValueChange={(value) => handleFilterChange("projectCode", value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="-">All projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.code} value={project.code}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />
                    {project.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <DateRangePicker
          defaultDate={{
            from: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
            to: filters.dateTo ? new Date(filters.dateTo) : undefined,
          }}
          onChange={(date) => {
            handleFilterChange("dateFrom", date ? date.from : undefined)
            handleFilterChange("dateTo", date ? date.to : undefined)
          }}
        />

        {isFiltered(filters) && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setFilters({})
            }}
            className="text-muted-foreground hover:text-foreground"
            title="Clear all filters"
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        <ColumnSelector fields={fields} />
      </div>
    </div>
  )
}
