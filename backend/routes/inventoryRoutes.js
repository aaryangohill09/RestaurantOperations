const express = require("express");
const Inventory = require("../models/Inventory");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();


// ===============================
// GET ALL INVENTORY
// ===============================
router.get(
    "/",
    protect,
    authorize(
        "admin",
        "manager",
        "chef",
        "kitchen",
        "staff"
    ),
    async (req, res) => {
        try {
            const {
                category,
                search,
                lowStock
            } = req.query;

            const filter = {
                isActive: true
            };

            if (category) {
                filter.category = category;
            }

            if (search) {
                filter.name = {
                    $regex: search,
                    $options: "i"
                };
            }

            if (lowStock === "true") {
                filter.$expr = {
                    $lte: [
                        "$quantity",
                        "$minimumStock"
                    ]
                };
            }

            const items = await Inventory.find(filter)
                .sort({
                    category: 1,
                    name: 1
                });

            res.status(200).json({
                success: true,
                count: items.length,
                items
            });

        } catch (error) {
            console.error(
                "Get Inventory Error:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Unable to fetch inventory."
            });
        }
    }
);


// ===============================
// GET SINGLE INVENTORY ITEM
// ===============================
router.get(
    "/:id",
    protect,
    authorize(
        "admin",
        "manager",
        "chef",
        "kitchen",
        "staff"
    ),
    async (req, res) => {
        try {
            const item = await Inventory.findById(
                req.params.id
            );

            if (!item) {
                return res.status(404).json({
                    success: false,
                    message: "Inventory item not found."
                });
            }

            res.status(200).json({
                success: true,
                item
            });

        } catch (error) {
            console.error(
                "Get Inventory Item Error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to fetch inventory item."
            });
        }
    }
);


// ===============================
// ADD INVENTORY ITEM
// ===============================
router.post(
    "/",
    protect,
    authorize("admin", "manager"),
    async (req, res) => {
        try {
            const {
                name,
                category,
                unit,
                quantity,
                minimumStock,
                supplier,
                pricePerUnit
            } = req.body;

            if (
                !name ||
                !category ||
                !unit
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Name, category and unit are required."
                });
            }

            const existingItem =
                await Inventory.findOne({
                    name: {
                        $regex: `^${name.trim()}$`,
                        $options: "i"
                    },
                    isActive: true
                });

            if (existingItem) {
                return res.status(409).json({
                    success: false,
                    message:
                        "An inventory item with this name already exists."
                });
            }

            const item = await Inventory.create({
                name: name.trim(),
                category: category.trim(),
                unit: unit.trim(),
                quantity:
                    Number(quantity) || 0,
                minimumStock:
                    Number(minimumStock) || 0,
                supplier:
                    supplier
                        ? supplier.trim()
                        : "",
                pricePerUnit:
                    Number(pricePerUnit) || 0
            });

            if (global.io) {
                global.io.emit(
                    "inventoryItemAdded",
                    item
                );
            }

            res.status(201).json({
                success: true,
                message:
                    "Inventory item added successfully.",
                item
            });

        } catch (error) {
            console.error(
                "Add Inventory Error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to add inventory item.",
                error: error.message
            });
        }
    }
);


// ===============================
// UPDATE INVENTORY ITEM
// ===============================
router.patch(
    "/:id",
    protect,
    authorize("admin", "manager"),
    async (req, res) => {
        try {
            const {
                name,
                category,
                unit,
                quantity,
                minimumStock,
                supplier,
                pricePerUnit,
                isActive
            } = req.body;

            const item = await Inventory.findById(
                req.params.id
            );

            if (!item) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Inventory item not found."
                });
            }

            if (name !== undefined) {
                item.name = name.trim();
            }

            if (category !== undefined) {
                item.category =
                    category.trim();
            }

            if (unit !== undefined) {
                item.unit = unit.trim();
            }

            if (quantity !== undefined) {
                if (Number(quantity) < 0) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "Quantity cannot be negative."
                    });
                }

                item.quantity =
                    Number(quantity);
            }

            if (minimumStock !== undefined) {
                if (Number(minimumStock) < 0) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "Minimum stock cannot be negative."
                    });
                }

                item.minimumStock =
                    Number(minimumStock);
            }

            if (supplier !== undefined) {
                item.supplier =
                    supplier.trim();
            }

            if (pricePerUnit !== undefined) {
                if (Number(pricePerUnit) < 0) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "Price cannot be negative."
                    });
                }

                item.pricePerUnit =
                    Number(pricePerUnit);
            }

            if (isActive !== undefined) {
                item.isActive =
                    Boolean(isActive);
            }

            await item.save();

            if (global.io) {
                global.io.emit(
                    "inventoryUpdated",
                    item
                );
            }

            res.status(200).json({
                success: true,
                message:
                    "Inventory item updated successfully.",
                item
            });

        } catch (error) {
            console.error(
                "Update Inventory Error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to update inventory item."
            });
        }
    }
);


// ===============================
// ADD STOCK
// ===============================
router.patch(
    "/:id/add-stock",
    protect,
    authorize(
        "admin",
        "manager",
        "chef",
        "kitchen",
        "staff"
    ),
    async (req, res) => {
        try {
            const {
                quantity
            } = req.body;

            const amount =
                Number(quantity);

            if (
                !amount ||
                amount <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "A valid stock quantity is required."
                });
            }

            const item = await Inventory.findById(
                req.params.id
            );

            if (!item) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Inventory item not found."
                });
            }

            item.quantity += amount;

            await item.save();

            if (global.io) {
                global.io.emit(
                    "inventoryStockUpdated",
                    item
                );
            }

            res.status(200).json({
                success: true,
                message:
                    "Stock added successfully.",
                item
            });

        } catch (error) {
            console.error(
                "Add Stock Error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to add stock."
            });
        }
    }
);


// ===============================
// REMOVE STOCK
// ===============================
router.patch(
    "/:id/remove-stock",
    protect,
    authorize(
        "admin",
        "manager",
        "chef",
        "kitchen",
        "staff"
    ),
    async (req, res) => {
        try {
            const {
                quantity
            } = req.body;

            const amount =
                Number(quantity);

            if (
                !amount ||
                amount <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "A valid stock quantity is required."
                });
            }

            const item = await Inventory.findById(
                req.params.id
            );

            if (!item) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Inventory item not found."
                });
            }

            if (amount > item.quantity) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Insufficient stock available."
                });
            }

            item.quantity -= amount;

            await item.save();

            if (global.io) {
                global.io.emit(
                    "inventoryStockUpdated",
                    item
                );
            }

            res.status(200).json({
                success: true,
                message:
                    "Stock removed successfully.",
                item
            });

        } catch (error) {
            console.error(
                "Remove Stock Error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to remove stock."
            });
        }
    }
);


// ===============================
// DELETE / DEACTIVATE ITEM
// ===============================
router.delete(
    "/:id",
    protect,
    authorize("admin", "manager"),
    async (req, res) => {
        try {
            const item = await Inventory.findById(
                req.params.id
            );

            if (!item) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Inventory item not found."
                });
            }

            item.isActive = false;

            await item.save();

            if (global.io) {
                global.io.emit(
                    "inventoryItemDeleted",
                    {
                        itemId: item._id
                    }
                );
            }

            res.status(200).json({
                success: true,
                message:
                    "Inventory item removed successfully."
            });

        } catch (error) {
            console.error(
                "Delete Inventory Error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to remove inventory item."
            });
        }
    }
);


module.exports = router;
