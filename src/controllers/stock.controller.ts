// Importing packages
import { Request, Response } from 'express';
import mongoose from 'mongoose';

// Importing models
import stockModel, { IStock } from '../models/stock.model';
import stockMovementModel from '../models/stock-movement.model';

// Importing constants
import httpStatusConstant from '../constants/http-message.constant';
import responseMessageConstant from '../constants/response-message.constant';

const getStockDoc = async (location: 'warehouse' | 'vehicle', vehicleId?: string) => {
  let query: any = { location };
  if (location === 'vehicle') {
    if (!vehicleId) throw new Error('Vehicle ID required for vehicle stock');
    query.vehicleId = vehicleId;
  }

  let stock = await stockModel.findOne(query);

  if (!stock) {
    stock = new stockModel({
      location,
      vehicleId: location === 'vehicle' ? vehicleId : undefined,
      items: []
    });
    await stock.save();
  }
  return stock;
};

/**
 * @createdBy Kavin Nishanthan P D
 * @description This function is used to fetch stock by location (warehouse or specific vehicle)
 */
const handleGetStock = async (req: Request, res: Response) => {
  const { location, vehicleId } = req.query;

  if (!location || (location !== 'warehouse' && location !== 'vehicle')) {
    return res.status(400).json({
      status: httpStatusConstant.BAD_REQUEST,
      code: 400,
      message: responseMessageConstant.INVALID_STOCK_LOCATION
    });
  }

  if (location === 'vehicle' && !vehicleId) {
    return res.status(400).json({
      status: httpStatusConstant.BAD_REQUEST,
      code: 400,
      message: responseMessageConstant.VEHICLE_ID_REQUIRED
    });
  }

  try {
    const stock = await stockModel
      .findOne({
        location: location as string,
        vehicleId: vehicleId ? (vehicleId as string) : undefined
      })
      .populate('items.productId');

    return res.status(200).json({
      status: httpStatusConstant.OK,
      code: 200,
      data: stock || { location, items: [] }
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
 * @description This function is used to transfer stock between warehouse and vehicles
 */
const handleTransferStock = async (req: Request, res: Response) => {
  const { type, vehicleId, targetVehicleId, items, description } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({
      status: httpStatusConstant.BAD_REQUEST,
      code: 400,
      message: responseMessageConstant.NO_ITEMS_TO_TRANSFER
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let sourceStock: IStock | null = null;
    let destStock: IStock | null = null;
    let movementData: any = {
      type,
      items,
      performedBy: req.user!._id,
      description
    };

    if (type === 'FACTORY_TO_WAREHOUSE') {
      destStock = await getStockDoc('warehouse');
      movementData.sourceLocation = 'factory';
      movementData.destinationLocation = 'warehouse';
    } else if (type === 'WAREHOUSE_TO_VEHICLE') {
      if (!vehicleId) throw new Error('Target Vehicle ID required');
      sourceStock = await getStockDoc('warehouse');
      destStock = await getStockDoc('vehicle', vehicleId);
      movementData.sourceLocation = 'warehouse';
      movementData.destinationLocation = 'vehicle';
      movementData.destinationVehicleId = vehicleId;
    } else if (type === 'VEHICLE_TO_WAREHOUSE') {
      if (!vehicleId) throw new Error('Source Vehicle ID required');
      sourceStock = await getStockDoc('vehicle', vehicleId);
      destStock = await getStockDoc('warehouse');
      movementData.sourceLocation = 'vehicle';
      movementData.sourceVehicleId = vehicleId;
      movementData.destinationLocation = 'warehouse';
    } else if (type === 'VEHICLE_TO_VEHICLE') {
      if (!vehicleId || !targetVehicleId) throw new Error('Both Source and Target Vehicle IDs required');
      sourceStock = await getStockDoc('vehicle', vehicleId);
      destStock = await getStockDoc('vehicle', targetVehicleId);
      movementData.sourceLocation = 'vehicle';
      movementData.sourceVehicleId = vehicleId;
      movementData.destinationLocation = 'vehicle';
      movementData.destinationVehicleId = targetVehicleId;
    } else {
      throw new Error('Invalid transfer type');
    }

    for (const item of items) {
      if (sourceStock) {
        const sourceItem = sourceStock.items.find((i) => i.productId.toString() === item.productId);
        if (!sourceItem || sourceItem.quantity < item.quantity) {
          throw new Error(`Insufficient stock for product ${item.productId}`);
        }
        sourceItem.quantity -= item.quantity;
      }

      if (destStock) {
        const destItem = destStock.items.find((i) => i.productId.toString() === item.productId);
        if (destItem) {
          destItem.quantity += item.quantity;
        } else {
          destStock.items.push({ productId: item.productId, quantity: item.quantity });
        }
      }
    }

    if (sourceStock) await sourceStock.save({ session });
    if (destStock) await destStock.save({ session });

    await stockMovementModel.create([movementData], { session });

    await session.commitTransaction();

    return res.status(200).json({
      status: httpStatusConstant.OK,
      code: 200,
      message: responseMessageConstant.STOCK_TRANSFER_SUCCESS
    });
  } catch (error: any) {
    await session.abortTransaction();

    return res.status(400).json({
      status: httpStatusConstant.BAD_REQUEST,
      code: 400,
      message: error.message
    });
  } finally {
    session.endSession();
  }
};

export default { handleGetStock, handleTransferStock };
