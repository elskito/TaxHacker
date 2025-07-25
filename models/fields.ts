import { prisma } from "@/lib/db"
import { codeFromName } from "@/lib/utils"
import { Prisma } from "@/prisma/client"
import { cache } from "react"

export type FieldData = {
  [key: string]: unknown
}

export const getFields = cache(async (userId: string) => {
  return await prisma.field.findMany({
    where: { userId },
    orderBy: [
      {
        order: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
  })
})

export const createField = async (userId: string, field: FieldData) => {
  if (!field.code) {
    field.code = codeFromName(field.name as string)
  }
  
  // Get the next order position
  const maxOrderField = await prisma.field.findFirst({
    where: { userId },
    orderBy: { order: "desc" },
    select: { order: true },
  })
  
  const nextOrder = (maxOrderField?.order ?? -1) + 1
  
  return await prisma.field.create({
    data: {
      ...field,
      order: nextOrder,
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

export const updateFieldsOrder = async (userId: string, fieldsOrder: { code: string; order: number }[]) => {
  return prisma.$transaction(
    fieldsOrder.map((field) =>
      prisma.field.update({
        where: { userId_code: { code: field.code, userId } },
        data: { order: field.order },
      })
    )
  )
}

export const resetFieldsToDefaultOrder = async (userId: string) => {
  const fields = await prisma.field.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  })

  return prisma.$transaction(
    fields.map((field, index) =>
      prisma.field.update({
        where: { userId_code: { code: field.code, userId } },
        data: { order: index },
      })
    )
  )
}
