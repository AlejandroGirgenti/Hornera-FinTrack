import { Router } from 'express';
import { copyBudgetsSchema, setBudgetSchema } from '@fintrack/shared';
import { requireAuth } from '../../middlewares/auth';
import { validateBody } from '../../middlewares/validate';
import {
  copyBudgetsHandler,
  getBudgetsHandler,
  removeBudgetHandler,
  setBudgetHandler,
} from './budgets.controller';

export const budgetsRouter = Router();

// Todas las rutas de presupuestos requieren sesión
budgetsRouter.use(requireAuth);

budgetsRouter.get('/', getBudgetsHandler);
budgetsRouter.put('/', validateBody(setBudgetSchema), setBudgetHandler);
budgetsRouter.delete('/', removeBudgetHandler);
budgetsRouter.post('/copy', validateBody(copyBudgetsSchema), copyBudgetsHandler);
