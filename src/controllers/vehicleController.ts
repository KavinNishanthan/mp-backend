import { Request, Response } from 'express';
import Vehicle from '../models/Vehicle';
import User from '../models/User';

// @desc    Get all vehicles
// @route   GET /api/vehicles
// @access  Private (Admin & Driver)
export const getVehicles = async (req: Request, res: Response) => {
    // Populate driver details for display
    const vehicles = await Vehicle.find({ isActive: true }).populate('driverId', 'name username');
    res.json(vehicles);
};

// @desc    Create a vehicle
// @route   POST /api/vehicles
// @access  Private/Admin
export const createVehicle = async (req: Request, res: Response) => {
    const { registrationNumber, name } = req.body;

    const vehicleExists = await Vehicle.findOne({ registrationNumber });

    if (vehicleExists) {
        res.status(400).json({ message: 'Vehicle with this registration number already exists' });
        return;
    }

    const vehicle = new Vehicle({
        registrationNumber,
        name,
    });

    const createdVehicle = await vehicle.save();
    res.status(201).json(createdVehicle);
};

// @desc    Update a vehicle
// @route   PUT /api/vehicles/:id
// @access  Private/Admin
export const updateVehicle = async (req: Request, res: Response) => {
    const { registrationNumber, name } = req.body;

    const vehicle = await Vehicle.findById(req.params.id);

    if (vehicle) {
        vehicle.registrationNumber = registrationNumber || vehicle.registrationNumber;
        vehicle.name = name || vehicle.name;

        const updatedVehicle = await vehicle.save();
        res.json(updatedVehicle);
    } else {
        res.status(404).json({ message: 'Vehicle not found' });
    }
};

// @desc    Delete a vehicle (Soft delete)
// @route   DELETE /api/vehicles/:id
// @access  Private/Admin
export const deleteVehicle = async (req: Request, res: Response) => {
    const vehicle = await Vehicle.findById(req.params.id);

    if (vehicle) {
        vehicle.isActive = false;
        await vehicle.save();
        res.json({ message: 'Vehicle removed' });
    } else {
        res.status(404).json({ message: 'Vehicle not found' });
    }
};

// @desc    Assign driver to vehicle
// @route   PUT /api/vehicles/:id/assign
// @access  Private/Admin
export const assignDriver = async (req: Request, res: Response) => {
    const { driverId } = req.body;
    const vehicleId = req.params.id;

    const vehicle = await Vehicle.findById(vehicleId);

    if (!vehicle) {
        res.status(404).json({ message: 'Vehicle not found' });
        return;
    }

    // If unassigning (driverId is null or empty)
    if (!driverId) {
        vehicle.driverId = null as any;
        await vehicle.save();
        res.json({ message: 'Driver unassigned', vehicle });
        return;
    }

    // Validate Driver
    const driver = await User.findById(driverId);
    if (!driver) {
        res.status(404).json({ message: 'Driver not found' });
        return;
    }

    if (driver.role !== 'driver') {
        res.status(400).json({ message: 'User is not a driver' });
        return;
    }

    // Check if driver is already assigned to ANOTHER vehicle?
    // Business logic: "Assign drivers to vehicles on a daily basis".
    // Ideally a driver drives one vehicle.
    // We should probably check if this driver is assigned elsewhere and warn or auto-unassign?
    // For simplicity and robustness, let's find any other vehicle where this driver is assigned and unassign them.
    await Vehicle.updateMany(
        { driverId: driverId, _id: { $ne: vehicleId } },
        { $set: { driverId: null } }
    );

    vehicle.driverId = driverId;
    const updatedVehicle = await vehicle.save();

    // Populate for response
    await updatedVehicle.populate('driverId', 'name username');

    res.json(updatedVehicle);
};
