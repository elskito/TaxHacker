import { prisma } from "@/lib/db"
import { codeFromName } from "@/lib/utils"
import { Prisma } from "@/prisma/client"
import { cache } from "react"
import { DEFAULT_FIELDS } from "./defaults"

export type FieldData = {
  [key: string]: unknown
}

export const getFields = cache(async (userId: string) => {
  const fields = await prisma.field.findMany({
    where: { userId },
    orderBy: {
      createdAt: "asc",
    },
  })

  if (!fields.some((field) => field.code === "invoiceId")) {
    const invoiceIdField = DEFAULT_FIELDS.find((field) => field.code === "invoiceId")
    if (invoiceIdField) {
      try {
        await prisma.field.create({
          data: { ...invoiceIdField, userId },
        })
      } catch {
        // Ignore (e.g. created concurrently)
      }

      return await prisma.field.findMany({
        where: { userId },
        orderBy: {
          createdAt: "asc",
        },
      })
    }
  }

  return fields
})

export const createField = async (userId: string, field: FieldData) => {
  if (!field.code) {
    field.code = codeFromName(field.name as string)
  }
  return await prisma.field.create({
    data: {
      ...field,
      user: {
        connect: {
          id: userId,
        },
      },
    } as Prisma.FieldCreateInput,
  })
}

export const updateField = async (userId: string, code: string, field: FieldData) => {
  return await prisma.field.update({
    where: { userId_code: { code, userId } },
    data: field,
  })
}

export const deleteField = async (userId: string, code: string) => {
  return await prisma.field.delete({
    where: { userId_code: { code, userId } },
  })
}
