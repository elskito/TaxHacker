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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { MobileFullscreenDialog } from "@/components/ui/mobile-fullscreen-dialog"
import { useIsMobile } from "@/hooks/use-mobile"
import { TaxFormWrapper } from "./tax-form-wrapper"

interface AddTaxButtonClientProps {
  currencies: { code: string; name: string }[]
  defaultCurrency?: string
  children: ReactNode
}

export function AddTaxButtonClient({ children, currencies, defaultCurrency }: AddTaxButtonClientProps) {
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

  const closeDialog = useCallback(() => {
    if (shouldRenderMobile || resolveMobileViewport()) {
      setIsMobileDialogOpen(false)
    } else {
      setIsDesktopOpen(false)
    }
  }, [resolveMobileViewport, shouldRenderMobile])

  const openDialog = useCallback(() => {
    if (shouldRenderMobile || resolveMobileViewport()) {
      setIsMobileDialogOpen(true)
    } else {
      setIsDesktopOpen(true)
    }
  }, [resolveMobileViewport, shouldRenderMobile])

  const handleSuccess = () => {
    closeDialog()
  }

  if (shouldRenderMobile) {
    const trigger = (() => {
      if (isValidElement(children)) {
        const element = children as ReactElement<{ onClick?: (event: MouseEvent) => void }>
        const handleClick = (event: MouseEvent) => {
          element.props.onClick?.(event)
          if (!event.defaultPrevented) {
            openDialog()
          }
        }
        return cloneElement(element, { onClick: handleClick })
      }
      return (
        <button type="button" onClick={openDialog}>
          {children}
        </button>
      )
    })()

    return (
      <>
        {trigger}
        <MobileFullscreenDialog
          open={isFullscreenOpen}
          onClose={closeDialog}
          title="Add Tax"
          footer={null}
        >
          <div className="flex flex-col gap-6">
            <TaxFormWrapper
              currencies={currencies}
              defaultCurrency={defaultCurrency}
              onSuccess={handleSuccess}
              submitAlign="end"
            />
          </div>
        </MobileFullscreenDialog>
      </>
    )
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setIsDesktopOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Tax Obligation</DialogTitle>
        </DialogHeader>
        <TaxFormWrapper
          currencies={currencies}
          defaultCurrency={defaultCurrency}
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  )
}
