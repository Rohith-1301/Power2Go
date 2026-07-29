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
  const { name, mobile, email, password, aadhaarNumber, licenseNumber, vehicleNumber, vehicleType, emergencyContact, batteryCapacity, profilePhoto } = req.body;
  if (!name || !mobile || !email || !password || !aadhaarNumber || !licenseNumber || !vehicleNumber || !vehicleType || !emergencyContact) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  try {
    const existing = await query('SELECT * FROM drivers WHERE email = $1', [email]);
    if (existing.rowCount > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const driverId = 'DRV' + Math.floor(100000 + Math.random() * 90000);
    
    const lat = 10.9602 + (Math.random() - 0.5) * 0.05;
    const lng = 78.0766 + (Math.random() - 0.5) * 0.05;

    await query(
      `INSERT INTO drivers (driver_id, name, mobile, email, password_hash, profile_photo, aadhaar_number, license_number, vehicle_number, vehicle_type, emergency_contact, battery_capacity, lat, lng, is_approved, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 0, 'offline')`,
      [driverId, name, mobile, email, passwordHash, profilePhoto || null, aadhaarNumber, licenseNumber, vehicleNumber, vehicleType, emergencyContact, batteryCapacity || 100.0, lat, lng]
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
      return res.status(403).json({ error: 'Your driver profile is pending admin approval.' });
    }
    const isMatch = await bcrypt.compare(password, driver.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign({ name: driver.name, driverId: driver.driver_id, isDriver: true }, JWT_SECRET, { expiresIn: '24h' });
    res.json({
      message: 'Driver login successful',
      token,
      driver: {
        driverId: driver.driver_id,
        name: driver.name,
        email: driver.email,
        mobile: driver.mobile,
        vehicleNumber: driver.vehicle_number,
        vehicleType: driver.vehicle_type,
        profilePhoto: driver.profile_photo,
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
      return res.json({ activeBooking: booking, driver });
    }
    res.json({ activeBooking: null });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
