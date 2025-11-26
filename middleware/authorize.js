const jwt = require("jsonwebtoken");
require("dotenv").config();

module.exports = async (req, res, next) => {
  try {
    // 1. Get the token from the header
    const token = req.header("token");

    if (!token) {
      return res.status(403).json({ message: "Authorization Denied. No token provided." });
    }

    // 2. Verify the token
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Attach the user info (user_id) to the request object
    req.user = payload;
    
    // 4. Continue to the next step (the controller)
    next();
  } catch (err) {
    res.status(401).json({ message: "Token is not valid" });
  }
};