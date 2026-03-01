"use client"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Download, Loader2, Plus } from "lucide-react"
import { useEffect, useState } from "react"

export function TransactionsLoading({ initialIsMobile }: { initialIsMobile: boolean }) {
  const [isMobile, setIsMobile] = useState(initialIsMobile)

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)")
    const apply = () => setIsMobile(mql.matches)
    apply()
    mql.addEventListener("change", apply)
    return () => mql.removeEventListener("change", apply)
  }, [])

  return isMobile ? <MobileLoading /> : <DesktopLoading />
}

function MobileLoading() {
  return (
    <div className="-mt-[60px]">
      <header className="border-b bg-background">
        <div className="flex items-center justify-between px-4 py-3">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-9 w-9" />
        </div>
      </header>
      <main className="py-4">
        <div className="flex flex-col gap-4 pb-[88px]">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-4 w-28" />
          </div>

          <div className="overflow-hidden rounded-md border">
            {[...Array(3)].map((_, sectionIndex) => (
              <div key={sectionIndex} className="border-b last:border-b-0">
                <div className="flex items-center justify-between border-b px-3 py-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
                {[...Array(3)].map((__, rowIndex) => (
                  <div
                    key={rowIndex}
                    className="flex items-start justify-between gap-4 border-b px-3 py-3 last:border-b-0"
                  >
                    <div className="flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="mt-2 h-3 w-2/3" />
                    </div>
                    <Skeleton className="h-3 w-14" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t bg-background px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
        <div className="grid grid-cols-4 gap-1">
          {[...Array(4)].map((_, index) => (
            <Skeleton key={index} className="h-12" />
          ))}
        </div>
      </div>
    </div>
  )
}

function DesktopLoading() {
  return (
    <div>
      <header className="mb-12 flex items-center justify-between">
        <h2 className="flex flex-row gap-3 md:gap-5">
          <span className="text-3xl font-bold tracking-tight">Transactions</span>
          <Loader2 className="h-10 w-10 animate-spin" />
        </h2>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download />
            Export
          </Button>
          <Button>
            <Plus /> Add Transaction
          </Button>
        </div>
      </header>

      <div className="flex w-full flex-row gap-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>

      <main>
        <div className="flex w-full flex-col gap-3">
          {[...Array(15)].map((_, i) => (
            <Skeleton key={i} className="h-8" />
          ))}
        </div>
      </main>
    </div>
  )
}
