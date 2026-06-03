// Importing packages
import { Request, Response } from 'express';

// Importing models
import userModel from '../models/user.model';

// Importing constants
import httpStatusConstant from '../constants/http-message.constant';
import responseMessageConstant from '../constants/response-message.constant';

/**
 * @createdBy Kavin Nishanthan P D
 * @description This function is used to register a new user (Driver or Admin)
 */
const handleRegisterUser = async (req: Request, res: Response) => {
  try {
    const { name, username, password, role } = req.body;

    const userExists = await userModel.findOne({ username });

    if (userExists) {
      return res.status(400).json({
        status: httpStatusConstant.BAD_REQUEST,
        code: 400,
        message: responseMessageConstant.USER_ALREADY_EXISTS
      });
    }

    const user = await userModel.create({ name, username, password, role });

    if (user) {
      return res.status(201).json({
        status: httpStatusConstant.CREATED,
        code: 201,
        message: responseMessageConstant.USER_CREATED,
        data: {
          _id: user._id,
          name: user.name,
          username: user.username,
          role: user.role
        }
      });
    }

    return res.status(400).json({
      status: httpStatusConstant.BAD_REQUEST,
      code: 400,
      message: responseMessageConstant.INVALID_USER_DATA
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
 * @description This function is used to fetch all users
 */
const handleGetUsers = async (req: Request, res: Response) => {
  try {
    const users = await userModel.find({}).select('-password');

    return res.status(200).json({
      status: httpStatusConstant.OK,
      code: 200,
      data: users
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
 * @description This function is used to delete a user by ID
 */
const handleDeleteUser = async (req: Request, res: Response) => {
  try {
    const user = await userModel.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        status: httpStatusConstant.NOT_FOUND,
        code: 404,
        message: responseMessageConstant.USER_NOT_FOUND
      });
    }

    await user.deleteOne();

    return res.status(200).json({
      status: httpStatusConstant.OK,
      code: 200,
      message: responseMessageConstant.USER_DELETED
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
 * @description This function is used to update a user by ID
 */
const handleUpdateUser = async (req: Request, res: Response) => {
  try {
    const user = await userModel.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        status: httpStatusConstant.NOT_FOUND,
        code: 404,
        message: responseMessageConstant.USER_NOT_FOUND
      });
    }

    user.name = req.body.name || user.name;
    user.username = req.body.username || user.username;

    if (req.body.password) {
      user.password = req.body.password;
    }

    if (req.body.role) {
      user.role = req.body.role;
    }

    const updatedUser = await user.save();

    return res.status(200).json({
      status: httpStatusConstant.OK,
      code: 200,
      message: responseMessageConstant.USER_UPDATED,
      data: {
        _id: updatedUser._id,
        name: updatedUser.name,
        username: updatedUser.username,
        role: updatedUser.role
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

export default { handleRegisterUser, handleGetUsers, handleDeleteUser, handleUpdateUser };
