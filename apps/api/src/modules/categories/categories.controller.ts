import type { Request, Response } from 'express';
import { listCategoriesQuerySchema } from '@fintrack/shared';
import type { CreateCategoryInput, UpdateCategoryInput } from '@fintrack/shared';
import { badRequest, notFound, unauthorized } from '../../lib/errors';
import * as categoriesService from './categories.service';

function currentUserId(req: Request): string {
  if (!req.userId) throw unauthorized('MISSING_ACCESS_TOKEN', 'Falta el token de acceso');
  return req.userId;
}

function categoryId(req: Request): string {
  const id = req.params.id;
  // En Express 5 un parámetro puede tipar como string | string[]; acá siempre es un string
  if (typeof id !== 'string' || !id) throw notFound('CATEGORY_NOT_FOUND', 'La categoría no existe');
  return id;
}

export async function listHandler(req: Request, res: Response) {
  const query = listCategoriesQuerySchema.safeParse(req.query);
  if (!query.success) {
    const details = query.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    throw badRequest('VALIDATION_ERROR', 'Los filtros enviados no son válidos', details);
  }

  const data = await categoriesService.listCategories(currentUserId(req), query.data.type);
  res.json({ data });
}

export async function createHandler(req: Request, res: Response) {
  const data = await categoriesService.createCategory(
    currentUserId(req),
    req.body as CreateCategoryInput,
  );
  res.status(201).json({ data });
}

export async function updateHandler(req: Request, res: Response) {
  const data = await categoriesService.updateCategory(
    currentUserId(req),
    categoryId(req),
    req.body as UpdateCategoryInput,
  );
  res.json({ data });
}

export async function deleteHandler(req: Request, res: Response) {
  await categoriesService.deleteCategory(currentUserId(req), categoryId(req));
  res.status(204).end();
}
