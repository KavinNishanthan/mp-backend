import { Request, Response } from 'express';
import Stock, { IStock } from '../models/Stock';
import StockMovement from '../models/StockMovement';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/authMiddleware';

// Helper to get or create stock document for a location
const getStockDoc = async (location: 'warehouse' | 'vehicle', vehicleId?: string) => {
    let query: any = { location };
    if (location === 'vehicle') {
        if (!vehicleId) throw new Error('Vehicle ID required for vehicle stock');
        query.vehicleId = vehicleId;
    }

    let stock = await Stock.findOne(query);

    if (!stock) {
        stock = new Stock({
            location,
            vehicleId: location === 'vehicle' ? vehicleId : undefined,
            items: [],
        });
        await stock.save();
    }
    return stock;
};

// @desc    Get stock by location (Warehouse or specific Vehicle)
// @route   GET /api/stock
// @access  Private
export const getStock = async (req: Request, res: Response) => {
    const { location, vehicleId } = req.query;

    if (!location || (location !== 'warehouse' && location !== 'vehicle')) {
        res.status(400).json({ message: 'Invalid location. Must be warehouse or vehicle' });
        return;
    }

    if (location === 'vehicle' && !vehicleId) {
        res.status(400).json({ message: 'Vehicle ID is required for vehicle stock' });
        return;
    }

    try {
        const stock = await Stock.findOne({
            location: location as string,
            vehicleId: vehicleId ? (vehicleId as string) : undefined
        }).populate('items.productId');

        res.json(stock || { location, items: [] });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Transfer/Update Stock
// @route   POST /api/stock/transfer
// @access  Private/Admin
export const transferStock = async (req: AuthRequest, res: Response) => {
    const { type, vehicleId, targetVehicleId, items, description } = req.body;
    // items: [{ productId, quantity }]

    if (!items || items.length === 0) {
        res.status(400).json({ message: 'No items to transfer' });
        return;
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
            description,
        };

        // 1. FACTORY -> WAREHOUSE
        if (type === 'FACTORY_TO_WAREHOUSE') {
            destStock = await getStockDoc('warehouse');
            movementData.sourceLocation = 'factory';
            movementData.destinationLocation = 'warehouse';
        }
        // 2. WAREHOUSE -> VEHICLE
        else if (type === 'WAREHOUSE_TO_VEHICLE') {
            if (!vehicleId) throw new Error('Target Vehicle ID required');
            sourceStock = await getStockDoc('warehouse');
            destStock = await getStockDoc('vehicle', vehicleId);

            movementData.sourceLocation = 'warehouse';
            movementData.destinationLocation = 'vehicle';
            movementData.destinationVehicleId = vehicleId;
        }
        // 3. VEHICLE -> WAREHOUSE
        else if (type === 'VEHICLE_TO_WAREHOUSE') {
            if (!vehicleId) throw new Error('Source Vehicle ID required');
            sourceStock = await getStockDoc('vehicle', vehicleId);
            destStock = await getStockDoc('warehouse');

            movementData.sourceLocation = 'vehicle';
            movementData.sourceVehicleId = vehicleId;
            movementData.destinationLocation = 'warehouse';
        }
        // 4. VEHICLE -> VEHICLE
        else if (type === 'VEHICLE_TO_VEHICLE') {
            if (!vehicleId || !targetVehicleId) throw new Error('Both Source and Target Vehicle IDs required');
            sourceStock = await getStockDoc('vehicle', vehicleId);
            destStock = await getStockDoc('vehicle', targetVehicleId);

            movementData.sourceLocation = 'vehicle';
            movementData.sourceVehicleId = vehicleId;
            movementData.destinationLocation = 'vehicle';
            movementData.destinationVehicleId = targetVehicleId;
        }
        // 5. CORRECTION (Direct update to a stock)
        else if (type === 'CORRECTION') {
            // For correction, we might just update the specific stock.
            // Keeping it simple: Assume correction is just adding/removing from a location directly 
            // without source/dest logic or implicitly Factory/Drain.
            // Logic below needs strict source/dest handling.
            // Let's implement correction as "Set absolute quantity" or "Adjustment".
            // For now, let's treat CORRECTION as a privileged operation handled differently or reuse the add/remove logic.
            // We will skip complex correction logic here and assume users use transfers to fix things for now,
            // or implement a specific 'adjustStock' endpoint.
            throw new Error('CORRECTION type not fully implemented in transfer endpoint');
        }
        else {
            throw new Error('Invalid transfer type');
        }

        // Process Transfer
        for (const item of items) {
            // Deduct from Source
            if (sourceStock) {
                const sourceItem = sourceStock.items.find(i => i.productId.toString() === item.productId);
                if (!sourceItem || sourceItem.quantity < item.quantity) {
                    throw new Error(`Insufficient stock for product ${item.productId}`);
                }
                sourceItem.quantity -= item.quantity;
            }

            // Add to Destination
            if (destStock) {
                const destItem = destStock.items.find(i => i.productId.toString() === item.productId);
                if (destItem) {
                    destItem.quantity += item.quantity;
                } else {
                    destStock.items.push({ productId: item.productId, quantity: item.quantity });
                }
            }
        }

        if (sourceStock) await sourceStock.save({ session });
        if (destStock) await destStock.save({ session });

        // Log Movement
        await StockMovement.create([movementData], { session });

        await session.commitTransaction();
        res.json({ message: 'Stock transfer successful' });

    } catch (error: any) {
        await session.abortTransaction();
        res.status(400).json({ message: error.message });
    } finally {
        session.endSession();
    }
};
