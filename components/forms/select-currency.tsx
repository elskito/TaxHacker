import { Banknote } from "lucide-react"
import { SelectProps } from "@radix-ui/react-select"
import { useMemo } from "react"
import { FormSelect } from "./simple"

export const FormSelectCurrency = ({
  currencies,
  title,
  emptyValue,
  placeholder,
  hideIfEmpty = false,
  isRequired = false,
  ...props
}: {
  currencies: { code: string; name: string }[]
  title?: string
  emptyValue?: string
  placeholder?: string
  hideIfEmpty?: boolean
  isRequired?: boolean
} & SelectProps) => {
  const items = useMemo(
    () =>
      currencies.map((currency) => ({
        code: currency.code,
        name: `${currency.code} — ${currency.name}`,
        icon: <Banknote className="h-4 w-4 text-muted-foreground" />,
      })),
    [currencies]
  )
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
