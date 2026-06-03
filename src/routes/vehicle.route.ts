// Importing packages
import { Router } from 'express';

// Importing controllers
import vehicleController from '../controllers/vehicle.controller';

// Importing middlewares
import authMiddleware from '../middlewares/auth.middleware';

// Defining router
const router = Router();

// Vehicle routes
router
  .route('/')
  .get(authMiddleware.protect, vehicleController.handleGetVehicles)
  .post(authMiddleware.protect, authMiddleware.admin, vehicleController.handleCreateVehicle);

router
  .route('/:id')
  .put(authMiddleware.protect, authMiddleware.admin, vehicleController.handleUpdateVehicle)
  .delete(authMiddleware.protect, authMiddleware.admin, vehicleController.handleDeleteVehicle);

router.route('/:id/assign').put(authMiddleware.protect, authMiddleware.admin, vehicleController.handleAssignDriver);

export default router;
