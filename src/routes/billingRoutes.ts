import express from 'express';
import { createBill, getBills, getBillById, updateBill, deleteBill, getBillAuditLog } from '../controllers/billController';
import { createPayment, getPayments } from '../controllers/paymentController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

// Bill Routes
router.post('/bills', protect, createBill);
router.get('/bills', protect, getBills);
router.get('/bills/:id', protect, getBillById);
router.put('/bills/:id', protect, admin, updateBill);
router.delete('/bills/:id', protect, admin, deleteBill);
router.get('/bills/:id/audit', protect, admin, getBillAuditLog);

// Payment Routes
router.post('/payments', protect, createPayment);
router.get('/payments', protect, getPayments);

export default router;
