const express = require("express");
const router = express.Router();
const db = require("../db/connection");
const jwt = require("jsonwebtoken");

const JWT_SECRET = "your_secret_key";

// Middleware: check login
function requireLogin(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized - No token" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

// Get all departments (only active ones)
router.get("/", requireLogin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT d.id, d.name, 
              GROUP_CONCAT(u.username) AS members
       FROM departments d
       LEFT JOIN department_members dm ON d.id = dm.department_id
       LEFT JOIN users u ON dm.user_id = u.id
       WHERE d.is_active = 1
       GROUP BY d.id, d.name`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Add department
router.post("/", requireLogin, async (req, res) => {
  if (req.user.role !== "master" && !req.user.can_add_department) {
    return res.status(403).send("No permission to add department");
  }

  const { name } = req.body;
  if (!name) return res.status(400).send("Department name required");

  try {
    const [result] = await db.query(
      "INSERT INTO departments (name, is_active) VALUES (?, 1)",
      [name]
    );
    res.json({ id: result.insertId, name });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Assign member to department
router.post("/:deptId/assign", requireLogin, async (req, res) => {
    if (req.user.role !== "master" && !req.user.can_assign_department_member) {
        return res.status(403).send("No permission to assign members");
    }
    const { deptId } = req.params;
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).send("User ID required");
    }
    try {
        const [existing] = await db.query(
            "SELECT 1 FROM department_members WHERE department_id = ? AND user_id = ?",
            [deptId, userId]
        );
        if (existing.length > 0) {
            return res.status(400).send("User is already assigned to this department");
        }
        const [dept] = await db.query(
            "SELECT 1 FROM departments WHERE id = ? AND is_active = 1",
            [deptId]
        );
        if (dept.length === 0) {
            return res.status(404).send("Department not found or inactive");
        }
        const [user] = await db.query(
            "SELECT 1 FROM users WHERE id = ?",
            [userId]
        );
        if (user.length === 0) {
            return res.status(404).send("User not found");
        }
        await db.query(
            "INSERT INTO department_members (department_id, user_id) VALUES (?, ?)",
            [deptId, userId]
        );
        res.send("Member assigned successfully");
    } catch (err) {
        console.error("Error assigning member:", err);
        res.status(500).send("Server error");
    }
});

// Soft delete department (set is_active = 0 instead of deleting row)
router.delete("/:id", requireLogin, async (req, res) => {
  if (req.user.role !== "master" && !req.user.can_delete_department) {
    return res.status(403).send("No permission to delete department");
  }

  try {
    const { id } = req.params;
    const [result] = await db.query(
      "UPDATE departments SET is_active = 0 WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).send("Department not found");
    }

    res.send("Department deactivated");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// Remove member
router.delete("/:deptId/members/:userId", requireLogin, async (req, res) => {
  if (req.user.role !== "master" && !req.user.can_assign_department_member) {
    return res.status(403).send("No permission to remove members");
  }

  try {
    await db.query(
      "DELETE FROM department_members WHERE department_id = ? AND user_id = ?",
      [req.params.deptId, req.params.userId]
    );
    res.send("Member removed successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

module.exports = router;
