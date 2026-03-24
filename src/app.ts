import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import userRoutes from './routes/userRoutes';
import productRoutes from './routes/productRoutes';
import shopRoutes from './routes/shopRoutes';
import vehicleRoutes from './routes/vehicleRoutes';
import stockRoutes from './routes/stockRoutes';
import billingRoutes from './routes/billingRoutes';
import dashboardRoutes from './routes/dashboardRoutes';

dotenv.config();

const app: Application = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api', billingRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Basic Route
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Milk Distribution System API is running' });
});

// Error Handling Middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

export default app;
