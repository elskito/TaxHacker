import { SelectProps } from "@radix-ui/react-select"
import { ArrowDown, ArrowUp, Clock3, HelpCircle } from "lucide-react"
import { FormSelect } from "./simple"

export const FormSelectType = ({
  title,
  emptyValue,
  placeholder,
  hideIfEmpty = false,
  isRequired = false,
  ...props
}: {
  title: string
  emptyValue?: string
  placeholder?: string
  hideIfEmpty?: boolean
  isRequired?: boolean
} & SelectProps) => {
  const items = [
    { code: "expense", name: "Expense", icon: <ArrowDown className="h-4 w-4 text-muted-foreground" /> },
    { code: "income", name: "Income", icon: <ArrowUp className="h-4 w-4 text-muted-foreground" /> },
    { code: "pending", name: "Pending", icon: <Clock3 className="h-4 w-4 text-muted-foreground" /> },
    { code: "other", name: "Other", icon: <HelpCircle className="h-4 w-4 text-muted-foreground" /> },
  ]

  return (
    <FormSelect
      title={title}
      items={items}
      emptyValue={emptyValue}
      placeholder={placeholder}
      hideIfEmpty={hideIfEmpty}
      isRequired={isRequired}
      {...props}
    />
  )
}
