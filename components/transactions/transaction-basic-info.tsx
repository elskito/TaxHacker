"use client"

import { Transaction, Field } from "@/prisma/client"
import { Card } from "@/components/ui/card"
import { FormInput, FormTextarea } from "@/components/forms/simple"
import { createFieldMap } from "@/lib/field-utils"

interface TransactionBasicInfoProps {
  transaction: Transaction
  fields: Field[]
}

export default function TransactionBasicInfo({ transaction, fields }: TransactionBasicInfoProps) {
  const fieldMap = createFieldMap(fields)

  return (
    <Card className="p-3 bg-white/90 border border-gray-200 shadow-sm flex-1">
      <div className="space-y-3">
        <FormInput
          title={fieldMap.name?.name || "Name"}
          name="name"
          defaultValue={transaction?.name || ""}
          isRequired={fieldMap.name?.isRequired || false}
        />
        
        <FormInput
          title={fieldMap.merchant?.name || "Merchant"}
          name="merchant"
          defaultValue={transaction?.merchant || ""}
          isRequired={fieldMap.merchant?.isRequired || false}
        />
        
        <FormTextarea
          title={fieldMap.description?.name || "Description"}
          name="description"
          defaultValue={transaction?.description || ""}
          isRequired={fieldMap.description?.isRequired || false}
          className="resize-none"
        />
      </div>
    </Card>
  )
}