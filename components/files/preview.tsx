"use client"

import { formatBytes } from "@/lib/utils"
import { File } from "@/prisma/client"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { format } from "date-fns"

export function FilePreview({ file }: { file: File }) {
  const [isEnlarged, setIsEnlarged] = useState(false)
  const [fullLoaded, setFullLoaded] = useState(false)

  useEffect(() => {
    if (!isEnlarged) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsEnlarged(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isEnlarged])

  useEffect(() => {
    if (isEnlarged) {
      setFullLoaded(false)
    }
  }, [isEnlarged, file.id])

  const fileSize =
    file.metadata && typeof file.metadata === "object" && "size" in file.metadata ? Number(file.metadata.size) : 0

  return (
    <>
      <div className="flex flex-col gap-2 p-4 overflow-hidden">
        <button
          type="button"
          className="relative aspect-[3/4] cursor-zoom-in"
          onClick={() => setIsEnlarged(true)}
          aria-label={`Open preview for ${file.filename}`}
        >
          <Image
            src={`/files/preview/${file.id}`}
            alt={file.filename}
            fill
            loading="lazy"
            sizes="(max-width: 1024px) 100vw, 400px"
            quality={90}
            className="object-contain"
          />
        </button>

        {isEnlarged && (
          <div className="fixed inset-0 z-50">
            <button
              type="button"
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsEnlarged(false)}
              aria-label="Close preview"
            />
            <div className="fixed inset-0 z-50 p-4 md:p-8" onClick={() => setIsEnlarged(false)}>
              <div className="relative h-full w-full cursor-zoom-out" onClick={(e) => e.stopPropagation()}>
                <Image
                  src={`/files/preview/${file.id}`}
                  alt={file.filename}
                  fill
                  sizes="100vw"
                  quality={80}
                  className={`object-contain transition-opacity duration-300 ${
                    fullLoaded ? "opacity-0" : "opacity-100"
                  }`}
                  aria-hidden={fullLoaded}
                  onClick={() => setIsEnlarged(false)}
                />
                <Image
                  src={`/files/preview/${file.id}?variant=full`}
                  alt={file.filename}
                  fill
                  priority
                  sizes="100vw"
                  quality={95}
                  className={`object-contain transition-opacity duration-300 ${
                    fullLoaded ? "opacity-100" : "opacity-0"
                  }`}
                  onLoadingComplete={() => setFullLoaded(true)}
                  onClick={() => setIsEnlarged(false)}
                />
              </div>
            </div>
          </div>
        )}
        <div className="flex flex-col gap-2 mt-2 overflow-hidden">
          <h2 className="text-md underline font-semibold overflow-ellipsis">
            <Link href={`/files/download/${file.id}`}>{file.filename}</Link>
          </h2>
          <p className="text-sm overflow-ellipsis">
            <strong>Type:</strong> {file.mimetype}
          </p>
          <p className="text-sm overflow-ellipsis">
            <strong>Uploaded:</strong> {format(file.createdAt, "MMM d, yyyy")}
          </p>
          <p className="text-sm">
            <strong>Size:</strong> {formatBytes(fileSize)}
          </p>
        </div>
      </div>
    </>
  )
}
