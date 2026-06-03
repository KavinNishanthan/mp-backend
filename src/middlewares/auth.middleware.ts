// Importing packages
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

// Importing models
import userModel from '../models/user.model';

// Importing constants
import httpStatusConstant from '../constants/http-message.constant';
import responseMessageConstant from '../constants/response-message.constant';

/**
 * @createdBy Kavin Nishanthan P D
 * @description This middleware is used to authenticate requests using JWT from Authorization header
 */
const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      const token = req.headers.authorization.split(' ')[1];

      const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);

      req.user = await userModel.findById(decoded.id).select('-password') as any;

      next();
      return;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        res.status(401).json({
          status: httpStatusConstant.UNAUTHORIZED,
          code: 401,
          message: responseMessageConstant.SESSION_EXPIRED
        });
        return;
      }

      res.status(401).json({
        status: httpStatusConstant.UNAUTHORIZED,
        code: 401,
        message: responseMessageConstant.NOT_AUTHORIZED
      });
      return;
    }
  }

  res.status(401).json({
    status: httpStatusConstant.UNAUTHORIZED,
    code: 401,
    message: responseMessageConstant.TOKEN_MISSING
  });
};

/**
 * @createdBy Kavin Nishanthan P D
 * @description This middleware checks if the authenticated user has admin role
 */
const admin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(401).json({
      status: httpStatusConstant.UNAUTHORIZED,
      code: 401,
      message: responseMessageConstant.NOT_AUTHORIZED_AS_ADMIN
    });
  }
};

export default { protect, admin };
