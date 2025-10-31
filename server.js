// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');

// --- App Initialization ---
const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
// Enable Cross-Origin Resource Sharing (CORS)
// This allows your React frontend to make requests to this backend
app.use(cors()); 

// Parse incoming JSON requests
app.use(express.json());

// --- Routes ---
// Mount the authentication routes under the '/auth' path
app.use('/auth', authRoutes);

// --- Server Startup ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});