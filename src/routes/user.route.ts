// Importing packages
import { Router } from 'express';

// Importing controllers
import userController from '../controllers/user.controller';

// Importing middlewares
import authMiddleware from '../middlewares/auth.middleware';

// Defining router
const router = Router();

// User routes
router
  .route('/')
  .post(authMiddleware.protect, authMiddleware.admin, userController.handleRegisterUser)
  .get(authMiddleware.protect, authMiddleware.admin, userController.handleGetUsers);

router
  .route('/:id')
  .delete(authMiddleware.protect, authMiddleware.admin, userController.handleDeleteUser)
  .put(authMiddleware.protect, authMiddleware.admin, userController.handleUpdateUser);

export default router;
