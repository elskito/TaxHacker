"use client"

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AddTaxButtonClient } from "./add-tax-button-client"

interface AddTaxButtonProps {
  currencies: { code: string; name: string }[]
  defaultCurrency?: string
}

export function AddTaxButton({ currencies, defaultCurrency }: AddTaxButtonProps) {
  return (
    <AddTaxButtonClient currencies={currencies} defaultCurrency={defaultCurrency}>
      <Button>
        <Plus className="mr-2 h-4 w-4" />
        Add Tax
      </Button>
    </AddTaxButtonClient>
  )
}
