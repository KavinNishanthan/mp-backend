// Importing packages
import { Router } from 'express';

// Importing controllers
import dashboardController from '../controllers/dashboard.controller';

// Importing middlewares
import authMiddleware from '../middlewares/auth.middleware';

// Defining router
const router = Router();

// Dashboard routes
router.get('/stats', authMiddleware.protect, authMiddleware.admin, dashboardController.handleGetAdminDashboardStats);
router.get('/profit', authMiddleware.protect, authMiddleware.admin, dashboardController.handleGetProfitReport);
router.get('/reports', authMiddleware.protect, authMiddleware.admin, dashboardController.handleGetFinancialReport);
router.get('/vehicle-history/:vehicleId', authMiddleware.protect, authMiddleware.admin, dashboardController.handleGetVehicleHistory);

export default router;
