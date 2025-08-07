"use client"

import { useNotification } from "@/app/(app)/context"
import { analyzeFileAction, deleteUnsortedFileAction, saveFileAsTransactionAction } from "@/app/(app)/unsorted/actions"
import { CurrencyConverterTool } from "@/components/agents/currency-converter"
import { ItemsDetectTool } from "@/components/agents/items-detect"
import ToolWindow from "@/components/agents/tool-window"
import { FormError } from "@/components/forms/error"
import { FormSelectCategory } from "@/components/forms/select-category"
import { FormSelectCurrency } from "@/components/forms/select-currency"
import { FormSelectProject } from "@/components/forms/select-project"
import { FormSelectType } from "@/components/forms/select-type"
import { FormInput, FormTextarea, FormCheckbox } from "@/components/forms/simple"
import { FormSelectField } from "@/components/forms/select-field"
import { DeleteModal } from "@/components/transactions/delete-file-modal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Category, Currency, Field, File, Project } from "@/prisma/client"
import { format, subDays } from "date-fns"
import { ArrowDownToLine, Brain, Loader2, Trash2 } from "lucide-react"
import { startTransition, useActionState, useMemo, useState } from "react"

export default function AnalyzeForm({
  file,
  categories,
  projects,
  currencies,
  fields,
  settings,
}: {
  file: File
  categories: Category[]
  projects: Project[]
  currencies: Currency[]
  fields: Field[]
  settings: Record<string, string>
}) {
  const { showNotification } = useNotification()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeStep, setAnalyzeStep] = useState<string>("")
  const [analyzeError, setAnalyzeError] = useState<string>("")
  const [deleteState, deleteAction, isDeleting] = useActionState(deleteUnsortedFileAction, null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  const fieldMap = useMemo(() => {
    return fields.reduce(
      (acc, field) => {
        acc[field.code] = field
        return acc
      },
      {} as Record<string, Field>
    )
  }, [fields])

  const extraFields = useMemo(() => fields.filter((field) => field.isExtra), [fields])
  const initialFormState = useMemo(() => {
    const baseState = {
      name: file.filename,
      merchant: "",
      description: "",
      type: settings.default_type,
      total: 0.0,
      currencyCode: settings.default_currency,
      convertedTotal: 0.0,
      convertedCurrencyCode: settings.default_currency,
      categoryCode: settings.default_category,
      projectCode: settings.default_project,
      issuedAt: "",
      dueDate: "",
      dateOfSale: "",
      note: "",
      text: "",
      items: [],
    }

    // Add extra fields
    const extraFieldsState = extraFields.reduce(
      (acc, field) => {
        if (field.type === "boolean") {
          acc[field.code] = false
        } else {
          acc[field.code] = ""
        }
        return acc
      },
      {} as Record<string, any>
    )

    // Load cached results if they exist
    const cachedResults = file.cachedParseResult
      ? Object.fromEntries(
          Object.entries(file.cachedParseResult as Record<string, any>).filter(
            ([key, value]) => {
              // Don't filter out boolean false values
              const field = extraFields.find(f => f.code === key)
              if (field?.type === "boolean") {
                return value !== null && value !== undefined
              }
              return value !== null && value !== undefined && value !== ""
            }
          ).map(([key, value]) => {
            // Convert string boolean values to actual booleans
            const field = extraFields.find(f => f.code === key)
            if (field?.type === "boolean") {
              return [key, typeof value === 'boolean' ? value : String(value) === "true"]
            }
            return [key, value]
          })
        )
      : {}

    return {
      ...baseState,
      ...extraFieldsState,
      ...cachedResults,
    }
  }, [file.filename, settings, extraFields, file.cachedParseResult])
  const [formData, setFormData] = useState(initialFormState)
  const rateDate = subDays(new Date(formData.issuedAt || Date.now()), 1)

  async function saveAsTransaction(formData: FormData) {
    setSaveError("")
    setIsSaving(true)
    startTransition(async () => {
      const result = await saveFileAsTransactionAction(null, formData)
      setIsSaving(false)

      if (result.success) {
        showNotification({ code: "global.banner", message: "Saved!", type: "success" })
        showNotification({ code: "sidebar.transactions", message: "new" })
        setTimeout(() => showNotification({ code: "sidebar.transactions", message: "" }), 3000)
      } else {
        setSaveError(result.error ? result.error : "Something went wrong...")
        showNotification({ code: "global.banner", message: "Failed to save", type: "failed" })
      }
    })
  }

  const startAnalyze = async () => {
    setIsAnalyzing(true)
    setAnalyzeError("")
    try {
      setAnalyzeStep("Analyzing...")
      const results = await analyzeFileAction(file, settings, fields, categories, projects)

      console.log("Analysis results:", results)

      if (!results.success) {
        setAnalyzeError(results.error ? results.error : "Something went wrong...")
      } else {
        const nonEmptyFields = Object.fromEntries(
          Object.entries(results.data?.output || {}).filter(
            ([key, value]) => {
              // Don't filter out boolean false values
              const field = extraFields.find(f => f.code === key) || fields.find(f => f.code === key)
              if (field?.type === "boolean") {
                return value !== null && value !== undefined
              }
              return value !== null && value !== undefined && value !== ""
            }
          ).map(([key, value]) => {
            // Convert string boolean values to actual booleans
            const field = extraFields.find(f => f.code === key) || fields.find(f => f.code === key)
            if (field?.type === "boolean") {
              return [key, typeof value === 'boolean' ? value : String(value) === "true"]
            }
            return [key, value]
          })
        )
        setFormData({ ...formData, ...nonEmptyFields })
      }
    } catch (error) {
      console.error("Analysis failed:", error)
      setAnalyzeError(error instanceof Error ? error.message : "Analysis failed")
    } finally {
      setIsAnalyzing(false)
      setAnalyzeStep("")
    }
  }

  const handleDelete = () => {
    startTransition(() => deleteAction(file.id))
    setDeleteModalOpen(false)
  }

  const openDeleteModal = () => {
    setDeleteModalOpen(true)
  }

  return (
    <>
      {file.isSplitted ? (
        <div className="flex justify-end">
          <Badge variant="outline">This file has been split up</Badge>
        </div>
      ) : (
        <Button className="w-full mb-6 py-6 text-lg" onClick={startAnalyze} disabled={isAnalyzing} data-analyze-button>
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              <span>{analyzeStep}</span>
            </>
          ) : (
            <>
              <Brain className="mr-1 h-4 w-4" />
              <span>Analyze with AI</span>
            </>
          )}
        </Button>
      )}

      <div>{analyzeError && <FormError>{analyzeError}</FormError>}</div>

      <form className="space-y-4" action={saveAsTransaction}>
        <input type="hidden" name="fileId" value={file.id} />
        <FormInput
          title={fieldMap.name.name}
          name="name"
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          required={fieldMap.name.isRequired}
        />

        <FormInput
          title={fieldMap.merchant.name}
          name="merchant"
          value={formData.merchant}
          onChange={(e) => setFormData((prev) => ({ ...prev, merchant: e.target.value }))}
          hideIfEmpty={!fieldMap.merchant.isVisibleInAnalysis}
          required={fieldMap.merchant.isRequired}
        />

        <FormInput
          title={fieldMap.description.name}
          name="description"
          value={formData.description}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          hideIfEmpty={!fieldMap.description.isVisibleInAnalysis}
          required={fieldMap.description.isRequired}
        />

        <div className="flex flex-wrap gap-4">
          <FormInput
            title={fieldMap.total.name}
            name="total"
            type="number"
            step="0.01"
            value={formData.total || ""}
            onChange={(e) => {
              const newValue = parseFloat(e.target.value || "0")
              !isNaN(newValue) && setFormData((prev) => ({ ...prev, total: newValue }))
            }}
            className="w-32"
            required={fieldMap.total.isRequired}
          />

          <FormSelectCurrency
            title={fieldMap.currencyCode.name}
            currencies={currencies}
            name="currencyCode"
            value={formData.currencyCode}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, currencyCode: value }))}
            hideIfEmpty={!fieldMap.currencyCode.isVisibleInAnalysis}
            required={fieldMap.currencyCode.isRequired}
          />

          <FormSelectType
            title={fieldMap.type.name}
            name="type"
            value={formData.type}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}
            hideIfEmpty={!fieldMap.type.isVisibleInAnalysis}
            required={fieldMap.type.isRequired}
          />
        </div>

        {formData.total != 0 && formData.currencyCode && formData.currencyCode !== settings.default_currency && (
          <ToolWindow title={`Exchange rate on ${format(rateDate, "LLLL dd, yyyy")}`}>
            <CurrencyConverterTool
              originalTotal={formData.total}
              originalCurrencyCode={formData.currencyCode}
              targetCurrencyCode={settings.default_currency}
              date={rateDate}
              onChange={(value) => setFormData((prev) => ({ ...prev, convertedTotal: value }))}
            />
            <input type="hidden" name="convertedCurrencyCode" value={settings.default_currency} />
          </ToolWindow>
        )}

        <div className="flex flex-row gap-4">
          <FormInput
            title={fieldMap.issuedAt.name}
            type="date"
            name="issuedAt"
            value={formData.issuedAt}
            onChange={(e) => setFormData((prev) => ({ ...prev, issuedAt: e.target.value }))}
            hideIfEmpty={!fieldMap.issuedAt.isVisibleInAnalysis}
            required={fieldMap.issuedAt.isRequired}
          />
          
          <FormInput
            title="Due Date"
            type="date"
            name="dueDate"
            value={formData.dueDate}
            onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
          />
          
          <FormInput
            title="Date of Sale"
            type="date"
            name="dateOfSale"
            value={formData.dateOfSale}
            onChange={(e) => setFormData((prev) => ({ ...prev, dateOfSale: e.target.value }))}
          />
        </div>

        <div className="flex flex-row gap-4">
          <FormSelectCategory
            title={fieldMap.categoryCode.name}
            categories={categories}
            name="categoryCode"
            value={formData.categoryCode}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, categoryCode: value }))}
            placeholder="Select Category"
            hideIfEmpty={!fieldMap.categoryCode.isVisibleInAnalysis}
            required={fieldMap.categoryCode.isRequired}
          />

          {projects.length > 0 && (
            <FormSelectProject
              title={fieldMap.projectCode.name}
              projects={projects}
              name="projectCode"
              value={formData.projectCode}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, projectCode: value }))}
              placeholder="Select Project"
              hideIfEmpty={!fieldMap.projectCode.isVisibleInAnalysis}
              required={fieldMap.projectCode.isRequired}
            />
          )}
        </div>

        <FormInput
          title={fieldMap.note.name}
          name="note"
          value={formData.note}
          onChange={(e) => setFormData((prev) => ({ ...prev, note: e.target.value }))}
          hideIfEmpty={!fieldMap.note.isVisibleInAnalysis}
          required={fieldMap.note.isRequired}
        />

        {extraFields.map((field) => {
          if (field.type === "select" && field.options && Array.isArray(field.options)) {
            const options = field.options.filter((opt): opt is string => typeof opt === 'string')
            return (
              <FormSelectField
                key={field.code}
                title={field.name}
                name={field.code}
                options={options}
                value={formData[field.code as keyof typeof formData] as string}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, [field.code]: value }))}
                hideIfEmpty={!field.isVisibleInAnalysis}
                required={field.isRequired}
                placeholder={`Select ${field.name}`}
                emptyValue="Not Defined"
              />
            )
          }
          
          if (field.type === "boolean") {
            return (
              <FormCheckbox
                key={field.code}
                title={field.name}
                name={field.code}
                checked={Boolean(formData[field.code as keyof typeof formData])}
                onChange={(checked) => setFormData((prev) => ({ ...prev, [field.code]: checked }))}
                hideIfEmpty={!field.isVisibleInAnalysis}
                isRequired={field.isRequired}
              />
            )
          }
          
          return (
            <FormInput
              key={field.code}
              type={field.type === "number" ? "number" : "text"}
              title={field.name}
              name={field.code}
              value={formData[field.code as keyof typeof formData]}
              onChange={(e) => setFormData((prev) => ({ ...prev, [field.code]: e.target.value }))}
              hideIfEmpty={!field.isVisibleInAnalysis}
              required={field.isRequired}
            />
          )
        })}

        {formData.items && formData.items.length > 0 && (
          <ToolWindow title="Detected items">
            <ItemsDetectTool file={file} data={formData} />
          </ToolWindow>
        )}

        <div className="hidden">
          <input type="text" name="items" value={JSON.stringify(formData.items)} readOnly />
          <FormTextarea
            title={fieldMap.text.name}
            name="text"
            value={formData.text}
            onChange={(e) => setFormData((prev) => ({ ...prev, text: e.target.value }))}
            hideIfEmpty={!fieldMap.text.isVisibleInAnalysis}
          />
        </div>

        <div className="flex justify-between gap-4 pt-6">
          <Button
            type="button"
            onClick={openDeleteModal}
            variant="destructive"
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? "⏳ Deleting..." : "Delete"}
          </Button>

          <Button type="submit" disabled={isSaving} data-save-button>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <ArrowDownToLine className="h-4 w-4" />
                Save as Transaction
              </>
            )}
          </Button>
        </div>

        <div>
          {deleteState?.error && <FormError>{deleteState.error}</FormError>}
          {saveError && <FormError>{saveError}</FormError>}
        </div>
      </form>

      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete File"
        description={`Are you sure you want to delete this file? This action cannot be undone.`}
      />
    </>
  )
}
