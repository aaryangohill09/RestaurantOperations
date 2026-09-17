const express = require("express");
const Order = require("../models/Order");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();


// ===============================
// GENERATE ORDER NUMBER
// ===============================
const generateOrderNumber = () => {
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    return `ARY-${randomNumber}`;
};


// ===============================
// CREATE ORDER
// ===============================
router.post("/", protect, async (req, res) => {
    try {
        const {
            customerName,
            customerEmail,
            customerPhone,
            orderType,
            tableNumber,
            pickupTime,
            deliveryAddress,
            specialInstructions,
            items,
            subtotal,
            tax,
            deliveryFee,
            total,
            paymentMethod
        } = req.body;

        if (!orderType) {
            return res.status(400).json({
                success: false,
                message: "Order type is required."
            });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one item is required."
            });
        }

        if (!paymentMethod) {
            return res.status(400).json({
                success: false,
                message: "Payment method is required."
            });
        }

        if (orderType === "DINE_IN" && !tableNumber) {
            return res.status(400).json({
                success: false,
                message: "Table number is required for dine-in orders."
            });
        }

        if (orderType === "DELIVERY" && !deliveryAddress) {
            return res.status(400).json({
                success: false,
                message: "Delivery address is required."
            });
        }

        const order = await Order.create({
            orderNumber: generateOrderNumber(),

            customer: req.user._id,

            customerName:
                customerName ||
                `${req.user.firstName} ${req.user.lastName}`,

            customerEmail:
                customerEmail || req.user.email,

            customerPhone:
                customerPhone || req.user.phone,

            orderType,

            tableNumber:
                orderType === "DINE_IN"
                    ? tableNumber
                    : "",

            pickupTime:
                orderType === "TAKEAWAY"
                    ? pickupTime
                    : null,

            deliveryAddress:
                orderType === "DELIVERY"
                    ? deliveryAddress
                    : "",

            specialInstructions:
                specialInstructions || "",

            items,

            subtotal: Number(subtotal) || 0,

            tax: Number(tax) || 0,

            deliveryFee: Number(deliveryFee) || 0,

            total: Number(total) || 0,

            paymentMethod,

            paymentStatus: "PENDING",

            status: "PLACED"
        });

        // Real-time notification
        if (global.io) {
            global.io.emit("newOrder", order);
            global.io.to("kitchen").emit("kitchenNewOrder", order);
            global.io.to("admin").emit("adminNewOrder", order);
        }

        res.status(201).json({
            success: true,
            message: "Order placed successfully.",
            order
        });

    } catch (error) {
        console.error("Create Order Error:", error);

        res.status(500).json({
            success: false,
            message: "Server error while creating order.",
            error: error.message
        });
    }
});


// ===============================
// GET MY ORDERS
// ===============================
router.get("/my", protect, async (req, res) => {
    try {
        const orders = await Order.find({
            customer: req.user._id
        }).sort({
            createdAt: -1
        });

        res.status(200).json({
            success: true,
            count: orders.length,
            orders
        });

    } catch (error) {
        console.error("Get My Orders Error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to fetch your orders."
        });
    }
});


// ===============================
// GET ALL ORDERS
// ADMIN / KITCHEN / STAFF
// ===============================
router.get(
    "/",
    protect,
    authorize(
        "admin",
        "kitchen",
        "manager",
        "chef",
        "waiter",
        "cashier",
        "staff"
    ),
    async (req, res) => {
        try {
            const {
                status,
                orderType,
                limit = 50
            } = req.query;

            const filter = {};

            if (status) {
                filter.status = status;
            }

            if (orderType) {
                filter.orderType = orderType;
            }

            const orders = await Order.find(filter)
                .populate(
                    "customer",
                    "firstName lastName email phone role"
                )
                .sort({
                    createdAt: -1
                })
                .limit(Number(limit));

            res.status(200).json({
                success: true,
                count: orders.length,
                orders
            });

        } catch (error) {
            console.error("Get All Orders Error:", error);

            res.status(500).json({
                success: false,
                message: "Unable to fetch orders."
            });
        }
    }
);


// ===============================
// GET SINGLE ORDER
// ===============================
router.get("/:id", protect, async (req, res) => {
    try {
        const order = await Order.findById(
            req.params.id
        ).populate(
            "customer",
            "firstName lastName email phone role"
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found."
            });
        }

        const isOwner =
            order.customer &&
            order.customer._id.toString() ===
                req.user._id.toString();

        const staffRoles = [
            "admin",
            "kitchen",
            "manager",
            "chef",
            "waiter",
            "cashier",
            "staff"
        ];

        const isStaff = staffRoles.includes(
            req.user.role
        );

        if (!isOwner && !isStaff) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to view this order."
            });
        }

        res.status(200).json({
            success: true,
            order
        });

    } catch (error) {
        console.error("Get Order Error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to fetch order."
        });
    }
});


// ===============================
// UPDATE ORDER STATUS
// ===============================
router.patch(
    "/:id/status",
    protect,
    authorize(
        "admin",
        "kitchen",
        "manager",
        "chef",
        "waiter",
        "cashier",
        "staff"
    ),
    async (req, res) => {
        try {
            const { status } = req.body;

            const validStatuses = [
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
            ];

            if (!status || !validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid order status."
                });
            }

            const order = await Order.findById(
                req.params.id
            );

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: "Order not found."
                });
            }

            order.status = status;

            if (status === "COMPLETED") {
                order.paymentStatus =
                    order.paymentMethod === "CASH"
                        ? "PENDING"
                        : "PAID";
            }

            await order.save();

            // Real-time order status update
            if (global.io) {
                global.io.emit("orderStatusUpdated", {
                    orderId: order._id,
                    orderNumber: order.orderNumber,
                    status: order.status
                });

                global.io
                    .to(`order_${order._id}`)
                    .emit("orderStatusUpdated", order);
            }

            res.status(200).json({
                success: true,
                message: "Order status updated successfully.",
                order
            });

        } catch (error) {
            console.error("Update Order Status Error:", error);

            res.status(500).json({
                success: false,
                message: "Unable to update order status."
            });
        }
    }
);


// ===============================
// UPDATE PAYMENT STATUS
// ===============================
router.patch(
    "/:id/payment",
    protect,
    authorize(
        "admin",
        "manager",
        "cashier",
        "staff"
    ),
    async (req, res) => {
        try {
            const { paymentStatus } = req.body;

            const validPaymentStatuses = [
                "PENDING",
                "PAID",
                "FAILED",
                "REFUNDED"
            ];

            if (
                !paymentStatus ||
                !validPaymentStatuses.includes(paymentStatus)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid payment status."
                });
            }

            const order = await Order.findByIdAndUpdate(
                req.params.id,
                {
                    paymentStatus
                },
                {
                    new: true,
                    runValidators: true
                }
            );

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: "Order not found."
                });
            }

            if (global.io) {
                global.io.emit("paymentStatusUpdated", {
                    orderId: order._id,
                    paymentStatus: order.paymentStatus
                });
            }

            res.status(200).json({
                success: true,
                message: "Payment status updated.",
                order
            });

        } catch (error) {
            console.error("Payment Status Error:", error);

            res.status(500).json({
                success: false,
                message: "Unable to update payment status."
            });
        }
    }
);


// ===============================
// CANCEL ORDER
// ===============================
router.patch("/:id/cancel", protect, async (req, res) => {
    try {
        const order = await Order.findById(
            req.params.id
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found."
            });
        }

        const isOwner =
            order.customer &&
            order.customer.toString() ===
                req.user._id.toString();

        const canManage = [
            "admin",
            "manager",
            "staff"
        ].includes(req.user.role);

        if (!isOwner && !canManage) {
            return res.status(403).json({
                success: false,
                message: "You are not allowed to cancel this order."
            });
        }

        if (
            ![
                "PLACED",
                "CONFIRMED"
            ].includes(order.status)
        ) {
            return res.status(400).json({
                success: false,
                message: "This order can no longer be cancelled."
            });
        }

        order.status = "CANCELLED";

        await order.save();

        if (global.io) {
            global.io.emit("orderCancelled", {
                orderId: order._id,
                orderNumber: order.orderNumber
            });
        }

        res.status(200).json({
            success: true,
            message: "Order cancelled successfully.",
            order
        });

    } catch (error) {
        console.error("Cancel Order Error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to cancel order."
        });
    }
});


module.exports = router;
