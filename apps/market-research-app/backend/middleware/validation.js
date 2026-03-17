import Joi from "joi";

function formatJoiError(error) {
  const [detail] = error.details || [];
  return detail?.message || "Invalid request";
}

export function validateRequest({ params, query, body }) {
  return (req, res, next) => {
    const targets = [
      ["params", params],
      ["query", query],
      ["body", body],
    ];

    for (const [key, schema] of targets) {
      if (!schema) {
        continue;
      }

      const { error, value } = schema.validate(req[key], {
        abortEarly: true,
        allowUnknown: false,
        stripUnknown: true,
      });

      if (error) {
        return res.status(400).json({ error: formatJoiError(error) });
      }

      req[key] = value;
    }

    return next();
  };
}

export { Joi };
