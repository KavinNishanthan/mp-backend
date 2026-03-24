import { Request, Response } from 'express';
import Product from '../models/Product';

// @desc    Fetch all products
// @route   GET /api/products
// @access  Private (Admin & Driver)
export const getProducts = async (req: Request, res: Response) => {
    const products = await Product.find({ isActive: true });
    res.json(products);
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
export const createProduct = async (req: Request, res: Response) => {
    const { name, costPrice, defaultSellingPrice, unit } = req.body;

    const product = new Product({
        name,
        costPrice,
        defaultSellingPrice,
        unit,
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
export const updateProduct = async (req: Request, res: Response) => {
    const { name, costPrice, defaultSellingPrice, unit } = req.body;

    const product = await Product.findById(req.params.id);

    if (product) {
        product.name = name || product.name;
        // Only Admin can see/edit costPrice, but route is protected by Admin middleware anyway
        product.costPrice = costPrice !== undefined ? costPrice : product.costPrice;
        product.defaultSellingPrice = defaultSellingPrice !== undefined ? defaultSellingPrice : product.defaultSellingPrice;
        product.unit = unit || product.unit;

        const updatedProduct = await product.save();
        res.json(updatedProduct);
    } else {
        res.status(404).json({ message: 'Product not found' });
    }
};

// @desc    Delete a product (Soft delete)
// @route   DELETE /api/products/:id
// @access  Private/Admin
export const deleteProduct = async (req: Request, res: Response) => {
    const product = await Product.findById(req.params.id);

    if (product) {
        product.isActive = false;
        await product.save();
        res.json({ message: 'Product removed' });
    } else {
        res.status(404).json({ message: 'Product not found' });
    }
};
