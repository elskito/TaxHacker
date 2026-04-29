import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, ArrowRight, FileText, Search, Upload } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <Card className="rounded-xl border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3">
            <Search className="h-4 w-4 text-slate-400" />
            <Skeleton className="h-4 w-20 bg-slate-200" />
            <Skeleton className="h-4 w-4 rounded-full bg-slate-200" />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white">
              <ArrowLeft className="h-4 w-4 text-slate-300" />
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white">
              <ArrowRight className="h-4 w-4 text-slate-300" />
            </div>
          </div>
        </div>
      </Card>

      <div className="flex flex-col flex-wrap items-stretch justify-center gap-4 lg:flex-row">
        <div className="flex w-full flex-1 lg:w-1/2">
          <Card className="flex w-full flex-col overflow-hidden border-violet-200/60 bg-gradient-to-br from-violet-50/80 via-indigo-50/80 to-white">
            <div className="w-full p-5">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20 bg-violet-200/70" />
                  <Skeleton className="h-4 w-44 bg-violet-200/70" />
                </div>
                <Skeleton className="h-9 w-40 bg-emerald-100" />
              </div>

              <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-white/80 bg-white/75 p-4 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <Skeleton className="h-5 w-28 bg-slate-200" />
                    <Skeleton className="h-8 w-8 rounded-full bg-slate-200" />
                  </div>
                  <div className="space-y-3">
                    <Skeleton className="h-10 w-full bg-slate-200" />
                    <Skeleton className="h-10 w-full bg-slate-200" />
                    <Skeleton className="h-10 w-2/3 bg-slate-200" />
                  </div>
                </div>

                <div className="rounded-lg border border-white/80 bg-white/75 p-4 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <Skeleton className="h-5 w-24 bg-slate-200" />
                    <Skeleton className="h-8 w-8 rounded-full bg-slate-200" />
                  </div>
                  <div className="space-y-3">
                    <Skeleton className="h-10 w-full bg-slate-200" />
                    <Skeleton className="h-10 w-full bg-slate-200" />
                    <Skeleton className="h-10 w-3/4 bg-slate-200" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="space-y-2">
                    <Skeleton className="h-3 w-24 bg-slate-200" />
                    <Skeleton className="h-10 w-full bg-white" />
                  </div>
                ))}
              </div>

              <div className="mt-5 space-y-2">
                <Skeleton className="h-3 w-16 bg-slate-200" />
                <Skeleton className="h-24 w-full bg-white" />
              </div>

              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <Skeleton className="h-10 w-28 bg-rose-100" />
                <Skeleton className="h-10 w-32 bg-violet-200/70" />
              </div>
            </div>
          </Card>
        </div>

        <div className="flex w-full flex-col space-y-4 lg:w-1/2 lg:max-w-[400px]">
          <Card className="relative min-h-32 p-4">
            <div className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/80 p-4">
              <Upload className="h-8 w-8 text-slate-300" />
              <Skeleton className="h-4 w-44 bg-slate-200" />
              <Skeleton className="h-3 w-28 bg-slate-200" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-400" />
              <Skeleton className="h-4 w-32 bg-slate-200" />
            </div>
            <Skeleton className="aspect-[4/5] w-full bg-slate-100" />
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card className="p-3">
              <Skeleton className="aspect-square w-full bg-slate-100" />
            </Card>
            <Card className="p-3">
              <Skeleton className="aspect-square w-full bg-slate-100" />
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
