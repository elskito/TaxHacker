"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"

import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { AddPaymentHandler, ClientMonth, ClientTax } from "./types"
import { MonthSection } from "./month-section"

interface MobileTimelineCarouselProps {
  months: ClientMonth[]
  activeMonthId: string | null
  onSelectMonth: (monthId: string) => void
  onRequestMore: () => void
  onAddPayment: AddPaymentHandler
  onDelete: (tax: ClientTax) => void
  onEdit: (tax: ClientTax) => void
}

type MonthRefs = Record<string, HTMLDivElement | null>

export function MobileTimelineCarousel({
  months,
  activeMonthId,
  onSelectMonth,
  onRequestMore,
  onAddPayment,
  onDelete,
  onEdit,
}: MobileTimelineCarouselProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const monthRefs = useRef<MonthRefs>({})
  const observerRef = useRef<IntersectionObserver | null>(null)
  const activeMonthRef = useRef<string | null>(activeMonthId)
  const programmaticScrollRef = useRef(false)
  const activeIndex = useMemo(() => {
    if (!activeMonthId) return 0
    const index = months.findIndex((month) => month.id === activeMonthId)
    return index === -1 ? 0 : index
  }, [activeMonthId, months])

  const setMonthRef = useCallback((monthId: string) => {
    return (node: HTMLDivElement | null) => {
      monthRefs.current[monthId] = node
    }
  }, [])

  useEffect(() => {
    activeMonthRef.current = activeMonthId
  }, [activeMonthId])

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    observerRef.current?.disconnect()

    const observer = new IntersectionObserver(
      (entries) => {
        if (programmaticScrollRef.current) {
          return
        }

        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

        if (!visibleEntry) {
          return
        }

        const monthId = visibleEntry.target.getAttribute("data-month-id")
        if (!monthId || monthId === activeMonthRef.current) {
          return
        }

        onSelectMonth(monthId)
      },
      {
        root: container,
        threshold: 0.55,
      },
    )

    Object.values(monthRefs.current).forEach((node) => {
      if (node) observer.observe(node)
    })

    observerRef.current = observer

    return () => {
      observer.disconnect()
      observerRef.current = null
    }
  }, [months, onSelectMonth])

  const handlePrev = useCallback(() => {
    if (months.length === 0) {
      return
    }

    const targetIndex = Math.max(activeIndex - 1, 0)
    const targetMonth = months[targetIndex]
    if (targetMonth) {
      programmaticScrollRef.current = true
      onSelectMonth(targetMonth.id)
    }
  }, [activeIndex, months, onSelectMonth])

  const handleNext = useCallback(() => {
    if (months.length === 0) {
      return
    }

    const targetIndex = Math.min(activeIndex + 1, months.length - 1)
    const targetMonth = months[targetIndex]

    if (targetMonth) {
      if (targetIndex === activeIndex && targetIndex === months.length - 1) {
        onRequestMore()
      } else {
        programmaticScrollRef.current = true
        onSelectMonth(targetMonth.id)
      }
      return
    }

    onRequestMore()
  }, [activeIndex, months, onRequestMore, onSelectMonth])

  const handleScroll = useCallback(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const nearEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 32
    if (nearEnd) {
      onRequestMore()
    }
  }, [onRequestMore])

  const scrollToMonth = useCallback(
    (monthId: string | null, behavior: ScrollBehavior = "smooth") => {
      const container = containerRef.current
      const target = monthId ? monthRefs.current[monthId] : null

      if (!container || !target) {
        return
      }

      const containerRect = container.getBoundingClientRect()
      const targetRect = target.getBoundingClientRect()
      const targetCenter = targetRect.left - containerRect.left + container.scrollLeft + targetRect.width / 2
      const nextScrollLeft = Math.max(0, targetCenter - container.clientWidth / 2)

      container.scrollTo({ left: nextScrollLeft, behavior })
    },
    [],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const onScroll = () => handleScroll()
    container.addEventListener("scroll", onScroll, { passive: true })

    return () => {
      container.removeEventListener("scroll", onScroll)
    }
  }, [handleScroll])

  useEffect(() => {
    const behavior = programmaticScrollRef.current ? "smooth" : "auto"
    scrollToMonth(activeMonthId, behavior)

    if (!programmaticScrollRef.current) {
      return
    }

    const timeout = window.setTimeout(() => {
      programmaticScrollRef.current = false
    }, 240)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [activeMonthId, scrollToMonth])

  useEffect(() => {
    const container = containerRef.current
    if (!container || typeof ResizeObserver === "undefined") {
      return
    }

    const resizeObserver = new ResizeObserver(() => {
      scrollToMonth(activeMonthRef.current, "auto")
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
    }
  }, [scrollToMonth])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handlePrev}
          disabled={activeIndex === 0}
          aria-label="Go to previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="flex-1 text-center">
          <span className="text-base font-semibold text-foreground">
            {months[activeIndex]?.label ?? ""}
          </span>
          {months[activeIndex]?.isCurrent && (
            <div className="text-xs font-medium text-primary">Current month</div>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleNext}
          disabled={months.length === 0}
          aria-label="Go to next month"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="relative">
        <div
          ref={containerRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4"
        >
          {months.map((month) => (
            <div
              key={month.id}
              ref={setMonthRef(month.id)}
              data-month-id={month.id}
              className="w-full flex-shrink-0 snap-center"
            >
              <MonthSection
                month={month}
                isActive={month.id === activeMonthId}
                onAddPayment={onAddPayment}
                onDelete={onDelete}
                onEdit={onEdit}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-2">
        {months.map((month) => {
          const isActive = month.id === activeMonthId
          return (
            <button
              key={month.id}
              type="button"
              onClick={() => {
                programmaticScrollRef.current = true
                onSelectMonth(month.id)
              }}
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                isActive ? "bg-primary" : "bg-muted",
              )}
              aria-label={`Go to ${month.label}`}
              aria-pressed={isActive}
            />
          )
        })}
      </div>
    </div>
  )
}
