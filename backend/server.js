const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { Server } = require("socket.io");

dotenv.config();

const app = express();
const server = http.createServer(app);


// ===============================
// ENVIRONMENT VARIABLES
// ===============================
const PORT = process.env.PORT || 5000;
const CLIENT_URL =
    process.env.CLIENT_URL || "http://127.0.0.1:5500";


// ===============================
// CORS
// ===============================
app.use(
    cors({
        origin: CLIENT_URL,
        credentials: true
    })
);


// ===============================
// BODY PARSER
// ===============================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ===============================
// SOCKET.IO
// ===============================
const io = new Server(server, {
    cors: {
        origin: CLIENT_URL,
        methods: ["GET", "POST", "PATCH", "DELETE"],
        credentials: true
    }
});


// Make Socket.IO available to route files
global.io = io;


// ===============================
// SOCKET CONNECTION
// ===============================
io.on("connection", (socket) => {
    console.log(
        `Socket connected: ${socket.id}`
    );


    // -------------------------------
    // JOIN ROLE ROOM
    // -------------------------------
    socket.on("joinRoleRoom", (role) => {
        if (!role) return;

        socket.join(role);

        console.log(
            `${socket.id} joined ${role} room`
        );
    });


    // -------------------------------
    // JOIN ORDER ROOM
    // -------------------------------
    socket.on("joinOrderRoom", (orderId) => {
        if (!orderId) return;

        socket.join(`order_${orderId}`);

        console.log(
            `${socket.id} joined order_${orderId}`
        );
    });


    // -------------------------------
    // JOIN TABLE ROOM
    // -------------------------------
    socket.on("joinTableRoom", () => {
        socket.join("tables");

        console.log(
            `${socket.id} joined tables room`
        );
    });


    // -------------------------------
    // LEAVE ORDER ROOM
    // -------------------------------
    socket.on("leaveOrderRoom", (orderId) => {
        if (!orderId) return;

        socket.leave(`order_${orderId}`);
    });


    // -------------------------------
    // DISCONNECT
    // -------------------------------
    socket.on("disconnect", () => {
        console.log(
            `Socket disconnected: ${socket.id}`
        );
    });
});


// ===============================
// BASIC ROUTES
// ===============================

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "ARY'S CAFE Backend API is running."
    });
});


app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "ARY'S CAFE API is healthy.",
        database:
            mongoose.connection.readyState === 1
                ? "connected"
                : "disconnected",
        time: new Date().toISOString()
    });
});


// ===============================
// API ROUTES
// ===============================

const authRoutes = require("./routes/authRoutes");
const orderRoutes = require("./routes/orderRoutes");
const tableRoutes = require("./routes/tableRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const staffRoutes = require("./routes/staffRoutes");


app.use(
    "/api/auth",
    authRoutes
);

app.use(
    "/api/orders",
    orderRoutes
);

app.use(
    "/api/tables",
    tableRoutes
);

app.use(
    "/api/inventory",
    inventoryRoutes
);

app.use(
    "/api/staff",
    staffRoutes
);


// ===============================
// 404 HANDLER
// ===============================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API route not found."
    });
});


// ===============================
// ERROR HANDLER
// ===============================
app.use((err, req, res, next) => {
    console.error(
        "Unhandled Server Error:",
        err
    );

    res.status(
        err.status || 500
    ).json({
        success: false,
        message:
            err.message ||
            "Internal server error."
    });
});


// ===============================
// MONGODB CONNECTION
// ===============================
const connectDatabase = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error(
                "MONGO_URI is missing in .env file."
            );
        }

        await mongoose.connect(
            process.env.MONGO_URI
        );

        console.log(
            "MongoDB connected successfully."
        );

    } catch (error) {
        console.error(
            "MongoDB connection failed:",
            error.message
        );

        process.exit(1);
    }
};


// ===============================
// START SERVER
// ===============================
const startServer = async () => {
    try {
        await connectDatabase();

        server.listen(
            PORT,
            "0.0.0.0",
            () => {
                console.log(
                    `ARY'S CAFE Backend running on port ${PORT}`
                );

                console.log(
                    `Local API: http://localhost:${PORT}`
                );

                console.log(
                    `Health Check: http://localhost:${PORT}/api/health`
                );
            }
        );

    } catch (error) {
        console.error(
            "Server startup failed:",
            error
        );

        process.exit(1);
    }
};


// ===============================
// GRACEFUL SHUTDOWN
// ===============================
const shutdownServer = async () => {
    console.log(
        "Shutting down server..."
    );

    server.close(async () => {
        await mongoose.connection.close();

        console.log(
            "Server and database connection closed."
        );

        process.exit(0);
    });
};


process.on(
    "SIGINT",
    shutdownServer
);

process.on(
    "SIGTERM",
    shutdownServer
);


// ===============================
// PROCESS ERROR HANDLERS
// ===============================
process.on(
    "unhandledRejection",
    (error) => {
        console.error(
            "Unhandled Promise Rejection:",
            error
        );
    }
);

process.on(
    "uncaughtException",
    (error) => {
        console.error(
            "Uncaught Exception:",
            error
        );

        process.exit(1);
    }
);


// ===============================
// START
// ===============================
startServer();


module.exports = {
    app,
    server,
    io
};