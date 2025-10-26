import { Folder } from "lucide-react"
import { Project } from "@/prisma/client"
import { SelectProps } from "@radix-ui/react-select"
import { FormSelect } from "./simple"

export const FormSelectProject = ({
  title,
  projects,
  emptyValue,
  placeholder,
  hideIfEmpty = false,
  isRequired = false,
  ...props
}: {
  title: string
  projects: Project[]
  emptyValue?: string
  placeholder?: string
  hideIfEmpty?: boolean
  isRequired?: boolean
} & SelectProps) => {
  return (
    <FormSelect
      title={title}
      items={projects.map((project) => ({
        code: project.code,
        name: project.name,
        icon: project.color ? (
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: project.color }} />
        ) : (
          <Folder className="h-4 w-4 text-muted-foreground" />
        ),
      }))}
      emptyValue={emptyValue}
      placeholder={placeholder}
      hideIfEmpty={hideIfEmpty}
      isRequired={isRequired}
      {...props}
    />
  )
}
