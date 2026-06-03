import Joi from "joi";

const BLOCKED_TLDS = [".onion", ".local", ".internal"];

function isPrivateHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname.startsWith("127.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  );
}

const urlValidator = (value: string, helpers: Joi.CustomHelpers) => {
  try {
    const { hostname } = new URL(value);

    if (process.env.NODE_ENV === "production" && isPrivateHost(hostname)) {
      return helpers.error("any.invalid", {
        message: "Private and local URLs are not allowed",
      });
    }

    if (BLOCKED_TLDS.some((tld) => hostname.endsWith(tld))) {
      return helpers.error("any.invalid", {
        message: "URL domain is not allowed",
      });
    }

    return value;
  } catch {
    return helpers.error("any.invalid");
  }
};

const urlField = Joi.string()
  .uri({ scheme: ["http", "https"] })
  .max(2048)
  .custom(urlValidator)
  .required();

export const urlSchema = Joi.object({
  url: urlField,
  priority: Joi.string().valid("low", "medium", "high").default("medium"),
});

export const bulkUrlSchema = Joi.object({
  urls: Joi.array().items(urlField).min(1).max(100).required(),
  priority: Joi.string().valid("low", "medium", "high").default("medium"),
});
