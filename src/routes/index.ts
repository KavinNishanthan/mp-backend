// Importing packages
import { Router } from 'express';

// Importing routes
import authRoute from './auth.route';
import userRoute from './user.route';
import productRoute from './product.route';
import shopRoute from './shop.route';
import vehicleRoute from './vehicle.route';
import stockRoute from './stock.route';
import billRoute from './bill.route';
import paymentRoute from './payment.route';
import dashboardRoute from './dashboard.route';

// Defining router
const router = Router();

// Non-authorization routes
router.use('/users', authRoute);

// Authorization routes
router.use('/users', userRoute);
router.use('/products', productRoute);
router.use('/shops', shopRoute);
router.use('/vehicles', vehicleRoute);
router.use('/stock', stockRoute);
router.use('/bills', billRoute);
router.use('/payments', paymentRoute);
router.use('/dashboard', dashboardRoute);

export default router;
