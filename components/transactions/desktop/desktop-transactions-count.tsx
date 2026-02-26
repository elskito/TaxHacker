"use client"

import { useEffect, useState } from "react"

const DESKTOP_COUNT_EVENT = "transactions:desktop-count"

type DesktopCountDetail = {
  loaded: number
  total: number
}

export function DesktopTransactionsCount({
  initialLoaded,
  initialTotal,
}: {
  initialLoaded: number
  initialTotal: number
}) {
  const [count, setCount] = useState<DesktopCountDetail>({
    loaded: initialLoaded,
    total: initialTotal,
  })

  useEffect(() => {
    setCount({ loaded: initialLoaded, total: initialTotal })
  }, [initialLoaded, initialTotal])

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<DesktopCountDetail>
      if (!customEvent.detail) return
      setCount(customEvent.detail)
    }

    window.addEventListener(DESKTOP_COUNT_EVENT, handler as EventListener)
    return () => {
      window.removeEventListener(DESKTOP_COUNT_EVENT, handler as EventListener)
    }
  }, [])

  return (
    <span className="text-3xl tracking-tight opacity-20">
      Showing {count.loaded} of {count.total}
    </span>
  )
}

export { DESKTOP_COUNT_EVENT }
