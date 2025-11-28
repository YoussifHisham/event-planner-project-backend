const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

exports.signup = async (req, res) => {
  const { email, password, role = "attendee" } = req.body;

  try {
    const check = await db.query("SELECT * FROM users WHERE user_email = $1", [email]);
    if (check.rows.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await db.query(
      `INSERT INTO users (user_email, user_password, role) 
       VALUES ($1, $2, $3) 
       RETURNING user_id, user_email, role`,
      [email, hashedPassword, role]
    );

    const user = newUser.rows[0];

    const token = jwt.sign(
      { 
        userId: user.user_id,
        email: user.user_email,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: "User created successfully",
      token,
      user: {
        user_id: user.user_id,
        user_email: user.user_email,
        role: user.role
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await db.query("SELECT * FROM users WHERE user_email = $1", [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.user_password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { 
        userId: user.user_id,
        email: user.user_email,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        user_id: user.user_id,
        user_email: user.user_email,
        role: user.role
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};