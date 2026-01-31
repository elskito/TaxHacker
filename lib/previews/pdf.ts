"use server"

import { fileExists, getUserPreviewsDirectory, safePathJoin } from "@/lib/files"
import { User } from "@/prisma/client"
import fs from "fs/promises"
import path from "path"
import { fromPath } from "pdf2pic"
import config from "../config"

type PdfPreviewVariant = "thumb" | "full"

type PdfToImagesOptions = {
  variant?: PdfPreviewVariant
  page?: number
}

export async function pdfToImages(
  user: User,
  origFilePath: string,
  options: PdfToImagesOptions = {}
): Promise<{ contentType: string; pages: string[] }> {
  const userPreviewsDirectory = getUserPreviewsDirectory(user)
  await fs.mkdir(userPreviewsDirectory, { recursive: true })

  const variant: PdfPreviewVariant = options.variant ?? "thumb"
  const dpi = variant === "full" ? 250 : config.upload.pdfs.dpi
  const quality = variant === "full" ? 95 : config.upload.pdfs.quality
  const maxWidth = variant === "full" ? 3000 : config.upload.pdfs.maxWidth
  const maxHeight = variant === "full" ? 3000 : config.upload.pdfs.maxHeight
  const requestedPage = options.page

  if (requestedPage !== undefined) {
    if (!Number.isInteger(requestedPage) || requestedPage < 1) {
      return { contentType: "image/webp", pages: [] }
    }

    if (requestedPage > config.upload.pdfs.maxPages) {
      return { contentType: "image/webp", pages: [] }
    }
  }

  const basename = path.basename(origFilePath, path.extname(origFilePath))
  const saveFilename = `${basename}.dpi${dpi}.w${maxWidth}.h${maxHeight}.q${quality}`

  if (requestedPage !== undefined) {
    const convertedFilePath = safePathJoin(
      userPreviewsDirectory,
      `${saveFilename}.${requestedPage}.webp`
    )
    if (await fileExists(convertedFilePath)) {
      return { contentType: "image/webp", pages: [convertedFilePath] }
    }
  }

  // If not — convert the file as store in previews folder
  const pdf2picOptions = {
    density: dpi,
    saveFilename,
    savePath: userPreviewsDirectory,
    format: "webp",
    quality,
    width: maxWidth,
    height: maxHeight,
    preserveAspectRatio: true,
  }

  try {
    const convert = fromPath(origFilePath, pdf2picOptions)

    if (requestedPage !== undefined) {
      try {
        const result = await convert(requestedPage, { responseType: "image" })
        const paths = [result?.path].filter(Boolean) as string[]
        return {
          contentType: "image/webp",
          pages: paths,
        }
      } catch {
        return { contentType: "image/webp", pages: [] }
      }
    }

    // Check if converted pages already exist (for this preview profile)
    const existingPages: string[] = []
    for (let i = 1; i <= config.upload.pdfs.maxPages; i++) {
      const convertedFilePath = safePathJoin(userPreviewsDirectory, `${saveFilename}.${i}.webp`)
      if (await fileExists(convertedFilePath)) {
        existingPages.push(convertedFilePath)
      } else {
        break
      }
    }
    if (existingPages.length > 0) {
      return { contentType: "image/webp", pages: existingPages }
    }

    const convertedPages: string[] = []
    for (let page = 1; page <= config.upload.pdfs.maxPages; page++) {
      try {
        const result = await convert(page, { responseType: "image" })
        if (!result?.path) {
          break
        }
        convertedPages.push(result.path)
      } catch (error) {
        if (convertedPages.length === 0) {
          throw error
        }
        break
      }
    }

    return { contentType: "image/webp", pages: convertedPages }
  } catch (error) {
    console.error("Error converting PDF to image:", error)
    throw error
  }
}
