/**
 * Standardized API response helpers
 */

/**
 * Success response
 * @param {any} data - Response data
 * @param {string} message - Optional message
 * @returns {object} Formatted success response
 */
export function success(data, message = null) {
  const response = {
    success: true,
    data,
  };

  if (message) {
    response.message = message;
  }

  return response;
}

/**
 * Paginated success response
 * @param {Array} items - Array of items
 * @param {object} pagination - Pagination info
 * @returns {object} Formatted paginated response
 */
export function paginated(items, pagination) {
  return {
    success: true,
    data: items,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
      hasMore: pagination.page * pagination.limit < pagination.total,
    },
  };
}

/**
 * Error response
 * @param {string} code - Error code
 * @param {string} message - Error message
 * @param {any} details - Optional error details
 * @returns {object} Formatted error response
 */
export function error(code, message, details = null) {
  const response = {
    success: false,
    error: {
      code,
      message,
    },
  };

  if (details) {
    response.error.details = details;
  }

  return response;
}

/**
 * Send success response
 * @param {Response} res - Express response
 * @param {any} data - Response data
 * @param {number} statusCode - HTTP status code
 */
export function sendSuccess(res, data, statusCode = 200) {
  res.status(statusCode).json(success(data));
}

/**
 * Send paginated response
 * @param {Response} res - Express response
 * @param {Array} items - Array of items
 * @param {object} pagination - Pagination info
 */
export function sendPaginated(res, items, pagination) {
  res.status(200).json(paginated(items, pagination));
}

/**
 * Send error response
 * @param {Response} res - Express response
 * @param {number} statusCode - HTTP status code
 * @param {string} code - Error code
 * @param {string} message - Error message
 * @param {any} details - Optional details
 */
export function sendError(res, statusCode, code, message, details = null) {
  res.status(statusCode).json(error(code, message, details));
}
