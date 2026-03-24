import express from 'express';
import { getAdminDashboardStats, getProfitReport, getFinancialReport, getVehicleHistory } from '../controllers/dashboardController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/stats', protect, admin, getAdminDashboardStats);
router.get('/profit', protect, admin, getProfitReport);
router.get('/reports', protect, admin, getFinancialReport);
router.get('/vehicle-history/:vehicleId', protect, admin, getVehicleHistory);

export default router;
