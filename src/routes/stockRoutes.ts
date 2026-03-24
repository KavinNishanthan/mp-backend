import express from 'express';
import { getStock, transferStock } from '../controllers/stockController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, getStock);
router.post('/transfer', protect, admin, transferStock);

export default router;
