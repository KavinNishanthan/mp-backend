// Importing packages
import { Request, Response } from 'express';

// Importing models
import userModel from '../models/user.model';

// Importing helpers
import generateToken from '../helpers/generate-token.helper';

// Importing constants
import httpStatusConstant from '../constants/http-message.constant';
import responseMessageConstant from '../constants/response-message.constant';

/**
 * @createdBy Kavin Nishanthan P D
 * @description This function is used to handle user login and return a JWT token
 */
const handleLogin = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    const user = await userModel.findOne({ username });

    if (user && (await user.matchPassword(password))) {
      return res.status(200).json({
        status: httpStatusConstant.OK,
        code: 200,
        message: responseMessageConstant.LOGIN_SUCCESS,
        data: {
          _id: user._id,
          name: user.name,
          username: user.username,
          role: user.role,
          token: generateToken((user._id as unknown) as string)
        }
      });
    }

    return res.status(401).json({
      status: httpStatusConstant.UNAUTHORIZED,
      code: 401,
      message: responseMessageConstant.INVALID_CREDENTIALS
    });
  } catch (err: any) {
    return res.status(500).json({
      status: httpStatusConstant.ERROR,
      code: 500,
      message: responseMessageConstant.SOMETHING_WENT_WRONG
    });
  }
};

/**
 * @createdBy Kavin Nishanthan P D
 * @description This function is used to fetch the profile of the currently authenticated user
 */
const handleGetProfile = async (req: Request, res: Response) => {
  try {
    const user = await userModel.findById(req.user!._id);

    if (!user) {
      return res.status(404).json({
        status: httpStatusConstant.NOT_FOUND,
        code: 404,
        message: responseMessageConstant.USER_NOT_FOUND
      });
    }

    return res.status(200).json({
      status: httpStatusConstant.OK,
      code: 200,
      data: {
        _id: user._id,
        name: user.name,
        username: user.username,
        role: user.role
      }
    });
  } catch (err: any) {
    return res.status(500).json({
      status: httpStatusConstant.ERROR,
      code: 500,
      message: responseMessageConstant.SOMETHING_WENT_WRONG
    });
  }
};

export default { handleLogin, handleGetProfile };
