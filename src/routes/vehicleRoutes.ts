import express from 'express';
import {
    getVehicles,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    assignDriver,
} from '../controllers/vehicleController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

router.route('/')
    .get(protect, getVehicles)
    .post(protect, admin, createVehicle);

router.route('/:id')
    .put(protect, admin, updateVehicle)
    .delete(protect, admin, deleteVehicle);

router.route('/:id/assign')
    .put(protect, admin, assignDriver);

export default router;
