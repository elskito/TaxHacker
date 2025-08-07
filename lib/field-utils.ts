import { Field } from "@/prisma/client"

export function createFieldMap(fields: Field[]): Record<string, Field> {
  return fields.reduce(
    (acc, field) => {
      acc[field.code] = field
      return acc
    },
    {} as Record<string, Field>
  )
}

export function formatDateForInput(date: Date | null): string {
  if (!date) return ""
  try {
    return date.toISOString().split('T')[0]
  } catch {
    return ""
  }
}