// Importing packages
import { Request, Response } from 'express';

// Importing models
import productModel from '../models/product.model';

// Importing constants
import httpStatusConstant from '../constants/http-message.constant';
import responseMessageConstant from '../constants/response-message.constant';

/**
 * @createdBy Kavin Nishanthan P D
 * @description This function is used to fetch all active products
 */
const handleGetProducts = async (req: Request, res: Response) => {
  try {
    const products = await productModel.find({ isActive: true });

    return res.status(200).json({
      status: httpStatusConstant.OK,
      code: 200,
      data: products
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
 * @description This function is used to create a new product
 */
const handleCreateProduct = async (req: Request, res: Response) => {
  try {
    const { name, costPrice, defaultSellingPrice, unit } = req.body;

    const product = new productModel({ name, costPrice, defaultSellingPrice, unit });
    const createdProduct = await product.save();

    return res.status(201).json({
      status: httpStatusConstant.CREATED,
      code: 201,
      message: responseMessageConstant.PRODUCT_CREATED,
      data: createdProduct
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
 * @description This function is used to update a product by ID
 */
const handleUpdateProduct = async (req: Request, res: Response) => {
  try {
    const { name, costPrice, defaultSellingPrice, unit } = req.body;

    const product = await productModel.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        status: httpStatusConstant.NOT_FOUND,
        code: 404,
        message: responseMessageConstant.PRODUCT_NOT_FOUND
      });
    }

    product.name = name || product.name;
    product.costPrice = costPrice !== undefined ? costPrice : product.costPrice;
    product.defaultSellingPrice = defaultSellingPrice !== undefined ? defaultSellingPrice : product.defaultSellingPrice;
    product.unit = unit || product.unit;

    const updatedProduct = await product.save();

    return res.status(200).json({
      status: httpStatusConstant.OK,
      code: 200,
      message: responseMessageConstant.PRODUCT_UPDATED,
      data: updatedProduct
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
 * @description This function is used to soft delete a product by ID
 */
const handleDeleteProduct = async (req: Request, res: Response) => {
  try {
    const product = await productModel.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        status: httpStatusConstant.NOT_FOUND,
        code: 404,
        message: responseMessageConstant.PRODUCT_NOT_FOUND
      });
    }

    product.isActive = false;
    await product.save();

    return res.status(200).json({
      status: httpStatusConstant.OK,
      code: 200,
      message: responseMessageConstant.PRODUCT_DELETED
    });
  } catch (err: any) {
    return res.status(500).json({
      status: httpStatusConstant.ERROR,
      code: 500,
      message: responseMessageConstant.SOMETHING_WENT_WRONG
    });
  }
};

export default { handleGetProducts, handleCreateProduct, handleUpdateProduct, handleDeleteProduct };
