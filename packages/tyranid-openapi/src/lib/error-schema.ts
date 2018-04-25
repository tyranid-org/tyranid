/**
 * error response schema
 */
export default {
  ErrorInvalidRequest: {
    type: 'object',
    properties: {
      status: { type: 'number', enum: [400] },
      message: { type: 'string' }
    }
  },

  ErrorInternalServer: {
    type: 'object',
    properties: {
      status: { type: 'number', enum: [500] },
      message: { type: 'string' }
    }
  },

  ErrorPermissionDenied: {
    type: 'object',
    properties: {
      status: { type: 'number', enum: [403] },
      message: { type: 'string' }
    }
  },

  ErrorTooManyRequests: {
    type: 'object',
    properties: {
      status: { type: 'number', enum: [429] },
      message: { type: 'string' }
    }
  }
};
