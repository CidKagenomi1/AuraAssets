import { z } from 'zod';

export const createOrderSchema = z
  .object({
    symbol: z
      .string()
      .trim()
      .min(1, 'Stock symbol is required')
      .max(16, 'Stock symbol is too long')
      .transform((s) => s.toUpperCase()),
    side: z
      .enum(['BUY', 'SELL'], {
        required_error: 'Order side (BUY or SELL) is required'
      }),
    type: z
      .enum(['LIMIT', 'MARKET'], {
        required_error: 'Order type (LIMIT or MARKET) is required'
      }),
    price: z
      .number()
      .int('Price must be an integer in smallest currency unit')
      .positive('Price must be greater than zero')
      .nullable()
      .optional(),
    quantity: z
      .number({
        required_error: 'Quantity is required'
      })
      .int('Quantity must be a positive integer')
      .positive('Quantity must be greater than zero'),
    idempotencyKey: z
      .string({
        required_error: 'idempotencyKey is required to prevent duplicate orders'
      })
      .trim()
      .min(8, 'idempotencyKey must be at least 8 characters')
      .max(128, 'idempotencyKey must be at most 128 characters')
  })
  .superRefine((data, ctx) => {
    if (data.type === 'LIMIT' && (data.price === null || data.price === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['price'],
        message: 'price is required for LIMIT orders'
      });
    }
    if (data.type === 'MARKET' && data.price !== null && data.price !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['price'],
        message: 'price must be omitted or null for MARKET orders'
      });
    }
  });

export const cancelOrderParamsSchema = z.object({
  id: z.string().uuid('Order ID must be a valid UUID')
});

export const myOrdersQuerySchema = z.object({
  symbol: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.toUpperCase() : undefined)),
  status: z
    .enum(['OPEN', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED', 'REJECTED', 'ACTIVE'])
    .optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50)
});

export const symbolParamsSchema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1)
    .max(16)
    .transform((s) => s.toUpperCase())
});

