import type { SchemaObject } from '@nestjs/swagger';

// Inline OpenAPI response schemas for RoomsController. Shapes match what the
// endpoints and Nest's built-in exceptions actually return.

const ROOM_EXAMPLE = {
  id: 1,
  name: 'Deluxe Sea View Suite',
  description: 'Sea view, king bed, private balcony',
  createdBy: 1,
  createdAt: '2026-10-21T08:30:00.000Z',
};

const ROOM_PROPERTIES: SchemaObject['properties'] = {
  id: { type: 'integer', example: 1 },
  name: { type: 'string', maxLength: 100, example: 'Deluxe Sea View Suite' },
  description: {
    type: 'string',
    nullable: true,
    example: 'Sea view, king bed, private balcony',
  },
  createdBy: {
    type: 'integer',
    nullable: true,
    description: 'ID of the admin who created the room',
    example: 1,
  },
  createdAt: {
    type: 'string',
    format: 'date-time',
    example: '2026-10-21T08:30:00.000Z',
  },
};

export const ROOM_SCHEMA: SchemaObject = {
  type: 'object',
  properties: ROOM_PROPERTIES,
  example: ROOM_EXAMPLE,
};

export const PAGINATED_ROOMS_SCHEMA: SchemaObject = {
  type: 'object',
  properties: {
    data: {
      type: 'array',
      items: { type: 'object', properties: ROOM_PROPERTIES },
    },
    meta: {
      type: 'object',
      properties: {
        total: {
          type: 'integer',
          description: 'Rooms matching the search',
          example: 12,
        },
        page: { type: 'integer', example: 1 },
        limit: { type: 'integer', example: 10 },
        totalPages: { type: 'integer', example: 2 },
      },
    },
  },
  example: {
    data: [
      ROOM_EXAMPLE,
      {
        id: 2,
        name: 'Standard City Room',
        description: 'City view, queen bed',
        createdBy: 1,
        createdAt: '2026-10-21T08:35:00.000Z',
      },
    ],
    meta: { total: 12, page: 1, limit: 10, totalPages: 2 },
  },
};

export const DELETED_ROOM_SCHEMA: SchemaObject = {
  type: 'object',
  properties: {
    message: { type: 'string', example: 'Room 1 deleted' },
    room: { type: 'object', properties: ROOM_PROPERTIES },
  },
  example: { message: 'Room 1 deleted', room: ROOM_EXAMPLE },
};

// Nest error body: { statusCode, message, error }. The throttler's 429 body
// has no `error` field, so only statusCode and message are required.
function errorSchema(
  statusCode: number,
  message: string | string[],
  error?: string,
): SchemaObject {
  return {
    type: 'object',
    required: ['statusCode', 'message'],
    properties: {
      statusCode: { type: 'integer', example: statusCode },
      message: {
        oneOf: [
          { type: 'string' },
          { type: 'array', items: { type: 'string' } },
        ],
        description: 'A string, or a list of validation messages',
      },
      error: { type: 'string', example: error },
    },
    example: error ? { statusCode, message, error } : { statusCode, message },
  };
}

export const BODY_VALIDATION_ERROR_SCHEMA = errorSchema(
  400,
  ['name should not be empty', 'name must be a string'],
  'Bad Request',
);

export const ID_VALIDATION_ERROR_SCHEMA = errorSchema(
  400,
  'Validation failed (numeric string is expected)',
  'Bad Request',
);

export const QUERY_VALIDATION_ERROR_SCHEMA = errorSchema(
  400,
  ['limit must not be greater than 100'],
  'Bad Request',
);

export const UNAUTHORIZED_SCHEMA = errorSchema(
  401,
  'Bearer token is required',
  'Unauthorized',
);

export const FORBIDDEN_SCHEMA = errorSchema(
  403,
  'Forbidden resource',
  'Forbidden',
);

export const ROOM_NOT_FOUND_SCHEMA = errorSchema(
  404,
  'Room 99 was not found',
  'Not Found',
);

export const TOO_MANY_REQUESTS_SCHEMA = errorSchema(
  429,
  'ThrottlerException: Too Many Requests',
);
