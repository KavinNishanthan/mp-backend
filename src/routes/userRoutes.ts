import express from 'express';
import { authUser, getUserProfile } from '../controllers/authController';
import { registerUser, getUsers, deleteUser, updateUser } from '../controllers/userController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/login', authUser);
router.route('/profile').get(protect, getUserProfile);
router.route('/').post(protect, admin, registerUser).get(protect, admin, getUsers);
router
    .route('/:id')
    .delete(protect, admin, deleteUser)
    .put(protect, admin, updateUser);

export default router;
