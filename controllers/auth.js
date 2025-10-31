const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// --- Signup Controller ---
exports.signup = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user already exists
    const user = await db.query("SELECT * FROM users WHERE user_email = $1", [email]);
    if (user.rows.length > 0) {
      return res.status(401).json({ message: "User already exists with that email." });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10); // 10 rounds
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert the new user into the database
    const newUser = await db.query(
      "INSERT INTO users (user_email, user_password) VALUES ($1, $2) RETURNING user_id, user_email",
      [email, hashedPassword]
    );

    // Generate a JWT token
    const token = jwt.sign(
      { userId: newUser.rows[0].user_id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' } // Token expires in 1 hour
    );

    res.status(201).json({
      message: "User created successfully!",
      token: token,
      user: newUser.rows[0]
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// --- Login Controller ---
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const user = await db.query("SELECT * FROM users WHERE user_email = $1", [email]);
    if (user.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials (email not found)." });
    }

    // Compare provided password with stored hashed password
    const storedPassword = user.rows[0].user_password;
    const isMatch = await bcrypt.compare(password, storedPassword);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials (password does not match)." });
    }

    //Generate a JWT token
    const token = jwt.sign(
      { userId: user.rows[0].user_id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      message: "Logged in successfully!",
      token: token,
      user: {
        user_id: user.rows[0].user_id,
        user_email: user.rows[0].user_email
      }
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
};