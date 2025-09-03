import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export function validateRequest(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          ok: false,
          error: 'Validation error',
          details: error.errors,
        });
      }
      
      return res.status(500).json({
        ok: false,
        error: 'Internal validation error',
      });
    }
  };
}

export function validateQuery(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = await schema.parseAsync(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          ok: false,
          error: 'Query validation error',
          details: error.errors,
        });
      }
      
      return res.status(500).json({
        ok: false,
        error: 'Internal validation error',
      });
    }
  };
}

export function validateParams(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = await schema.parseAsync(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          ok: false,
          error: 'Parameter validation error',
          details: error.errors,
        });
      }
      
      return res.status(500).json({
        ok: false,
        error: 'Internal validation error',
      });
    }
  };
}