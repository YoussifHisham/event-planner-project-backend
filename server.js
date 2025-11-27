// Load environment variables
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events'); 

// --- App Initialization ---
const app = express();
const PORT = 5000;

// --- Middleware ---
// Enable Cross-Origin Resource Sharing (CORS)
// This allows your React frontend to make requests to this backend

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
// Parse incoming JSON requests
app.use(express.json());

// --- Routes ---
app.use('/auth', authRoutes);
app.use('/events', eventRoutes); 

// --- Server Startup ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});