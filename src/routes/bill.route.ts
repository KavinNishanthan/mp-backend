// Importing packages
import { Router } from 'express';

// Importing controllers
import billController from '../controllers/bill.controller';

// Importing middlewares
import authMiddleware from '../middlewares/auth.middleware';

// Defining router
const router = Router();

// Bill routes
router.post('/', authMiddleware.protect, billController.handleCreateBill);
router.get('/', authMiddleware.protect, billController.handleGetBills);
router.get('/:id', authMiddleware.protect, billController.handleGetBillById);
router.put('/:id', authMiddleware.protect, authMiddleware.admin, billController.handleUpdateBill);
router.delete('/:id', authMiddleware.protect, authMiddleware.admin, billController.handleDeleteBill);
router.get('/:id/audit', authMiddleware.protect, authMiddleware.admin, billController.handleGetBillAuditLog);

export default router;
