/**
 * Validation helper functions
 */

export const validationHelpers = {
  /**
   * Email validation
   */
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Password validation
   */
  password: (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }

    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    if (!/\d/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push("Password must contain at least one special character");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  /**
   * Phone number validation
   */
  phone: (phone: string): boolean => {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  },

  /**
   * URL validation
   */
  url: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Required field validation
   */
  required: (value: any): boolean => {
    if (typeof value === "string") {
      return value.trim().length > 0;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value !== null && value !== undefined;
  },

  /**
   * Minimum length validation
   */
  minLength: (value: string, min: number): boolean => {
    return value.length >= min;
  },

  /**
   * Maximum length validation
   */
  maxLength: (value: string, max: number): boolean => {
    return value.length <= max;
  },

  /**
   * Numeric validation
   */
  numeric: (value: string): boolean => {
    return !isNaN(Number(value)) && isFinite(Number(value));
  },

  /**
   * Integer validation
   */
  integer: (value: string): boolean => {
    return Number.isInteger(Number(value));
  },

  /**
   * Positive number validation
   */
  positive: (value: number): boolean => {
    return value > 0;
  },

  /**
   * Date validation
   */
  date: (date: string): boolean => {
    const dateObj = new Date(date);
    return !isNaN(dateObj.getTime());
  },

  /**
   * Future date validation
   */
  futureDate: (date: string): boolean => {
    const dateObj = new Date(date);
    return dateObj > new Date();
  },

  /**
   * Past date validation
   */
  pastDate: (date: string): boolean => {
    const dateObj = new Date(date);
    return dateObj < new Date();
  },

  /**
   * Form validation helper
   */
  validateForm: (
    data: Record<string, any>,
    rules: Record<string, any>,
  ): {
    isValid: boolean;
    errors: Record<string, string[]>;
  } => {
    const errors: Record<string, string[]> = {};

    Object.keys(rules).forEach((field) => {
      const fieldRules = rules[field];
      const fieldErrors: string[] = [];

      Object.keys(fieldRules).forEach((rule) => {
        const ruleValue = fieldRules[rule];
        const fieldValue = data[field];

        switch (rule) {
          case "required":
            if (!validationHelpers.required(fieldValue)) {
              fieldErrors.push(`${field} is required`);
            }
            break;
          case "email":
            if (fieldValue && !validationHelpers.email(fieldValue)) {
              fieldErrors.push(`${field} must be a valid email`);
            }
            break;
          case "minLength":
            if (fieldValue && !validationHelpers.minLength(fieldValue, ruleValue)) {
              fieldErrors.push(`${field} must be at least ${ruleValue} characters`);
            }
            break;
          case "maxLength":
            if (fieldValue && !validationHelpers.maxLength(fieldValue, ruleValue)) {
              fieldErrors.push(`${field} must be no more than ${ruleValue} characters`);
            }
            break;
          case "numeric":
            if (fieldValue && !validationHelpers.numeric(fieldValue)) {
              fieldErrors.push(`${field} must be a number`);
            }
            break;
        }
      });

      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors;
      }
    });

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  },
};
