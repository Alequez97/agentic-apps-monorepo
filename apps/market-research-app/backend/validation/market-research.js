import { Joi } from "../middleware/validation.js";

const uuidSchema = Joi.string()
  .pattern(/^[0-9a-f-]{36}$/)
  .required();

const competitorIdSchema = Joi.string()
  .pattern(/^[a-z0-9-]+$/)
  .required();

export const reportIdParamsSchema = Joi.object({
  reportId: uuidSchema,
});

export const competitorParamsSchema = Joi.object({
  reportId: uuidSchema,
  competitorId: competitorIdSchema,
});

export const listHistoryQuerySchema = Joi.object({
  reportId: Joi.string()
    .pattern(/^[0-9a-f-]{36}$/)
    .optional(),
});

export const upsertSessionBodySchema = Joi.object({
  idea: Joi.string().trim().min(1).required(),
  state: Joi.object().required(),
});

export const analyzeReportBodySchema = Joi.object({
  idea: Joi.string().trim().min(1).required(),
  regions: Joi.array()
    .items(Joi.string().trim().min(1))
    .max(20)
    .allow(null)
    .optional(),
});
