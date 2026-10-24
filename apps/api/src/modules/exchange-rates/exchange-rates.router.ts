import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth';
import { usdRateHandler } from './exchange-rates.controller';

export const exchangeRatesRouter = Router();

// Requiere sesión para que la API no sea un proxy abierto de la fuente externa
exchangeRatesRouter.use(requireAuth);

exchangeRatesRouter.get('/usd', usdRateHandler);
