import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import routes from './routes';
import { initDatabase } from './db';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'https://power2go.onrender.com'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets if any
app.use('/static', express.static(path.join(__dirname, 'public')));

// API Routes
app.get('/api/download-report', (req, res) => {
  const pdfPath = "C:\\Users\\Rohith\\Desktop\\Power2Go_One_Page_Report.pdf";
  if (fs.existsSync(pdfPath)) {
    res.download(pdfPath, 'Power2Go_One_Page_Report.pdf');
  } else {
    res.status(404).json({ error: 'Report file not found on server' });
  }
});
app.get('/api/download-deck', (req, res) => {
  const localPptx = path.join(__dirname, '../Power2Go_Unleash_LLM_Final_Pitch.pptx');
  const desktopPptx = "C:\\Users\\Rohith\\Desktop\\Power2Go_Unleash_LLM_Final_Pitch.pptx";
  const targetPath = fs.existsSync(localPptx) ? localPptx : (fs.existsSync(desktopPptx) ? desktopPptx : null);
  if (targetPath) {
    res.download(targetPath, 'Power2Go_Unleash_LLM_Final_Pitch.pptx');
  } else {
    res.status(404).json({ error: 'Pitch deck file not found on server' });
  }
});
app.use('/api', routes);

// Serve Next.js Static Export in Production
const frontendOutPath = path.join(__dirname, '../../frontend/out');
if (fs.existsSync(frontendOutPath)) {
  console.log(`Serving static frontend files from: ${frontendOutPath}`);
  app.use(express.static(frontendOutPath, { extensions: ['html'] }));
}

// Root Route and SPA Fallback
app.get('*', (req, res, next) => {
  // Pass API requests through to the API router
  if (req.path.startsWith('/api')) {
    return next();
  }
  
  const indexPath = path.join(frontendOutPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({ message: 'Welcome to Power2Go Backend API Service (Frontend build not found)' });
  }
});

// Initialize DB and Start Server
async function startServer() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`Unified server running on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Error starting server:', err);
});
