import { randomHexColor } from "@/lib/utils"
import { z } from "zod"

export const settingsFormSchema = z.object({
  default_currency: z.string().max(5).optional(),
  default_type: z.string().optional(),
  default_category: z.string().optional(),
  default_project: z.string().optional(),
  openai_api_key: z.string().optional(),
  openai_model_name: z.string().default('gpt-4o-mini'),
  google_api_key: z.string().optional(),
  google_model_name: z.string().default("gemini-2.5-flash"),
  mistral_api_key: z.string().optional(),
  mistral_model_name: z.string().default("mistral-medium-latest"),
  openrouter_api_key: z.string().optional(),
  openrouter_model_name: z.string().default("openai/gpt-4o-mini"),
  llm_providers: z.string().default('openai,google,mistral,openrouter'),
  prompt_analyse_new_file: z.string().optional(),
  is_welcome_message_hidden: z.string().optional(),
})

export const currencyFormSchema = z.object({
  code: z.string().max(5),
  name: z.string().max(32),
})

export const projectFormSchema = z.object({
  name: z.string().max(128),
  llm_prompt: z.string().max(512).nullable().optional(),
  color: z.string().max(7).default(randomHexColor()).nullable().optional(),
})

export const categoryFormSchema = z.object({
  name: z.string().max(128),
  llm_prompt: z.string().max(512).nullable().optional(),
  color: z.string().max(7).default(randomHexColor()).nullable().optional(),
})

export const fieldFormSchema = z.object({
  name: z.string().max(128),
  type: z.string().max(128).default("string"),
  llm_prompt: z.string().max(512).nullable().optional(),
  options: z.array(z.string().max(100).transform(val => val.trim())).nullable().optional()
    .transform((val) => val === null ? undefined : val)
    .refine(
      (options) => {
        if (!options) return true;
        // Ensure no empty strings when provided
        return options.every(opt => opt.length > 0);
      },
      {
        message: "Options cannot be empty strings",
      }
    )
    .refine(
      (options) => {
        if (!options) return true;
        // Ensure no duplicate options (case-insensitive)
        const lowercaseOptions = options.map(opt => opt.toLowerCase());
        return new Set(lowercaseOptions).size === lowercaseOptions.length;
      },
      {
        message: "Options must be unique",
      }
    )
    .refine(
      (options) => {
        if (!options) return true;
        // Validate each option against common injection patterns
        const dangerousPatterns = [
          /<script/i, 
          /javascript:/i, 
          /data:/i, 
          /vbscript:/i,
          /on\w+\s*=/i
        ];
        return !options.some(opt => 
          dangerousPatterns.some(pattern => pattern.test(opt))
        );
      },
      {
        message: "Options contain potentially dangerous content",
      }
    ),
  isVisibleInList: z.boolean().optional(),
  isVisibleInAnalysis: z.boolean().optional(),
  isRequired: z.boolean().optional(),
}).refine(
  (data) => {
    // For select type, options should be provided if required
    if (data.type === "select" && data.isRequired) {
      return data.options && data.options.length > 0;
    }
    return true;
  },
  {
    message: "Required select fields must have at least one option",
    path: ["options"],
  }
)
