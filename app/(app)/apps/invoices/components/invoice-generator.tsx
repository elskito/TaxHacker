"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { fetchAsBase64 } from "@/lib/utils"
import { SettingsMap } from "@/models/settings"
import { Currency, User } from "@/prisma/client"
import { FileDown, Loader2, Pencil, Save, TextSelect, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { startTransition, useCallback, useMemo, useReducer, useState } from "react"
import {
  addNewTemplateAction,
  deleteTemplateAction,
  generateInvoicePDF,
  saveInvoiceAsTransactionAction,
  updateTemplateAction,
} from "../actions"
import defaultTemplates, { InvoiceTemplate } from "../default-templates"
import { InvoiceAppData } from "../page"
import { InvoiceFormData, InvoicePDFData, InvoicePage } from "./invoice-page"
import { DeleteModal } from "@/components/transactions/delete-file-modal"

type InvoiceItem = InvoiceFormData["items"][number]
type InvoiceTax = InvoiceFormData["additionalTaxes"][number]
type InvoiceFee = InvoiceFormData["additionalFees"][number]

type InvoiceFormAction =
  | { type: "SET_FORM"; payload: InvoiceFormData }
  | { type: "UPDATE_FIELD"; field: keyof InvoiceFormData; value: InvoiceFormData[keyof InvoiceFormData] }
  | { type: "ADD_ITEM" }
  | { type: "UPDATE_ITEM"; index: number; field: keyof InvoiceItem; value: InvoiceItem[keyof InvoiceItem] }
  | { type: "REMOVE_ITEM"; index: number }
  | { type: "ADD_TAX" }
  | { type: "UPDATE_TAX"; index: number; field: keyof InvoiceTax; value: InvoiceTax[keyof InvoiceTax] }
  | { type: "REMOVE_TAX"; index: number }
  | { type: "ADD_FEE" }
  | { type: "UPDATE_FEE"; index: number; field: keyof InvoiceFee; value: InvoiceFee[keyof InvoiceFee] }
  | { type: "REMOVE_FEE"; index: number }

function invoiceFormReducer(state: InvoiceFormData, action: InvoiceFormAction): InvoiceFormData {
  switch (action.type) {
    case "SET_FORM":
      return action.payload
    case "UPDATE_FIELD":
      return { ...state, [action.field]: action.value }
    case "ADD_ITEM":
      return {
        ...state,
        items: [
          ...state.items,
          { name: "", subtitle: "", showSubtitle: false, quantity: 1, unitPrice: 0, subtotal: 0 },
        ],
      }
    case "UPDATE_ITEM": {
      const items = [...state.items]
      items[action.index] = { ...items[action.index], [action.field]: action.value }
      if (action.field === "quantity" || action.field === "unitPrice") {
        items[action.index].subtotal = Number(items[action.index].quantity) * Number(items[action.index].unitPrice)
      }
      
      // Recalculate tax amounts when items change
      const newSubtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
      const updatedTaxes = state.additionalTaxes.map(tax => ({
        ...tax,
        amount: (newSubtotal * tax.rate) / 100
      }))
      
      return { ...state, items, additionalTaxes: updatedTaxes }
    }
    case "REMOVE_ITEM": {
      const items = state.items.filter((_, i) => i !== action.index)
      
      // Recalculate tax amounts when items are removed
      const newSubtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
      const updatedTaxes = state.additionalTaxes.map(tax => ({
        ...tax,
        amount: (newSubtotal * tax.rate) / 100
      }))
      
      return { ...state, items, additionalTaxes: updatedTaxes }
    }
    case "ADD_TAX":
      return { ...state, additionalTaxes: [...state.additionalTaxes, { name: "", rate: 0, amount: 0 }] }
    case "UPDATE_TAX": {
      const taxes = [...state.additionalTaxes]
      taxes[action.index] = { ...taxes[action.index], [action.field]: action.value }
      if (action.field === "rate") {
        const subtotal = state.items.reduce((sum, item) => sum + item.subtotal, 0)
        taxes[action.index].amount = (subtotal * Number(action.value)) / 100
      }
      return { ...state, additionalTaxes: taxes }
    }
    case "REMOVE_TAX":
      return { ...state, additionalTaxes: state.additionalTaxes.filter((_, i) => i !== action.index) }
    case "ADD_FEE":
      return { ...state, additionalFees: [...state.additionalFees, { name: "", amount: 0 }] }
    case "UPDATE_FEE": {
      const fees = [...state.additionalFees]
      fees[action.index] = { ...fees[action.index], [action.field]: action.value }
      return { ...state, additionalFees: fees }
    }
    case "REMOVE_FEE":
      return { ...state, additionalFees: state.additionalFees.filter((_, i) => i !== action.index) }
    default:
      return state
  }
}

export function InvoiceGenerator({
  user,
  settings,
  currencies,
  appData,
}: {
  user: User
  settings: SettingsMap
  currencies: Currency[]
  appData: InvoiceAppData | null
}) {
  // Helper function to ensure templates have all required fields
  const ensureTemplateFields = useCallback((template: InvoiceTemplate): InvoiceTemplate => {
    const defaultTemplate = defaultTemplates(user, settings)[0].formData
    return {
      ...template,
      formData: {
        ...defaultTemplate,
        ...template.formData,
        // Ensure critical label fields are present
        dateOfSaleLabel: template.formData.dateOfSaleLabel || defaultTemplate.dateOfSaleLabel,
        issueDateLabel: template.formData.issueDateLabel || defaultTemplate.issueDateLabel,
        dueDateLabel: template.formData.dueDateLabel || defaultTemplate.dueDateLabel,
      }
    }
  }, [user, settings])

  const templates: InvoiceTemplate[] = useMemo(
    () => [
      ...defaultTemplates(user, settings), 
      ...(appData?.templates || []).map(ensureTemplateFields)
    ],
    [appData, user, settings, ensureTemplateFields]
  )

  const [selectedTemplate, setSelectedTemplate] = useState<string>(templates[0].name)
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [isRenameTemplateDialogOpen, setIsRenameTemplateDialogOpen] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState("")
  const [renameTemplateName, setRenameTemplateName] = useState("")
  const [templateToDelete, setTemplateToDelete] = useState<InvoiceTemplate | null>(null)
  const [isDeletingTemplate, setIsDeletingTemplate] = useState(false)
  const [formData, dispatch] = useReducer(invoiceFormReducer, templates[0].formData)
  const [isPdfLoading, setIsPdfLoading] = useState(false)
  const [isSavingTransaction, setIsSavingTransaction] = useState(false)
  const [isUpdatingTemplate, setIsUpdatingTemplate] = useState(false)
  const [isRenamingTemplate, setIsRenamingTemplate] = useState(false)

  const router = useRouter()
  const selectedTemplateData = templates.find((t) => t.name === selectedTemplate)

  // Function to handle template selection
  const handleTemplateSelect = (templateName: string) => {
    const template = templates.find((t) => t.name === templateName)
    if (template) {
      setSelectedTemplate(templateName)
      dispatch({ type: "SET_FORM", payload: template.formData })
    }
  }

  const handleGeneratePDF = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsPdfLoading(true)

    try {
      if (formData.businessLogo) {
        formData.businessLogo = await fetchAsBase64(formData.businessLogo)
      }

      // Create pdfData for PDF generation with currency information
      const pdfData: InvoicePDFData = {
        ...formData,
        defaultCurrency: settings.default_currency,
        currencyRate: 1 // Default currency rate for invoice generator
      }
      const pdfBuffer = await generateInvoicePDF(pdfData)

      // Create a blob from the buffer
      const blob = new Blob([pdfBuffer], { type: "application/pdf" })

      // Create a URL for the blob
      const url = URL.createObjectURL(blob)

      // Create a temporary link element
      const link = document.createElement("a")
      link.href = url
      link.download = `invoice-${formData.invoiceNumber}.pdf`

      // Append the link to the document, click it, and remove it
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up the URL
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Failed to generate PDF. Please try again.")
    } finally {
      setIsPdfLoading(false)
    }
  }

  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim()) {
      alert("Please enter a template name")
      return
    }

    if (templates.some((t) => t.name === newTemplateName.trim())) {
      alert("A template with this name already exists")
      return
    }

    try {
      const result = await addNewTemplateAction(user, {
        id: `tmpl_${Math.random().toString(36).substring(2, 15)}`,
        name: newTemplateName.trim(),
        formData: formData,
      })

      if (result.success) {
        setIsTemplateDialogOpen(false)
        setNewTemplateName("")
        router.refresh()
      } else {
        alert("Failed to save template. Please try again.")
      }
    } catch (error) {
      console.error("Error saving template:", error)
      alert("Failed to save template. Please try again.")
    }
  }

  const handleDeleteTemplateClick = (template: InvoiceTemplate, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!template.id) return
    setTemplateToDelete(template)
  }

  const handleDeleteTemplateConfirm = async () => {
    if (!templateToDelete?.id) return
    setIsDeletingTemplate(true)
    try {
      const result = await deleteTemplateAction(user, templateToDelete.id)
      if (result.success) {
        setTemplateToDelete(null)
        router.refresh()
      } else {
        alert("Failed to delete template. Please try again.")
      }
    } catch (error) {
      console.error("Error deleting template:", error)
      alert("Failed to delete template. Please try again.")
    } finally {
      setIsDeletingTemplate(false)
    }
  }

  const handleUpdateTemplate = async () => {
    if (!selectedTemplateData || !selectedTemplateData.id) {
      alert("Cannot update default templates")
      return
    }

    setIsUpdatingTemplate(true)

    try {
      const result = await updateTemplateAction(user, selectedTemplateData.id, {
        ...selectedTemplateData,
        formData: formData,
      })

      if (result.success) {
        router.refresh()
        // Add a second delay to show the "updating" state
        setTimeout(() => {
          setIsUpdatingTemplate(false)
        }, 1000)
      } else {
        alert("Failed to update template. Please try again.")
        setIsUpdatingTemplate(false)
      }
    } catch (error) {
      console.error("Error updating template:", error)
      alert("Failed to update template. Please try again.")
      setIsUpdatingTemplate(false)
    }
  }

  const openRenameTemplateDialog = () => {
    if (!selectedTemplateData?.id) return
    setRenameTemplateName(selectedTemplateData.name)
    setIsRenameTemplateDialogOpen(true)
  }

  const handleRenameTemplate = async () => {
    if (!selectedTemplateData?.id) {
      alert("Cannot rename default templates")
      return
    }

    const trimmedName = renameTemplateName.trim()
    if (!trimmedName) {
      alert("Please enter a template name")
      return
    }

    if (templates.some((t) => t.id !== selectedTemplateData.id && t.name === trimmedName)) {
      alert("A template with this name already exists")
      return
    }

    setIsRenamingTemplate(true)

    try {
      const result = await updateTemplateAction(user, selectedTemplateData.id, {
        ...selectedTemplateData,
        name: trimmedName,
      })

      if (result.success) {
        setSelectedTemplate(trimmedName)
        setIsRenameTemplateDialogOpen(false)
        router.refresh()
      } else {
        alert("Failed to rename template. Please try again.")
      }
    } catch (error) {
      console.error("Error renaming template:", error)
      alert("Failed to rename template. Please try again.")
    } finally {
      setIsRenamingTemplate(false)
    }
  }

  // Accept optional event, prevent default only if present
  const handleSaveAsTransaction = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setIsSavingTransaction(true)

    try {
      if (formData.businessLogo) {
        formData.businessLogo = await fetchAsBase64(formData.businessLogo)
      }

      const result = await saveInvoiceAsTransactionAction(formData)
      if (result.success && result.data?.id) {
        console.log("SUCCESS! REDIRECTING TO TRANSACTION", result.data?.id)
        startTransition(() => {
          router.push(`/transactions/${result.data?.id}`)
        })
      } else {
        alert(result.error || "Failed to save as transaction")
      }
    } catch (error) {
      console.error("Error saving as transaction:", error)
      alert("Failed to save as transaction. Please try again.")
    } finally {
      setIsSavingTransaction(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Templates Section */}
      <div className="py-4 flex overflow-x-auto gap-2">
        {templates.map((template) => (
          <div key={template.id ?? template.name} className="relative group">
            <Button
              variant={selectedTemplate === template.name ? "default" : "outline"}
              className={`
                  whitespace-nowrap p-4 
                  ${selectedTemplate === template.name ? "bg-black hover:bg-gray-900" : "border-gray-300 text-gray-700 hover:bg-gray-100"}
                `}
              onClick={() => handleTemplateSelect(template.name)}
            >
              {template.name}
            </Button>
            {template.id && (
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => handleDeleteTemplateClick(template, e)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
        {/* Action Buttons */}
        <div className="grid grid-cols-2 lg:order-2 lg:flex lg:flex-col gap-3 lg:gap-4">
          <Button onClick={handleGeneratePDF} disabled={isPdfLoading} className="justify-start">
            {isPdfLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                <span className="ml-2">Generating...</span>
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4 flex-shrink-0" />
                <span className="ml-2">Download PDF</span>
              </>
            )}
          </Button>
          <Button variant="secondary" onClick={() => setIsTemplateDialogOpen(true)} className="justify-start">
            <TextSelect className="h-4 w-4 flex-shrink-0" />
            <span className="ml-2">Make a Template</span>
          </Button>
          <Button 
            variant="secondary" 
            onClick={handleUpdateTemplate}
            disabled={!selectedTemplateData?.id || isUpdatingTemplate}
            className="justify-start"
          >
            <Save className={`h-4 w-4 flex-shrink-0 ${isUpdatingTemplate ? "text-green-600" : ""}`} />
            <span className="ml-2">{isUpdatingTemplate ? "Updating..." : "Update a Template"}</span>
          </Button>
          <Button
            variant="secondary"
            onClick={openRenameTemplateDialog}
            disabled={!selectedTemplateData?.id || isRenamingTemplate}
            className="justify-start"
          >
            {isRenamingTemplate ? (
              <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
            ) : (
              <Pencil className="h-4 w-4 flex-shrink-0" />
            )}
            <span className="ml-2">{isRenamingTemplate ? "Renaming..." : "Rename Template"}</span>
          </Button>
          <Button variant="secondary" onClick={handleSaveAsTransaction} disabled={isSavingTransaction} className="justify-start">
            {isSavingTransaction ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                <span className="ml-2">Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4 flex-shrink-0" />
                <span className="ml-2">Save as Transaction</span>
              </>
            )}
          </Button>
        </div>

        {/* Invoice Page */}
        <div className="lg:order-1">
          <InvoicePage invoiceData={formData} dispatch={dispatch} currencies={currencies} />
        </div>
      </div>

      {/* New Template Dialog */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="Enter template name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate}>Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Template Dialog */}
      <Dialog open={isRenameTemplateDialogOpen} onOpenChange={setIsRenameTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Template</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={renameTemplateName}
              onChange={(e) => setRenameTemplateName(e.target.value)}
              placeholder="Enter template name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameTemplateDialogOpen(false)} disabled={isRenamingTemplate}>
              Cancel
            </Button>
            <Button onClick={handleRenameTemplate} disabled={isRenamingTemplate}>
              {isRenamingTemplate ? "Renaming..." : "Rename Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteModal
        isOpen={Boolean(templateToDelete)}
        onClose={() => {
          if (isDeletingTemplate) return
          setTemplateToDelete(null)
        }}
        onConfirm={handleDeleteTemplateConfirm}
        title="Delete Template"
        description={`Are you sure you want to delete "${templateToDelete?.name || "this template"}"? This action cannot be undone.`}
      />
    </div>
  )
}
