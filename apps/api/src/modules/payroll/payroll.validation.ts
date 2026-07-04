import { z } from "zod";

export const SALARY_COMPONENT_TYPES = ["EARNING", "DEDUCTION"] as const;

const componentSchema = z.object({
  name: z.string().trim().min(1, "Component name is required"),
  type: z.enum(SALARY_COMPONENT_TYPES),
  amount: z.number().int().nonnegative("amount must be a non-negative integer"),
});

export const createSalaryStructureSchema = z.object({
  employeeId: z.string().trim().min(1, "employeeId is required"),
  effectiveFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "effectiveFrom must be YYYY-MM-DD")
    .optional(),
  components: z.array(componentSchema).optional(),
});

export const updateSalaryStructureSchema = z.object({
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "effectiveFrom must be YYYY-MM-DD"),
});

export const createComponentSchema = componentSchema;

export const updateComponentSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    type: z.enum(SALARY_COMPONENT_TYPES).optional(),
    amount: z.number().int().nonnegative().optional(),
  })
  .refine((v) => v.name !== undefined || v.type !== undefined || v.amount !== undefined, {
    message: "At least one of name, type or amount must be provided",
  });

export const generatePayslipSchema = z.object({
  employeeId: z.string().trim().min(1, "employeeId is required"),
  month: z.number().int().gte(1).lte(12),
  year: z.number().int().gte(2000).lte(2100),
});

export const listPayslipsSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  employee: z.string().trim().optional(),
  month: z.string().regex(/^([1-9]|1[0-2])$/).transform(Number).optional(),
  year: z.string().regex(/^\d{4}$/).transform(Number).optional(),
});

export const myPayslipsSchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  year: z.string().regex(/^\d{4}$/).transform(Number).optional(),
});

export type CreateSalaryStructureInput = z.infer<typeof createSalaryStructureSchema>;
export type CreateComponentInput = z.infer<typeof createComponentSchema>;
export type UpdateComponentInput = z.infer<typeof updateComponentSchema>;
export type GeneratePayslipInput = z.infer<typeof generatePayslipSchema>;
export type ListPayslipsQuery = z.infer<typeof listPayslipsSchema>;
export type MyPayslipsQuery = z.infer<typeof myPayslipsSchema>;
