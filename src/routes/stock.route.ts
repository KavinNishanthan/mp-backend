// Importing packages
import { Router } from 'express';

// Importing controllers
import stockController from '../controllers/stock.controller';

// Importing middlewares
import authMiddleware from '../middlewares/auth.middleware';

// Defining router
const router = Router();

// Stock routes
router.get('/', authMiddleware.protect, stockController.handleGetStock);
router.post('/transfer', authMiddleware.protect, authMiddleware.admin, stockController.handleTransferStock);

export default router;
