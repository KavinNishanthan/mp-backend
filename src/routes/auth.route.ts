// Importing packages
import { Router } from 'express';

// Importing controllers
import authController from '../controllers/auth.controller';

// Importing middlewares
import authMiddleware from '../middlewares/auth.middleware';

// Defining router
const router = Router();

// Auth routes
router.post('/login', authController.handleLogin);
router.get('/profile', authMiddleware.protect, authController.handleGetProfile);

export default router;
