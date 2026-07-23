import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import routes from './routes';
import { initDatabase } from './db';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.BACKEND_PORT || process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000', // Allow our Next.js frontend
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets if any
app.use('/static', express.static(path.join(__dirname, 'public')));

// Root Route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Power2Go Backend API Service' });
});

// API Routes
app.use('/api', routes);

// Initialize DB and Start Server
async function startServer() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Error starting backend server:', err);
});
