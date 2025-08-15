"use client"

import { useState } from "react"
import { TaxForm } from "./tax-form"
import { createTaxAction } from "../actions"
import { toast } from "sonner"
import { TaxFormData } from "@/forms/taxes"

interface TaxFormWrapperProps {
  onSuccess?: () => void
  currencies: { code: string; name: string }[]
  defaultCurrency?: string
}

export function TaxFormWrapper({ onSuccess, currencies, defaultCurrency }: TaxFormWrapperProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (data: TaxFormData) => {
    setIsLoading(true)
    try {
      const formData = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value instanceof Date ? value.toISOString() : String(value))
        }
      })
      
      await createTaxAction(formData)
      toast.success("Tax added successfully")
      
      // Call onSuccess to close the modal
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error("Failed to create tax:", error)
      toast.error("Failed to add tax")
    } finally {
      setIsLoading(false)
    }
  }

  return <TaxForm onSubmit={handleSubmit} isLoading={isLoading} currencies={currencies} defaultCurrency={defaultCurrency} />
}