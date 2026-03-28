import { Types } from "mongoose";

interface Iuser{
    name: string;
    username: string;
    phone: string;
    password?: string;
    profilePicture?: string;
    roll:"Admin"|"driver"
}


interface Ivehicle extends Document{
    registrationNumber: string;
    name?: string;
    driverId: Types.ObjectId;
    iaActive?: boolean;
}

interface IStockMovementItem {
    productId: Types.ObjectId;
    quantity: number;
}

interface IStockMovement extends Document {
    type: 'FACTORY_TO_WAREHOUSE' | 'WAREHOUSE_TO_VEHICLE' | 'VEHICLE_TO_WAREHOUSE' | 'VEHICLE_TO_VEHICLE' | 'CORRECTION' | 'SALE';
    sourceLocation?: 'warehouse' | 'vehicle' | 'factory';
    sourceVehicleId?: Types.ObjectId;
    destinationLocation?: 'warehouse' | 'vehicle';
    destinationVehicleId?: Types.ObjectId;
    items: IStockMovementItem[];
    date: Date;
    performedBy: Types.ObjectId;
    description?: string;
}


interface IStockItem {
    productId: Types.ObjectId;
    quantity: number;
}


interface IStock {
    location: 'warehouse' | 'vehicle';
    vehicleId?: Types.ObjectId;
    items: IStockItem[];
}


interface ICustomPrice {
    productId: Types.ObjectId;
    price: number;
}


interface IShop extends Document {
    name: string;
    address: string;
    contactNumber?: string;
    customPrices: ICustomPrice[];
    outstandingBalance: number;
    isActive: boolean;
}


interface IProduct extends Document {
    name: string;
    costPrice: number;
    defaultSellingPrice: number;
    unit: string;
    isActive: boolean;
}


interface IPayment extends Document {
    shopId: Types.ObjectId;
    billId?: Types.ObjectId;
    amount: number;
    date: Date;
    driverId: Types.ObjectId;
    vehicleId: Types.ObjectId;
    outstandingBalanceSnapshot: number;
}


interface IBillAuditLog extends Document {
    billId: Types.ObjectId;
    action: 'EDIT' | 'DELETE';
    originalData: Record<string, any>;
    modifiedData?: Record<string, any>;
    adminId: Types.ObjectId;
    reason?: string;
    timestamp: Date;
}


interface IBillItem {
    productId: Types.ObjectId;
    quantity: number;
    sellingPrice: number;
    total: number;
    costPriceSnapshot: number;
}


interface IBill extends Document {
    shopId: Types.ObjectId;
    vehicleId: Types.ObjectId;
    driverId: Types.ObjectId;
    date: Date;
    items: IBillItem[];
    totalAmount: number;
    paidAmount: number;
    balanceOnBill: number;
    isDeleted: boolean;
    deletedAt?: Date;
    deletedBy?: Types.ObjectId;
}


export{Iuser, Ivehicle, IStockMovement, IStockItem, IStock, ICustomPrice, IShop, IProduct, IPayment, IBillAuditLog, IBillItem, IBill}

