import { z } from "zod"

export const taxFormSchema = z.object({
  type: z.string().min(1, "Tax type is required").max(64),
  amount: z
    .union([
      z.number(),
      z.string()
        .min(1, "Amount is required")
        .refine((val) => !isNaN(parseFloat(val)), "Amount must be a valid number")
        .transform((val) => parseFloat(val))
    ])
    .refine((num) => num > 0, "Amount must be a positive number")
    .transform((num) => Math.round(num * 100)), // convert to cents
  currencyCode: z.string()
    .min(3, "Currency code is required")
    .max(5)
    .regex(/^[A-Z]{3}$/, "Currency code must be 3 uppercase letters (e.g., USD, EUR)"),
  dueDate: z
    .union([
      z.date(),
      z
        .string()
        .min(1, "Due date is required")
        .refine((val) => !isNaN(Date.parse(val)), {
          message: "Invalid date format",
        })
        .transform((val) => new Date(val)),
    ])
    .refine((date) => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return date >= today
    }, "Due date must be today or in the future"),
  bankAccountNumber: z.string().max(64).optional().nullable().transform(val => val || undefined),
  notes: z.string().max(500).optional().nullable().transform(val => val || undefined),
})

export const markTaxPaidSchema = z.object({
  paidAt: z
    .union([
      z.date(),
      z
        .string()
        .refine((val) => !isNaN(Date.parse(val)), {
          message: "Invalid date format",
        })
        .transform((val) => new Date(val)),
    ])
    .default(() => new Date()),
  notes: z.string().max(500).optional(),
})

export const addTaxPaymentSchema = z.object({
  amount: z
    .string()
    .min(1, "Amount is required")
    .transform((val) => {
      const num = parseFloat(val)
      if (isNaN(num) || num <= 0) {
        throw new z.ZodError([{ message: "Amount must be a positive number", path: ["amount"], code: z.ZodIssueCode.custom }])
      }
      return Math.round(num * 100) // convert to cents
    }),
  paidAt: z
    .union([
      z.date(),
      z
        .string()
        .refine((val) => !isNaN(Date.parse(val)), {
          message: "Invalid date format",
        })
        .transform((val) => new Date(val)),
    ]),
  note: z.string().max(500).optional().nullable().transform(val => val || undefined),
  proofOfPaymentFile: z.string().optional().nullable().transform(val => val || undefined),
})

export type TaxFormData = z.infer<typeof taxFormSchema>
export type MarkTaxPaidData = z.infer<typeof markTaxPaidSchema>
export type AddTaxPaymentData = z.infer<typeof addTaxPaymentSchema>