const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
    {
        productId: {
            type: String,
            default: ""
        },

        name: {
            type: String,
            required: true,
            trim: true
        },

        price: {
            type: Number,
            required: true,
            min: 0
        },

        quantity: {
            type: Number,
            required: true,
            min: 1
        },

        image: {
            type: String,
            default: ""
        }
    },
    {
        _id: false
    }
);

const orderSchema = new mongoose.Schema(
    {
        orderNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        customerName: {
            type: String,
            required: true,
            trim: true
        },

        customerEmail: {
            type: String,
            default: "",
            trim: true
        },

        customerPhone: {
            type: String,
            default: "",
            trim: true
        },

        orderType: {
            type: String,
            enum: [
                "DINE_IN",
                "TAKEAWAY",
                "DELIVERY"
            ],
            required: true
        },

        tableNumber: {
            type: String,
            default: ""
        },

        pickupTime: {
            type: String,
            default: ""
        },

        deliveryAddress: {
            type: String,
            default: ""
        },

        specialInstructions: {
            type: String,
            default: ""
        },

        items: {
            type: [orderItemSchema],
            required: true,
            validate: {
                validator: function (items) {
                    return items.length > 0;
                },
                message:
                    "Order must contain at least one item"
            }
        },

        subtotal: {
            type: Number,
            required: true,
            min: 0
        },

        tax: {
            type: Number,
            default: 0,
            min: 0
        },

        deliveryFee: {
            type: Number,
            default: 0,
            min: 0
        },

        total: {
            type: Number,
            required: true,
            min: 0
        },

        paymentMethod: {
            type: String,
            enum: [
                "CASH",
                "UPI",
                "CARD"
            ],
            default: "CASH"
        },

        paymentStatus: {
            type: String,
            enum: [
                "PENDING",
                "PAID",
                "FAILED",
                "REFUNDED"
            ],
            default: "PENDING"
        },

        status: {
            type: String,
            enum: [
                "PLACED",
                "CONFIRMED",
                "PREPARING",
                "READY",
                "SERVED",
                "PICKED_UP",
                "OUT_FOR_DELIVERY",
                "DELIVERED",
                "COMPLETED",
                "CANCELLED"
            ],
            default: "PLACED"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "Order",
    orderSchema
);
