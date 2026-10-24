import { Router } from 'express';
import { createTransactionSchema, updateTransactionSchema } from '@fintrack/shared';
import { requireAuth } from '../../middlewares/auth';
import { validateBody } from '../../middlewares/validate';
import {
  createHandler,
  deleteHandler,
  exportHandler,
  getHandler,
  listHandler,
  updateHandler,
} from './transactions.controller';

export const transactionsRouter = Router();

// Todas las rutas de movimientos requieren sesión
transactionsRouter.use(requireAuth);

transactionsRouter.get('/', listHandler);
// Tiene que ir antes de '/:id', si no "export" se tomaría como un id
transactionsRouter.get('/export', exportHandler);
transactionsRouter.post('/', validateBody(createTransactionSchema), createHandler);
transactionsRouter.get('/:id', getHandler);
transactionsRouter.patch('/:id', validateBody(updateTransactionSchema), updateHandler);
transactionsRouter.delete('/:id', deleteHandler);
