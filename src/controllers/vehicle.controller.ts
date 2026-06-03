// Importing packages
import { Request, Response } from 'express';

// Importing models
import vehicleModel from '../models/vehicle.model';
import userModel from '../models/user.model';

// Importing constants
import httpStatusConstant from '../constants/http-message.constant';
import responseMessageConstant from '../constants/response-message.constant';

/**
 * @createdBy Kavin Nishanthan P D
 * @description This function is used to fetch all active vehicles
 */
const handleGetVehicles = async (req: Request, res: Response) => {
  try {
    const vehicles = await vehicleModel.find({ isActive: true }).populate('driverId', 'name username');

    return res.status(200).json({
      status: httpStatusConstant.OK,
      code: 200,
      data: vehicles
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
 * @description This function is used to create a new vehicle
 */
const handleCreateVehicle = async (req: Request, res: Response) => {
  try {
    const { registrationNumber, name } = req.body;

    const vehicleExists = await vehicleModel.findOne({ registrationNumber });

    if (vehicleExists) {
      return res.status(400).json({
        status: httpStatusConstant.BAD_REQUEST,
        code: 400,
        message: responseMessageConstant.VEHICLE_ALREADY_EXISTS
      });
    }

    const vehicle = new vehicleModel({ registrationNumber, name });
    const createdVehicle = await vehicle.save();

    return res.status(201).json({
      status: httpStatusConstant.CREATED,
      code: 201,
      message: responseMessageConstant.VEHICLE_CREATED,
      data: createdVehicle
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
 * @description This function is used to update a vehicle by ID
 */
const handleUpdateVehicle = async (req: Request, res: Response) => {
  try {
    const { registrationNumber, name } = req.body;

    const vehicle = await vehicleModel.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({
        status: httpStatusConstant.NOT_FOUND,
        code: 404,
        message: responseMessageConstant.VEHICLE_NOT_FOUND
      });
    }

    vehicle.registrationNumber = registrationNumber || vehicle.registrationNumber;
    vehicle.name = name || vehicle.name;

    const updatedVehicle = await vehicle.save();

    return res.status(200).json({
      status: httpStatusConstant.OK,
      code: 200,
      message: responseMessageConstant.VEHICLE_UPDATED,
      data: updatedVehicle
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
 * @description This function is used to soft delete a vehicle by ID
 */
const handleDeleteVehicle = async (req: Request, res: Response) => {
  try {
    const vehicle = await vehicleModel.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({
        status: httpStatusConstant.NOT_FOUND,
        code: 404,
        message: responseMessageConstant.VEHICLE_NOT_FOUND
      });
    }

    vehicle.isActive = false;
    await vehicle.save();

    return res.status(200).json({
      status: httpStatusConstant.OK,
      code: 200,
      message: responseMessageConstant.VEHICLE_DELETED
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
 * @description This function is used to assign or unassign a driver to a vehicle
 */
const handleAssignDriver = async (req: Request, res: Response) => {
  try {
    const { driverId } = req.body;
    const vehicleId = req.params.id;

    const vehicle = await vehicleModel.findById(vehicleId);

    if (!vehicle) {
      return res.status(404).json({
        status: httpStatusConstant.NOT_FOUND,
        code: 404,
        message: responseMessageConstant.VEHICLE_NOT_FOUND
      });
    }

    if (!driverId) {
      vehicle.driverId = null as any;
      await vehicle.save();

      return res.status(200).json({
        status: httpStatusConstant.OK,
        code: 200,
        message: responseMessageConstant.DRIVER_UNASSIGNED,
        data: vehicle
      });
    }

    const driver = await userModel.findById(driverId);

    if (!driver) {
      return res.status(404).json({
        status: httpStatusConstant.NOT_FOUND,
        code: 404,
        message: responseMessageConstant.DRIVER_NOT_FOUND
      });
    }

    if (driver.role !== 'driver') {
      return res.status(400).json({
        status: httpStatusConstant.BAD_REQUEST,
        code: 400,
        message: responseMessageConstant.USER_NOT_A_DRIVER
      });
    }

    await vehicleModel.updateMany(
      { driverId: driverId, _id: { $ne: vehicleId } },
      { $set: { driverId: null } }
    );

    vehicle.driverId = driverId;
    const updatedVehicle = await vehicle.save();
    await updatedVehicle.populate('driverId', 'name username');

    return res.status(200).json({
      status: httpStatusConstant.OK,
      code: 200,
      data: updatedVehicle
    });
  } catch (err: any) {
    return res.status(500).json({
      status: httpStatusConstant.ERROR,
      code: 500,
      message: responseMessageConstant.SOMETHING_WENT_WRONG
    });
  }
};

export default { handleGetVehicles, handleCreateVehicle, handleUpdateVehicle, handleDeleteVehicle, handleAssignDriver };
