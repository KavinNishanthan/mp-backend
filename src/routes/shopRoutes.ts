import express from 'express';
import {
    getShops,
    createShop,
    updateShop,
    deleteShop,
    getShopById,
    getShopHistory,
} from '../controllers/shopController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

router.route('/')
    .get(protect, getShops)
    .post(protect, admin, createShop);

router.route('/:id')
    .get(protect, getShopById)
    .put(protect, admin, updateShop)
    .delete(protect, admin, deleteShop);

// Shop History (Admin only)
router.get('/:id/history', protect, admin, getShopHistory);

export default router;
