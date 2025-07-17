import Joi from 'joi';

export const urlSchema = Joi.object({
  url: Joi.string().uri().required(),
  priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
});

export const bulkUrlSchema = Joi.object({
  urls: Joi.array().items(Joi.string().uri()).min(1).max(1000).required(),
  priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
});
