import { Joi } from "../middleware/validation.js";

export const googleAuthBodySchema = Joi.object({
  credential: Joi.string().trim().required(),
});
