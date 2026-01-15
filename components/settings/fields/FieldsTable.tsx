"use client"

import * as React from "react"
import { CrudTable, FormDialog, FormField, useCrudForm, type TableColumn, type EditableItem } from "@/components/ui/data-table"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { TableCell, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { flexRender, type Row } from "@tanstack/react-table"
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { fieldsFieldConfig, FieldsFormData } from "./fieldConfigs"
import { FieldWithActions } from "./types"
import { SelectOptionsManager } from "./SelectOptionsManager"
import { GripVertical } from "lucide-react"
import { toast } from "sonner"

type FieldWithEditableActions = FieldWithActions & EditableItem

interface FieldsTableProps {
  fields: FieldWithEditableActions[]
  onAdd: (data: Partial<FieldWithEditableActions>) => Promise<{ success: boolean; error?: string }>
  onEdit: (code: string, data: Partial<FieldWithEditableActions>) => Promise<{ success: boolean; error?: string }>
  onDelete: (code: string) => Promise<{ success: boolean; error?: string }>
  onReorder?: (orderedCodes: string[]) => Promise<{ success: boolean; error?: string }>
}

function SortableFieldsRow({
  row,
  item,
  isSelected,
	  onClick,
	  dragDisabled,
	}: {
	  row: Row<FieldWithEditableActions>
	  item: FieldWithEditableActions
	  isSelected: boolean
	  onClick?: () => void
	  dragDisabled: boolean
	}) {
  const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.code,
    disabled: dragDisabled,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
  }

	  return (
	    <TableRow
	      ref={setNodeRef}
	      style={style}
      data-state={isSelected && "selected"}
	      className={onClick ? "cursor-pointer" : ""}
	      onClick={onClick}
	    >
	      {row.getVisibleCells().map((cell) => {
	        if (cell.column.id === "__drag") {
	          return (
	            <TableCell key={cell.id} className="w-8">
	              <button
                type="button"
                ref={setActivatorNodeRef}
                {...attributes}
                {...listeners}
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
                  dragDisabled && "pointer-events-none opacity-50"
                )}
                aria-label="Drag to reorder"
              >
                <GripVertical className="h-4 w-4" />
              </button>
            </TableCell>
          )
        }

        return (
          <TableCell key={cell.id}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        )
      })}
    </TableRow>
  )
}

export function FieldsTable({ fields, onAdd, onEdit, onDelete, onReorder }: FieldsTableProps) {
  const [orderedFields, setOrderedFields] = React.useState<FieldWithEditableActions[]>(fields)
  const [isReordering, setIsReordering] = React.useState(false)
  const [globalFilter, setGlobalFilter] = React.useState("")

  React.useEffect(() => {
    setOrderedFields(fields)
  }, [fields])

  const {
    isAddDialogOpen,
    isEditDialogOpen,
    setIsAddDialogOpen,
    setIsEditDialogOpen,
    formData,
    updateFormData,
    openAddDialog,
    openEditDialog,
    handleAdd,
    handleEdit,
    handleDelete,
  } = useCrudForm<FieldWithEditableActions>({
    defaultFormData: fieldsFieldConfig.defaultFormData(),
    onAdd: onAdd as (data: Partial<FieldWithEditableActions>) => Promise<{ success: boolean; error?: string }>,
    onEdit,
    onDelete,
    successMessages: {
      add: "Field added successfully",
      edit: "Field updated successfully",
      delete: "Field deleted successfully"
    },
    errorMessages: {
      add: "Failed to add field",
      edit: "Failed to update field",
      delete: "Failed to delete field"
    }
  })

  const columns: TableColumn<FieldWithEditableActions>[] = React.useMemo(
    () => [
      { key: "__drag", title: "", sortable: false, width: "32" },
      ...fieldsFieldConfig.getColumns<FieldWithEditableActions>(),
    ],
    []
  )
  const formFields = fieldsFieldConfig.getFormFields(
    formData as FieldsFormData,
    updateFormData
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

	  const dragDisabled = isReordering || globalFilter.trim().length > 0 || !onReorder
	
	  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
	    if (dragDisabled) return
	    if (!onReorder) return
	    if (!over || active.id === over.id) return
	
	    const oldIndex = orderedFields.findIndex((field) => field.code === String(active.id))
	    const newIndex = orderedFields.findIndex((field) => field.code === String(over.id))
	    if (oldIndex === -1 || newIndex === -1) return
	
	    const previous = orderedFields
	    const next = arrayMove(previous, oldIndex, newIndex)
    setOrderedFields(next)

    setIsReordering(true)
    try {
      const result = await onReorder(next.map((field) => field.code))
      if (!result.success) {
        setOrderedFields(previous)
        toast.error(result.error || "Failed to update field order")
      }
    } catch {
      setOrderedFields(previous)
      toast.error("Failed to update field order")
    } finally {
      setIsReordering(false)
    }
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={orderedFields.map((f) => f.code)} strategy={verticalListSortingStrategy}>
          <CrudTable
            data={orderedFields}
            columns={columns}
            onAdd={openAddDialog}
            onEdit={openEditDialog}
            onDelete={handleDelete}
            searchKey="name"
            searchPlaceholder={dragDisabled && globalFilter.trim().length > 0 ? "Clear search to reorder..." : "Search fields..."}
            addButtonText="Add Field"
            pagination={false}
            sortable={false}
            globalFilter={globalFilter}
            onGlobalFilterChange={setGlobalFilter}
            renderRow={({ row, item, isSelected, onClick }) => (
              <SortableFieldsRow
                key={item.id}
	                row={row as Row<FieldWithEditableActions>}
	                item={item}
	                isSelected={isSelected}
	                onClick={onClick}
	                dragDisabled={dragDisabled}
              />
            )}
          />
        </SortableContext>
      </DndContext>
      {/* Add Dialog */}
      <FormDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        title="Add Field"
        description="Add a new custom field for transaction data extraction."
        onSubmit={handleAdd}
        submitText="Add Field"
      >
        {formFields.map((field) => (
          <FormField
            key={field.id}
            id={field.id}
            label={field.label}
            value={field.value}
            onChange={field.onChange}
            type={field.type}
            placeholder={field.placeholder}
          />
        ))}
        
        {/* Type Select */}
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="type" className="text-right">
            Field Type
          </Label>
          <div className="col-span-3">
            <Select
              value={formData.type || "string"}
              onValueChange={(value) => updateFormData({ type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="string">String</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="boolean">Boolean</SelectItem>
                <SelectItem value="select">Select</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Select Options - only show when type is "select" */}
        {formData.type === "select" && (
          <SelectOptionsManager
            options={Array.isArray(formData.options) ? formData.options.filter((opt): opt is string => typeof opt === 'string') : []}
            onChange={(options) => updateFormData({ options })}
            label="Select Options"
            isRequired={formData.isRequired || false}
          />
        )}

        {/* Checkboxes */}
        <div className="grid grid-cols-4 items-center gap-4">
          <Label className="text-right">Options</Label>
          <div className="col-span-3 space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isVisibleInList"
                checked={formData.isVisibleInList || false}
                onCheckedChange={(checked) => updateFormData({ isVisibleInList: checked as boolean })}
              />
              <Label htmlFor="isVisibleInList" className="text-sm font-normal">
                Show in Transaction Table
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isVisibleInAnalysis"
                checked={formData.isVisibleInAnalysis || false}
                onCheckedChange={(checked) => updateFormData({ isVisibleInAnalysis: checked as boolean })}
              />
              <Label htmlFor="isVisibleInAnalysis" className="text-sm font-normal">
                Show in Analysis
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isRequired"
                checked={formData.isRequired || false}
                onCheckedChange={(checked) => updateFormData({ isRequired: checked as boolean })}
              />
              <Label htmlFor="isRequired" className="text-sm font-normal">
                Required Field
              </Label>
            </div>
          </div>
        </div>
      </FormDialog>

      {/* Edit Dialog */}
      <FormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        title="Edit Field"
        description="Modify the field configuration."
        onSubmit={handleEdit}
        submitText="Update Field"
      >
        {formFields.map((field) => (
          <FormField
            key={`edit-${field.id}`}
            id={`edit-${field.id}`}
            label={field.label}
            value={field.value}
            onChange={field.onChange}
            type={field.type}
            placeholder={field.placeholder}
          />
        ))}
        
        {/* Type Select */}
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="edit-type" className="text-right">
            Field Type
          </Label>
          <div className="col-span-3">
            <Select
              value={formData.type || "string"}
              onValueChange={(value) => updateFormData({ type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="string">String</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="boolean">Boolean</SelectItem>
                <SelectItem value="select">Select</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Select Options - only show when type is "select" */}
        {formData.type === "select" && (
          <SelectOptionsManager
            options={Array.isArray(formData.options) ? formData.options.filter((opt): opt is string => typeof opt === 'string') : []}
            onChange={(options) => updateFormData({ options })}
            label="Select Options"
            isRequired={formData.isRequired || false}
          />
        )}

        {/* Checkboxes */}
        <div className="grid grid-cols-4 items-center gap-4">
          <Label className="text-right">Options</Label>
          <div className="col-span-3 space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-isVisibleInList"
                checked={formData.isVisibleInList || false}
                onCheckedChange={(checked) => updateFormData({ isVisibleInList: checked as boolean })}
              />
              <Label htmlFor="edit-isVisibleInList" className="text-sm font-normal">
                Show in Transaction Table
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-isVisibleInAnalysis"
                checked={formData.isVisibleInAnalysis || false}
                onCheckedChange={(checked) => updateFormData({ isVisibleInAnalysis: checked as boolean })}
              />
              <Label htmlFor="edit-isVisibleInAnalysis" className="text-sm font-normal">
                Show in Analysis
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-isRequired"
                checked={formData.isRequired || false}
                onCheckedChange={(checked) => updateFormData({ isRequired: checked as boolean })}
              />
              <Label htmlFor="edit-isRequired" className="text-sm font-normal">
                Required Field
              </Label>
            </div>
          </div>
        </div>
      </FormDialog>
    </>
  )
}
