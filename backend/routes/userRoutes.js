const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("../db/connection");

const router = express.Router();
const JWT_SECRET = "your_secret_key"; 

// Middleware: must be logged in
function requireLogin(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return res.status(401).json({ error: "Unauthorized - No token" });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; 
        next();
    } catch (err) {
        return res.status(403).json({ error: "Invalid or expired token" });
    }
}

// Middleware: must be admin
function requireAdmin(req, res, next) {
    if (req.user.role !== "master" && req.user.role !== "admin") {
        return res.status(403).json({ error: "Forbidden - Admin access required" });
    }
    next();
}

// Middleware: allow only master
function requireMaster(req, res, next) {
    if (req.user.role !== "master") {
        return res.status(403).json({ error: "Only master can update user permissions" });
    }
    next();
}

// ------------------------- ROUTES -------------------------

// Get logged-in user profile
router.get("/profile", requireLogin, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT id, username, role,
                    can_add_stock, can_view_stock, 
                    can_edit_stock, can_delete_stock,
                    can_add_department, can_assign_department_member
             FROM users
             WHERE id = ?`,
            [req.user.id]
        );

        if (rows.length === 0) return res.status(404).json({ error: "User not found" });

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// Get all users (admin only) with optional search, role filter, and pagination
router.get("/", requireLogin, requireAdmin, async (req, res) => {
    const search = req.query.search || ''; // Get search query
    const role = req.query.role || ''; // Get role filter
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = parseInt(req.query.limit) || 2; // Default to 2 users per page

    // Validate pagination parameters
    if (page < 1 || limit < 1) {
        return res.status(400).json({ error: "Invalid page or limit value" });
    }

    const offset = (page - 1) * limit; // Calculate offset for SQL query

    try {
        // Build the WHERE clause dynamically
        let whereClause = 'WHERE username LIKE ?';
        const queryParams = [`%${search}%`];
        
        if (role && ['admin', 'master', 'user'].includes(role)) {
            whereClause += ' AND role = ?';
            queryParams.push(role);
        }

        // Query to count total users matching the search and role criteria
        const [countResult] = await db.query(
            `SELECT COUNT(*) as totalUsers
             FROM users
             ${whereClause}`,
            queryParams
        );
        const totalUsers = countResult[0].totalUsers;
        const totalPages = Math.ceil(totalUsers / limit);

        // Query to fetch paginated users
        const [rows] = await db.query(
            `SELECT id, username, role,
                    can_add_stock, can_view_stock,
                    can_edit_stock, can_delete_stock,
                    can_add_department, can_assign_department_member
             FROM users
             ${whereClause}
             LIMIT ? OFFSET ?`,
            [...queryParams, limit, offset]
        );

        // Return paginated users and pagination metadata
        res.json({
            users: rows,
            totalPages: totalPages,
            totalUsers: totalUsers
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// Get single user by ID (admin only)
router.get("/:id", requireLogin, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query(
            `SELECT id, username, role,
                    can_add_stock, can_view_stock,
                    can_edit_stock, can_delete_stock,
                    can_add_department, can_assign_department_member
             FROM users
             WHERE id = ?`,
            [id]
        );

        if (rows.length === 0) return res.status(404).json({ error: "User not found" });

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// Update user permissions (master only)
router.put("/:id", requireLogin, requireMaster, async (req, res) => {
    const { id } = req.params;
    const {
        can_add_stock, can_view_stock, can_edit_stock, can_delete_stock,
        can_add_department, can_assign_department_member
    } = req.body;

    try {
        if (parseInt(id) === 1) {
            return res.status(403).send("You cannot edit the master admin's permissions");
        }

        const [result] = await db.query(
            `UPDATE users 
             SET can_add_stock=?, can_view_stock=?, can_edit_stock=?, can_delete_stock=?,
                 can_add_department=?, can_assign_department_member=?
             WHERE id=?`,
            [
                can_add_stock, can_view_stock, can_edit_stock, can_delete_stock,
                can_add_department, can_assign_department_member,
                id
            ]
        );

        if (result.affectedRows === 0) return res.status(404).send("User not found");

        res.send("Permissions updated successfully");
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});

module.exports = router;
