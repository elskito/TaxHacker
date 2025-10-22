"use client"

import {
  MouseEvent,
  ReactElement,
  ReactNode,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useState,
} from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { MobileFullscreenDialog } from "@/components/ui/mobile-fullscreen-dialog"
import { useIsMobile } from "@/hooks/use-mobile"
import TransactionCreateForm from "./create"
import { Category, Currency, Project } from "@/prisma/client"

interface NewTransactionDialogProps {
  children: ReactNode
  categories: Category[]
  currencies: Currency[]
  settings: Record<string, string>
  projects: Project[]
}

export function NewTransactionDialogClient({
  children,
  categories,
  currencies,
  settings,
  projects,
}: NewTransactionDialogProps) {
  const isMobile = useIsMobile()
  const [isMobileDialogOpen, setIsMobileDialogOpen] = useState(false)
  const [isDesktopOpen, setIsDesktopOpen] = useState(false)

  const resolveMobileViewport = useCallback(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches,
    []
  )

  const shouldRenderMobile = isMobile || isMobileDialogOpen
  const isFullscreenOpen = shouldRenderMobile && isMobileDialogOpen
  const dialogOpen = shouldRenderMobile ? isMobileDialogOpen : isDesktopOpen

  useEffect(() => {
    if (shouldRenderMobile && isDesktopOpen) {
      setIsDesktopOpen(false)
    }
  }, [isDesktopOpen, shouldRenderMobile])

  const openDialog = useCallback(() => {
    if (shouldRenderMobile || resolveMobileViewport()) {
      setIsMobileDialogOpen(true)
    } else {
      setIsDesktopOpen(true)
    }
  }, [resolveMobileViewport, shouldRenderMobile])

  const closeDialog = useCallback(() => {
    if (shouldRenderMobile || resolveMobileViewport()) {
      setIsMobileDialogOpen(false)
    } else {
      setIsDesktopOpen(false)
    }
  }, [resolveMobileViewport, shouldRenderMobile])

  if (shouldRenderMobile) {
    const trigger = (() => {
      if (isValidElement(children)) {
        const element = children as ReactElement<{ onClick?: (event: MouseEvent) => void }>
        const existingOnClick = element.props.onClick
        const handleClick = (event: MouseEvent) => {
          existingOnClick?.(event)
          if (!event.defaultPrevented) {
            openDialog()
          }
        }
        return cloneElement(element, { onClick: handleClick })
      }

      return (
        <Button type="button" onClick={openDialog}>
          {children}
        </Button>
      )
    })()

    return (
      <>
        {trigger}

        <MobileFullscreenDialog
          open={isFullscreenOpen}
          onClose={closeDialog}
          title="New Transaction"
          footer={null}
        >
          <TransactionCreateForm
            categories={categories}
            currencies={currencies}
            settings={settings}
            projects={projects}
          />
        </MobileFullscreenDialog>
      </>
    )
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setIsDesktopOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">New Transaction</DialogTitle>
          <DialogDescription>Create a new transaction</DialogDescription>
        </DialogHeader>

        <TransactionCreateForm
          categories={categories}
          currencies={currencies}
          settings={settings}
          projects={projects}
        />
      </DialogContent>
    </Dialog>
  )
}
