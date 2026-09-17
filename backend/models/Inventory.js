const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        category: {
            type: String,
            required: true,
            trim: true
        },

        unit: {
            type: String,
            required: true,
            trim: true
        },

        quantity: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },

        minimumStock: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        },

        supplier: {
            type: String,
            default: "",
            trim: true
        },

        pricePerUnit: {
            type: Number,
            default: 0,
            min: 0
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "Inventory",
    inventorySchema
);