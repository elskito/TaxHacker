import { Suspense } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getTaxStats, getTaxTimeline } from "@/models/taxes"
import { getCurrencies } from "@/models/currencies"
import { getSettings } from "@/models/settings"
import { getCurrentUser } from "@/lib/auth"
import { AddTaxButton } from "./components/add-tax-button"
import { TaxTimeline } from "./components/tax-timeline"

async function TaxStatsCards() {
  const user = await getCurrentUser()
  if (!user) throw new Error("User not found")
  
  const [stats, settings] = await Promise.all([
    getTaxStats(),
    getSettings(user.id)
  ])

  const formatCurrency = (amount: number) => {
    const defaultCurrency = settings.default_currency || "USD"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: defaultCurrency,
    }).format(amount / 100)
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Taxes</CardTitle>
          <div className="text-2xl font-bold">{stats.totalTaxes}</div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">All tax obligations</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending</CardTitle>
          <div className="text-2xl font-bold text-yellow-600">{stats.pendingTaxes}</div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Awaiting payment</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          <div className="text-2xl font-bold text-red-600">{stats.overdueTaxes}</div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Past due date</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
          <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">All obligations</p>
        </CardContent>
      </Card>
    </div>
  )
}

function StatsLoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-12" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

async function TaxTimelineContainer() {
  const user = await getCurrentUser()
  if (!user) throw new Error("User not found")
  
  const [timeline, currencies, settings] = await Promise.all([
    getTaxTimeline({ limit: 4, userId: user.id }),
    getCurrencies(user.id),
    getSettings(user.id)
  ])

  return (
    <TaxTimeline
      initialMonths={timeline.months}
      initialCursor={timeline.nextCursor}
      currencies={currencies}
      defaultCurrency={settings.default_currency}
    />
  )
}

async function AddTaxButtonContainer() {
  const user = await getCurrentUser()
  if (!user) throw new Error("User not found")
  
  const [currencies, settings] = await Promise.all([
    getCurrencies(user.id),
    getSettings(user.id)
  ])
  
  return <AddTaxButton currencies={currencies} defaultCurrency={settings.default_currency} />
}

function TimelineLoadingSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-6 w-48" />
      <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
        <div className="hidden lg:block space-y-4">
          {[...Array(3)].map((_, index) => (
            <Card key={index} className="p-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-2 h-3 w-16" />
            </Card>
          ))}
        </div>
        <div className="space-y-6">
          {[...Array(3)].map((_, index) => (
            <Card key={index}>
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center justify-between gap-4">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export default async function TaxesPage() {

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tax Management</h1>
          <p className="text-muted-foreground">
            Track and manage your tax obligations with due dates and payment status
          </p>
        </div>
        
        <Suspense fallback={<Button disabled><Plus className="mr-2 h-4 w-4" />Add Tax</Button>}>
          <AddTaxButtonContainer />
        </Suspense>
      </div>

      <Suspense fallback={<StatsLoadingSkeleton />}>
        <TaxStatsCards />
      </Suspense>

      <div>
        <h2 className="text-2xl font-semibold mb-6">Tax Obligations</h2>
        <Suspense fallback={<TimelineLoadingSkeleton />}>
          <TaxTimelineContainer />
        </Suspense>
      </div>
    </div>
  )
}
