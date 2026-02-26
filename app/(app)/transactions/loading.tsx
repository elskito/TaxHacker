import { TransactionsLoading } from "@/components/transactions/transactions-loading"
import { isMobileUserAgent } from "@/lib/device"
import { headers } from "next/headers"

export default async function Loading() {
  const ua = (await headers()).get("user-agent")
  const initialIsMobile = isMobileUserAgent(ua)

  return <TransactionsLoading initialIsMobile={initialIsMobile} />
}
