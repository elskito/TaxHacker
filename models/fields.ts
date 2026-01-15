import { prisma } from "@/lib/db"
import { codeFromName } from "@/lib/utils"
import { Prisma } from "@/prisma/client"
import { cache } from "react"
import { DEFAULT_FIELDS } from "./defaults"

export type FieldData = {
  [key: string]: unknown
}

const getNextFieldSortOrder = async (userId: string) => {
  const aggregate = await prisma.field.aggregate({
    where: { userId },
    _max: { sortOrder: true },
  })
  return (aggregate._max.sortOrder ?? -1) + 1
}

export const getFields = cache(async (userId: string) => {
  const fields = await prisma.field.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  })

  if (!fields.some((field) => field.code === "invoiceId")) {
    const invoiceIdField = DEFAULT_FIELDS.find((field) => field.code === "invoiceId")
    if (invoiceIdField) {
      try {
        const sortOrder = await getNextFieldSortOrder(userId)
        await prisma.field.create({
          data: { ...invoiceIdField, userId, sortOrder },
        })
      } catch {
        // Ignore (e.g. created concurrently)
      }

      return await prisma.field.findMany({
        where: { userId },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      })
    }
  }

  return fields
})

export const createField = async (userId: string, field: FieldData) => {
  if (!field.code) {
    field.code = codeFromName(field.name as string)
  }
  if (field.sortOrder === undefined) {
    field.sortOrder = await getNextFieldSortOrder(userId)
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

export const reorderFields = async (userId: string, orderedCodes: string[]) => {
  const existing = await prisma.field.findMany({
    where: { userId },
    select: { code: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  })

  const existingCodes = existing.map((f) => f.code)
  const existingSet = new Set(existingCodes)

  const seen = new Set<string>()
  const sanitized = orderedCodes.filter((code) => {
    if (!existingSet.has(code)) return false
    if (seen.has(code)) return false
    seen.add(code)
    return true
  })

  const missing = existingCodes.filter((code) => !seen.has(code))
  const finalOrder = [...sanitized, ...missing]

  if (finalOrder.length === 0) return

  await prisma.$transaction(
    finalOrder.map((code, sortOrder) =>
      prisma.field.update({
        where: { userId_code: { userId, code } },
        data: { sortOrder },
      })
    )
  )
}
