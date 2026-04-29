"use client"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Download, Plus, Search, SlidersHorizontal } from "lucide-react"
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
      <header className="sticky top-0 z-30 border-b bg-background">
        <div className="flex items-center justify-between py-3">
          <Skeleton className="h-9 w-9 bg-slate-200" />
          <span className="text-lg font-bold">Transactions</span>
          <Skeleton className="h-9 w-9 bg-primary/15" />
        </div>
      </header>
      <main className="py-4">
        <div className="flex flex-col gap-4 pb-[88px]">
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-white p-3 shadow-sm">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border bg-slate-50 px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <Skeleton className="h-4 w-32 bg-slate-200" />
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-white">
              <SlidersHorizontal className="h-4 w-4 text-slate-400" />
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
            {[...Array(3)].map((_, sectionIndex) => (
              <div key={sectionIndex} className="border-b last:border-b-0">
                <div className="flex items-center justify-between border-b bg-slate-50/80 px-3 py-2">
                  <Skeleton className="h-4 w-24 bg-slate-200" />
                  <Skeleton className="h-4 w-20 bg-slate-200" />
                </div>
                {[...Array(3)].map((__, rowIndex) => (
                  <div
                    key={rowIndex}
                    className="flex items-start justify-between gap-4 border-b px-3 py-3 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-2 w-2 rounded-full bg-rose-200" />
                        <Skeleton className="h-4 w-3/4 bg-slate-200" />
                      </div>
                      <Skeleton className="mt-2 h-3 w-2/3 bg-slate-100" />
                    </div>
                    <Skeleton className="h-4 w-16 bg-slate-200" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t bg-background px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2">
        <div className="grid grid-cols-4 gap-1">
          {[...Array(4)].map((_, index) => (
            <Skeleton key={index} className="h-12 bg-slate-200" />
          ))}
        </div>
      </div>
    </div>
  )
}

function DesktopLoading() {
  return (
    <div>
      <header className="mb-8 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex flex-row gap-3 md:gap-5">
          <span className="text-3xl font-bold tracking-tight">Transactions</span>
          <span className="flex items-center rounded-full border bg-white px-3 py-1 text-sm font-medium text-slate-500 shadow-sm">
            <Skeleton className="h-4 w-28 bg-slate-200" />
          </span>
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" disabled className="disabled:opacity-100">
            <Download />
            <span className="hidden md:block">Export</span>
          </Button>
          <Button disabled className="disabled:opacity-100">
            <Plus />
            <span className="hidden md:block">Add Transaction</span>
          </Button>
        </div>
      </header>

      <div className="mb-4 rounded-xl border bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-[260px] flex-1 items-center gap-2 rounded-md border bg-slate-50 px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <Skeleton className="h-4 w-44 bg-slate-200" />
          </div>
          <div className="flex items-center gap-2">
            <FilterPill />
            <FilterPill />
            <FilterPill className="hidden lg:block" />
            <FilterPill className="hidden xl:block" />
          </div>
        </div>
      </div>

      <main>
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="grid grid-cols-[minmax(220px,1.4fr)_repeat(5,minmax(110px,1fr))] gap-4 border-b bg-slate-50/80 px-4 py-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-4 bg-slate-200" />
            ))}
          </div>
          <div className="divide-y">
            {Array.from({ length: 12 }).map((_, rowIndex) => (
              <div
                key={rowIndex}
                className="grid grid-cols-[minmax(220px,1.4fr)_repeat(5,minmax(110px,1fr))] items-center gap-4 px-4 py-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Skeleton className="h-2.5 w-2.5 rounded-full bg-rose-200" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4 bg-slate-200" />
                    <Skeleton className="h-3 w-1/2 bg-slate-100" />
                  </div>
                </div>
                <Skeleton className="h-4 bg-slate-100" />
                <Skeleton className="h-4 bg-slate-100" />
                <Skeleton className="h-4 bg-slate-100" />
                <Skeleton className="h-4 bg-slate-100" />
                <Skeleton className="h-5 w-24 justify-self-end rounded-full bg-emerald-100" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

function FilterPill({ className }: { className?: string }) {
  return <Skeleton className={`h-9 w-28 bg-slate-200 ${className ?? ""}`} />
}
