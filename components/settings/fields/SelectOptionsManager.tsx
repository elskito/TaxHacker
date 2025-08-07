"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, X } from "lucide-react"

interface SelectOptionsManagerProps {
  options: string[]
  onChange: (options: string[]) => void
  label: string
  isRequired?: boolean
}

export function SelectOptionsManager({ options, onChange, label, isRequired = false }: SelectOptionsManagerProps) {
  const [newOption, setNewOption] = useState("")

  const addOption = () => {
    const trimmed = newOption.trim()
    if (trimmed && !options.includes(trimmed)) {
      onChange([...options, trimmed])
      setNewOption("")
    }
  }

  const removeOption = (index: number) => {
    onChange(options.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addOption()
    }
  }

  return (
    <div className="grid grid-cols-4 items-start gap-4">
      <Label className="text-right mt-2">
        {label}
        {isRequired && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <div className="col-span-3 space-y-3">
        {/* Add new option input */}
        <div className="flex gap-2" role="group" aria-label="Add new option">
          <Input
            placeholder="Enter option value"
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
            aria-describedby="option-help"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addOption}
            disabled={!newOption.trim() || options.includes(newOption.trim())}
            aria-label="Add option"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div id="option-help" className="text-sm text-muted-foreground sr-only">
          Press Enter or click the plus button to add a new option
        </div>

        {/* Options list */}
        {options.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              Options ({options.length}):
            </div>
            <div 
              className="space-y-2 max-h-32 overflow-y-auto" 
              role="list" 
              aria-label="Current options"
            >
              {options.map((option, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-2 border rounded-md bg-muted/30"
                  role="listitem"
                >
                  <span className="text-sm" aria-label={`Option ${index + 1}: ${option}`}>
                    {option}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOption(index)}
                    className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    aria-label={`Remove option: ${option}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {options.length === 0 && (
          <div className={`text-sm p-2 border border-dashed rounded-md text-center ${
            isRequired ? 'text-red-600 border-red-300 bg-red-50' : 'text-muted-foreground'
          }`}>
            {isRequired ? (
              <span className="font-medium">⚠️ Required: </span>
            ) : null}
            No options added yet. Enter an option above and click the + button.
          </div>
        )}
      </div>
    </div>
  )
}