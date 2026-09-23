const API_BASE_URL = "https://restaurantoperations-production.up.railway.app/api";

async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem("arysCafeToken");

    const config = {
        method: options.method || "GET",
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    };

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    if (options.body !== undefined) {
        config.body =
            typeof options.body === "string"
                ? options.body
                : JSON.stringify(options.body);
    }

    const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        config
    );

    let data;

    try {
        data = await response.json();
    } catch {
        data = {
            success: false,
            message: "Invalid server response."
        };
    }

    if (!response.ok) {
        throw new Error(
            data.message || `Request failed with status ${response.status}`
        );
    }

    return data;
}


function saveAuth(data) {
    if (!data || !data.token || !data.user) {
        throw new Error("Invalid authentication response.");
    }

    localStorage.setItem(
        "arysCafeToken",
        data.token
    );

    localStorage.setItem(
        "arysCafeUser",
        JSON.stringify(data.user)
    );

    localStorage.setItem(
        "arysCafeLoggedIn",
        "true"
    );

    localStorage.setItem(
        "arysCafeRole",
        data.user.role || "customer"
    );
}


function getAuthToken() {
    return localStorage.getItem(
        "arysCafeToken"
    );
}


function getCurrentUser() {
    const user =
        localStorage.getItem("arysCafeUser");

    if (!user) {
        return null;
    }

    try {
        return JSON.parse(user);
    } catch {
        return null;
    }
}


function isLoggedIn() {
    return Boolean(
        localStorage.getItem("arysCafeToken")
    );
}


function logoutUser() {
    localStorage.removeItem(
        "arysCafeToken"
    );

    localStorage.removeItem(
        "arysCafeUser"
    );

    localStorage.removeItem(
        "arysCafeLoggedIn"
    );

    localStorage.removeItem(
        "arysCafeRole"
    );

    window.location.href =
        "login.html";
}


async function registerUser(userData) {
    const data = await apiRequest(
        "/auth/register",
        {
            method: "POST",
            body: userData
        }
    );

    saveAuth(data);

    return data;
}


async function loginUser(email, password) {
    const data = await apiRequest(
        "/auth/login",
        {
            method: "POST",
            body: {
                email,
                password
            }
        }
    );

    saveAuth(data);

    return data;
}


async function getMyProfile() {
    return await apiRequest(
        "/auth/me"
    );
}


async function getOrders() {
    return await apiRequest(
        "/orders/my"
    );
}


async function createOrder(orderData) {
    return await apiRequest(
        "/orders",
        {
            method: "POST",
            body: orderData
        }
    );
}


async function getOrder(orderId) {
    return await apiRequest(
        `/orders/${orderId}`
    );
}


async function updateOrderStatus(
    orderId,
    status
) {
    return await apiRequest(
        `/orders/${orderId}/status`,
        {
            method: "PATCH",
            body: {
                status
            }
        }
    );
}


async function cancelOrder(orderId) {
    return await apiRequest(
        `/orders/${orderId}/cancel`,
        {
            method: "PATCH"
        }
    );
}


async function getTables() {
    return await apiRequest(
        "/tables"
    );
}


async function getInventory() {
    return await apiRequest(
        "/inventory"
    );
}


async function getStaff() {
    return await apiRequest(
        "/staff"
    );
}