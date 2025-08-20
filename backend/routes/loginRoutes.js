const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const db = require("../db/connection");

const JWT_SECRET = "your_secret_key"; 
// Middleware to check login via JWT
function requireLogin(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "Unauthorized - No token provided" });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid token" });
        req.user = user; 
        next();
    });
}

// Login

router.post("/login", async (req, res) => {
    const { username, password } = req.body;

    const [rows] = await db.query(
        "SELECT * FROM users WHERE username = ? AND password = ?",
        [username, password]
    );

    if (rows.length === 0) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = rows[0];

    // Generate JWT token including permissions
    const token = jwt.sign(
        {
            id: user.id,
            role: user.role,
            can_add_stock: user.can_add_stock,
            can_view_stock: user.can_view_stock,
            can_edit_stock: user.can_edit_stock,
            can_delete_stock: user.can_delete_stock,
            can_add_department: user.can_add_department,
            can_assign_department_member: user.can_assign_department_member
        },
        JWT_SECRET,
        { expiresIn: "1h" }
    );

    res.json({ message: "Login successful", token });
});

// Logout (JWT version just instructs client to delete token)
router.post("/logout", (req, res) => {
    res.json({ message: "Logged out - please delete the token on client side" });
});

// Get current user info
router.get("/me", requireLogin, async (req, res) => {
    const [results] = await db.query(
        `SELECT username, role, 
                can_add_stock, can_view_stock, 
                can_edit_stock, can_delete_stock,
                can_add_department, can_assign_department_member
         FROM users WHERE id = ?`,
        [req.user.id]
    );

    if (results.length === 0) {
        return res.status(404).json({ error: "User not found" });
    }

    res.json(results[0]);
});


module.exports = router;
