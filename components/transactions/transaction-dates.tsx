"use client"

import { Transaction, Field } from "@/prisma/client"
import { Card } from "@/components/ui/card"
import { FormInput } from "@/components/forms/simple"
import { createFieldMap, formatDateForInput } from "@/lib/field-utils"

interface TransactionDatesProps {
  transaction: Transaction
  fields: Field[]
}

export default function TransactionDates({ transaction, fields }: TransactionDatesProps) {
  const fieldMap = createFieldMap(fields)

  return (
    <Card className="p-3 bg-white/90 border border-gray-200 shadow-sm min-w-[180px] lg:min-w-[200px]">
      <div className="space-y-3">
        <FormInput
          title={fieldMap.issuedAt?.name || "Issued At"}
          type="date"
          name="issuedAt"
          defaultValue={formatDateForInput(transaction?.issuedAt)}
          isRequired={fieldMap.issuedAt?.isRequired || false}
        />
        
        <FormInput
          title={fieldMap.dueDate?.name || "Due Date"}
          type="date"
          name="dueDate"
          defaultValue={formatDateForInput(transaction?.dueDate)}
          isRequired={fieldMap.dueDate?.isRequired || false}
        />
        
        <FormInput
          title={fieldMap.dateOfSale?.name || "Date of Sale"}
          type="date"
          name="dateOfSale"
          defaultValue={formatDateForInput(transaction?.dateOfSale)}
          isRequired={fieldMap.dateOfSale?.isRequired || false}
        />
      </div>
    </Card>
  )
}