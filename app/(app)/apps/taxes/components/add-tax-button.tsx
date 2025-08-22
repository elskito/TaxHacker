"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { TaxFormWrapper } from "./tax-form-wrapper"

interface AddTaxButtonProps {
  currencies: { code: string; name: string }[]
  defaultCurrency?: string
}

export function AddTaxButton({ currencies, defaultCurrency }: AddTaxButtonProps) {
  const [open, setOpen] = useState(false)

  const handleSuccess = () => {
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Tax
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Tax Obligation</DialogTitle>
        </DialogHeader>
        <TaxFormWrapper 
          currencies={currencies} 
          defaultCurrency={defaultCurrency}
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  )
}