const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { docClient, TABLES } = require("../db");
const { ScanCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { JWT_SECRET } = require("../middleware/auth");

// Helper to find a user by email using Scan (simple and requires no custom GSI configuration on AWS)
async function findUserByEmail(email) {
  const params = {
    TableName: TABLES.USERS,
    FilterExpression: "email = :email",
    ExpressionAttributeValues: {
      ":email": email.toLowerCase().trim()
    }
  };
  const result = await docClient.send(new ScanCommand(params));
  return result.Items && result.Items.length > 0 ? result.Items[0] : null;
}

// POST /api/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (role !== "teacher" && role !== "student") {
      return res.status(400).json({ error: "Invalid role. Must be 'teacher' or 'student'" });
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = {
      userId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role
    };

    await docClient.send(new PutCommand({
      TableName: TABLES.USERS,
      Item: newUser
    }));

    // Generate JWT
    const token = jwt.sign({ userId, name: newUser.name, email: newUser.email, role }, JWT_SECRET, {
      expiresIn: "7d"
    });

    res.status(201).json({
      message: "Registration successful",
      token,
      user: { userId, name: newUser.name, email: newUser.email, role }
    });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Generate JWT
    const token = jwt.sign({ userId: user.userId, name: user.name, email: user.email, role: user.role }, JWT_SECRET, {
      expiresIn: "7d"
    });

    res.json({
      message: "Login successful",
      token,
      user: { userId: user.userId, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
