"use client"

import { Field } from "@/prisma/client"
import { Card } from "@/components/ui/card"
import { FormInput } from "@/components/forms/simple"
import { createFieldMap } from "@/lib/field-utils"

interface UnsortedDatesProps {
  formData: {
    issuedAt: string
    dueDate: string
    dateOfSale: string
  }
  onFormDataChange: (update: Partial<UnsortedDatesProps['formData']>) => void
  fields: Field[]
}

export default function UnsortedDates({ formData, onFormDataChange, fields }: UnsortedDatesProps) {
  const fieldMap = createFieldMap(fields)

  return (
    <Card className="p-3 bg-white/90 border border-gray-200 shadow-sm min-w-[180px] lg:min-w-[200px]">
      <div className="space-y-3">
        <FormInput
          title={fieldMap.issuedAt?.name || "Issued At"}
          type="date"
          name="issuedAt"
          value={formData.issuedAt}
          onChange={(e) => onFormDataChange({ issuedAt: e.target.value })}
          hideIfEmpty={!fieldMap.issuedAt?.isVisibleInAnalysis}
          required={fieldMap.issuedAt?.isRequired || false}
        />
        
        <FormInput
          title="Due Date"
          type="date"
          name="dueDate"
          value={formData.dueDate}
          onChange={(e) => onFormDataChange({ dueDate: e.target.value })}
        />
        
        <FormInput
          title="Date of Sale"
          type="date"
          name="dateOfSale"
          value={formData.dateOfSale}
          onChange={(e) => onFormDataChange({ dateOfSale: e.target.value })}
        />
      </div>
    </Card>
  )
}