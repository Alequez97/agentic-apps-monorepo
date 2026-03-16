/**
 * Logger utility for centralized logging
 * Allows easy configuration of log levels and output destinations
 */

export const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

// Default configuration
const config = {
  level: LOG_LEVELS.INFO,
  enableTimestamps: true,
  outputs: [console], // Can add file streams, etc.
};

/**
 * Configure logger settings
 * @param {Object} options - Configuration options
 * @param {number} options.level - Minimum log level to display
 * @param {boolean} options.enableTimestamps - Include timestamps
 * @param {Array} options.outputs - Array of output destinations
 */
export function configure(options) {
  Object.assign(config, options);
}

/**
 * Serialize Error objects to plain objects for JSON stringification
 */
function serializeErrors(obj) {
  if (obj instanceof Error) {
    return {
      message: obj.message,
      stack: obj.stack,
      name: obj.name,
      ...obj,
    };
  }

  if (obj && typeof obj === "object") {
    const serialized = {};
    for (const key in obj) {
      if (Object.hasOwn(obj, key)) {
        serialized[key] = serializeErrors(obj[key]);
      }
    }
    return serialized;
  }

  return obj;
}

/**
 * Format log message with optional timestamp
 * Context is only included for ERROR level to keep output clean
 */
function format(level, message, context) {
  let formatted = "";

  if (config.enableTimestamps) {
    formatted += `${new Date().toISOString()} `;
  }

  formatted += `[${level}] ${message}`;

  if (context && level === "ERROR") {
    const serialized = serializeErrors(context);
    formatted += ` ${JSON.stringify(serialized)}`;
  }

  return formatted;
}

/**
 * Write log to all configured outputs
 */
function write(level, message, context, method = "log") {
  const formatted = format(level, message, context);

  config.outputs.forEach((output) => {
    if (output[method]) {
      output[method](formatted);
    } else if (output.write) {
      output.write(formatted + "\n");
    }
  });
}

/**
 * Log error message
 * @param {string} message - Error message
 * @param {Object|Error} context - Additional context or error object
 */
export function error(message, context) {
  if (config.level >= LOG_LEVELS.ERROR) {
    // If context is an Error, extract useful info
    if (context instanceof Error) {
      context = {
        message: context.message,
        stack: context.stack,
        ...context,
      };
    }
    write("ERROR", message, context, "error");
  }
}

/**
 * Log warning message
 * @param {string} message - Warning message
 * @param {Object} context - Additional context
 */
export function warn(message, context) {
  if (config.level >= LOG_LEVELS.WARN) {
    write("WARN", message, context, "warn");
  }
}

/**
 * Log info message
 * @param {string} message - Info message
 * @param {Object} context - Additional context
 */
export function info(message, context) {
  if (config.level >= LOG_LEVELS.INFO) {
    write("INFO", message, context, "log");
  }
}

/**
 * Log debug message
 * @param {string} message - Debug message
 * @param {Object} context - Additional context
 */
export function debug(message, context) {
  if (config.level >= LOG_LEVELS.DEBUG) {
    write("DEBUG", message, context, "log");
  }
}

/**
 * Log HTTP request
 * @param {string} method - HTTP method
 * @param {string} path - Request path
 */
export function http(method, path) {
  info(`${method} ${path}`);
}

/**
 * Simple log without level filtering
 * @param {string} message - Message
 */
export function log(message) {
  console.log(message);
}

/**
 * Create a scoped logger instance that writes to multiple outputs
 * Useful for task-specific logging (console + file)
 * @param {Array} additionalOutputs - Additional output streams (e.g., file streams)
 * @returns {Object} Logger instance with all logging methods
 */
export function createLogger(additionalOutputs = []) {
  const scopedConfig = {
    ...config,
    outputs: [...config.outputs, ...additionalOutputs],
  };

  function scopedWrite(level, message, context, method = "log") {
    const formatted = format(level, message, context);

    scopedConfig.outputs.forEach((output) => {
      if (output[method]) {
        output[method](formatted);
      } else if (output.write) {
        output.write(formatted + "\n");
      }
    });
  }

  return {
    error: (message, context) => {
      if (scopedConfig.level >= LOG_LEVELS.ERROR) {
        if (context instanceof Error) {
          context = {
            message: context.message,
            stack: context.stack,
            ...context,
          };
        }
        scopedWrite("ERROR", message, context, "error");
      }
    },
    warn: (message, context) => {
      if (scopedConfig.level >= LOG_LEVELS.WARN) {
        scopedWrite("WARN", message, context, "warn");
      }
    },
    info: (message, context) => {
      if (scopedConfig.level >= LOG_LEVELS.INFO) {
        scopedWrite("INFO", message, context, "log");
      }
    },
    debug: (message, context) => {
      if (scopedConfig.level >= LOG_LEVELS.DEBUG) {
        scopedWrite("DEBUG", message, context, "log");
      }
    },
    // Raw log without timestamp/level (useful for structured banners)
    raw: (message) => {
      scopedConfig.outputs.forEach((output) => {
        if (output.log) {
          output.log(message);
        } else if (output.write) {
          output.write(message + "\n");
        }
      });
    },
  };
}
