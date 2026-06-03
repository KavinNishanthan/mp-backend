// Importing packages
import { Router } from 'express';

// Importing controllers
import paymentController from '../controllers/payment.controller';

// Importing middlewares
import authMiddleware from '../middlewares/auth.middleware';

// Defining router
const router = Router();

// Payment routes
router.post('/', authMiddleware.protect, paymentController.handleCreatePayment);
router.get('/', authMiddleware.protect, paymentController.handleGetPayments);

export default router;
