// Importing packages
import { Router } from 'express';

// Importing controllers
import productController from '../controllers/product.controller';

// Importing middlewares
import authMiddleware from '../middlewares/auth.middleware';

// Defining router
const router = Router();

// Product routes
router
  .route('/')
  .get(authMiddleware.protect, productController.handleGetProducts)
  .post(authMiddleware.protect, authMiddleware.admin, productController.handleCreateProduct);

router
  .route('/:id')
  .put(authMiddleware.protect, authMiddleware.admin, productController.handleUpdateProduct)
  .delete(authMiddleware.protect, authMiddleware.admin, productController.handleDeleteProduct);

export default router;
