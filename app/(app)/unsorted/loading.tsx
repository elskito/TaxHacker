import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Brain, FileText, Save, Settings, Swords, Trash2 } from "lucide-react"

export default function Loading() {
  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex flex-wrap items-center gap-3 text-3xl font-bold tracking-tight">
          <span>You have</span>
          <Skeleton className="h-8 w-16 bg-slate-200" />
          <span>unsorted files</span>
        </h2>

        <div className="flex flex-row flex-wrap justify-end gap-2">
          <div className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-400 shadow-sm">
            <Save className="h-4 w-4" />
            <Skeleton className="h-4 w-14 bg-slate-200" />
          </div>
          <div className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm opacity-70">
            <Swords className="h-4 w-4" />
            <Skeleton className="h-4 w-20 bg-white/40" />
          </div>
        </div>
      </header>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <Settings className="mt-1 h-4 w-4 text-slate-300" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-80 max-w-full bg-slate-200" />
            <Skeleton className="h-3 w-96 max-w-full bg-slate-100" />
          </div>
          <Skeleton className="hidden h-10 w-28 bg-slate-200 sm:block" />
        </div>
      </div>

      <main className="flex flex-col gap-5">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card
            key={index}
            className="flex flex-row flex-wrap items-start justify-center gap-5 rounded-2xl border-violet-200/60 bg-gradient-to-br from-violet-50/80 via-indigo-50/80 to-white p-5 md:flex-nowrap"
          >
            <div className="w-full max-w-[500px]">
              <Card className="overflow-hidden">
                <div className="flex aspect-[4/5] min-h-[360px] flex-col bg-white">
                  <div className="flex items-center justify-between border-b px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-400" />
                      <Skeleton className="h-4 w-32 bg-slate-200" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full bg-slate-100" />
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <Skeleton className="h-5 w-4/5 bg-slate-200" />
                    <Skeleton className="h-4 w-full bg-slate-100" />
                    <Skeleton className="h-4 w-11/12 bg-slate-100" />
                    <Skeleton className="h-4 w-5/6 bg-slate-100" />
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <Skeleton className="h-16 bg-slate-100" />
                      <Skeleton className="h-16 bg-slate-100" />
                    </div>
                    <Skeleton className="mt-auto h-32 w-full bg-slate-100" />
                  </div>
                </div>
              </Card>
            </div>

            <div className="w-full">
              <div className="mb-6 flex h-14 items-center justify-center gap-2 rounded-md bg-primary px-4 text-lg font-medium text-primary-foreground shadow-sm opacity-75">
                <Brain className="h-5 w-5" />
                <Skeleton className="h-5 w-32 bg-white/40" />
              </div>

              <div className="space-y-4">
                <FormFieldSkeleton className="w-40" />
                <FormFieldSkeleton className="w-32" />
                <FormFieldSkeleton className="w-28" />
                <FormFieldSkeleton className="w-36" />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {Array.from({ length: 6 }).map((_, fieldIndex) => (
                    <FormFieldSkeleton key={fieldIndex} />
                  ))}
                </div>

                <div className="space-y-2">
                  <Skeleton className="h-3 w-16 bg-slate-200" />
                  <Skeleton className="h-24 w-full bg-white" />
                </div>

                <div className="flex flex-row justify-end gap-2 pt-2">
                  <div className="flex h-10 items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 text-sm font-medium text-rose-300">
                    <Trash2 className="h-4 w-4" />
                    <Skeleton className="h-4 w-12 bg-rose-100" />
                  </div>
                  <div className="flex h-10 items-center gap-2 rounded-md bg-violet-500/80 px-4 text-sm font-medium text-white shadow-sm">
                    <Save className="h-4 w-4" />
                    <Skeleton className="h-4 w-28 bg-white/40" />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </main>
    </>
  )
}

function FormFieldSkeleton({ className }: { className?: string }) {
  return (
    <div className="space-y-2">
      <Skeleton className={`h-3 bg-slate-200 ${className ?? "w-24"}`} />
      <Skeleton className="h-10 w-full bg-white" />
    </div>
  )
}
