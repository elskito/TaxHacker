import { resizeImage } from "@/lib/previews/images"
import { pdfToImages } from "@/lib/previews/pdf"
import { User } from "@/prisma/client"

export type PreviewVariant = "thumb" | "full"

export type GenerateFilePreviewsOptions = {
  variant?: PreviewVariant
  page?: number
}

export async function generateFilePreviews(
  user: User,
  filePath: string,
  mimetype: string,
  options: GenerateFilePreviewsOptions = {}
): Promise<{ contentType: string; previews: string[] }> {
  const variant: PreviewVariant = options.variant ?? "thumb"

  if (mimetype === "application/pdf") {
    const { contentType, pages } = await pdfToImages(user, filePath, { variant, page: options.page })
    return { contentType, previews: pages }
  } else if (mimetype.startsWith("image/")) {
    const { contentType, resizedPath } = await resizeImage(user, filePath, { variant })
    return { contentType, previews: [resizedPath] }
  } else {
    return { contentType: mimetype, previews: [filePath] }
  }
}

export async function prewarmFilePreview(user: User, filePath: string, mimetype: string) {
  try {
    await generateFilePreviews(user, filePath, mimetype, { variant: "thumb", page: 1 })
  } catch (error) {
    console.warn("Failed to generate preview:", error)
  }
}
