const express = require("express");
const Staff = require("../models/Staff");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();


// ===============================
// GET ALL STAFF
// ===============================
router.get(
    "/",
    protect,
    authorize(
        "admin",
        "manager"
    ),
    async (req, res) => {
        try {
            const {
                role,
                status,
                search
            } = req.query;

            const filter = {
                isActive: true
            };

            if (role) {
                filter.role = role;
            }

            if (status) {
                filter.status = status;
            }

            if (search) {
                filter.$or = [
                    {
                        name: {
                            $regex: search,
                            $options: "i"
                        }
                    },
                    {
                        email: {
                            $regex: search,
                            $options: "i"
                        }
                    },
                    {
                        phone: {
                            $regex: search,
                            $options: "i"
                        }
                    }
                ];
            }

            const staff = await Staff.find(filter)
                .populate(
                    "user",
                    "firstName lastName email role isActive"
                )
                .sort({
                    createdAt: -1
                });

            res.status(200).json({
                success: true,
                count: staff.length,
                staff
            });

        } catch (error) {
            console.error(
                "Get Staff Error:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Unable to fetch staff."
            });
        }
    }
);


// ===============================
// GET SINGLE STAFF
// ===============================
router.get(
    "/:id",
    protect,
    authorize(
        "admin",
        "manager"
    ),
    async (req, res) => {
        try {
            const staff = await Staff.findById(
                req.params.id
            ).populate(
                "user",
                "firstName lastName email phone role isActive"
            );

            if (!staff) {
                return res.status(404).json({
                    success: false,
                    message: "Staff member not found."
                });
            }

            res.status(200).json({
                success: true,
                staff
            });

        } catch (error) {
            console.error(
                "Get Staff Member Error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to fetch staff member."
            });
        }
    }
);


// ===============================
// CREATE STAFF
// ===============================
router.post(
    "/",
    protect,
    authorize("admin", "manager"),
    async (req, res) => {
        try {
            const {
                firstName,
                lastName,
                name,
                email,
                phone,
                password,
                role,
                department,
                shift
            } = req.body;

            const staffName =
                name ||
                `${firstName || ""} ${lastName || ""}`.trim();

            if (
                !staffName ||
                !email ||
                !password ||
                !role
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Name, email, password and role are required."
                });
            }

            const validRoles = [
                "manager",
                "chef",
                "kitchen",
                "waiter",
                "cashier",
                "staff"
            ];

            if (!validRoles.includes(role)) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid staff role."
                });
            }

            const existingUser =
                await User.findOne({
                    email: email.toLowerCase().trim()
                });

            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message:
                        "A user with this email already exists."
                });
            }

            const hashedPassword =
                await bcrypt.hash(
                    password,
                    10
                );

            const user =
                await User.create({
                    firstName:
                        firstName ||
                        staffName.split(" ")[0],

                    lastName:
                        lastName ||
                        staffName
                            .split(" ")
                            .slice(1)
                            .join(" "),

                    email:
                        email
                            .toLowerCase()
                            .trim(),

                    phone:
                        phone
                            ? phone.trim()
                            : "",

                    password:
                        hashedPassword,

                    role,

                    isActive: true
                });

            const staff =
                await Staff.create({
                    user: user._id,

                    name: staffName,

                    email:
                        user.email,

                    phone:
                        user.phone,

                    role,

                    department:
                        department ||
                        "Other",

                    shift:
                        shift ||
                        "Morning",

                    status: "OFFLINE",

                    isActive: true
                });

            if (global.io) {
                global.io.emit(
                    "staffAdded",
                    staff
                );
            }

            res.status(201).json({
                success: true,
                message:
                    "Staff member created successfully.",

                staff
            });

        } catch (error) {
            console.error(
                "Create Staff Error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to create staff member.",
                error: error.message
            });
        }
    }
);


// ===============================
// UPDATE STAFF
// ===============================
router.patch(
    "/:id",
    protect,
    authorize("admin", "manager"),
    async (req, res) => {
        try {
            const {
                name,
                email,
                phone,
                role,
                department,
                shift,
                status,
                isActive
            } = req.body;

            const staff =
                await Staff.findById(
                    req.params.id
                );

            if (!staff) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Staff member not found."
                });
            }

            if (role !== undefined) {
                const validRoles = [
                    "manager",
                    "chef",
                    "kitchen",
                    "waiter",
                    "cashier",
                    "staff"
                ];

                if (!validRoles.includes(role)) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "Invalid staff role."
                    });
                }

                staff.role = role;
            }

            if (name !== undefined) {
                staff.name =
                    name.trim();
            }

            if (email !== undefined) {
                staff.email =
                    email
                        .toLowerCase()
                        .trim();
            }

            if (phone !== undefined) {
                staff.phone =
                    phone.trim();
            }

            if (department !== undefined) {
                staff.department =
                    department;
            }

            if (shift !== undefined) {
                staff.shift =
                    shift;
            }

            if (status !== undefined) {
                const validStatuses = [
                    "ACTIVE",
                    "BREAK",
                    "OFFLINE"
                ];

                if (!validStatuses.includes(status)) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "Invalid staff status."
                    });
                }

                staff.status =
                    status;
            }

            if (isActive !== undefined) {
                staff.isActive =
                    Boolean(isActive);
            }

            await staff.save();

            // Update linked user
            if (staff.user) {
                const user =
                    await User.findById(
                        staff.user
                    );

                if (user) {
                    if (email !== undefined) {
                        user.email =
                            email
                                .toLowerCase()
                                .trim();
                    }

                    if (phone !== undefined) {
                        user.phone =
                            phone.trim();
                    }

                    if (role !== undefined) {
                        user.role =
                            role;
                    }

                    if (isActive !== undefined) {
                        user.isActive =
                            Boolean(isActive);
                    }

                    await user.save();
                }
            }

            if (global.io) {
                global.io.emit(
                    "staffUpdated",
                    staff
                );
            }

            res.status(200).json({
                success: true,
                message:
                    "Staff member updated successfully.",
                staff
            });

        } catch (error) {
            console.error(
                "Update Staff Error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to update staff member."
            });
        }
    }
);


// ===============================
// UPDATE STAFF STATUS
// ===============================
router.patch(
    "/:id/status",
    protect,
    authorize(
        "admin",
        "manager"
    ),
    async (req, res) => {
        try {
            const {
                status
            } = req.body;

            const validStatuses = [
                "ACTIVE",
                "BREAK",
                "OFFLINE"
            ];

            if (
                !status ||
                !validStatuses.includes(status)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid staff status."
                });
            }

            const staff =
                await Staff.findByIdAndUpdate(
                    req.params.id,
                    {
                        status
                    },
                    {
                        new: true,
                        runValidators: true
                    }
                );

            if (!staff) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Staff member not found."
                });
            }

            if (global.io) {
                global.io.emit(
                    "staffStatusUpdated",
                    {
                        staffId: staff._id,
                        status: staff.status
                    }
                );
            }

            res.status(200).json({
                success: true,
                message:
                    "Staff status updated successfully.",
                staff
            });

        } catch (error) {
            console.error(
                "Update Staff Status Error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to update staff status."
            });
        }
    }
);


// ===============================
// DELETE / DEACTIVATE STAFF
// ===============================
router.delete(
    "/:id",
    protect,
    authorize("admin"),
    async (req, res) => {
        try {
            const staff =
                await Staff.findById(
                    req.params.id
                );

            if (!staff) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Staff member not found."
                });
            }

            staff.isActive = false;
            staff.status = "OFFLINE";

            await staff.save();

            if (staff.user) {
                await User.findByIdAndUpdate(
                    staff.user,
                    {
                        isActive: false
                    }
                );
            }

            if (global.io) {
                global.io.emit(
                    "staffRemoved",
                    {
                        staffId: staff._id
                    }
                );
            }

            res.status(200).json({
                success: true,
                message:
                    "Staff member deactivated successfully."
            });

        } catch (error) {
            console.error(
                "Delete Staff Error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Unable to deactivate staff member."
            });
        }
    }
);


module.exports = router;