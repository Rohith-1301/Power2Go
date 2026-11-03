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
      const token = jwt.sign({ name, isAdmin: true }, JWT_SECRET, { expiresIn: '365d' });
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

    const token = jwt.sign({ name: user.name, isAdmin: false }, JWT_SECRET, { expiresIn: '365d' });
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
    selectedServices,
  } = req.body;

  if (!userName || !serviceType || !vehicleType || !chargingType || !paymentType) {
    return res.status(400).json({ error: 'Missing required booking parameters' });
  }

  try {
    const isPostgres = !!(
      process.env.PGHOST &&
      process.env.PGUSER &&
      process.env.PGPASSWORD &&
      process.env.PGDATABASE
    );

    let result;
    let bookingId: number;

    if (isPostgres) {
      result = await query(
        `INSERT INTO bookings (
          user_name, service_type, vehicle_type, charging_type, battery_percentage,
          distance_km, power_needed_kwh, total_amount, payment_type, location,
          station_name, delay_minutes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
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
      bookingId = result.rows[0].id;
    } else {
      result = await query(
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
      bookingId = result.lastInsertRowid;
    }

    // Insert associated EV services if selected
    if (selectedServices && Array.isArray(selectedServices)) {
      for (const service of selectedServices) {
        await query(
          'INSERT INTO booking_services (booking_id, service_name, service_price, duration_mins) VALUES ($1, $2, $3, $4)',
          [bookingId, service.name, parseFloat(service.price), parseInt(service.duration)]
        );
      }
    }

    // Automatically trigger Dispatch Finder for mobile or emergency requests
    const sType = serviceType.toLowerCase();
    if (sType.includes('mobile') || sType.includes('emergency') || sType.includes('sos')) {
      setTimeout(() => {
        triggerDispatch(bookingId, req.body);
      }, 500);
    }

    res.status(201).json({ message: 'Booking created successfully', bookingId });
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
    const driversRes = await query('SELECT * FROM drivers ORDER BY created_at DESC');

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
      drivers: driversRes.rows,
    });
  } catch (error: any) {
    console.error('Admin metrics fetching error:', error);
    res.status(500).json({ error: 'Failed to fetch admin data' });
  }
});

// Admin Export to Excel
router.get('/admin/export', async (req: Request, res: Response) => {
  const { password } = req.query;
  if (password !== '1208006') {
    return res.status(401).send('Unauthorized to export data');
  }

  try {
    const usersRes = await query('SELECT name, vehicle_plate, register_number, created_at FROM users');
    const bookingsRes = await query('SELECT * FROM bookings');
    const feedbacksRes = await query('SELECT user_name, rating, comments, created_at FROM feedbacks');
    const driversRes = await query('SELECT * FROM drivers');

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
        'Driver Rating': b.driver_rating || 'N/A',
        'Driver Feedback': b.driver_feedback || 'N/A',
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

    // 4. Drivers Sheet
    const wsDrivers = XLSX.utils.json_to_sheet(
      driversRes.rows.map((d: any) => ({
        'Driver ID': d.driver_id,
        'Name': d.name,
        'Mobile': d.mobile,
        'Email': d.email,
        'Aadhaar Number': d.aadhaar_number,
        'Driving License': d.license_number,
        'Vehicle Number': d.vehicle_number,
        'Vehicle Type': d.vehicle_type,
        'Battery Level (%)': d.battery_capacity,
        'Status': d.status,
        'Approved': d.is_approved ? 'Yes' : 'No',
        'Location Lat': d.lat,
        'Location Lng': d.lng,
        'Joined Date': new Date(d.created_at).toLocaleString(),
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsDrivers, 'Drivers');

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

// Create a Trip Plan
router.post('/trips', async (req: Request, res: Response) => {
  const {
    userName,
    startLocation,
    endLocation,
    vehicleType,
    vehicleModel,
    batteryCapacity,
    currentCharge,
    totalDistance,
    totalDuration,
    stopsCount,
    stopsDetails,
    totalCost
  } = req.body;

  if (!userName || !startLocation || !endLocation || !vehicleType || !vehicleModel || batteryCapacity === undefined || currentCharge === undefined || totalDistance === undefined || !totalDuration || stopsCount === undefined || !stopsDetails || totalCost === undefined) {
    return res.status(400).json({ error: 'All trip parameters are required' });
  }

  try {
    const result = await query(
      'INSERT INTO trips (user_name, start_location, end_location, vehicle_type, vehicle_model, battery_capacity, current_charge, total_distance, total_duration, stops_count, stops_details, total_cost) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
      [userName, startLocation, endLocation, vehicleType, vehicleModel, batteryCapacity, currentCharge, totalDistance, totalDuration, stopsCount, stopsDetails, totalCost]
    );

    res.status(201).json({ message: 'Trip planned successfully', lastInsertRowid: result.lastInsertRowid });
  } catch (error) {
    console.error('Error saving trip:', error);
    res.status(500).json({ error: 'Database error while saving trip' });
  }
});

// Get Trip History for user
router.get('/trips', async (req: Request, res: Response) => {
  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ error: 'Username is required to fetch trips' });
  }

  try {
    const result = await query(
      'SELECT * FROM trips WHERE user_name = $1 ORDER BY created_at DESC',
      [username]
    );
    res.json({ trips: result.rows });
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({ error: 'Database error while fetching trip history' });
  }
});

// --- DRIVER MANAGEMENT SYSTEM BACKEND ENGINE ---

export interface ActiveDispatch {
  bookingId: number;
  userName: string;
  vehicleType: string;
  chargingType: string;
  batteryPercentage: number;
  powerNeededKwh: number;
  totalAmount: number;
  location: string;
  address: string;
  drivers: any[]; // online drivers sorted by distance
  currentIdx: number;
  notifiedDriverId: string | null;
  notificationTime: number;
  status: 'searching' | 'notified' | 'accepted' | 'rejected' | 'failed';
}

export const activeDispatches: Record<number, ActiveDispatch> = {};

function getReadableAddress(locationStr: string): string {
  if (!locationStr) return 'Unknown Location';
  
  let lat = 0, lng = 0, found = false;
  const regex1 = /Lat:\s*(-?\d+\.\d+).*Lng:\s*(-?\d+\.\d+)/i;
  const match1 = locationStr.match(regex1);
  if (match1) {
    lat = parseFloat(match1[1]);
    lng = parseFloat(match1[2]);
    found = true;
  } else {
    const regex2 = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/;
    const match2 = locationStr.match(regex2);
    if (match2) {
      lat = parseFloat(match2[1]);
      lng = parseFloat(match2[2]);
      found = true;
    }
  }

  if (found) {
    if (Math.abs(lat - 10.9602) < 0.05 && Math.abs(lng - 78.0766) < 0.05) {
      return 'Near Karur Bus Stand, Karur';
    }
    if (Math.abs(lat - 10.9392) < 0.05 && Math.abs(lng - 78.4147) < 0.05) {
      return 'Near Bus Stand, Kulithalai';
    }
    if (Math.abs(lat - 9.9322) < 0.05 && Math.abs(lng - 78.1561) < 0.05) {
      return 'Near Mattuthavani Bus Stand, Madurai';
    }
    if (Math.abs(lat - 12.9915) < 0.05 && Math.abs(lng - 80.2173) < 0.05) {
      return 'Near Phoenix Marketcity, Velachery, Chennai';
    }
    if (Math.abs(lat - 10.8056) < 0.05 && Math.abs(lng - 78.6856) < 0.05) {
      return 'Near Central Bus Stand, Trichy';
    }
    if (Math.abs(lat - 11.6643) < 0.05 && Math.abs(lng - 78.1460) < 0.05) {
      return 'Near NH-44 Salem Bypass Crossing, Salem';
    }
    return `Area coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  }
  return locationStr;
}

async function triggerDispatch(bookingId: number, reqBody: any) {
  const { userName, vehicleType, chargingType, batteryPercentage, powerNeededKwh, totalAmount, location } = reqBody;
  let cLat = 10.9602, cLng = 78.0766;
  if (location) {
    const regex1 = /Lat:\s*(-?\d+\.\d+).*Lng:\s*(-?\d+\.\d+)/i;
    const match1 = location.match(regex1);
    if (match1) {
      cLat = parseFloat(match1[1]);
      cLng = parseFloat(match1[2]);
    } else {
      const regex2 = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/;
      const match2 = location.match(regex2);
      if (match2) {
        cLat = parseFloat(match2[1]);
        cLng = parseFloat(match2[2]);
      }
    }
  }

  try {
    const driversRes = await query("SELECT id, driver_id, name, lat, lng, mobile, vehicle_number, battery_capacity FROM drivers WHERE status = 'online' AND is_approved = 1");
    if (driversRes.rowCount === 0) {
      activeDispatches[bookingId] = {
        bookingId,
        userName,
        vehicleType,
        chargingType,
        batteryPercentage: parseInt(batteryPercentage || '0'),
        powerNeededKwh: parseFloat(powerNeededKwh || '0'),
        totalAmount: parseFloat(totalAmount || '0'),
        location: location || '',
        address: getReadableAddress(location || ''),
        drivers: [],
        currentIdx: 0,
        notifiedDriverId: null,
        notificationTime: 0,
        status: 'failed'
      };
      return;
    }

    const driverList = driversRes.rows.map((drv: any) => {
      const dLat = drv.lat || 10.9602;
      const dLng = drv.lng || 78.0766;
      const dist = Math.sqrt(Math.pow(dLat - cLat, 2) + Math.pow(dLng - cLng, 2)) * 111.12;
      return { ...drv, distance: dist };
    });

    driverList.sort((a: any, b: any) => a.distance - b.distance);

    activeDispatches[bookingId] = {
      bookingId,
      userName,
      vehicleType,
      chargingType,
      batteryPercentage: parseInt(batteryPercentage || '0'),
      powerNeededKwh: parseFloat(powerNeededKwh || '0'),
      totalAmount: parseFloat(totalAmount || '0'),
      location: location || '',
      address: getReadableAddress(location || ''),
      drivers: driverList,
      currentIdx: 0,
      notifiedDriverId: driverList[0].driver_id,
      notificationTime: Date.now(),
      status: 'notified'
    };
  } catch (err) {
    console.error('Error triggering dispatch:', err);
  }
}

function cascadeDispatch(bookingId: number) {
  const dispatch = activeDispatches[bookingId];
  if (!dispatch || dispatch.status === 'accepted' || dispatch.status === 'failed') return;

  const nextIdx = dispatch.currentIdx + 1;
  if (nextIdx < dispatch.drivers.length) {
    dispatch.currentIdx = nextIdx;
    dispatch.notifiedDriverId = dispatch.drivers[nextIdx].driver_id;
    dispatch.notificationTime = Date.now();
    dispatch.status = 'notified';
  } else {
    dispatch.notifiedDriverId = null;
    dispatch.status = 'failed';
  }
}

function checkDispatchTimeouts() {
  const now = Date.now();
  for (const bookingId in activeDispatches) {
    const dispatch = activeDispatches[bookingId];
    if (dispatch.status === 'notified' && (now - dispatch.notificationTime > 30000)) {
      cascadeDispatch(dispatch.bookingId);
    }
  }
}

// 1. Driver Registration
router.post('/auth/driver/register', async (req: Request, res: Response) => {
  const { name, mobile, email, password, aadhaarNumber, licenseNumber, vehicleNumber, vehicleType, emergencyContact, batteryCapacity, profilePhoto, role } = req.body;
  if (!name || !mobile || !email || !password || !aadhaarNumber || !licenseNumber || !vehicleNumber || !vehicleType || !emergencyContact) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  const workerRole = role === 'mechanic' ? 'mechanic' : 'driver';
  try {
    const existing = await query('SELECT * FROM drivers WHERE email = $1', [email]);
    if (existing.rowCount > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const driverId = (workerRole === 'mechanic' ? 'MECH' : 'DRV') + Math.floor(100000 + Math.random() * 90000);
    
    const lat = 10.9602 + (Math.random() - 0.5) * 0.05;
    const lng = 78.0766 + (Math.random() - 0.5) * 0.05;

    await query(
      `INSERT INTO drivers (driver_id, name, mobile, email, password_hash, profile_photo, aadhaar_number, license_number, vehicle_number, vehicle_type, emergency_contact, battery_capacity, lat, lng, is_approved, status, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 0, 'offline', $15)`,
      [driverId, name, mobile, email, passwordHash, profilePhoto || null, aadhaarNumber, licenseNumber, vehicleNumber, vehicleType, emergencyContact, batteryCapacity || 100.0, lat, lng, workerRole]
    );
    res.status(201).json({ message: 'Registration successful. Application pending admin approval.', driverId });
  } catch (error) {
    console.error('Driver registration error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 2. Driver Login
router.post('/auth/driver/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    const result = await query('SELECT * FROM drivers WHERE email = $1', [email]);
    if (result.rowCount === 0) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    const driver = result.rows[0];
    const isApproved = Boolean(Number(driver.is_approved) === 1 || driver.is_approved === true || driver.is_approved === 'true');
    if (!isApproved) {
      return res.status(403).json({ error: 'Your profile is pending admin approval.' });
    }
    const isMatch = await bcrypt.compare(password, driver.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign({ name: driver.name, driverId: driver.driver_id, isDriver: true, role: driver.role || 'driver' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({
      message: 'Worker login successful',
      token,
      driver: {
        driverId: driver.driver_id,
        name: driver.name,
        email: driver.email,
        mobile: driver.mobile,
        vehicleNumber: driver.vehicle_number,
        vehicleType: driver.vehicle_type,
        profilePhoto: driver.profile_photo,
        role: driver.role || 'driver',
        batteryCapacity: driver.battery_capacity,
        isDriver: true
      }
    });
  } catch (error) {
    console.error('Driver login error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// 3. Driver status & location update
router.post('/drivers/status', async (req: Request, res: Response) => {
  const { driverId, status } = req.body;
  try {
    await query('UPDATE drivers SET status = $1 WHERE driver_id = $2', [status, driverId]);
    res.json({ message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/drivers/location', async (req: Request, res: Response) => {
  const { driverId, lat, lng, batteryCapacity } = req.body;
  try {
    if (batteryCapacity !== undefined) {
      await query('UPDATE drivers SET lat = $1, lng = $2, battery_capacity = $3 WHERE driver_id = $4', [parseFloat(lat), parseFloat(lng), parseFloat(batteryCapacity), driverId]);
    } else {
      await query('UPDATE drivers SET lat = $1, lng = $2 WHERE driver_id = $3', [parseFloat(lat), parseFloat(lng), driverId]);
    }
    res.json({ message: 'Location updated' });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// 4. Pending, active and historical orders for Driver
router.get('/bookings/driver-pending', async (req: Request, res: Response) => {
  const { driverId } = req.query;
  if (!driverId) return res.status(400).json({ error: 'Driver ID is required' });
  
  checkDispatchTimeouts();

  let pendingBooking = null;
  for (const bId in activeDispatches) {
    const dsp = activeDispatches[bId];
    if (dsp.status === 'notified' && dsp.notifiedDriverId === driverId) {
      const remainingTime = Math.max(0, Math.round((30000 - (Date.now() - dsp.notificationTime)) / 1000));
      if (remainingTime > 0) {
        pendingBooking = {
          bookingId: dsp.bookingId,
          userName: dsp.userName,
          vehicleType: dsp.vehicleType,
          chargingType: dsp.chargingType,
          batteryPercentage: dsp.batteryPercentage,
          powerNeededKwh: dsp.powerNeededKwh,
          totalAmount: dsp.totalAmount,
          location: dsp.location,
          address: dsp.address,
          remainingTime
        };
        break;
      }
    }
  }

  res.json({ pendingBooking });
});

router.post('/bookings/driver-respond', async (req: Request, res: Response) => {
  const { bookingId, driverId, response } = req.body;
  const dispatch = activeDispatches[bookingId];
  if (!dispatch) return res.status(404).json({ error: 'Booking dispatch state not found' });

  if (response === 'accept') {
    try {
      const driverRes = await query('SELECT id FROM drivers WHERE driver_id = $1', [driverId]);
      if (driverRes.rowCount === 0) return res.status(404).json({ error: 'Driver not found' });
      
      const dbDriverId = driverRes.rows[0].id;
      await query("UPDATE bookings SET status = 'accepted', assigned_driver_id = $1 WHERE id = $2", [dbDriverId, bookingId]);
      
      dispatch.status = 'accepted';
      dispatch.notifiedDriverId = driverId;
      res.json({ message: 'Booking accepted successfully' });
    } catch (err) {
      res.status(500).json({ error: 'Database error during acceptance' });
    }
  } else {
    cascadeDispatch(bookingId);
    res.json({ message: 'Booking rejected' });
  }
});

router.get('/drivers/orders/today', async (req: Request, res: Response) => {
  const { driverId } = req.query;
  try {
    const driverRes = await query('SELECT id FROM drivers WHERE driver_id = $1', [driverId]);
    if (driverRes.rowCount === 0) return res.json({ bookings: [] });
    
    const dbDriverId = driverRes.rows[0].id;
    // For local databases where strftime / SQLite is used:
    const bookingsRes = await query(
      "SELECT * FROM bookings WHERE assigned_driver_id = $1 ORDER BY booking_time DESC", 
      [dbDriverId]
    );
    res.json({ bookings: bookingsRes.rows });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/drivers/orders/completed', async (req: Request, res: Response) => {
  const { driverId } = req.query;
  try {
    const driverRes = await query('SELECT id FROM drivers WHERE driver_id = $1', [driverId]);
    if (driverRes.rowCount === 0) return res.json({ bookings: [] });
    
    const dbDriverId = driverRes.rows[0].id;
    const bookingsRes = await query(
      "SELECT * FROM bookings WHERE assigned_driver_id = $1 AND status = 'completed' ORDER BY booking_time DESC", 
      [dbDriverId]
    );
    res.json({ bookings: bookingsRes.rows });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/drivers/orders/earnings', async (req: Request, res: Response) => {
  const { driverId } = req.query;
  try {
    const driverRes = await query('SELECT id FROM drivers WHERE driver_id = $1', [driverId]);
    if (driverRes.rowCount === 0) return res.json({ earnings: 0, completedCount: 0 });
    
    const dbDriverId = driverRes.rows[0].id;
    const statsRes = await query(
      "SELECT SUM(total_amount) as total_earnings, COUNT(id) as completed_count FROM bookings WHERE assigned_driver_id = $1 AND status = 'completed'", 
      [dbDriverId]
    );
    res.json({
      earnings: statsRes.rows[0].total_earnings || 0,
      completedCount: statsRes.rows[0].completed_count || 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// 5. Active Order Live Tracking for Customer / Driver
router.get('/bookings/:id/track', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const bookingRes = await query('SELECT * FROM bookings WHERE id = $1', [id]);
    if (bookingRes.rowCount === 0) return res.status(404).json({ error: 'Booking not found' });
    
    const booking = bookingRes.rows[0];
    
    let driver = null;
    if (booking.assigned_driver_id) {
      const driverRes = await query('SELECT name, mobile, vehicle_number, vehicle_type, profile_photo, lat, lng, battery_capacity FROM drivers WHERE id = $1', [booking.assigned_driver_id]);
      if (driverRes.rowCount > 0) {
        driver = driverRes.rows[0];
      }
    }
    
    res.json({ booking, driver });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/bookings/:id/progress', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, batteryPct, energyDelivered, durationMins, cost } = req.body;
  try {
    if (status === 'completed') {
      await query(
        `UPDATE bookings SET status = 'completed', live_battery_pct = $1, live_energy_delivered = $2, live_duration_mins = $3, total_amount = $4 WHERE id = $5`,
        [parseInt(batteryPct || '100'), parseFloat(energyDelivered || '0'), parseInt(durationMins || '0'), parseFloat(cost || '0'), id]
      );
    } else {
      await query(
        `UPDATE bookings SET status = $1, live_battery_pct = $2, live_energy_delivered = $3, live_duration_mins = $4, total_amount = $5 WHERE id = $6`,
        [status, parseInt(batteryPct || '0'), parseFloat(energyDelivered || '0'), parseInt(durationMins || '0'), parseFloat(cost || '0'), id]
      );
    }
    res.json({ message: 'Progress updated' });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/bookings/:id/rate', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { rating, feedback } = req.body;
  try {
    await query('UPDATE bookings SET driver_rating = $1, driver_feedback = $2 WHERE id = $3', [parseInt(rating), feedback || '', id]);
    res.json({ message: 'Rating submitted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// 6. Admin Driver approval APIs
router.post('/drivers/approve', async (req: Request, res: Response) => {
  const { driverId, approve } = req.body;
  const val = approve ? 1 : 0;
  try {
    await query('UPDATE drivers SET is_approved = $1 WHERE driver_id = $2', [val, driverId]);
    res.json({ message: `Driver status updated: ${approve ? 'Approved' : 'Unapproved'}` });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Get Active Booking for User
router.get('/bookings/active', async (req: Request, res: Response) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Username is required' });
  try {
    const result = await query(
      "SELECT * FROM bookings WHERE user_name = $1 AND status != 'completed' ORDER BY booking_time DESC LIMIT 1",
      [username]
    );
    if (result.rowCount > 0) {
      const booking = result.rows[0];
      let driver = null;
      if (booking.assigned_driver_id) {
        const driverRes = await query('SELECT name, mobile, vehicle_number, vehicle_type, profile_photo, lat, lng FROM drivers WHERE id = $1', [booking.assigned_driver_id]);
        if (driverRes.rowCount > 0) driver = driverRes.rows[0];
      }
      
      // Fetch any booked EV services associated with this booking
      const servicesRes = await query('SELECT * FROM booking_services WHERE booking_id = $1', [booking.id]);
      
      return res.json({ activeBooking: booking, driver, services: servicesRes.rows });
    }
    res.json({ activeBooking: null });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// EV SERVICES ROUTES

// GET /api/services - List all available station services
router.get('/services', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM station_services ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/admin/services/update - Toggle availability or edit price
router.post('/admin/services/update', async (req: Request, res: Response) => {
  const { id, isAvailable, price } = req.body;
  const avail = isAvailable ? 1 : 0;
  try {
    await query(
      'UPDATE station_services SET is_available = $1, price = $2 WHERE id = $3',
      [avail, parseFloat(price), parseInt(id)]
    );
    res.json({ message: 'Service configuration updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/bookings/:id/services/status - Update technician & progress status of a service
router.post('/bookings/:id/services/status', async (req: Request, res: Response) => {
  const { id } = req.params; // booking id
  const { serviceId, status, technicianName } = req.body;
  try {
    await query(
      'UPDATE booking_services SET status = $1, technician_name = $2 WHERE id = $3 AND booking_id = $4',
      [status, technicianName || null, parseInt(serviceId), parseInt(id)]
    );
    res.json({ message: 'Service status updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/bookings/:id/services/rate - Rate a specific service
router.post('/bookings/:id/services/rate', async (req: Request, res: Response) => {
  const { id } = req.params; // booking id
  const { serviceId, rating, feedback } = req.body;
  try {
    await query(
      'UPDATE booking_services SET rating = $1, feedback = $2 WHERE id = $3 AND booking_id = $4',
      [parseInt(rating), feedback || '', parseInt(serviceId), parseInt(id)]
    );
    res.json({ message: 'Service feedback submitted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});


// EV REPAIR & ROADSIDE ASSISTANCE ROUTES

// POST /api/repairs/diagnose - Run AI diagnosis mock
router.post('/repairs/diagnose', async (req: Request, res: Response) => {
  const { description, vehicleType, vehicleNumber, batteryLevel } = req.body;
  if (!description) return res.status(400).json({ error: 'Description is required' });

  const desc = description.toLowerCase();
  let diagnosis = "EV Drive Unit Control Module Error";
  let causes = ["High-voltage control module communication fault", "Inverter capacitor pre-charge failure", "Auxiliary 12V battery power supply sag"];
  let severity = "Warning"; // Critical, Warning, Normal
  let recommendations = "Restart vehicle system, perform drive unit systems diagnostic check, verify 12V battery health status.";
  let category = "Electrical System / Control Unit";

  if (desc.includes('battery') || desc.includes('charge') || desc.includes('power') || desc.includes('dead')) {
    diagnosis = "HV Battery Pack Cell Imbalance / BMS Lockout";
    causes = ["Over-discharge of individual battery cells", "BMS firmware communication timeout", "BMS safety contactor open circuit failure"];
    severity = "Critical";
    recommendations = "Do not attempt to start the vehicle. Call roadside emergency support immediately. Vehicle recovery to center recommended.";
    category = "High Voltage Battery Pack";
  } else if (desc.includes('tire') || desc.includes('puncture') || desc.includes('flat') || desc.includes('wheel')) {
    diagnosis = "Tire Puncture / Pressure Loss";
    causes = ["Road hazard sharp object intrusion", "Valve core leakage", "TPMS sensor unit battery depleted"];
    severity = "Warning";
    recommendations = "Pull over safely. Inspect tire carcass for embedded objects. Use standard inflation kit if puncture is minimal, otherwise request roadside mechanic.";
    category = "Wheels & Tires";
  } else if (desc.includes('brake') || desc.includes('noise') || desc.includes('squeak') || desc.includes('stop')) {
    diagnosis = "Brake Caliper Seized / Friction Material Wear";
    causes = ["Corrosion inside brake slide pins", "Pad friction material worn past wear indicator", "Brake master cylinder pressure check fault"];
    severity = "Critical";
    recommendations = "Avoid driving if brake pedal feels soft or unresponsive. Roadside mechanic dispatch recommended to inspect caliper piston safety.";
    category = "Brakes & Suspension";
  } else if (desc.includes('ac') || desc.includes('cooling') || desc.includes('filter') || desc.includes('hot')) {
    diagnosis = "AC Compressor Thermal Anomaly / Filter Blockage";
    causes = ["Cabin air filter completely clogged", "Refrigerant loop pressure leak", "Thermal expansion valve solenoid sticking"];
    severity = "Warning";
    recommendations = "Inspect cabin filter status. Turn off climate control loop to avoid compressor motor overheating.";
    category = "HVAC / Climate Control";
  }

  let recommendedAction = "mechanic";
  if (severity === "Critical" || desc.includes("tow") || desc.includes("flatbed") || desc.includes("dead") || desc.includes("accident") || desc.includes("smoke") || desc.includes("fire")) {
    recommendedAction = "tow";
  }

  res.json({
    diagnosis,
    causes,
    severity,
    recommendations,
    category,
    recommendedAction,
    disclaimer: "AI result is only a preliminary assessment. A qualified mechanic must perform the final diagnosis."
  });
});

// GET /api/repairs/mechanics/nearest - Query nearest available mechanics
router.get('/repairs/mechanics/nearest', async (req: Request, res: Response) => {
  try {
    const registered = await query("SELECT driver_id AS mechanic_id, name, mobile, profile_photo, 5.0 AS rating, 'available' AS status, vehicle_type || ' ' || vehicle_number AS vehicle_details, lat, lng FROM drivers WHERE role = 'mechanic' AND (status = 'online' OR status = 'available')");
    const seeded = await query("SELECT * FROM mechanics WHERE status = 'available' ORDER BY rating DESC");
    res.json([...registered.rows, ...seeded.rows]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/repairs/request - Create a new roadside repair request
router.post('/repairs/request', async (req: Request, res: Response) => {
  const {
    userName,
    vehicleType,
    vehicleNumber,
    description,
    photoUrl,
    location,
    aiDiagnosisResult,
    serviceOption
  } = req.body;

  const vNum = vehicleNumber ? String(vehicleNumber).trim() : 'N/A';
  const desc = description ? String(description).trim() : 'Roadside malfunction';
  const loc = location ? String(location).trim() : 'Karur Center';

  if (!userName || !vehicleType) {
    return res.status(400).json({ error: 'Missing userName or vehicleType' });
  }

  try {
    const isPostgres = !!(
      process.env.PGHOST &&
      process.env.PGUSER &&
      process.env.PGPASSWORD &&
      process.env.PGDATABASE
    );

    let result;
    let requestId: number;

    const queryStr = `
      INSERT INTO repair_requests (
        user_name, vehicle_type, vehicle_number, description, photo_url,
        location, ai_diagnosis_result, status, service_option
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
    `;
    const params = [
      userName,
      vehicleType,
      vNum,
      desc,
      photoUrl || null,
      loc,
      aiDiagnosisResult ? JSON.stringify(aiDiagnosisResult) : null,
      serviceOption || 'none'
    ];

    if (isPostgres) {
      result = await query(queryStr + ' RETURNING id', params);
      requestId = result.rows[0].id;
    } else {
      result = await query(queryStr, params);
      requestId = result.lastInsertRowid;
    }

    res.status(201).json({ message: 'Repair request created successfully', requestId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/repairs/active - Fetch active repair request for a customer
router.get('/repairs/active', async (req: Request, res: Response) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Username is required' });
  try {
    const result = await query(
      "SELECT * FROM repair_requests WHERE user_name = $1 AND status != 'completed' ORDER BY created_at DESC LIMIT 1",
      [username]
    );
    if (result.rowCount > 0) {
      const repair = result.rows[0];
      let mechanic = null;
      if (repair.mechanic_id) {
        // Try to fetch from registered workers in drivers table first
        const driverMech = await query(
          "SELECT driver_id AS mechanic_id, name, mobile, profile_photo, 5.0 AS rating, vehicle_type || ' ' || vehicle_number AS vehicle_details, lat, lng FROM drivers WHERE driver_id = $1",
          [repair.mechanic_id]
        );
        if (driverMech.rowCount > 0) {
          mechanic = driverMech.rows[0];
        } else {
          // Fallback to static mechanics table
          const mechRes = await query('SELECT * FROM mechanics WHERE mechanic_id = $1', [repair.mechanic_id]);
          if (mechRes.rowCount > 0) mechanic = mechRes.rows[0];
        }
      }

      let towDriver = null;
      if (repair.tow_driver_id) {
        const driverRes = await query('SELECT * FROM drivers WHERE driver_id = $1', [repair.tow_driver_id]);
        if (driverRes.rowCount > 0) {
          const d = driverRes.rows[0];
          towDriver = {
            name: d.name,
            mobile: d.mobile,
            profile_photo: d.profile_photo || 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=256',
            vehicle_details: (d.vehicle_type || 'Heavy Flatbed Tow') + ' ' + d.vehicle_number
          };
        }
      }

      return res.json({ activeRepair: repair, mechanic, towDriver });
    }
    res.json({ activeRepair: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/repairs/mechanic/active - Fetch active/pending repair request for a mechanic
router.get('/repairs/mechanic/active', async (req: Request, res: Response) => {
  const { mechanicId } = req.query;
  if (!mechanicId) return res.status(400).json({ error: 'mechanicId is required' });
  try {
    const activeRes = await query(
      "SELECT * FROM repair_requests WHERE mechanic_id = $1 AND status != 'completed' AND status != 'recovery_required' AND status != 'station_assigned' ORDER BY created_at DESC LIMIT 1",
      [mechanicId]
    );
    if (activeRes.rowCount > 0) {
      return res.json({ activeRepair: activeRes.rows[0], pendingRepair: null });
    }

    const pendingRes = await query(
      "SELECT * FROM repair_requests WHERE status = 'pending' AND (service_option = 'book_mechanic' OR service_option = 'none') ORDER BY created_at DESC LIMIT 1"
    );
    if (pendingRes.rowCount > 0) {
      return res.json({ activeRepair: null, pendingRepair: pendingRes.rows[0] });
    }

    res.json({ activeRepair: null, pendingRepair: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/repairs/mechanic/earnings - Fetch earnings for mechanic
router.get('/repairs/mechanic/earnings', async (req: Request, res: Response) => {
  const { mechanicId } = req.query;
  if (!mechanicId) return res.status(400).json({ error: 'mechanicId is required' });
  try {
    const result = await query(
      "SELECT estimate_labor, estimate_parts, estimate_diagnostics, estimate_other FROM repair_requests WHERE mechanic_id = $1 AND status = 'completed'",
      [mechanicId]
    );
    let earnings = 0;
    result.rows.forEach((r: any) => {
      earnings += (r.estimate_labor || 0) + (r.estimate_parts || 0) + (r.estimate_diagnostics || 0) + (r.estimate_other || 0);
    });
    res.json({ earnings, completedCount: result.rowCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/repairs/driver-pending - Fetch pending towing jobs for drivers
router.get('/repairs/driver-pending', async (req: Request, res: Response) => {
  try {
    const pendingRes = await query(
      "SELECT * FROM repair_requests WHERE status = 'tow_requested' AND (tow_driver_id IS NULL OR tow_driver_id = '') ORDER BY created_at DESC LIMIT 1"
    );
    if (pendingRes.rowCount > 0) {
      const p = pendingRes.rows[0];
      return res.json({
        pendingBooking: {
          bookingId: p.id,
          userName: p.user_name,
          vehicleType: p.vehicle_type,
          chargingType: 'Towing Recovery Dispatch',
          batteryPercentage: 0,
          powerNeededKwh: 0,
          totalAmount: 0,
          location: p.location,
          address: p.location,
          remainingTime: 30,
          isTowing: true
        }
      });
    }
    res.json({ pendingBooking: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/repairs/:id/driver-respond - Driver accept/decline towing shift
router.post('/repairs/:id/driver-respond', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { driverId, accept } = req.body;
  if (!driverId) return res.status(400).json({ error: 'driverId is required' });
  try {
    if (accept) {
      await query(
        "UPDATE repair_requests SET tow_driver_id = $1, status = 'recovery_required', recovery_vehicle_assigned = 1, recovery_status = 'dispatched' WHERE id = $2",
        [driverId, parseInt(id)]
      );
    }
    res.json({ message: 'Respond recorded successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/repairs/driver-active - Get active towing job assigned to a driver
router.get('/repairs/driver-active', async (req: Request, res: Response) => {
  const { driverId } = req.query;
  if (!driverId) return res.status(400).json({ error: 'driverId is required' });
  try {
    const activeRes = await query(
      "SELECT * FROM repair_requests WHERE tow_driver_id = $1 AND status != 'completed' ORDER BY created_at DESC LIMIT 1",
      [driverId]
    );
    if (activeRes.rowCount > 0) {
      return res.json({ activeRepair: activeRes.rows[0] });
    }
    res.json({ activeRepair: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/repairs/:id/mechanic/respond - Mechanic accept/reject request
router.post('/repairs/:id/mechanic/respond', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { mechanicId, accept } = req.body;
  try {
    if (accept) {
      await query(
        "UPDATE repair_requests SET status = 'accepted', mechanic_id = $1, service_option = 'book_mechanic' WHERE id = $2",
        [mechanicId, parseInt(id)]
      );
      await query("UPDATE mechanics SET status = 'busy' WHERE mechanic_id = $1", [mechanicId]);
    } else {
      await query("UPDATE repair_requests SET status = 'pending', mechanic_id = NULL WHERE id = $1", [parseInt(id)]);
    }
    res.json({ message: 'Response registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/repairs/:id/status - Update repair request status
router.post('/repairs/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, serviceOption, stationName } = req.body;
  try {
    let updateFields = [];
    let params = [];
    let index = 1;

    if (status) {
      updateFields.push(`status = $${index++}`);
      params.push(status);
    }
    if (serviceOption) {
      updateFields.push(`service_option = $${index++}`);
      params.push(serviceOption);
    }
    if (stationName) {
      updateFields.push(`station_name = $${index++}`);
      params.push(stationName);
    }

    params.push(parseInt(id));
    const queryStr = `UPDATE repair_requests SET ${updateFields.join(', ')} WHERE id = $${index}`;
    
    await query(queryStr, params);

    // If status becomes completed, free up the mechanic
    if (status === 'completed') {
      const repairRes = await query('SELECT mechanic_id FROM repair_requests WHERE id = $1', [parseInt(id)]);
      if (repairRes.rowCount > 0 && repairRes.rows[0].mechanic_id) {
        await query("UPDATE mechanics SET status = 'available' WHERE mechanic_id = $1", [repairRes.rows[0].mechanic_id]);
      }
    }

    res.json({ message: 'Repair status updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/repairs/:id/request-recovery - Request towing recovery
router.post('/repairs/:id/request-recovery', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { stationName } = req.body;
  try {
    await query(
      "UPDATE repair_requests SET recovery_vehicle_assigned = 0, recovery_status = 'pending', status = 'tow_requested', station_name = $1, tow_driver_id = NULL WHERE id = $2",
      [stationName || 'Power2Go Station Hub', parseInt(id)]
    );
    res.json({ message: 'Towing request submitted. Waiting for driver acceptance.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/repairs/:id/estimate - Admin/Technician submit estimate
router.post('/repairs/:id/estimate', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { labor, parts, diagnostics, other } = req.body;
  try {
    await query(
      "UPDATE repair_requests SET estimate_labor = $1, estimate_parts = $2, estimate_diagnostics = $3, estimate_other = $4, estimate_status = 'pending_approval' WHERE id = $5",
      [parseFloat(labor), parseFloat(parts), parseFloat(diagnostics), parseFloat(other), parseInt(id)]
    );
    res.json({ message: 'Repair estimate submitted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/repairs/:id/estimate/approve - Customer approve/reject estimate
router.post('/repairs/:id/estimate/approve', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { approve } = req.body;
  const statusVal = approve ? 'approved' : 'rejected';
  const newRepairStatus = approve ? 'repair_in_progress' : 'inspection_started';
  try {
    await query(
      "UPDATE repair_requests SET estimate_status = $1, status = $2 WHERE id = $3",
      [statusVal, newRepairStatus, parseInt(id)]
    );
    res.json({ message: `Estimate ${statusVal} successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/repairs/:id/pay - Pay repair invoice
router.post('/repairs/:id/pay', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { method } = req.body;
  try {
    await query(
      "UPDATE repair_requests SET payment_status = 'paid', payment_method = $1 WHERE id = $2",
      [method, parseInt(id)]
    );
    res.json({ message: 'Payment registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST /api/repairs/:id/rate - Rate roadside repair experience
router.post('/repairs/:id/rate', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { ratingMechanic, ratingRepair, ratingOverall, feedback } = req.body;
  try {
    await query(
      "UPDATE repair_requests SET rating_mechanic = $1, rating_repair = $2, rating_overall = $3, feedback_text = $4 WHERE id = $5",
      [parseInt(ratingMechanic), parseInt(ratingRepair), parseInt(ratingOverall), feedback || '', parseInt(id)]
    );
    res.json({ message: 'Repair feedback submitted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /api/admin/repairs/list - Complete list of repairs
router.get('/admin/repairs/list', async (req: Request, res: Response) => {
  try {
    const repairsRes = await query('SELECT * FROM repair_requests ORDER BY created_at DESC');
    const mechanicsRes = await query('SELECT * FROM mechanics');
    const driverMechsRes = await query("SELECT driver_id AS mechanic_id, name, mobile, profile_photo, 5.0 AS rating, status, vehicle_type || ' ' || vehicle_number AS vehicle_details, lat, lng FROM drivers WHERE role = 'mechanic'");
    res.json({ repairs: repairsRes.rows, mechanics: [...driverMechsRes.rows, ...mechanicsRes.rows] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ============================================================
// AI CHATBOT ENDPOINT - Power Bot (Multilingual with Rich Fallback)
// ============================================================
router.post('/ai/chat', async (req: Request, res: Response) => {
  const { message, language } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  const lang = (language && ['ta', 'hi', 'te', 'en'].includes(language)) ? language : 'en';

  const langNames: Record<string, string> = {
    ta: 'Tamil (தமிழ்)',
    hi: 'Hindi (हिंदी)',
    te: 'Telugu (తెలుగు)',
    en: 'English'
  };
  const selectedLangName = langNames[lang] || 'English';

  const systemPrompt = `You are Power Bot, the official AI assistant for Power2Go - an EV charging, roadside rescue and repair platform in India.
Services:
1. Mobile Emergency Charging: van dispatched to location (₹20/kWh + ₹25/km)
2. Roadside Repair: AI diagnosis + nearest certified mechanic dispatched in 15 mins
3. Power Station Booking: reserve physical charging ports in advance (₹50/slot)
4. AI Route Planner: optimal charging stops for long EV trips
5. SOS Emergency Tow Truck: flatbed rescue for accidents or battery drain

CRITICAL MULTILINGUAL RULE:
The user has selected the language: ${selectedLangName}.
You MUST respond STRICTLY in ${selectedLangName} script.
Even if the user writes in English, your reply MUST be in ${selectedLangName}.
Keep replies clear, polite, concise, and under 80 words.
If danger (fire/smoke), tell them to immediately evacuate and dial 112.`;

  // 1. Try Gemini API if key is available in environment
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (GEMINI_API_KEY) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `${systemPrompt}\n\nUser Question: ${message}\nPower Bot Answer in ${selectedLangName}:` }]
          }]
        }),
        signal: AbortSignal.timeout(6000)
      });
      if (geminiRes.ok) {
        const gData = await geminiRes.json() as any;
        const gReply = gData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (gReply) {
          return res.json({ reply: gReply, language: lang, source: 'gemini' });
        }
      }
    } catch (e) {
      // Continue to next AI provider
    }
  }

  // 2. Try local Ollama if running
  try {
    const ollamaRes = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3',
        prompt: `${systemPrompt}\n\nUser Question: ${message}\nPower Bot Answer in ${selectedLangName}:`,
        stream: false,
        options: { temperature: 0.5, num_predict: 180 }
      }),
      signal: AbortSignal.timeout(6000)
    });

    if (!ollamaRes.ok) throw new Error('Ollama unavailable');
    const ollamaData = await ollamaRes.json() as any;
    const reply = (ollamaData.response || '').trim();
    if (!reply) throw new Error('Empty reply from Ollama');
    return res.json({ reply, language: lang, source: 'llama3' });

  } catch (err: any) {
    // Intelligent multilingual rule-based fallback responses
    // 3. Robust Multilingual Semantic Engine (Safe from substring collisions like "தீர்ந்தது")
    const lower = message.toLowerCase();

    // Explicit check for real fire/smoke/danger (avoid matching "தீர்ந்தது")
    const isActualDanger = 
      lower.includes('புகை') || lower.includes('நெருப்பு') || lower.includes('தீ விபத்து') || 
      lower.includes('தீப்பிடி') || lower.includes('வெடி') || lower.includes('விபத்து') ||
      lower.includes('धुआं') || lower.includes('आग लग') || lower.includes('विस्फोट') || lower.includes('दुर्घटना') ||
      lower.includes('మంట') || lower.includes('పొగ రా') || lower.includes('ప్రమాదం') ||
      lower.includes('smoke') || lower.includes('fire') || lower.includes('spark') || 
      lower.includes('explosion') || lower.includes('burning smell');

    // Check for battery empty / charging needs
    const isBatteryEmpty = 
      lower.includes('தீர்ந்தது') || lower.includes('காலி') || lower.includes('சார்ஜ் இல்லை') || 
      lower.includes('பேட்டரி') || lower.includes('சார்ஜ்') || lower.includes('சார்ஜிங்') ||
      lower.includes('बैटरी खत्म') || lower.includes('बैटरी लो') || lower.includes('चार्ज खत्म') || 
      lower.includes('बैटरी') || lower.includes('चार्जिंग') ||
      lower.includes('బ్యాటరీ అయిపో') || lower.includes('ఛార్జ్ లేదు') || lower.includes('బ్యాటరీ ఖాళీ') || 
      lower.includes('బ్యాటరీ') || lower.includes('ఛార్జింగ్') ||
      lower.includes('dead') || lower.includes('low battery') || lower.includes('battery is dead') || 
      lower.includes('drain') || lower.includes('charge') || lower.includes('out of power');

    // Check for repair / mechanical noise / puncture / not starting
    const isRepairOrFault = 
      lower.includes('சத்தம்') || lower.includes('பழுது') || lower.includes('உடைந்') || 
      lower.includes('வேலை செய்யல') || lower.includes('ஸ்டார்ட் ஆகல') || lower.includes('பஞ்சர்') ||
      lower.includes('आवाज') || lower.includes('शोर') || lower.includes('खराब') || 
      lower.includes('स्टार्ट नहीं') || lower.includes('पंचर') || lower.includes('मरम्मत') ||
      lower.includes('శబ్దం') || lower.includes('రిపేర్') || lower.includes('స్టార్ట్ కావట్లేదు') || 
      lower.includes('చెడిపోయి') || lower.includes('పంచర్') ||
      lower.includes('noise') || lower.includes('sound') || lower.includes('broke') || 
      lower.includes('repair') || lower.includes('mechanic') || lower.includes('puncture') || 
      lower.includes('not starting') || lower.includes('fault');

    // Check for trip planning / route
    const isTrip = 
      lower.includes('பயண') || lower.includes('திட்டமி') || lower.includes('பாதை') || lower.includes('ரூட்') ||
      lower.includes('यात्रा') || lower.includes('मार्ग') || lower.includes('ट्रिप') ||
      lower.includes('ప్రయాణ') || lower.includes('రూట్') || lower.includes('ప్లాన్') ||
      lower.includes('trip') || lower.includes('route') || lower.includes('plan') || lower.includes('travel');

    // Check for pricing / costs
    const isCost = 
      lower.includes('செலவு') || lower.includes('விலை') || lower.includes('கட்டண') || lower.includes('எவ்வளவு') ||
      lower.includes('कीमत') || lower.includes('खर्च') || lower.includes('दर') || lower.includes('कितना') ||
      lower.includes('ఖర్చు') || lower.includes('ధర') || lower.includes('రేటు') || lower.includes('ఎంత') ||
      lower.includes('cost') || lower.includes('price') || lower.includes('rate') || lower.includes('pricing') || lower.includes('how much');

    // Check for station booking
    const isStation = 
      lower.includes('நிலையம்') || lower.includes('ஸ்டேஷன்') || lower.includes('ஸ்லாட்') || lower.includes('மையம்') ||
      lower.includes('स्टेशन') || lower.includes('स्लॉट') || lower.includes('बुकिंग') ||
      lower.includes('స్టేషన్') || lower.includes('స్లాట్') || lower.includes('బుకింగ్') ||
      lower.includes('station') || lower.includes('hub') || lower.includes('slot') || lower.includes('book slot');

    let topic = 'general';
    if (isActualDanger) {
      topic = 'danger';
    } else if (isBatteryEmpty) {
      topic = 'charge';
    } else if (isRepairOrFault) {
      topic = 'repair';
    } else if (isTrip) {
      topic = 'trip';
    } else if (isCost) {
      topic = 'cost';
    } else if (isStation) {
      topic = 'station';
    }

    const MULTILINGUAL_RESPONSES: Record<string, Record<string, string>> = {
      danger: {
        en: "🚨 **EVACUATE IMMEDIATELY!** Move away from the vehicle. Do NOT touch high-voltage cables or battery pack. Call emergency **112**, then use our **Emergency SOS** service for instant rescue dispatch.",
        ta: "🚨 **உடனே வாகனத்தை விட்டு பாதுகாப்பான தூரத்திற்கு செல்லுங்கள்!** பேட்டரி அல்லது ஆரஞ்சு கேபிள்களை தொடாதீர்கள். அவசர உதவி எண் **112**-ஐ அழைக்கவும் அல்லது எங்கள் **Emergency SOS** பக்கத்தில் உதவி கோரவும்!",
        hi: "🚨 **तुरंत गाड़ी से सुरक्षित दूरी पर चले जाएं!** हाई-वोल्टेज बैटरी या तारों को न छुएं। आपातकालीन नंबर **112** पर कॉल करें या तुरंत **Emergency SOS** सेवा बुक करें।",
        te: "🚨 **వెంటనే వాహనం నుండి సురక్షిత దూరానికి వెళ్ళండి!** హై-వోల్టేజ్ బ్యాటరీ లేదా కేబుల్స్‌ను తాకవద్దు. అత్యవసర సహాయం **112** లేదా మా **Emergency SOS** సేవను సంప్రదించండి."
      },
      charge: {
        en: "⚡ **EV Battery Drained? Don't worry, Power2Go has you covered!**\n\n1. **Mobile Charging Van**: We dispatch a van with an on-board DC fast charger directly to your location (₹20/kWh + ₹25/km).\n2. **Nearest Station**: If you have 3-5% reserve battery, check the **Power Station** page to book a nearby charging slot.\n3. **SOS Flatbed Rescue**: If stuck in a non-accessible spot, our tow truck can safely take you to the nearest hub.\n\n👉 Head over to **Mobile Charging** to request an emergency charging van now!",
        ta: "⚡ **உங்கள் EV பேட்டரி தீர்ந்துவிட்டதா? கவலைப்பட வேண்டாம்!**\n\n1. **நடமாடும் சார்ஜிங் வேன் (Mobile Charging Van)**: நீங்கள் இருக்கும் இடத்திற்கே வந்து உங்கள் EV-க்கு உடனடி சார்ஜ் செய்கிறோம் (₹20/kWh + ₹25/km).\n2. **அருகிலுள்ள மையம்**: குறைந்தபட்ச பேட்டரி இருந்தால், **Power Station** பக்கத்தில் அருகிலுள்ள சார்ஜிங் மையத்திற்கு ஸ்லாட் புக் செய்யலாம்.\n3. **SOS மீட்பு**: வாகனம் முற்றிலும் நகரவில்லை என்றால், **Roadside Repair** பக்கத்தில் டோவ் வாகனத்தை அழைக்கலாம்.\n\n👉 இப்போதே **Mobile Charging** பக்கத்திற்குச் சென்று வேனை புக் செய்யுங்கள்!",
        hi: "⚡ **EV बैटरी खत्म हो गई? चिंता न करें, Power2Go आपकी मदद के लिए है!**\n\n1. **मोबाइल चार्जिंग वैन**: हमारी मोबाइल वैन आपके स्थान पर आकर सीधे आपकी EV को फास्ट-चार्ज करेगी (₹20/kWh + ₹25/km)।\n2. **निकटतम स्टेशन**: यदि थोड़ी बैटरी बची है, तो **Power Station** पेज पर निकटतम स्टेशन स्लॉट बुक करें।\n3. **SOS रेस्क्यू**: यदि गाड़ी पूरी तरह बंद है, तो **Roadside Repair** से टो-ट्रक बुलाएं।\n\n👉 अभी सहायता के लिए **Mobile Charging** पेज पर जाएं!",
        te: "⚡ **మీ EV బ్యాటరీ ఖాళీ అయిందా? చింతించకండి, Power2Go మీకు సహాయం చేస్తుంది!**\n\n1. **మొబైల్ ఛార్జింగ్ వ్యాన్**: మా మొబైల్ ఛార్జింగ్ వ్యాన్ మీ వద్దకే వచ్చి వెంటనే ఛార్జ్ చేస్తుంది (₹20/kWh + ₹25/km).\n2. **సమీప స్టేషన్**: కొద్దిగా ఛార్జ్ ఉంటే, **Power Station** పేజీలో సమీప స్టేషన్‌లో స్లాట్ బుక్ చేసుకోండి.\n3. **SOS టోయింగ్**: వాహనం పూర్తిగా ఆగిపోతే, **Roadside Repair** పేజీలో టో వ్యాన్‌ను పిలవండి.\n\n👉 అత్యవసర ఛార్జింగ్ కోసం **Mobile Charging** పేజీకి వెళ్లండి!"
      },
      repair: {
        en: "🔧 **Vehicle Issue Detected? Here is how to fix it:**\n\n1. Go to the **Roadside Repair** page.\n2. Enter or speak your vehicle's issue (e.g. rattling noise, brake fault, tire puncture).\n3. Our AI diagnoses the root fault instantly.\n4. A certified mobile mechanic will be dispatched to your GPS location in under 15 minutes!\n\n👉 Click **Roadside Repair** on your dashboard to start AI diagnosis.",
        ta: "🔧 **வாகனத்தில் பிரச்சனை உள்ளதா? சரிசெய்யும் முறை:**\n\n1. உங்கள் டேஷ்போர்டில் உள்ள **Roadside Repair** பக்கத்திற்குச் செல்லவும்.\n2. உங்கள் பிரச்சனையை விவரிக்கவும் அல்லது மைக்கில் பேசவும் (எ.கா: பிரேக் சத்தம், மோட்டார் கோளாறு, டயர் பஞ்சர்).\n3. எங்கள் AI உடனடியாகப் பழுதை கண்டறியும்.\n4. அருகிலுள்ள சான்றளிக்கப்பட்ட மெக்கானிக் 15 நிமிடங்களில் உங்கள் இடத்திற்கு வருவார்!\n\n👉 இப்போதே **Roadside Repair** பக்கத்திற்குச் சென்று AI பரிசோதனை செய்யுங்கள்.",
        hi: "🔧 **वाहन में खराबी आई है? इसे ऐसे ठीक करें:**\n\n1. अपने डैशबोर्ड पर **Roadside Repair** पेज पर जाएं।\n2. अपनी समस्या टाइप करें या बोलकर बताएं (उदा: मोटर से आवाज, ब्रेक की समस्या, टायर पंचर)।\n3. हमारा AI तुरंत खराबी का कारण बताएगा।\n4. 15 मिनट के अंदर एक मैकेनिक आपकी लोकेशन पर पहुंचेगा!\n\n👉 तुरंत जांच के लिए **Roadside Repair** पर जाएं।",
        te: "🔧 **వాహనంలో సమస్య ఉందా? ఇలా పరిష్కరించండి:**\n\n1. మీ డ్యాష్‌బోర్డ్‌లో **Roadside Repair** పేజీకి వెళ్లండి.\n2. మీ సమస్యను వివరించండి లేదా మాట్లాడండి (ఉదా: శబ్దం రావడం, బ్రేక్ సమస్య, టైర్ పంచర్).\n3. మా AI వెంటనే సమస్యను విశ్లేషిస్తుంది.\n4. 15 నిమిషాల్లో సర్టిఫైడ్ మెకానిక్ మీ లొకేషన్‌కు చేరుకుంటారు!\n\n👉 తనిఖీ కోసం **Roadside Repair** పేజీని సందర్శించండి."
      },
      trip: {
        en: "🗺️ **Plan Long Trips Seamlessly with AI Route Planner:**\n\n1. Go to the **AI Route Planner** page.\n2. Enter your Starting City, Destination, and current Battery SoC %.\n3. AI calculates the most energy-efficient route and automatically schedules optimal fast-charging stops along highway corridors.\n\n👉 Try it on the **AI Route Planner** page!",
        ta: "🗺️ **AI Route Planner மூலம் எளிதாக பயணத்தை திட்டமிடுங்கள்:**\n\n1. **AI Route Planner** பக்கத்திற்குச் செல்லவும்.\n2. புறப்படும் இடம், சேருமிடம் மற்றும் தற்போதைய பேட்டரி % உள்ளிடவும்.\n3. AI குறைந்த மின்சாரத்தில் செல்லும் பாதையையும், வழியில் உள்ள சிறந்த சார்ஜிங் மையங்களையும் துல்லியமாக கணக்கிட்டு தரும்.\n\n👉 இப்போதே **AI Route Planner** பக்கத்தை முயற்சிக்கவும்!",
        hi: "🗺️ **AI Route Planner के साथ लंबी यात्रा की योजना बनाएं:**\n\n1. **AI Route Planner** पेज पर जाएं।\n2. शुरुआती शहर, गंतव्य और वर्तमान बैटरी % दर्ज करें।\n3. AI सबसे कुशल रास्ता और रास्ते में आने वाले सबसे अच्छे चार्जिंग स्टॉप की सूची बनाएगा।\n\n👉 **AI Route Planner** पेज का उपयोग करें!",
        te: "🗺️ **AI Route Planner తో సులభంగా ప్రయాణాన్ని ప్లాన్ చేసుకోండి:**\n\n1. **AI Route Planner** పేజీకి వెళ్లండి.\n2. ప్రారంభ స్థానం, గమ్యం మరియు ప్రస్తుత బ్యాటరీ % ఇవ్వండి.\n3. AI తక్కువ బ్యాటరీతో వెళ్ళే రూట్ మరియు దారిలోని ఉత్తమ ఛార్జింగ్ స్టేషన్‌లను సూచిస్తుంది.\n\n👉 **AI Route Planner** పేజీని చూడండి!"
      },
      cost: {
        en: "💰 **Power2Go Transparent Pricing:**\n\n• **Mobile Charging Van**: ₹20 / kWh delivered + ₹25 / km dispatch.\n• **Power Station Pre-booking**: ₹50 advance reservation fee (skips queue).\n• **Emergency Tow Truck / SOS**: Flat ₹180 dispatch fee.\n• **AI Fault Diagnosis**: 100% Completely FREE.\n\nAll payments are processed securely via instant UPI on service completion.",
        ta: "💰 **Power2Go கட்டண விவரங்கள்:**\n\n• **நடமாடும் சார்ஜிங் வேன்**: ₹20 / kWh + ₹25 / km வருகை கட்டணம்.\n• **ஸ்டேஷன் முன்பதிவு**: ₹50 (வரிசையில் நிற்காமல் உடனே சார்ஜ் செய்யலாம்).\n• **அவசர டோவ் வாகனம் (SOS)**: ₹180 தொடக்க கட்டணம்.\n• **AI பழுது கண்டறிதல்**: 100% முற்றிலும் இலவசம்.\n\nபணி முடிந்ததும் பாதுகாப்பான UPI மூலம் கட்டணம் செலுத்தலாம்.",
        hi: "💰 **Power2Go शुल्क विवरण:**\n\n• **मोबाइल चार्जिंग वैन**: ₹20 / kWh + ₹25 / km डिस्पैच शुल्क।\n• **स्टेशन प्री-बुकिंग**: ₹50 स्लॉट बुकिंग (लाइन में खड़े होने की जरूरत नहीं)।\n• **इमरजेंसी टो-ट्रक**: ₹180 डिस्पैच चार्ज।\n• **AI डायग्नोसिस**: 100% पूरी तरह मुफ़्त।\n\nसेवा पूरी होने के बाद त्वरित UPI द्वारा भुगतान किया जा सकता है।",
        te: "💰 **Power2Go ధరల వివరాలు:**\n\n• **మొబైల్ ఛార్జింగ్ వ్యాన్**: ₹20 / kWh + ₹25 / km డిస్పాచ్ ఛార్జ్.\n• **స్టేషన్ స్లాట్ బుకింగ్**: ₹50 (క్యూ లేకుండా నేరుగా ఛార్జ్ చేయవచ్చు).\n• **ఎమర్జెన్సీ టోయింగ్ (SOS)**: ₹180 ప్రారంభ ఛార్జ్.\n• **AI రోగ నిర్ధారణ**: 100% పూర్తిగా ఉచితం.\n\nపని పూర్తయిన తర్వాత సురక్షితమైన UPI ద్వారా చెల్లించవచ్చు."
      },
      station: {
        en: "🏭 **Skip Queues with Power Station Slot Booking:**\n\n1. Go to the **Power Station** page.\n2. Select your city (Karur, Trichy, Madurai, or Chennai).\n3. Pick your preferred time slot and plug type (CCS2, Type 2, GB/T).\n4. Pay ₹50 to guarantee your spot — your charger will be waiting reserved for you!",
        ta: "🏭 **வரிசையில் நிற்காமல் சார்ஜ் செய்ய Power Station முன்பதிவு:**\n\n1. **Power Station** பக்கத்திற்குச் செல்லவும்.\n2. உங்கள் நகரத்தை தேர்ந்தெடுக்கவும் (கரூர், திருச்சி, மதுரை, சென்னை).\n3. உங்கள் நேரம் மற்றும் சார்ஜர் வகையை (CCS2, Type 2) தேர்வு செய்யவும்.\n4. ₹50 செலுத்தி உங்கள் ஸ்லாட்டை உறுதி செய்யுங்கள் — உங்களுக்காக போர்ட் காத்திருக்கும்!",
        hi: "🏭 **बिना लाइन में खड़े हुए Power Station स्लॉट बुक करें:**\n\n1. **Power Station** पेज पर जाएं।\n2. अपना शहर चुनें (करूर, त्रिची, मदुरै, चेन्नई)।\n3. पसंदीदा समय और प्लग प्रकार (CCS2, Type 2) चुनें।\n4. ₹50 देकर अपना स्लॉट पक्का करें — आपका चार्जर आरक्षित रहेगा!",
        te: "🏭 **క్యూ లేకుండా చార్జ్ చేసుకోవడానికి Power Station స్లాట్ బుక్ చేయండి:**\n\n1. **Power Station** పేజీకి వెళ్లండి.\n2. మీ నగరాన్ని ఎంచుకోండి (కరూర్, తిరుచ్చి, మధురై, చెన్నై).\n3. మీకు అనుకూలమైన సమయం మరియు ప్లగ్ రకాన్ని (CCS2, Type 2) ఎంచుకోండి.\n4. ₹50 చెల్లించి మీ స్లాట్‌ను ఖరారు చేసుకోండి — ఛార్జర్ మీ కోసం సిద్ధంగా ఉంటుంది!"
      },
      general: {
        en: "👋 Hello! I'm **Power Bot** 🤖, your smart EV mobility assistant.\n\nI can help you with:\n• ⚡ Emergency roadside charging\n• 🔧 AI fault diagnosis & mechanic dispatch\n• 🏭 Pre-booking charging hub slots\n• 🗺️ EV long-trip route planning\n\nHow can I help you today? You can also use the **🎙️ Mic button** to ask!",
        ta: "👋 வணக்கம்! நான் **Power Bot** 🤖, உங்கள் ஸ்மார்ட் EV உதவி AI.\n\nநான் உதவக்கூடிய சேவைகள்:\n• ⚡ அவசர சாலையோர சார்ஜிங்\n• 🔧 AI பழுது கண்டறிதல் மற்றும் மெக்கானிக் வருகை\n• 🏭 சார்ஜிங் மையங்களில் ஸ்லாட் முன்பதிவு\n• 🗺️ நீண்ட தூர பயணத் திட்டமிடல்\n\nஉங்களுக்கு என்ன உதவி வேண்டும்? நீங்கள் **🎙️ மைக் பட்டனை** அழுத்தியும் கேட்கலாம்!",
        hi: "👋 नमस्ते! मैं **Power Bot** हूँ 🤖, आपका स्मार्ट EV सहायक AI।\n\nमैं इन सेवाओं में मदद कर सकता हूँ:\n• ⚡ आपातकालीन सड़क किनारे चार्जिंग\n• 🔧 AI खराबी जांच और मैकेनिक सहायता\n• 🏭 चार्जिंग स्टेशन स्लॉट प्री-बुकिंग\n• 🗺️ लंबी यात्रा के लिए रूट प्लानिंग\n\nमैं आपकी क्या मदद करूँ? आप **🎙️ माइक बटन** दबाकर भी पूछ सकते हैं!",
        te: "👋 నమస్కారం! నేను **Power Bot** 🤖, మీ స్మార్ట్ EV సహాయ AI.\n\nనేను సహాయం చేయగల సేవలు:\n• ⚡ అత్యవసర రోడ్‌సైడ్ ఛార్జింగ్\n• 🔧 AI లోప నిర్ధారణ మరియు మెకానిక్ సేవలు\n• 🏭 ఛార్జింగ్ స్టేషన్ స్లాట్ బుకింగ్\n• 🗺️ దూర ప్రయాణాల రూట్ ప్లానింగ్\n\nమీకు ఏమి సహాయం కావాలి? మీరు **🎙️ మైక్ బటన్** నొక్కి కూడా అడగవచ్చు!"
      }
    };

    const reply = MULTILINGUAL_RESPONSES[topic]?.[lang] || MULTILINGUAL_RESPONSES['general'][lang];
    return res.json({ reply, language: lang, topic, source: 'semantic-ai' });
  }
});

// ============================================================
// MULTILINGUAL AI DIAGNOSIS ENDPOINT
// ============================================================
router.post('/ai/diagnose-multilingual', async (req: Request, res: Response) => {
  const { description, vehicleType, language } = req.body;
  if (!description) return res.status(400).json({ error: 'Description is required' });

  // Auto-detect language if not explicitly provided or if user typed Indic script
  let targetLang = (language && ['ta', 'hi', 'te', 'en'].includes(language)) ? language : 'en';
  if (targetLang === 'en') {
    if (/[\u0B80-\u0BFF]/.test(description)) targetLang = 'ta';
    else if (/[\u0900-\u097F]/.test(description)) targetLang = 'hi';
    else if (/[\u0C00-\u0C7F]/.test(description)) targetLang = 'te';
  }

  const langInstructions: Record<string, string> = {
    'ta': 'Respond ENTIRELY in Tamil (தமிழ்). Use proper Tamil script.',
    'hi': 'Respond ENTIRELY in Hindi (हिंदी). Use proper Devanagari script.',
    'te': 'Respond ENTIRELY in Telugu (తెలుగు). Use proper Telugu script.',
    'en': 'Respond in English.'
  };
  const langInstruction = langInstructions[targetLang] || langInstructions['en'];

  // 1. Try Gemini API if key is present
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (GEMINI_API_KEY) {
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const geminiPrompt = `You are an expert EV roadside diagnostic AI for Power2Go India. ${langInstruction}

Analyze this EV breakdown/issue:
Vehicle type: ${vehicleType || 'electric car'}
Problem description: ${description}

Return ONLY valid JSON (no markdown formatting, no backticks, no code block) matching this schema:
{
  "diagnosis": "Precise fault title in target language",
  "category": "High Voltage Battery / Drive Motor & Inverter / Braking & Suspension / Wheels & Tires / Thermal Management / 12V Auxiliary",
  "causes": ["Probable cause 1 in target language", "Probable cause 2 in target language", "Probable cause 3 in target language"],
  "severity": "Critical or Warning or Normal",
  "recommendations": "Actionable instructions and safety steps in target language",
  "recommendedAction": "tow or mechanic",
  "disclaimer": "AI preliminary assessment. Professional mechanic verification required.",
  "faultTitle": "Brief fault name",
  "possibleCause": "Primary likely cause",
  "safetyAdvice": "Immediate safety action",
  "recommendation": "TOW_TRUCK or MECHANIC or MOBILE_CHARGING or SAFE_TO_DRIVE",
  "estimatedCost": "₹X – ₹Y (INR)",
  "responseInLanguage": "Friendly 2-sentence explanation in target language"
}`;

      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: geminiPrompt }] }]
        }),
        signal: AbortSignal.timeout(8000)
      });

      if (geminiRes.ok) {
        const gData = await geminiRes.json() as any;
        const raw = gData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (!Array.isArray(parsed.causes)) {
            parsed.causes = [parsed.possibleCause || parsed.diagnosis || 'Diagnostic inspection required'];
          }
          if (!parsed.recommendedAction) {
            parsed.recommendedAction = (parsed.recommendation === 'TOW_TRUCK' || parsed.severity === 'Critical') ? 'tow' : 'mechanic';
          }
          return res.json({ ...parsed, language: targetLang, source: 'gemini' });
        }
      }
    } catch (e) {
      // Continue to next AI provider
    }
  }

  // 2. Try local Ollama if running
  try {
    const ollamaRes = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3',
        prompt: `You are an expert EV vehicle diagnostic AI for Power2Go. ${langInstruction}
Problem: ${description} (Vehicle: ${vehicleType || 'EV'})
Return ONLY JSON with keys: diagnosis, category, causes (array of strings), severity (Critical/Warning/Normal), recommendations, recommendedAction (tow/mechanic), disclaimer, faultTitle, possibleCause, safetyAdvice, recommendation (TOW_TRUCK/MECHANIC/MOBILE_CHARGING/SAFE_TO_DRIVE), estimatedCost, responseInLanguage.`,
        stream: false,
        options: { temperature: 0.3, num_predict: 400 }
      }),
      signal: AbortSignal.timeout(6000)
    });

    if (ollamaRes.ok) {
      const ollamaData = await ollamaRes.json() as any;
      const raw = (ollamaData.response || '').trim();
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(parsed.causes)) {
          parsed.causes = [parsed.possibleCause || parsed.diagnosis || 'Diagnostic inspection required'];
        }
        if (!parsed.recommendedAction) {
          parsed.recommendedAction = (parsed.recommendation === 'TOW_TRUCK' || parsed.severity === 'Critical') ? 'tow' : 'mechanic';
        }
        return res.json({ ...parsed, language: targetLang, source: 'llama3' });
      }
    }
  } catch (err: any) {
    // Continue to domain-specific knowledge engine
  }

  // 3. High-Accuracy Multilingual EV Diagnostic Knowledge Engine
  const desc = description.toLowerCase();

  // Explicit check for actual fire/smoke/thermal danger (avoid substring collision like "தீர்ந்தது")
  const isActualThermalDanger =
    desc.includes('smoke') || desc.includes('fire') || desc.includes('flame') || desc.includes('spark') ||
    desc.includes('burning') || desc.includes('overheat') ||
    desc.includes('புகை') || desc.includes('நெருப்பு') || desc.includes('தீ விபத்து') || desc.includes('எரியும்') ||
    desc.includes('धुआं') || desc.includes('आग') || desc.includes('जलने') || desc.includes('चिंगारी') ||
    desc.includes('పొగ') || desc.includes('మంట') || desc.includes('నిప్పు');

  // Battery depleted / dead / no charge / stalled
  const isBatteryDepleted =
    desc.includes('battery') || desc.includes('charge') || desc.includes('dead') || desc.includes('drain') ||
    desc.includes('0%') || desc.includes('deplet') || desc.includes('discharge') || desc.includes('stall') ||
    desc.includes('range') || desc.includes('powerless') || desc.includes('shutdown') ||
    desc.includes('பேட்டரி') || desc.includes('தீர்ந்தது') || desc.includes('காலி') || desc.includes('சார்ஜ்') || desc.includes('நிக்கிது') || desc.includes('நிற்கிறது') ||
    desc.includes('बैटरी') || desc.includes('खत्म') || desc.includes('डिस्चार्ज') || desc.includes('चार्ज नहीं') || desc.includes('बंद') ||
    desc.includes('బ్యాటరీ') || desc.includes('అయిపోయింది') || desc.includes('ఛార్జ్ లేదు') || desc.includes('ఆగిపోయింది');

  // Brakes / stopping / screeching
  const isBrakeIssue =
    desc.includes('brake') || desc.includes('squeak') || desc.includes('grind') || desc.includes('pedal') ||
    desc.includes('stopping') || desc.includes('abs') ||
    desc.includes('பிரேக்') || desc.includes('நிக்க மாட்டேங்குது') ||
    desc.includes('ब्रेक') || desc.includes('आवाज') ||
    desc.includes('బ్రేక్') || desc.includes('శబ్దం');

  // Tire puncture / flat / air pressure
  const isTireIssue =
    desc.includes('tire') || desc.includes('tyre') || desc.includes('flat') || desc.includes('puncture') ||
    desc.includes('wheel') || desc.includes('air') || desc.includes('pressure') || desc.includes('tpms') ||
    desc.includes('டயர்') || desc.includes('பஞ்சர்') || desc.includes('காற்று') ||
    desc.includes('टायर') || desc.includes('पंचर') || desc.includes('हवा') ||
    desc.includes('టైర్') || desc.includes('పంక్చర్') || desc.includes('గాలి');

  // Motor / Inverter / Acceleration
  const isMotorIssue =
    desc.includes('motor') || desc.includes('inverter') || desc.includes('accel') || desc.includes('slow') ||
    desc.includes('jerk') || desc.includes('vibrat') || desc.includes('drive unit') ||
    desc.includes('மோட்டார்') || desc.includes('வேகம்') || desc.includes('இழுக்கல') || desc.includes('உதறல்') ||
    desc.includes('मोटर') || desc.includes('गति') || desc.includes('कंपन') ||
    desc.includes('మోటార్') || desc.includes('వేగం') || desc.includes('కంపనం');

  // Charging port / gun stuck / connector
  const isChargingPortIssue =
    desc.includes('port') || desc.includes('gun') || desc.includes('cable') || desc.includes('stuck') ||
    desc.includes('socket') || desc.includes('plug') || desc.includes('latch') ||
    desc.includes('போர்ட்') || desc.includes('கன்') || desc.includes('பிளக்') ||
    desc.includes('सॉकेट') || desc.includes('गन') || desc.includes('प्लग') ||
    desc.includes('సాకెట్') || desc.includes('గన్');

  // 12V Auxiliary Battery / Display Blank
  const is12VIssue =
    desc.includes('12v') || desc.includes('screen') || desc.includes('display') || desc.includes('blank') ||
    desc.includes('black') || desc.includes('lights') || desc.includes('cluster') ||
    desc.includes('திரை') || desc.includes('டிஸ்பிளே') || desc.includes('லைட்') ||
    desc.includes('डिस्प्ले') || desc.includes('स्क्रीन') || desc.includes('लाइट') ||
    desc.includes('డిస్‌ప్లే') || desc.includes('స్క్రీన్');

  let report: {
    diagnosis: string;
    category: string;
    causes: string[];
    severity: string;
    recommendations: string;
    recommendedAction: 'tow' | 'mechanic';
    disclaimer: string;
    faultTitle: string;
    possibleCause: string;
    safetyAdvice: string;
    recommendation: 'TOW_TRUCK' | 'MECHANIC' | 'MOBILE_CHARGING' | 'SAFE_TO_DRIVE';
    estimatedCost: string;
    responseInLanguage: string;
  };

  if (isActualThermalDanger) {
    const titles: Record<string, string> = {
      ta: 'அவசர வெப்ப அல்லது ஷார்ட் சர்க்யூட் எச்சரிக்கை',
      hi: 'थर्मल या शॉर्ट सर्किट आपातकालीन चेतावनी',
      te: 'థర్మల్ లేదా షార్ట్ సర్క్యూట్ అత్యవసర హెచ్చరిక',
      en: 'High Voltage Thermal / Short Circuit Emergency'
    };
    const expl: Record<string, string> = {
      ta: 'வாகனத்தில் அதிக வெப்பம் அல்லது புகை கண்டறியப்பட்டுள்ளது. உடனடியாக வாகனத்திலிருந்து பாதுகாப்பான தூரத்திற்கு வெளியேறி SOS டோவிங் சேவையை அழைக்கவும்!',
      hi: 'वाहन में अत्यधिक गर्मी या धुआं पाया गया है। तुरंत वाहन से सुरक्षित दूरी पर बाहर निकलें और SOS टोइंग सेवा को कॉल करें!',
      te: 'వాహనంలో అధిక వేడి లేదా పొగ గుర్తించబడింది. వెంటనే వాహనం నుండి సురక్షితమైన దూరానికి బయటకు వచ్చి SOS టోయింగ్ సేవను పిలవండి!',
      en: 'Thermal hazard or electrical short detected. Evacuate immediately to a safe distance and request emergency flatbed recovery.'
    };
    const causeList: Record<string, string[]> = {
      ta: ['பேட்டரி செல்கள் அதிக வெப்பமடைதல்', 'உயர் மின்னழுத்த இன்வெர்ட்டர் வயரிங் ஷார்ட்', 'கூலிங் திரவ கசிவு அல்லது பம்ப் செயலிழப்பு'],
      hi: ['बैटरी कोशिकाओं का अधिक गर्म होना', 'हाई-वोल्टेज इन्वर्टर वायरिंग शॉर्ट', 'कूलेंट लीक या थर्मल पंप विफलता'],
      te: ['బ్యాటరీ సెల్స్ వేడెక్కడం', 'హై వోల్టేజ్ ఇన్వర్టర్ షార్ట్ సర్క్యూట్', 'కూలెంట్ లీకేజ్ లేదా పంప్ వైఫల్యం'],
      en: ['HV Battery pack cell thermal runaway', 'Inverter wiring insulation short circuit', 'Coolant loop depressurization or pump failure']
    };
    report = {
      diagnosis: titles[targetLang] || titles.en,
      category: 'Thermal & High Voltage Safety',
      causes: causeList[targetLang] || causeList.en,
      severity: 'Critical',
      recommendations: targetLang === 'ta' ? 'வாகனத்தை விட்டு வெளியேறி பாதுகாப்பான தூரத்தில் நிற்கவும். பவர்2கோ அவசர டோவிங் அழைக்கவும்.' : 'Evacuate vehicle immediately. Request Power2Go Flatbed Recovery.',
      recommendedAction: 'tow',
      disclaimer: targetLang === 'ta' ? 'அவசர எச்சரிக்கை: உயர் மின்னழுத்த வயரிங்கை தொடாதீர்கள்.' : 'Urgent Safety Warning: Never touch exposed high voltage components.',
      faultTitle: titles[targetLang] || titles.en,
      possibleCause: (causeList[targetLang] || causeList.en)[0],
      safetyAdvice: 'EVACUATE IMMEDIATELY! Keep 20m distance and contact emergency rescue.',
      recommendation: 'TOW_TRUCK',
      estimatedCost: '₹12,000 – ₹25,000',
      responseInLanguage: expl[targetLang] || expl.en
    };

  } else if (isBatteryDepleted) {
    const titles: Record<string, string> = {
      ta: 'உயர் மின்னழுத்த பேட்டரி முழுமையாக தீர்ந்தது (BMS லாக்அவுட்)',
      hi: 'हाई वोल्टेज बैटरी डिस्चार्ज (BMS लॉकआउट)',
      te: 'హై వోల్టేజ్ బ్యాటరీ పూర్తిగా డిశ్చార్జ్ (BMS లాకౌట్)',
      en: 'High Voltage Traction Battery Depleted (BMS Lockout)'
    };
    const expl: Record<string, string> = {
      ta: 'உங்கள் EV பேட்டரி 0% நிலையை அடைந்து வாகனம் நின்றுள்ளது. மொபைல் சார்ஜிங் வேன் அல்லது அருகிலுள்ள பவர்2கோ நிலையத்திற்கு டோவிங் தேர்வு செய்யவும்.',
      hi: 'आपकी EV बैटरी 0% पर पहुंच चुकी है। मोबाइल चार्जिंग वैन या नजदीकी पावर2गो स्टेशन के लिए टोइंग चुनें।',
      te: 'మీ EV బ్యాటరీ 0%కి చేరుకుంది మరియు వాహనం ఆగింది. మొబైల్ ఛార్జింగ్ వ్యాన్ లేదా సమీప పవర్2గో స్టేషన్‌కు టోయింగ్ ఎంచుకోండి.',
      en: 'Your EV traction battery is completely depleted below operating voltage. Dispatch a mobile charging van or book flatbed recovery to the nearest hub.'
    };
    const causeList: Record<string, string[]> = {
      ta: ['நீண்ட தூர பயணத்தில் முழு சார்ஜ் தீர்ந்து போதல்', 'BMS குறைந்த மின்னழுத்த பாதுகாப்பு லாக்', 'பேட்டரி செல்களின் சமநிலையின்மை'],
      hi: ['लंबी दूरी में बैटरी पूरी तरह समाप्त होना', 'BMS लो-वोल्टेज सुरक्षा शटडाउन', 'बैटरी सेल असंतुलन'],
      te: ['సుదీర్ఘ ప్రయాణంలో ఛార్జ్ పూర్తిగా అయిపోవడం', 'BMS లో-వోల్టేజ్ భద్రతా షట్‌డౌన్', 'బ్యాటరీ సెల్ అసమతుల్యత'],
      en: ['Traction battery over-discharge past reserve threshold', 'BMS low-voltage protection lockout engaged', 'HV Contactor open circuit state']
    };
    report = {
      diagnosis: titles[targetLang] || titles.en,
      category: 'High Voltage Battery System',
      causes: causeList[targetLang] || causeList.en,
      severity: 'Critical',
      recommendations: targetLang === 'ta' ? 'அவசர மொபைல் சார்ஜிங் வேனை உங்கள் இடத்திற்கு வரவழைக்கவும் அல்லது பவர்2கோ சார்ஜிங் மையத்திற்கு வாகனத்தை டோவ் செய்யவும்.' : 'Dispatch Power2Go Mobile Charging Van or request Tow Recovery to nearest charging hub.',
      recommendedAction: 'tow',
      disclaimer: targetLang === 'ta' ? 'பேட்டரியை முழுமையாக காலியான நிலையில் நீண்ட நேரம் வைப்பது செல் ஆயுளை பாதிக்கும்.' : 'Prolonged zero-charge state can degrade lithium cell chemistry.',
      faultTitle: titles[targetLang] || titles.en,
      possibleCause: (causeList[targetLang] || causeList.en)[0],
      safetyAdvice: 'Turn on hazard flashers. Do not repeatedly cycle ignition switch.',
      recommendation: 'MOBILE_CHARGING',
      estimatedCost: '₹350 – ₹850 (Emergency roadside boost)',
      responseInLanguage: expl[targetLang] || expl.en
    };

  } else if (isBrakeIssue) {
    const titles: Record<string, string> = {
      ta: 'பிரேக்கிங் அமைப்பு மற்றும் ஹைட்ராலிக் குறைபாடு',
      hi: 'ब्रेकिंग सिस्टम और हाइड्रोलिक खराबी',
      te: 'బ్రేకింగ్ సిస్టమ్ మరియు హైడ్రాలిక్ లోపం',
      en: 'Braking System Friction Wear / Hydraulic Pressure Fault'
    };
    const expl: Record<string, string> = {
      ta: 'பிரேக் பேட் தேய்மானம் அல்லது பிரேக் திரவக் கசிவு கண்டறியப்பட்டுள்ளது. எங்கள் நடமாடும் மெக்கானிக்கை உங்கள் இருப்பிடத்திற்கு அழைக்கவும்.',
      hi: 'ब्रेक पैड घिसने या ब्रेक फ्लुइड रिसाव का पता चला है। हमारे मोबाइल मैकेनिक को अपने स्थान पर बुलाएं।',
      te: 'బ్రేక్ ప్యాడ్ అరిగిపోవడం లేదా బ్రేక్ ద్రవం లీకేజీ గుర్తించబడింది. మా మొబైల్ మెకానిక్‌ని మీ లొకేషన్‌కు పిలవండి.',
      en: 'Brake friction lining degradation or hydraulic fluid pressure warning. Certified roadside mechanic dispatch recommended.'
    };
    const causeList: Record<string, string[]> = {
      ta: ['பிரேக் பேட் உராய்வு தகடு தேய்மானம்', 'பிரேக் ஆயில் கசிவு அல்லது காற்று அடைப்பு', 'ரீஜெனரேட்டிவ் பிரேக் சென்சார் கோளாறு'],
      hi: ['ब्रेक पैड घिसना', 'हाइड्रोलिक ब्रेक तरल रिसाव', 'रीजेनेरेटिव ब्रेक सेंसर त्रुटि'],
      te: ['బ్రేక్ ప్యాడ్ అరిగిపోవడం', 'బ్రేక్ ఆయిల్ లీకేజ్', 'రీజనరేటివ్ బ్రేకింగ్ సెన్సార్ లోపం'],
      en: ['Brake pad friction material worn below minimum safety limit', 'Hydraulic line pressure drop or air bubbles', 'Regenerative braking blended sensor communication error']
    };
    report = {
      diagnosis: titles[targetLang] || titles.en,
      category: 'Brakes & Suspension',
      causes: causeList[targetLang] || causeList.en,
      severity: 'Warning',
      recommendations: targetLang === 'ta' ? 'கடினமாக பிரேக் அடிப்பதை தவிர்க்கவும். உங்கள் இடத்திற்கே மெக்கானிக்கை முன்பதிவு செய்யவும்.' : 'Avoid high-speed driving. Book an on-site Power2Go technician to inspect brake calipers and pads.',
      recommendedAction: 'mechanic',
      disclaimer: targetLang === 'ta' ? 'பாதுகாப்பு: பிரேக் பெடல் மெதுவாக இருந்தால் வாகனத்தை ஓட்டாதீர்கள்.' : 'Do not drive if brake pedal feels spongey or sinks to the floor.',
      faultTitle: titles[targetLang] || titles.en,
      possibleCause: (causeList[targetLang] || causeList.en)[0],
      safetyAdvice: 'Pull vehicle safely to road shoulder and engage electronic parking brake.',
      recommendation: 'MECHANIC',
      estimatedCost: '₹1,200 – ₹3,500',
      responseInLanguage: expl[targetLang] || expl.en
    };

  } else if (isTireIssue) {
    const titles: Record<string, string> = {
      ta: 'டயர் பஞ்சர் அல்லது குறைந்த காற்று அழுத்தம்',
      hi: 'टायर पंचर या कम हवा का दबाव',
      te: 'టైర్ పంక్చర్ లేదా తక్కువ గాలి పీడనం',
      en: 'Tire Puncture / Rapid Air Pressure Depletion'
    };
    const expl: Record<string, string> = {
      ta: 'டயரில் பஞ்சர் அல்லது காற்று கசிவு ஏற்பட்டுள்ளது. எங்கள் மொபைல் மெக்கானிக் சம்பவ இடத்திற்கு வந்து பஞ்சர் சரிசெய்வார்.',
      hi: 'टायर में पंचर या हवा का रिसाव हुआ है। हमारा मोबाइल मैकेनिक मौके पर आकर पंचर ठीक करेगा।',
      te: 'టైర్‌లో పంక్చర్ లేదా గాలి లీకేజీ జరిగింది. మా మొబైల్ మెకానిక్ వచ్చి పంక్చర్ రిపేర్ చేస్తారు.',
      en: 'Loss of tire pressure detected due to road hazard penetration. Roadside puncture repair or spare tire replacement available.'
    };
    const causeList: Record<string, string[]> = {
      ta: ['சாலையில் ஆணி அல்லது கூர்மையான பொருள் குத்துதல்', 'வால்வ் பின் வழியே காற்று கசிவு', 'TPMS பிரஷர் சென்சார் பழுது'],
      hi: ['सड़क पर कील या नुकीली वस्तु चुभना', 'वाल्व से हवा का रिसाव', 'TPMS प्रेशर सेंसर खराबी'],
      te: ['రోడ్డుపై మేకు లేదా పదునైన వస్తువు గుచ్చుకోవడం', 'వాల్వ్ లీకేజ్', 'TPMS సెన్సార్ లోపం'],
      en: ['Puncture caused by sharp road debris or nail', 'Valve stem core sealing leakage', 'TPMS pressure sensor internal transducer fault']
    };
    report = {
      diagnosis: titles[targetLang] || titles.en,
      category: 'Wheels & Tires',
      causes: causeList[targetLang] || causeList.en,
      severity: 'Warning',
      recommendations: targetLang === 'ta' ? 'வாகனத்தை மெதுவாக சாலையோரம் நிறுத்தி மொபைல் மெக்கானிக்கை அழைக்கவும்.' : 'Pull over safely. Book a Power2Go mobile mechanic for on-site puncture repair or spare fitment.',
      recommendedAction: 'mechanic',
      disclaimer: targetLang === 'ta' ? 'முற்றிலும் காற்று இல்லாத டயரில் ஓட்டுவது அலாய் வீலை சேதப்படுத்தும்.' : 'Driving on a completely flat tire causes permanent rim and sidewall damage.',
      faultTitle: titles[targetLang] || titles.en,
      possibleCause: (causeList[targetLang] || causeList.en)[0],
      safetyAdvice: 'Turn on hazard lights. Do not drive on rim.',
      recommendation: 'MECHANIC',
      estimatedCost: '₹300 – ₹900',
      responseInLanguage: expl[targetLang] || expl.en
    };

  } else if (isMotorIssue) {
    const titles: Record<string, string> = {
      ta: 'டிரைவ் மோட்டார் அல்லது இன்வெர்ட்டர் கட்டுப்பாட்டு கோளாறு',
      hi: 'ड्राइव मोटर या इन्वर्टर कंट्रोल फॉल्ट',
      te: 'డ్రైవ్ మోటార్ లేదా ఇన్వర్టర్ కంట్రోల్ లోపం',
      en: 'Electric Traction Motor & Inverter Drive Unit Fault'
    };
    const expl: Record<string, string> = {
      ta: 'மின்சார மோட்டார் பவர் அல்லது இன்வெர்ட்டர் கட்டுப்பாட்டில் குறைபாடு ஏற்பட்டுள்ளது. மொபைல் மெக்கானிக் மூலம் OBD ஸ்கேன் செய்யவும்.',
      hi: 'इलेक्ट्रिक मोटर पावर या इन्वर्टर नियंत्रण में समस्या है। मोबाइल मैकेनिक से OBD स्कैन करवाएं।',
      te: 'ఎలక్ట్రిక్ మోటార్ పవర్ లేదా ఇన్వర్టర్ నియంత్రణలో సమస్య ఉంది. మొబైల్ మెకానిక్ ద్వారా తనిఖీ చేయించండి.',
      en: 'Torque reduction or phase power delivery failure in EV traction unit. OBD-II diagnostic scan required.'
    };
    const causeList: Record<string, string[]> = {
      ta: ['இன்வெர்ட்டர் IGBT சுவிட்ச் தொடர்பு பிழை', 'மோட்டார் ரோட்டார் பொசிஷன் சென்சார் (Resolver) விலகல்', 'மோட்டார் டிரைவ் கூலிங் பம்ப் சுழற்சி குறைவு'],
      hi: ['इन्वर्टर सर्किट में खराबी', 'मोटर रोटर सेंसर (Resolver) समस्या', 'मोटर कूलिंग पंप की कमी'],
      te: ['ఇన్వర్టర్ సర్క్యూట్ లోపం', 'మోటార్ పొజిషన్ సెన్సార్ సమస్య', 'మోటార్ కూలింగ్ పంప్ లోపం'],
      en: ['Inverter power stage switching anomaly', 'Motor resolver position sensor miscalibration', 'Drive unit auxiliary cooling loop restriction']
    };
    report = {
      diagnosis: titles[targetLang] || titles.en,
      category: 'Electric Powertrain & Inverter',
      causes: causeList[targetLang] || causeList.en,
      severity: 'Warning',
      recommendations: targetLang === 'ta' ? 'வாகனத்தை மறுதொடக்கம் (Power Cycle) செய்து பார்க்கவும். சிக்கல் தொடர்ந்தால் மெக்கானிக்கை அழைக்கவும்.' : 'Perform an ignition power cycle. If warning persists, dispatch an EV diagnostic technician.',
      recommendedAction: 'mechanic',
      disclaimer: targetLang === 'ta' ? 'அதிக முடுக்கம் (hard acceleration) கொடுப்பதை தவிர்க்கவும்.' : 'Avoid rapid torque demands until diagnostic clearing.',
      faultTitle: titles[targetLang] || titles.en,
      possibleCause: (causeList[targetLang] || causeList.en)[0],
      safetyAdvice: 'Shift to Park safely on road shoulder.',
      recommendation: 'MECHANIC',
      estimatedCost: '₹1,500 – ₹4,500',
      responseInLanguage: expl[targetLang] || expl.en
    };

  } else if (isChargingPortIssue) {
    const titles: Record<string, string> = {
      ta: 'சார்ஜிங் போர்ட் கன் லாக் அல்லது கனெக்டர் கோளாறு',
      hi: 'चार्जिंग पोर्ट गन लॉक या कनेक्टर खराबी',
      te: 'ఛార్జింగ్ పోర్ట్ గన్ లాక్ లేదా కనెక్టర్ లోపం',
      en: 'Charging Inlet Actuator Lock Failure / Connector Latch Fault'
    };
    const expl: Record<string, string> = {
      ta: 'சார்ஜர் கன் லாக் ஆகி பிரிக்க முடியவில்லை அல்லது சார்ஜிங் தொடங்கவில்லை. எங்கள் மெக்கானிக் லாக் அமைப்பை பத்திரமாக விடுவிப்பார்.',
      hi: 'चार्जिंग गन लॉक हो गई है या चार्जिंग शुरू नहीं हो रही। हमारे मैकेनिक द्वारा लॉक सुरक्षित रूप से खोला जाएगा।',
      te: 'ఛార్జింగ్ గన్ లాక్ అయి రావడం లేదు లేదా ఛార్జింగ్ ప్రారంభం కాలేదు. మా మెకానిక్ సమస్యను పరిష్కరిస్తారు.',
      en: 'Vehicle charging port motorized solenoid pin stuck in lock position or pilot communication pin not handshaking.'
    };
    const causeList: Record<string, string[]> = {
      ta: ['சார்ஜிங் போர்ட் ஆக்சுவேட்டர் மோட்டார் லாக்', 'சார்ஜர் பின்னில் அழுக்கு அல்லது தூசு', 'ஆன்-போர்டு சார்ஜர் (OBC) தொடர்பு முறிவு'],
      hi: ['चार्जिंग पोर्ट एक्चुएटर पिन अटकना', 'पिन पर धूल या जंग', 'ऑन-बोर्ड चार्जर संचार समस्या'],
      te: ['ఛార్జింగ్ పోర్ట్ పిన్ ఇరుక్కోవడం', 'పిన్లపై దుమ్ము లేదా తుప్పు', 'ఆన్-బోర్డ్ ఛార్జర్ కమ్యూనికేషన్ సమస్య'],
      en: ['Electromechanical locking pin solenoid binding', 'Control Pilot (CP) / Proximity Pilot (PP) contact oxidation', 'On-board Charger (OBC) handshake timeout']
    };
    report = {
      diagnosis: titles[targetLang] || titles.en,
      category: 'Charging System & Inlet',
      causes: causeList[targetLang] || causeList.en,
      severity: 'Normal',
      recommendations: targetLang === 'ta' ? 'கன்னை பலவந்தமாக இழுக்காதீர்கள். கார் பூட்டை 3 முறை அன்லாக் செய்து பார்க்கவும் அல்லது மெக்கானிக்கை அழைக்கவும்.' : 'Do not force the cable. Try emergency manual release cord inside boot, or book our roadside technician.',
      recommendedAction: 'mechanic',
      disclaimer: targetLang === 'ta' ? 'பலவந்தமாக இழுத்தால் போர்ட் பின் உடையும் அபாயம் உள்ளது.' : 'Forcing charging cable can break the inlet assembly and require costly replacement.',
      faultTitle: titles[targetLang] || titles.en,
      possibleCause: (causeList[targetLang] || causeList.en)[0],
      safetyAdvice: 'Do not pull cable vigorously while charger is energized.',
      recommendation: 'MECHANIC',
      estimatedCost: '₹500 – ₹1,800',
      responseInLanguage: expl[targetLang] || expl.en
    };

  } else if (is12VIssue) {
    const titles: Record<string, string> = {
      ta: 'துணை 12V பேட்டரி சார்ஜ் குறைவு / டிஸ்பிளே ஆஃப்',
      hi: '12V सहायक बैटरी लो चार्ज / डिस्प्ले बंद',
      te: '12V సహాయక బ్యాటరీ లో ఛార్జ్ / డిస్‌ప్లే ఆఫ్',
      en: '12V Auxiliary Battery Low Voltage / Central Infotainment Blackout'
    };
    const expl: Record<string, string> = {
      ta: 'EV-யின் 12V துணை பேட்டரி பலவீனமாக இருப்பதால் திரை மற்றும் கட்டுப்பாடுகள் ஆன் ஆகவில்லை. ஜம்ப்-ஸ்டார்ட் அல்லது 12V பேட்டரி மாற்ற மெக்கானிக்கை அழைக்கவும்.',
      hi: 'EV की 12V सहायक बैटरी कमजोर होने के कारण डिस्प्ले और सिस्टम शुरू नहीं हो रहे। जंप-स्टार्ट के लिए मैकेनिक बुक करें।',
      te: 'EV యొక్క 12V సహాయక బ్యాటరీ బలహీనంగా ఉండటం వల్ల స్క్రీన్ మరియు సిస్టమ్స్ ఆన్ కాలేదు. జంప్-స్టార్ట్ కోసం మెకానిక్‌ని బుక్ చేయండి.',
      en: 'The 12-volt low voltage battery powering onboard computers, contactor relays, and screens is discharged.'
    };
    const causeList: Record<string, string[]> = {
      ta: ['12V துணை லெட்-ஆசிட்/லித்தியம் பேட்டரி பலவீனம்', 'DC-DC கன்வெர்ட்டர் 12V சார்ஜிங் சுவிட்ச் செயலிழப்பு', 'துணை சாதனங்களின் தொடர் மின் பயன்பாடு'],
      hi: ['12V सहायक बैटरी डिस्चार्ज होना', 'DC-DC कनवर्टर चार्जिंग फॉल्ट', 'अतिरिक्त उपकरणों द्वारा बैटरी ड्रेन'],
      te: ['12V సహాయక బ్యాటరీ డిశ్చార్జ్ కావడం', 'DC-DC కన్వర్టర్ లోపం', 'బ్యాటరీ డ్రెయిన్'],
      en: ['12V auxiliary battery state-of-health degradation', 'DC-DC converter buck circuit sleep state failure', 'Parasitic draw from aftermarket accessory or dashcam']
    };
    report = {
      diagnosis: titles[targetLang] || titles.en,
      category: '12V Low Voltage Electrical',
      causes: causeList[targetLang] || causeList.en,
      severity: 'Warning',
      recommendations: targetLang === 'ta' ? 'மொபைல் மெக்கானிக்கை அழைத்து 12V பூஸ்ட் அல்லது பேட்டரி மாற்றத்தை மேற்கொள்ளவும்.' : 'Book a mobile mechanic to perform a 12V booster pack jump-start or battery test.',
      recommendedAction: 'mechanic',
      disclaimer: targetLang === 'ta' ? '12V இல்லாவிட்டால் உயர் மின்னழுத்த பேட்டரியும் இயங்காது.' : 'The HV traction battery contactors cannot close without a healthy 12V system.',
      faultTitle: titles[targetLang] || titles.en,
      possibleCause: (causeList[targetLang] || causeList.en)[0],
      safetyAdvice: 'Turn off all auxiliary accessories (headlights, blower fans) to conserve voltage.',
      recommendation: 'MECHANIC',
      estimatedCost: '₹600 – ₹2,200',
      responseInLanguage: expl[targetLang] || expl.en
    };

  } else {
    // General EV Diagnostic Telemetry issue
    const titles: Record<string, string> = {
      ta: 'EV பொதுவான கணினி மற்றும் சென்சார் கண்டறிதல்',
      hi: 'EV सामान्य कंप्यूटर और सेंसर डायग्नोस्टिक',
      te: 'EV సాధారణ సిస్టమ్ మరియు సెన్సార్ డయాగ్నస్టిక్',
      en: 'EV Powertrain Control Module System Diagnostic'
    };
    const expl: Record<string, string> = {
      ta: 'வாகனத்தின் சென்சார் மற்றும் கண்ட்ரோல் யூனிட் ஸ்கேன் செய்யப்பட்டது. பவர்2கோ மெக்கானிக் மூலம் விரிவான ஆய்வு பரிந்துரைக்கப்படுகிறது.',
      hi: 'वाहन के सेंसर और कंट्रोल यूनिट का विश्लेषण किया गया। पावर2गो मैकेनिक द्वारा निरीक्षण की सिफारिश की जाती है।',
      te: 'వాహనం సెన్సార్ మరియు కంట్రోల్ యూనిట్ పరిశీలించబడింది. మెకానిక్ ద్వారా తనిఖీ సిఫార్సు చేయబడింది.',
      en: 'Preliminary EV telemetry diagnostic scan completed. Roadside technician inspection recommended for full root cause resolution.'
    };
    const causeList: Record<string, string[]> = {
      ta: ['கண்ட்ரோல் மாட்யூல் கேன்-பஸ் (CAN-bus) தொடர்பு முரண்பாடு', 'சென்சார் சிக்னல் தற்காலிக துண்டிப்பு', 'சிஸ்டம் வோல்டேஜ் மாறுபாடு'],
      hi: ['कंट्रोल मॉड्यूल CAN-bus संचार में व्यवधान', 'सेंसर सिग्नल का क्षणिक डिस्कनेक्ट', 'सिस्टम वोल्टेज में उतार-चढ़ाव'],
      te: ['కంట్రోల్ మాడ్యూల్ కమ్యూనికేషన్ లోపం', 'సెన్సార్ సిగ్నల్ సమస్య', 'వోల్టేజ్ హెచ్చుతగ్గులు'],
      en: ['CAN-bus communication transient frame timeout', 'Chassis sensor intermittent signal variance', 'Auxiliary telemetry voltage fluctuation']
    };
    report = {
      diagnosis: titles[targetLang] || titles.en,
      category: 'General Electronic Control Unit (ECU)',
      causes: causeList[targetLang] || causeList.en,
      severity: 'Normal',
      recommendations: targetLang === 'ta' ? 'அருகிலுள்ள பவர்2கோ சேவை மையத்தை தொடர்பு கொள்ளவும் அல்லது மெக்கானிக்கை வரவழைக்கவும்.' : 'Perform vehicle restart. If warning persists, dispatch our mobile EV mechanic.',
      recommendedAction: 'mechanic',
      disclaimer: targetLang === 'ta' ? 'பாதுகாப்பான முறையில் ஓட்டவும். எச்சரிக்கை விளக்குகள் எரிந்தால் கவனிக்கவும்.' : 'AI preliminary triage based on reported telemetry. Professional verification recommended.',
      faultTitle: titles[targetLang] || titles.en,
      possibleCause: (causeList[targetLang] || causeList.en)[0],
      safetyAdvice: 'Monitor dashboard indicators. If red warning alerts appear, stop safely.',
      recommendation: 'MECHANIC',
      estimatedCost: '₹500 – ₹1,800',
      responseInLanguage: expl[targetLang] || expl.en
    };
  }

  return res.json({
    ...report,
    language: targetLang,
    source: 'knowledge-engine'
  });
});

export default router;
