"use server"

import { revalidatePath } from "next/cache"
import { addTaxPaymentSchema, TaxFormData } from "@/forms/taxes"
import { createTax, updateTax, deleteTax, addTaxPayment } from "@/models/taxes"
import { getCurrentUser } from "@/lib/auth"
import { randomUUID } from "crypto"
import { mkdir, writeFile } from "fs/promises"
import path from "path"
import { getUserUploadsDirectory, safePathJoin, getDirectorySize } from "@/lib/files"
import { createFile } from "@/models/files"
import { updateUser } from "@/models/users"

export async function createTaxAction(data: TaxFormData) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("User not authenticated")
  }

  try {
    await createTax(data)
    revalidatePath("/apps/taxes")
    return { success: true }
  } catch (error) {
    console.error("Failed to create tax:", error)
    throw new Error("Failed to create tax")
  }
}

export async function updateTaxAction(id: string, data: TaxFormData) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("User not authenticated")
  }

  const taxData = { id, ...data }

  try {
    await updateTax(taxData)
    revalidatePath("/apps/taxes")
    return { success: true }
  } catch (error) {
    console.error("Failed to update tax:", error)
    throw new Error("Failed to update tax")
  }
}

export async function deleteTaxAction(id: string) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("User not authenticated")
  }

  try {
    await deleteTax(id)
    revalidatePath("/apps/taxes")
    return { success: true }
  } catch (error) {
    console.error("Failed to delete tax:", error)
    throw new Error("Failed to delete tax")
  }
}


export async function addTaxPaymentAction(taxId: string, formData: FormData, fileUuid?: string) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("User not authenticated")
  }

  const rawData = {
    amount: formData.get("amount"),
    paidAt: formData.get("paidAt"),
    note: formData.get("note") || undefined,
  }

  const validatedData = addTaxPaymentSchema.parse(rawData)

  // Handle proof of payment file upload if provided
  let proofOfPaymentFileId: string | undefined = undefined
  const file = formData.get("proofOfPaymentFile") as File | null
  
  
  if (file && file.size > 0) {
    try {
      const userUploadsDirectory = getUserUploadsDirectory(user)
      
      // Use provided UUID or generate new one
      const finalFileUuid = fileUuid || randomUUID()
      const fileExtension = path.extname(file.name)
      const storedFileName = `${finalFileUuid}${fileExtension}`
      
      // Create path structure: tax-payments/YYYY/MM/filename
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, "0")
      const relativeFilePath = path.join("tax-payments", String(year), month, storedFileName)
      
      // Save file to filesystem
      const fullFilePath = safePathJoin(userUploadsDirectory, relativeFilePath)
      await mkdir(path.dirname(fullFilePath), { recursive: true })
      
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      await writeFile(fullFilePath, buffer)
      
      // Create file record in database
      const fileRecord = await createFile(user.id, {
        id: finalFileUuid,
        filename: file.name,
        path: relativeFilePath,
        mimetype: file.type,
        isReviewed: true,
        metadata: {
          size: file.size,
          lastModified: file.lastModified,
        },
      })
      
      proofOfPaymentFileId = fileRecord.id
    } catch (error) {
      console.error("Failed to upload proof of payment file:", error)
      throw new Error("Failed to upload proof of payment file")
    }
  }


  try {
    const payment = await addTaxPayment({
      taxId,
      amount: validatedData.amount,
      paidAt: validatedData.paidAt,
      note: validatedData.note,
      proofOfPaymentFile: proofOfPaymentFileId,
    })
    
    // Update user storage used
    if (proofOfPaymentFileId) {
      const storageUsed = await getDirectorySize(getUserUploadsDirectory(user))
      await updateUser(user.id, { storageUsed })
    }
    // Don't revalidate path to avoid page reload - optimistic updates handle UI
    return { success: true, payment }
  } catch (error) {
    console.error("Failed to add tax payment:", error)
    throw new Error("Failed to add tax payment")
  }
}

