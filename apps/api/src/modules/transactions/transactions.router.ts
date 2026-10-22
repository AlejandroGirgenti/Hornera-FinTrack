import { Router } from 'express';
import { createTransactionSchema, updateTransactionSchema } from '@fintrack/shared';
import { requireAuth } from '../../middlewares/auth';
import { validateBody } from '../../middlewares/validate';
import {
  createHandler,
  deleteHandler,
  getHandler,
  listHandler,
  updateHandler,
} from './transactions.controller';

export const transactionsRouter = Router();

// Todas las rutas de movimientos requieren sesión
transactionsRouter.use(requireAuth);

transactionsRouter.get('/', listHandler);
transactionsRouter.post('/', validateBody(createTransactionSchema), createHandler);
transactionsRouter.get('/:id', getHandler);
transactionsRouter.patch('/:id', validateBody(updateTransactionSchema), updateHandler);
transactionsRouter.delete('/:id', deleteHandler);
