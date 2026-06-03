// Importing packages
import { Router } from 'express';

// Importing controllers
import shopController from '../controllers/shop.controller';

// Importing middlewares
import authMiddleware from '../middlewares/auth.middleware';

// Defining router
const router = Router();

// Shop routes
router
  .route('/')
  .get(authMiddleware.protect, shopController.handleGetShops)
  .post(authMiddleware.protect, authMiddleware.admin, shopController.handleCreateShop);

router
  .route('/:id')
  .get(authMiddleware.protect, shopController.handleGetShopById)
  .put(authMiddleware.protect, authMiddleware.admin, shopController.handleUpdateShop)
  .delete(authMiddleware.protect, authMiddleware.admin, shopController.handleDeleteShop);

router.get('/:id/history', authMiddleware.protect, authMiddleware.admin, shopController.handleGetShopHistory);

export default router;
