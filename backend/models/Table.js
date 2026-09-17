const mongoose = require("mongoose");

const tableSchema = new mongoose.Schema(
    {
        tableNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        seats: {
            type: Number,
            required: true,
            min: 1
        },

        status: {
            type: String,
            enum: [
                "AVAILABLE",
                "OCCUPIED",
                "RESERVED",
                "CLEANING"
            ],
            default: "AVAILABLE"
        },

        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            default: null
        },

        customerName: {
            type: String,
            default: "",
            trim: true
        },

        guests: {
            type: Number,
            default: 0,
            min: 0
        },

        reservationTime: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "Table",
    tableSchema
);
