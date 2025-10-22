"use client"

import { ReactNode, useEffect } from "react"

interface MobileFullscreenDialogProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  dismissLabel?: string
}

export function MobileFullscreenDialog({
  open,
  onClose,
  title,
  children,
  footer,
  dismissLabel = "Cancel",
}: MobileFullscreenDialogProps) {
  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <button
          type="button"
          className="text-sm font-medium text-muted-foreground"
          onClick={onClose}
        >
          {dismissLabel}
        </button>
        <h2 className="text-base font-semibold">{title}</h2>
        <div className="h-6 w-12" aria-hidden="true" />
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6">{children}</div>

      {footer ? <footer className="border-t px-4 py-3">{footer}</footer> : null}
    </div>
  )
}

