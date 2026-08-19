const { ZodError } = require("zod");

/**
 * Returns an Express middleware that validates req.body against a Zod schema.
 * On failure, sends a clean 400 JSON response with field-level error messages.
 *
 * Usage:
 *   router.post("/register", validate(registerSchema), authController.userRegisterController)
 */
const validate = (schema, source = "body") => (req, res, next) => {
  try {
    const parsed = schema.parse(req[source]);
    // Replace req[source] with the parsed (sanitised/coerced) data
    req[source] = parsed;
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      // Flatten to a simple map of { field: firstMessage }
      const errors = {};
      for (const issue of err.issues) {
        const field = issue.path.join(".") || "value";
        if (!errors[field]) {
          errors[field] = issue.message;
        }
      }

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }
    next(err);
  }
};

module.exports = validate;
