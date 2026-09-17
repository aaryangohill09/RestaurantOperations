const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            trim: true,
            lowercase: true,
            default: ""
        },

        phone: {
            type: String,
            trim: true,
            default: ""
        },

        role: {
            type: String,
            required: true,
            enum: [
                "manager",
                "chef",
                "kitchen",
                "waiter",
                "cashier",
                "staff"
            ]
        },

        department: {
            type: String,
            enum: [
                "Management",
                "Kitchen",
                "Service",
                "Cashier",
                "Other"
            ],
            default: "Other"
        },

        shift: {
            type: String,
            enum: [
                "Morning",
                "Afternoon",
                "Evening",
                "Night"
            ],
            default: "Morning"
        },

        status: {
            type: String,
            enum: [
                "ACTIVE",
                "BREAK",
                "OFFLINE"
            ],
            default: "OFFLINE"
        },

        joiningDate: {
            type: Date,
            default: Date.now
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
    "Staff",
    staffSchema
);