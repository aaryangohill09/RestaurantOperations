const express = require("express");
const Table = require("../models/Table");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();


// ===============================
// GET ALL TABLES
// ===============================
router.get("/", async (req, res) => {
    try {
        const { status } = req.query;

        const filter = {};

        if (status) {
            filter.status = status;
        }

        const tables = await Table.find(filter)
            .populate(
                "order",
                "orderNumber customerName status total"
            )
            .sort({
                tableNumber: 1
            });

        res.status(200).json({
            success: true,
            count: tables.length,
            tables
        });

    } catch (error) {
        console.error("Get Tables Error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to fetch tables."
        });
    }
});


// ===============================
// GET SINGLE TABLE
// ===============================
router.get("/:id", async (req, res) => {
    try {
        const table = await Table.findById(
            req.params.id
        ).populate(
            "order",
            "orderNumber customerName status total items"
        );

        if (!table) {
            return res.status(404).json({
                success: false,
                message: "Table not found."
            });
        }

        res.status(200).json({
            success: true,
            table
        });

    } catch (error) {
        console.error("Get Table Error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to fetch table."
        });
    }
});


// ===============================
// CREATE TABLE
// ===============================
router.post(
    "/",
    protect,
    authorize("admin", "manager"),
    async (req, res) => {
        try {
            const {
                tableNumber,
                seats
            } = req.body;

            if (!tableNumber || !seats) {
                return res.status(400).json({
                    success: false,
                    message: "Table number and seats are required."
                });
            }

            const existingTable = await Table.findOne({
                tableNumber: tableNumber.trim()
            });

            if (existingTable) {
                return res.status(409).json({
                    success: false,
                    message: "A table with this number already exists."
                });
            }

            const table = await Table.create({
                tableNumber: tableNumber.trim(),
                seats: Number(seats),
                status: "AVAILABLE"
            });

            if (global.io) {
                global.io.emit(
                    "tableCreated",
                    table
                );
            }

            res.status(201).json({
                success: true,
                message: "Table created successfully.",
                table
            });

        } catch (error) {
            console.error("Create Table Error:", error);

            res.status(500).json({
                success: false,
                message: "Unable to create table.",
                error: error.message
            });
        }
    }
);


// ===============================
// UPDATE TABLE
// ===============================
router.patch(
    "/:id",
    protect,
    authorize("admin", "manager", "waiter", "staff"),
    async (req, res) => {
        try {
            const {
                seats,
                status,
                customerName,
                guests,
                reservationTime,
                order
            } = req.body;

            const table = await Table.findById(
                req.params.id
            );

            if (!table) {
                return res.status(404).json({
                    success: false,
                    message: "Table not found."
                });
            }

            if (seats !== undefined) {
                table.seats = Number(seats);
            }

            if (status !== undefined) {
                const validStatuses = [
                    "AVAILABLE",
                    "OCCUPIED",
                    "RESERVED",
                    "CLEANING"
                ];

                if (!validStatuses.includes(status)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid table status."
                    });
                }

                table.status = status;
            }

            if (customerName !== undefined) {
                table.customerName = customerName;
            }

            if (guests !== undefined) {
                table.guests = Number(guests);
            }

            if (reservationTime !== undefined) {
                table.reservationTime =
                    reservationTime || null;
            }

            if (order !== undefined) {
                table.order = order || null;
            }

            await table.save();

            if (global.io) {
                global.io.emit(
                    "tableUpdated",
                    table
                );

                global.io
                    .to("tables")
                    .emit(
                        "tableStatusUpdated",
                        table
                    );
            }

            res.status(200).json({
                success: true,
                message: "Table updated successfully.",
                table
            });

        } catch (error) {
            console.error("Update Table Error:", error);

            res.status(500).json({
                success: false,
                message: "Unable to update table."
            });
        }
    }
);


// ===============================
// SEAT GUESTS
// ===============================
router.patch(
    "/:id/seat",
    protect,
    authorize(
        "admin",
        "manager",
        "waiter",
        "staff"
    ),
    async (req, res) => {
        try {
            const {
                customerName,
                guests,
                order
            } = req.body;

            const table = await Table.findById(
                req.params.id
            );

            if (!table) {
                return res.status(404).json({
                    success: false,
                    message: "Table not found."
                });
            }

            if (table.status !== "AVAILABLE") {
                return res.status(400).json({
                    success: false,
                    message: "This table is not available."
                });
            }

            if (!guests || Number(guests) < 1) {
                return res.status(400).json({
                    success: false,
                    message: "Number of guests is required."
                });
            }

            if (Number(guests) > table.seats) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Number of guests exceeds table capacity."
                });
            }

            table.status = "OCCUPIED";
            table.customerName =
                customerName || "";
            table.guests = Number(guests);
            table.order = order || null;

            await table.save();

            if (global.io) {
                global.io.emit(
                    "tableStatusUpdated",
                    table
                );
            }

            res.status(200).json({
                success: true,
                message: "Guests seated successfully.",
                table
            });

        } catch (error) {
            console.error("Seat Guests Error:", error);

            res.status(500).json({
                success: false,
                message: "Unable to seat guests."
            });
        }
    }
);


// ===============================
// RELEASE TABLE
// ===============================
router.patch(
    "/:id/release",
    protect,
    authorize(
        "admin",
        "manager",
        "waiter",
        "staff"
    ),
    async (req, res) => {
        try {
            const table = await Table.findById(
                req.params.id
            );

            if (!table) {
                return res.status(404).json({
                    success: false,
                    message: "Table not found."
                });
            }

            table.status = "CLEANING";
            table.order = null;
            table.customerName = "";
            table.guests = 0;
            table.reservationTime = null;

            await table.save();

            if (global.io) {
                global.io.emit(
                    "tableStatusUpdated",
                    table
                );
            }

            res.status(200).json({
                success: true,
                message: "Table released and sent for cleaning.",
                table
            });

        } catch (error) {
            console.error("Release Table Error:", error);

            res.status(500).json({
                success: false,
                message: "Unable to release table."
            });
        }
    }
);


// ===============================
// MARK TABLE AVAILABLE
// ===============================
router.patch(
    "/:id/available",
    protect,
    authorize(
        "admin",
        "manager",
        "waiter",
        "staff"
    ),
    async (req, res) => {
        try {
            const table = await Table.findById(
                req.params.id
            );

            if (!table) {
                return res.status(404).json({
                    success: false,
                    message: "Table not found."
                });
            }

            table.status = "AVAILABLE";
            table.order = null;
            table.customerName = "";
            table.guests = 0;
            table.reservationTime = null;

            await table.save();

            if (global.io) {
                global.io.emit(
                    "tableStatusUpdated",
                    table
                );
            }

            res.status(200).json({
                success: true,
                message: "Table is now available.",
                table
            });

        } catch (error) {
            console.error(
                "Mark Available Error:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Unable to update table."
            });
        }
    }
);


// ===============================
// RESERVE TABLE
// ===============================
router.patch(
    "/:id/reserve",
    protect,
    authorize(
        "admin",
        "manager",
        "waiter",
        "staff"
    ),
    async (req, res) => {
        try {
            const {
                customerName,
                guests,
                reservationTime
            } = req.body;

            const table = await Table.findById(
                req.params.id
            );

            if (!table) {
                return res.status(404).json({
                    success: false,
                    message: "Table not found."
                });
            }

            if (
                !["AVAILABLE", "RESERVED"].includes(
                    table.status
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "This table cannot be reserved right now."
                });
            }

            if (!customerName || !guests) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Customer name and guests are required."
                });
            }

            if (Number(guests) > table.seats) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Number of guests exceeds table capacity."
                });
            }

            table.status = "RESERVED";
            table.customerName =
                customerName.trim();
            table.guests = Number(guests);
            table.reservationTime =
                reservationTime || null;

            await table.save();

            if (global.io) {
                global.io.emit(
                    "tableReserved",
                    table
                );
            }

            res.status(200).json({
                success: true,
                message: "Table reserved successfully.",
                table
            });

        } catch (error) {
            console.error("Reserve Table Error:", error);

            res.status(500).json({
                success: false,
                message: "Unable to reserve table."
            });
        }
    }
);


// ===============================
// DELETE TABLE
// ===============================
router.delete(
    "/:id",
    protect,
    authorize("admin", "manager"),
    async (req, res) => {
        try {
            const table = await Table.findById(
                req.params.id
            );

            if (!table) {
                return res.status(404).json({
                    success: false,
                    message: "Table not found."
                });
            }

            if (table.status === "OCCUPIED") {
                return res.status(400).json({
                    success: false,
                    message:
                        "Occupied table cannot be deleted."
                });
            }

            await Table.findByIdAndDelete(
                req.params.id
            );

            if (global.io) {
                global.io.emit(
                    "tableDeleted",
                    {
                        tableId: req.params.id
                    }
                );
            }

            res.status(200).json({
                success: true,
                message: "Table deleted successfully."
            });

        } catch (error) {
            console.error("Delete Table Error:", error);

            res.status(500).json({
                success: false,
                message: "Unable to delete table."
            });
        }
    }
);


module.exports = router;