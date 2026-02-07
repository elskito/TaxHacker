"use client"

import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"
import { PanelLeft } from "lucide-react"

export function MobileSidebarToggle() {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      onClick={toggleSidebar}
      title="Toggle navigation"
    >
      <PanelLeft className="h-5 w-5" />
      <span className="sr-only">Toggle navigation</span>
    </Button>
  )
}
