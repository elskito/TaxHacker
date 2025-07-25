"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Check, Edit, GripVertical, Trash2 } from "lucide-react"
import { useOptimistic, useState, startTransition, useCallback } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface CrudColumn<T> {
  key: keyof T
  label: string
  type?: "text" | "number" | "checkbox" | "select"
  options?: string[]
  defaultValue?: string | boolean
  editable?: boolean
}

interface DraggableCrudProps<T extends Record<string, unknown> & { code?: string; id?: string; isDeletable?: boolean }> {
  items: T[]
  columns: CrudColumn<T>[]
  onDelete: (id: string) => Promise<{ success: boolean; error?: string }>
  onAdd: (data: Partial<T>) => Promise<{ success: boolean; error?: string }>
  onEdit?: (id: string, data: Partial<T>) => Promise<{ success: boolean; error?: string }>
  onReorder?: (items: T[]) => Promise<{ success: boolean; error?: string }>
  onResetOrder?: () => Promise<{ success: boolean; error?: string }>
}

function SortableRow<T extends Record<string, unknown> & { code?: string; id?: string; isDeletable?: boolean }>({
  item,
  columns,
  editingId,
  editingItem,
  setEditingItem,
  onEdit,
  onDelete,
  startEditing,
  setEditingId,
}: {
  item: T
  columns: CrudColumn<T>[]
  editingId: string | null
  editingItem: Partial<T>
  setEditingItem: (item: Partial<T>) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  startEditing: (item: T) => void
  setEditingId: (id: string | null) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: (item.code || item.id) as string })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
  }

  const FormCell = useCallback((item: T, column: CrudColumn<T>) => {
    if (column.type === "checkbox") {
      return item[column.key] ? <Check /> : ""
    }
    return String(item[column.key] || "")
  }, [])

  const EditFormCell = useCallback((item: T, column: CrudColumn<T>) => {
    if (column.type === "checkbox") {
      return (
        <input
          type="checkbox"
          checked={Boolean(editingItem[column.key])}
          onChange={(e) =>
            setEditingItem({
              ...editingItem,
              [column.key]: e.target.checked as T[keyof T],
            })
          }
        />
      )
    } else if (column.type === "select") {
      return (
        <select
          value={String(editingItem[column.key] || "")}
          className="p-2 rounded-md border bg-transparent"
          onChange={(e) =>
            setEditingItem({
              ...editingItem,
              [column.key]: e.target.value as T[keyof T],
            })
          }
        >
          {column.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )
    }

    return (
      <Input
        type="text"
        value={String(editingItem[column.key] || "")}
        onChange={(e) =>
          setEditingItem({
            ...editingItem,
            [column.key]: e.target.value as T[keyof T],
          })
        }
      />
    )
  }, [editingItem, setEditingItem])

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? "z-10" : ""}>
      <TableCell
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing w-8"
      >
        <GripVertical className="h-4 w-4 text-gray-400" />
      </TableCell>
      {columns.map((column) => (
        <TableCell key={String(column.key)} className="first:font-semibold">
          {editingId === (item.code || item.id) && column.editable
            ? EditFormCell(item, column)
            : FormCell(item, column)}
        </TableCell>
      ))}
      <TableCell>
        <div className="flex gap-2">
          {editingId === (item.code || item.id) ? (
            <>
              <Button size="sm" onClick={() => onEdit(item.code || item.id || "")}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              {onEdit && typeof onEdit === "function" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    startEditing(item)
                  }}
                >
                  <Edit />
                </Button>
              )}
              {item.isDeletable && (
                <Button variant="ghost" size="icon" onClick={() => onDelete(item.code || item.id || "")}>
                  <Trash2 />
                </Button>
              )}
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

export function DraggableCrudTable<T extends Record<string, unknown> & { code?: string; id?: string; isDeletable?: boolean }>({
  items,
  columns,
  onDelete,
  onAdd,
  onEdit,
  onReorder,
  onResetOrder,
}: DraggableCrudProps<T>) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newItem, setNewItem] = useState<Partial<T>>(itemDefaults(columns))
  const [editingItem, setEditingItem] = useState<Partial<T>>(itemDefaults(columns))
  const [optimisticItems, setOptimisticItems] = useOptimistic(
    items, 
    useCallback((state: T[], action: { type: 'reorder'; items: T[] } | { type: 'add'; item: T }) => {
      if (action.type === 'reorder') {
        return action.items
      }
      return [...state, action.item]
    }, [])
  )

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const AddFormCell = useCallback((column: CrudColumn<T>) => {
    if (column.type === "checkbox") {
      return (
        <input
          type="checkbox"
          checked={Boolean(newItem[column.key] || column.defaultValue)}
          onChange={(e) =>
            setNewItem({
              ...newItem,
              [column.key]: e.target.checked as T[keyof T],
            })
          }
        />
      )
    } else if (column.type === "select") {
      return (
        <select
          value={String(newItem[column.key] || column.defaultValue || "")}
          className="p-2 rounded-md border bg-transparent"
          onChange={(e) =>
            setNewItem({
              ...newItem,
              [column.key]: e.target.value as T[keyof T],
            })
          }
        >
          {column.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )
    }
    return (
      <Input
        type={column.type || "text"}
        value={String(newItem[column.key] || column.defaultValue || "")}
        onChange={(e) =>
          setNewItem({
            ...newItem,
            [column.key]: e.target.value as T[keyof T],
          })
        }
      />
    )
  }, [newItem, setNewItem])

  const handleAdd = useCallback(async () => {
    try {
      const result = await onAdd(newItem)
      if (result.success) {
        setIsAdding(false)
        setNewItem(itemDefaults(columns))
      } else {
        alert(result.error)
      }
    } catch (error) {
      console.error("Failed to add item:", error)
    }
  }, [onAdd, newItem, columns])

  const handleEdit = useCallback(async (id: string) => {
    if (!onEdit) return
    try {
      const result = await onEdit(id, editingItem)
      if (result.success) {
        setEditingId(null)
        setEditingItem({})
      } else {
        alert(result.error)
      }
    } catch (error) {
      console.error("Failed to edit item:", error)
    }
  }, [onEdit, editingItem])

  const startEditing = useCallback((item: T) => {
    setEditingId(item.code || item.id || "")
    setEditingItem(item)
    setIsAdding(false)
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    try {
      const result = await onDelete(id)
      if (!result.success) {
        alert(result.error)
      }
    } catch (error) {
      console.error("Failed to delete item:", error)
    }
  }, [onDelete])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = optimisticItems.findIndex((item) => (item.code || item.id) === active.id)
      const newIndex = optimisticItems.findIndex((item) => (item.code || item.id) === over?.id)

      const reorderedItems = arrayMove(optimisticItems, oldIndex, newIndex)
      
      // Optimistically update the UI immediately
      startTransition(() => {
        setOptimisticItems({ type: 'reorder', items: reorderedItems })
      })
      
      if (onReorder) {
        try {
          const result = await onReorder(reorderedItems)
          if (!result.success) {
            alert(result.error)
            // Revert on error - the useOptimistic will automatically revert to original items
          }
        } catch (error) {
          console.error("Failed to reorder items:", error)
          // Revert on error - the useOptimistic will automatically revert to original items
        }
      }
    }
  }, [optimisticItems, onReorder, setOptimisticItems])

  const handleResetOrder = useCallback(async () => {
    if (onResetOrder) {
      try {
        const result = await onResetOrder()
        if (!result.success) {
          alert(result.error)
        }
      } catch (error) {
        console.error("Failed to reset order:", error)
      }
    }
  }, [onResetOrder])

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              {columns.map((column) => (
                <TableHead key={String(column.key)}>{column.label}</TableHead>
              ))}
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <SortableContext items={optimisticItems.map((item) => (item.code || item.id) as string)} strategy={verticalListSortingStrategy}>
              {optimisticItems.map((item) => (
                <SortableRow
                  key={item.code || item.id || "unknown"}
                  item={item}
                  columns={columns}
                  editingId={editingId}
                  editingItem={editingItem}
                  setEditingItem={setEditingItem}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  startEditing={startEditing}
                  setEditingId={setEditingId}
                />
              ))}
            </SortableContext>
            {isAdding && (
              <TableRow>
                <TableCell></TableCell>
                {columns.map((column) => (
                  <TableCell key={String(column.key)} className="first:font-semibold">
                    {column.editable && AddFormCell(column)}
                  </TableCell>
                ))}
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAdd}>
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIsAdding(false)}>
                      Cancel
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DndContext>
      {!isAdding && (
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setIsAdding(true)
              setEditingId(null)
            }}
          >
            Add New
          </Button>
          {onResetOrder && (
            <Button variant="outline" onClick={handleResetOrder}>
              Reset to Default Order
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function itemDefaults<T>(columns: CrudColumn<T>[]) {
  return columns.reduce((acc, column) => {
    acc[column.key] = column.defaultValue as T[keyof T]
    return acc
  }, {} as Partial<T>)
}