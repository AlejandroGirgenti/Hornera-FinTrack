import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
import { byCategoryHandler, monthlyTrendHandler, summaryHandler } from './reports.controller';

export const reportsRouter = Router();

// Todas las rutas de reportes requieren sesión
reportsRouter.use(requireAuth);

reportsRouter.get('/summary', summaryHandler);
reportsRouter.get('/by-category', byCategoryHandler);
reportsRouter.get('/monthly-trend', monthlyTrendHandler);
