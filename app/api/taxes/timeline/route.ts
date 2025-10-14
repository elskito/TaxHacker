import { NextResponse, type NextRequest } from "next/server"
import { getTaxTimeline } from "@/models/taxes"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get("cursor") ?? undefined
  const limitParam = searchParams.get("limit")
  const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined

  const timeline = await getTaxTimeline({
    cursor,
    limit: Number.isFinite(limit) ? limit : undefined,
  })

  return NextResponse.json(timeline)
}
