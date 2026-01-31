"use server"

import { fileExists, getUserPreviewsDirectory, safePathJoin } from "@/lib/files"
import { User } from "@/prisma/client"
import fs from "fs/promises"
import path from "path"
import sharp from "sharp"
import config from "../config"

type ResizeVariant = "thumb" | "full"

type ResizeImageOptions = {
  variant?: ResizeVariant
}

export async function resizeImage(
  user: User,
  origFilePath: string,
  options: ResizeImageOptions = {}
): Promise<{ contentType: string; resizedPath: string }> {
  try {
    const variant: ResizeVariant = options.variant ?? "thumb"
    const maxWidth = variant === "full" ? 4096 : config.upload.images.maxWidth
    const maxHeight = variant === "full" ? 4096 : config.upload.images.maxHeight
    const quality = variant === "full" ? 95 : config.upload.images.quality

    const userPreviewsDirectory = getUserPreviewsDirectory(user)
    await fs.mkdir(userPreviewsDirectory, { recursive: true })

    const basename = path.basename(origFilePath, path.extname(origFilePath))
    const outputPath = safePathJoin(userPreviewsDirectory, `${basename}.w${maxWidth}.h${maxHeight}.q${quality}.webp`)

    if (await fileExists(outputPath)) {
      const metadata = await sharp(outputPath).metadata()
      return {
        contentType: `image/${metadata.format}`,
        resizedPath: outputPath,
      }
    }

    await sharp(origFilePath)
      .rotate()
      .resize(maxWidth, maxHeight, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: quality })
      .toFile(outputPath)

    return {
      contentType: "image/webp",
      resizedPath: outputPath,
    }
  } catch (error) {
    console.error("Error resizing image:", error)
    return {
      contentType: "image/unknown",
      resizedPath: origFilePath,
    }
  }
}
