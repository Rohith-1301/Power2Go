import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as XLSX from 'xlsx';
import { query } from './db';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'power2go_super_secret_jwt_key_99';

// Register User
router.post('/auth/register', async (req: Request, res: Response) => {
  const { name, vehiclePlate, password, registerNumber } = req.body;

  if (!name || !vehiclePlate || !password || !registerNumber) {
    return res.status(400).json({ error: 'All fields (name, vehiclePlate, password, registerNumber) are required' });
  }

  try {
    // Check if user already exists
    const existing = await query('SELECT * FROM users WHERE name = $1', [name]);
    if (existing.rowCount > 0) {
      return res.status(400).json({ error: 'Username already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Save to database
    await query(
      'INSERT INTO users (name, vehicle_plate, password_hash, register_number) VALUES ($1, $2, $3, $4)',
      [name, vehiclePlate, passwordHash, registerNumber]
    );

    res.status(201).json({ message: 'Registration successful' });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Database error during registration' });
  }
});

// Login User
router.post('/auth/login', async (req: Request, res: Response) => {
  const { name, password } = req.body;

  if (!name || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    // Admin login bypass
    if (name === 'Power2Go' && password === '1208006') {
      const token = jwt.sign({ name, isAdmin: true }, JWT_SECRET, { expiresIn: '2h' });
      return res.json({
        message: 'Admin login successful',
        token,
        user: { name: 'Power2Go', registerNumber: 'N/A', vehiclePlate: 'N/A', isAdmin: true },
      });
    }

    const result = await query('SELECT * FROM users WHERE name = $1', [name]);
    if (result.rowCount === 0) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign({ name: user.name, isAdmin: false }, JWT_SECRET, { expiresIn: '24h' });
    res.json({
      message: 'Login successful',
      token,
      user: { name: user.name, vehiclePlate: user.vehicle_plate, registerNumber: user.register_number, isAdmin: false },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Database error during login' });
  }
});

// Create a Booking
router.post('/bookings', async (req: Request, res: Response) => {
  const {
    userName,
    serviceType,
    vehicleType,
    chargingType,
    batteryPercentage,
    distanceKm,
    powerNeededKwh,
    totalAmount,
    paymentType,
    location,
    stationName,
    delayMinutes,
  } = req.body;

  if (!userName || !serviceType || !vehicleType || !chargingType || !paymentType) {
    return res.status(400).json({ error: 'Missing required booking parameters' });
  }

  try {
    await query(
      `INSERT INTO bookings (
        user_name, service_type, vehicle_type, charging_type, battery_percentage,
        distance_km, power_needed_kwh, total_amount, payment_type, location,
        station_name, delay_minutes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        userName,
        serviceType,
        vehicleType,
        chargingType,
        batteryPercentage !== undefined ? parseInt(batteryPercentage) : null,
        distanceKm !== undefined ? parseFloat(distanceKm) : null,
        powerNeededKwh !== undefined ? parseFloat(powerNeededKwh) : null,
        totalAmount !== undefined ? parseFloat(totalAmount) : null,
        paymentType,
        location || null,
        stationName || null,
        delayMinutes !== undefined ? parseInt(delayMinutes) : 0,
      ]
    );

    res.status(201).json({ message: 'Booking created successfully' });
  } catch (error: any) {
    console.error('Booking insertion error:', error);
    res.status(500).json({ error: 'Failed to save booking details' });
  }
});

// Submit Feedback
router.post('/feedback', async (req: Request, res: Response) => {
  const { userName, rating, comments } = req.body;

  if (!userName || rating === undefined) {
    return res.status(400).json({ error: 'User name and rating are required' });
  }

  const numericRating = parseInt(rating);
  if (numericRating < 1 || numericRating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  try {
    await query(
      'INSERT INTO feedbacks (user_name, rating, comments) VALUES ($1, $2, $3)',
      [userName, numericRating, comments || '']
    );

    res.status(201).json({ message: 'Feedback submitted successfully' });
  } catch (error: any) {
    console.error('Feedback error:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Admin Dashboard - Get Data Summary
router.post('/admin/metrics', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (username !== 'Power2Go' || password !== '1208006') {
    return res.status(401).json({ error: 'Unauthorized: Invalid admin credentials' });
  }

  try {
    const usersRes = await query('SELECT id, name, vehicle_plate, register_number, created_at FROM users ORDER BY created_at DESC');
    const bookingsRes = await query('SELECT * FROM bookings ORDER BY booking_time DESC');
    const feedbacksRes = await query('SELECT * FROM feedbacks ORDER BY created_at DESC');

    // Calculate metrics
    const totalUsers = usersRes.rowCount;
    const totalBookings = bookingsRes.rowCount;
    const totalFeedback = feedbacksRes.rowCount;

    // Daily registrations: Count users registered today (July 19, 2026 based on mock system date)
    const todayStr = new Date('2026-07-19').toISOString().split('T')[0];
    const registrationsToday = usersRes.rows.filter((u: any) => {
      const regDate = new Date(u.created_at).toISOString().split('T')[0];
      return regDate === todayStr;
    }).length;

    res.json({
      metrics: {
        totalUsers,
        totalBookings,
        totalFeedback,
        registrationsToday,
      },
      users: usersRes.rows,
      bookings: bookingsRes.rows,
      feedbacks: feedbacksRes.rows,
    });
  } catch (error: any) {
    console.error('Admin metrics fetching error:', error);
    res.status(500).json({ error: 'Failed to fetch admin data' });
  }
});

// Admin Export to Excel
router.get('/admin/export', async (req: Request, res: Response) => {
  // Wait, for security, verify admin query parameters
  const { password } = req.query;
  if (password !== '1208006') {
    return res.status(401).send('Unauthorized to export data');
  }

  try {
    const usersRes = await query('SELECT name, vehicle_plate, register_number, created_at FROM users');
    const bookingsRes = await query('SELECT * FROM bookings');
    const feedbacksRes = await query('SELECT user_name, rating, comments, created_at FROM feedbacks');

    const wb = XLSX.utils.book_new();

    // 1. Customers Sheet
    const wsUsers = XLSX.utils.json_to_sheet(
      usersRes.rows.map((u: any) => ({
        'Customer Name': u.name,
        'Register Number': u.register_number,
        'Vehicle Number Plate': u.vehicle_plate,
        'Registration Date': new Date(u.created_at).toLocaleString(),
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsUsers, 'Customers');

    // 2. Bookings Sheet
    const wsBookings = XLSX.utils.json_to_sheet(
      bookingsRes.rows.map((b: any) => ({
        'Booking ID': b.id,
        'Customer Name': b.user_name,
        'Service Mode': b.service_type,
        'Vehicle Type': b.vehicle_type,
        'Charging Type': b.charging_type,
        'Current Charge (%)': b.battery_percentage,
        'Distance (km)': b.distance_km,
        'Power Consumed (kWh)': b.power_needed_kwh,
        'Total Fee (INR)': b.total_amount,
        'Payment Method': b.payment_type,
        'Location Share': b.location,
        'Station Destination': b.station_name,
        'Est. Delay Fee (INR)': b.delay_minutes ? b.delay_minutes * 2 : 0,
        'Booking Date': new Date(b.booking_time).toLocaleString(),
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsBookings, 'Bookings');

    // 3. Feedback Sheet
    const wsFeedbacks = XLSX.utils.json_to_sheet(
      feedbacksRes.rows.map((f: any) => ({
        'Customer Name': f.user_name,
        'Rating (1-5)': f.rating,
        'Comments': f.comments,
        'Submitted At': new Date(f.created_at).toLocaleString(),
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsFeedbacks, 'Feedback');

    // Write buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="Power2Go_Admin_Report.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Error generating Excel file:', error);
    res.status(500).send('Error generating report');
  }
});

export default router;
