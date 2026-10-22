import { Router } from 'express';
import { createCategorySchema, updateCategorySchema } from '@fintrack/shared';
import { requireAuth } from '../../middlewares/auth';
import { validateBody } from '../../middlewares/validate';
import { createHandler, deleteHandler, listHandler, updateHandler } from './categories.controller';

export const categoriesRouter = Router();

// Todas las rutas de categorías requieren sesión
categoriesRouter.use(requireAuth);

categoriesRouter.get('/', listHandler);
categoriesRouter.post('/', validateBody(createCategorySchema), createHandler);
categoriesRouter.patch('/:id', validateBody(updateCategorySchema), updateHandler);
categoriesRouter.delete('/:id', deleteHandler);
