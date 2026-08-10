import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { 
  ArrowLeft, Navigation, MapPin, CheckCircle, Car, ShieldCheck, 
  Clock, Layers, Battery, Map, ShieldAlert, Award, RefreshCw, 
  Trash2, Compass, AlertTriangle, Zap, Leaf, ExternalLink
} from 'lucide-react';
import Layout from '@/components/Layout';

interface User {
  name: string;
}

interface RecommendedStop {
  id: string;
  name: string;
  locationName: string;
  lat: number;
  lng: number;
  chargeRequiredKwh: number;
  chargeTimeMins: number;
  chargeCost: number;
  batteryAtStop: number;
  batteryAfterStop: number;
  normalSlots: { total: number; available: number };
  fastSlots: { total: number; available: number };
  chargerType: 'Normal' | 'Fast';
  price: number;
  mapX: number;
  mapY: number;
  distanceFromStart: number;
}

interface TripPlan {
  id?: number;
  userName?: string;
  user_name?: string;
  startLocation?: string;
  start_location?: string;
  endLocation?: string;
  end_location?: string;
  vehicleType?: string;
  vehicle_type?: string;
  vehicleModel?: string;
  vehicle_model?: string;
  batteryCapacity?: number;
  battery_capacity?: number;
  currentCharge?: number;
  current_charge?: number;
  totalDistance?: number;
  total_distance?: number;
  totalDuration?: string;
  total_duration?: string;
  stopsCount?: number;
  stops_count?: number;
  stopsDetails?: string;
  stops_details?: string;
  totalCost?: number;
  total_cost?: number;
  created_at?: string;
}

// Predefined route database for simulation
const ROUTE_DATABASE: Record<string, {
  distance: number;
  duration: string;
  coordinateRoute: [number, number][]; // lat, lng points
  possibleStations: RecommendedStop[];
}> = {
  'karur-chennai': {
    distance: 384,
    duration: '5h 45m',
    coordinateRoute: [
      [10.9602, 78.0766], // Karur
      [10.8056, 78.6856], // Trichy
      [11.9401, 79.4861], // Villupuram
      [13.0827, 80.2707], // Chennai
    ],
    possibleStations: [
      {
        id: 'station-trichy',
        name: 'Power2Go (Trichy)',
        locationName: 'Trichy Toll plaza (Charging Point 1)',
        lat: 10.8056,
        lng: 78.6856,
        chargeRequiredKwh: 12,
        chargeTimeMins: 20,
        chargeCost: 216,
        batteryAtStop: 45,
        batteryAfterStop: 80,
        normalSlots: { total: 12, available: 8 },
        fastSlots: { total: 8, available: 4 },
        chargerType: 'Fast',
        price: 18,
        mapX: 240,
        mapY: 270,
        distanceFromStart: 80
      },
      {
        id: 'station-villupuram',
        name: 'Power2Go (Villupuram)',
        locationName: 'Villupuram NH-45 Toll plaza (Charging Point 2)',
        lat: 11.9401,
        lng: 79.4861,
        chargeRequiredKwh: 18,
        chargeTimeMins: 30,
        chargeCost: 324,
        batteryAtStop: 40,
        batteryAfterStop: 80,
        normalSlots: { total: 14, available: 9 },
        fastSlots: { total: 8, available: 2 },
        chargerType: 'Fast',
        price: 18,
        mapX: 540,
        mapY: 160,
        distanceFromStart: 230
      }
    ]
  },
  'coimbatore-bangalore': {
    distance: 365,
    duration: '6h 15m',
    coordinateRoute: [
      [11.0168, 76.9558], // Coimbatore
      [11.3410, 77.7172], // Erode
      [11.6643, 78.1460], // Salem
      [12.7409, 77.8253], // Hosur
      [12.9716, 77.5946], // Bangalore
    ],
    possibleStations: [
      {
        id: 'station-10',
        name: 'Power2Go (Erode)',
        locationName: 'Erode NH-544 Crossing (Charging Point 1)',
        lat: 11.3410,
        lng: 77.7172,
        chargeRequiredKwh: 15,
        chargeTimeMins: 30,
        chargeCost: 195,
        batteryAtStop: 50,
        batteryAfterStop: 80,
        normalSlots: { total: 8, available: 3 },
        fastSlots: { total: 4, available: 2 },
        chargerType: 'Normal',
        price: 13,
        mapX: 240,
        mapY: 270,
        distanceFromStart: 60
      },
      {
        id: 'station-6',
        name: 'Power2Go (Salem)',
        locationName: 'Salem NH-44 Crossing (Charging Point 2)',
        lat: 11.6643,
        lng: 78.1460,
        chargeRequiredKwh: 22,
        chargeTimeMins: 40,
        chargeCost: 396,
        batteryAtStop: 38,
        batteryAfterStop: 85,
        normalSlots: { total: 16, available: 5 },
        fastSlots: { total: 10, available: 3 },
        chargerType: 'Fast',
        price: 18,
        mapX: 380,
        mapY: 220,
        distanceFromStart: 120
      },
      {
        id: 'station-11',
        name: 'Power2Go (Hosur)',
        locationName: 'Hosur Toll Plaza (Charging Point 3)',
        lat: 12.7409,
        lng: 77.8253,
        chargeRequiredKwh: 18,
        chargeTimeMins: 25,
        chargeCost: 324,
        batteryAtStop: 42,
        batteryAfterStop: 80,
        normalSlots: { total: 15, available: 11 },
        fastSlots: { total: 8, available: 5 },
        chargerType: 'Fast',
        price: 18,
        mapX: 540,
        mapY: 160,
        distanceFromStart: 290
      }
    ]
  },
  'trichy-madurai': {
    distance: 135,
    duration: '2h 15m',
    coordinateRoute: [
      [10.8056, 78.6856], // Trichy
      [10.3673, 77.9803], // Dindigul
      [9.9252, 78.1198], // Madurai
    ],
    possibleStations: [
      {
        id: 'station-12',
        name: 'Power2Go (Dindigul)',
        locationName: 'Dindigul highway junction (Charging Point 1)',
        lat: 10.3673,
        lng: 77.9803,
        chargeRequiredKwh: 10,
        chargeTimeMins: 15,
        chargeCost: 180,
        batteryAtStop: 45,
        batteryAfterStop: 75,
        normalSlots: { total: 10, available: 4 },
        fastSlots: { total: 6, available: 2 },
        chargerType: 'Fast',
        price: 18,
        mapX: 400,
        mapY: 210,
        distanceFromStart: 65
      }
    ]
  },
  'chennai-kanyakumari': {
    distance: 705,
    duration: '11h 45m',
    coordinateRoute: [
      [13.0827, 80.2707], // Chennai
      [11.9401, 79.4861], // Villupuram
      [10.8056, 78.6856], // Trichy
      [9.9252, 78.1198], // Madurai
      [8.7139, 77.7567], // Tirunelveli
      [8.0883, 77.5385], // Kanyakumari
    ],
    possibleStations: [
      {
        id: 'station-9',
        name: 'Power2Go (Villupuram)',
        locationName: 'Villupuram Bypass crossing (Charging Point 1)',
        lat: 11.9401,
        lng: 79.4861,
        chargeRequiredKwh: 22,
        chargeTimeMins: 35,
        chargeCost: 396,
        batteryAtStop: 42,
        batteryAfterStop: 85,
        normalSlots: { total: 12, available: 6 },
        fastSlots: { total: 6, available: 3 },
        chargerType: 'Fast',
        price: 18,
        mapX: 220,
        mapY: 280,
        distanceFromStart: 160
      },
      {
        id: 'station-4',
        name: 'Power2Go (Trichy)',
        locationName: 'Trichy Central Bus Stand (Charging Point 2)',
        lat: 10.8056,
        lng: 78.6856,
        chargeRequiredKwh: 28,
        chargeTimeMins: 55,
        chargeCost: 364,
        batteryAtStop: 35,
        batteryAfterStop: 80,
        normalSlots: { total: 15, available: 7 },
        fastSlots: { total: 5, available: 0 },
        chargerType: 'Normal',
        price: 13,
        mapX: 340,
        mapY: 230,
        distanceFromStart: 320
      },
      {
        id: 'station-13',
        name: 'Power2Go (Madurai)',
        locationName: 'Madurai Outer Ring Toll (Charging Point 3)',
        lat: 9.9252,
        lng: 78.1198,
        chargeRequiredKwh: 24,
        chargeTimeMins: 38,
        chargeCost: 432,
        batteryAtStop: 40,
        batteryAfterStop: 85,
        normalSlots: { total: 14, available: 7 },
        fastSlots: { total: 8, available: 4 },
        chargerType: 'Fast',
        price: 18,
        mapX: 460,
        mapY: 190,
        distanceFromStart: 480
      },
      {
        id: 'station-14',
        name: 'Power2Go (Tirunelveli)',
        locationName: 'Tirunelveli Bypass crossing (Charging Point 4)',
        lat: 8.7139,
        lng: 77.7567,
        chargeRequiredKwh: 20,
        chargeTimeMins: 30,
        chargeCost: 360,
        batteryAtStop: 45,
        batteryAfterStop: 85,
        normalSlots: { total: 10, available: 5 },
        fastSlots: { total: 4, available: 1 },
        chargerType: 'Fast',
        price: 18,
        mapX: 580,
        mapY: 150,
        distanceFromStart: 620
      }
    ]
  }
};

const POWER2GO_STATIONS = [
  {
    id: 'st-chennai-1',
    name: 'Power2Go – Velachery',
    address: 'Phoenix Marketcity, Velachery, Chennai, Tamil Nadu 600042',
    lat: 12.9915,
    lng: 80.2173,
    type: 'DC Fast (120kW) & AC Type-2',
    availability: '5/8 slots free',
    hours: '24/7 Operating Hours'
  },
  {
    id: 'st-chennai-2',
    name: 'Power2Go – Sholinganallur',
    address: 'OMR IT Corridor, Sholinganallur, Chennai, Tamil Nadu 600119',
    lat: 12.9010,
    lng: 80.2279,
    type: 'DC Ultra Fast (150kW)',
    availability: '3/6 slots free',
    hours: '24/7 Operating Hours'
  },
  {
    id: 'st-madurai',
    name: 'Power2Go – Mattuthavani',
    address: 'Mattuthavani Bus Stand Road, Madurai, Tamil Nadu 625007',
    lat: 9.9322,
    lng: 78.1561,
    type: 'DC Fast (60kW) & AC Type-2',
    availability: '4/4 slots free',
    hours: '24/7 Operating Hours'
  },
  {
    id: 'st-trichy',
    name: 'Power2Go – Trichy Central',
    address: 'Central Bus Stand, Trichy, Tamil Nadu 620001',
    lat: 10.8056,
    lng: 78.6856,
    type: 'DC Fast (120kW)',
    availability: '6/8 slots free',
    hours: '24/7 Operating Hours'
  },
  {
    id: 'st-karur',
    name: 'Power2Go – Karur Bus Stand',
    address: 'Karur Bus Stand, Karur, Tamil Nadu 639001',
    lat: 10.9602,
    lng: 78.0766,
    type: 'DC Fast (60kW)',
    availability: '2/4 slots free',
    hours: '24/7 Operating Hours'
  },
  {
    id: 'st-villupuram',
    name: 'Power2Go – Villupuram New Bus Stand',
    address: 'Villupuram New Bus Stand, Villupuram, Tamil Nadu 605602',
    lat: 11.9401,
    lng: 79.4861,
    type: 'DC Fast (120kW) & AC Type-2',
    availability: '7/8 slots free',
    hours: '24/7 Operating Hours'
  },
  {
    id: 'st-namakkal',
    name: 'Power2Go – Namakkal NH44',
    address: 'NH44, Namakkal, Tamil Nadu 637001',
    lat: 11.2189,
    lng: 78.1673,
    type: 'DC Fast (120kW)',
    availability: '8/8 slots free',
    hours: '24/7 Operating Hours'
  },
  {
    id: 'st-salem',
    name: 'Power2Go – Five Roads Junction',
    address: 'Five Roads Junction, Salem, Tamil Nadu 636004',
    lat: 11.6643,
    lng: 78.1460,
    type: 'DC Fast (120kW) & AC Type-2',
    availability: '5/8 slots free',
    hours: '24/7 Operating Hours'
  },
  {
    id: 'st-dindigul',
    name: 'Power2Go – Dindigul NH44',
    address: 'NH44 Bypass, Dindigul, Tamil Nadu 624001',
    lat: 10.3673,
    lng: 77.9803,
    type: 'DC Fast (60kW)',
    availability: '3/4 slots free',
    hours: '24/7 Operating Hours'
  },
  {
    id: 'st-virudhunagar',
    name: 'Power2Go – Virudhunagar Bus Stand',
    address: 'Virudhunagar Bus Stand, Virudhunagar, Tamil Nadu 626001',
    lat: 9.5872,
    lng: 77.9578,
    type: 'DC Fast (60kW) & AC Type-2',
    availability: '4/4 slots free',
    hours: '24/7 Operating Hours'
  },
  {
    id: 'st-kulithalai',
    name: 'Power2Go – Kulithalai Bus Stand',
    address: 'Kulithalai Bus Stand, Kulithalai, Tamil Nadu 639104',
    lat: 10.9385,
    lng: 78.4145,
    type: 'AC Type-2 (22kW)',
    availability: '2/2 slots free',
    hours: '24/7 Operating Hours'
  },
  {
    id: 'st-ariyalur',
    name: 'Power2Go – Ariyalur Bus Stand',
    address: 'Ariyalur Bus Stand, Ariyalur, Tamil Nadu 621704',
    lat: 11.1401,
    lng: 79.0786,
    type: 'DC Fast (60kW)',
    availability: '4/4 slots free',
    hours: '24/7 Operating Hours'
  },
  {
    id: 'st-erode',
    name: 'Power2Go – Texvalley Mall',
    address: 'Texvalley Mall, Gangapuram, Erode, Tamil Nadu 638102',
    lat: 11.3710,
    lng: 77.7285,
    type: 'DC Fast (120kW)',
    availability: '5/6 slots free',
    hours: '24/7 Operating Hours'
  },
  {
    id: 'st-coimbatore-1',
    name: 'Power2Go – Brookefields Mall',
    address: 'Brookefields Mall, Krishnaswamy Road, Coimbatore, Tamil Nadu 641001',
    lat: 11.0125,
    lng: 76.9582,
    type: 'DC Fast (120kW) & AC Type-2',
    availability: '4/8 slots free',
    hours: '24/7 Operating Hours'
  },
  {
    id: 'st-coimbatore-2',
    name: 'Power2Go – Avinashi Road',
    address: 'Avinashi Road, Coimbatore, Tamil Nadu 641014',
    lat: 11.0252,
    lng: 77.0123,
    type: 'DC Ultra Fast (150kW)',
    availability: '5/6 slots free',
    hours: '24/7 Operating Hours'
  },
  {
    id: 'st-nilgiris',
    name: 'Power2Go – Coonoor Town',
    address: 'Coonoor Town, Nilgiris, Tamil Nadu 643101',
    lat: 11.3530,
    lng: 76.7959,
    type: 'DC Fast (60kW)',
    availability: '3/4 slots free',
    hours: '24/7 Operating Hours'
  },
  {
    id: 'st-ooty',
    name: 'Power2Go – Ooty Bus Stand',
    address: 'Ooty Bus Stand, Ooty, Tamil Nadu 643001',
    lat: 11.4064,
    lng: 76.6932,
    type: 'DC Fast (60kW) & AC Type-2',
    availability: '4/4 slots free',
    hours: '24/7 Operating Hours'
  },
  {
    id: 'st-kodaikanal',
    name: 'Power2Go – Kodaikanal Bus Stand',
    address: 'Kodaikanal Bus Stand, Kodaikanal, Tamil Nadu 624101',
    lat: 10.2381,
    lng: 77.4892,
    type: 'DC Fast (60kW) & AC Type-2',
    availability: '3/4 slots free',
    hours: '24/7 Operating Hours'
  },
  {
    id: 'st-ramanathapuram',
    name: 'Power2Go – Ramanathapuram Bus Stand',
    address: 'Ramanathapuram Bus Stand, Ramanathapuram, Tamil Nadu 623501',
    lat: 9.3639,
    lng: 78.8394,
    type: 'DC Fast (60kW)',
    availability: '4/4 slots free',
    hours: '24/7 Operating Hours'
  }
];

export default function AIRoutePlanner() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [alternativeRoutes, setAlternativeRoutes] = useState<any[]>([]);
  const [activeRouteIndex, setActiveRouteIndex] = useState<number>(0);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState<number>(0);
  const [availableRoutes, setAvailableRoutes] = useState<any[]>([]);

  const mapInstanceRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);
  const directionsServiceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);

  // Load Google Maps script on client side
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsClient(true);
    if ((window as any).google && (window as any).google.maps) {
      setGoogleMapsLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setGoogleMapsLoaded(true);
    };
    script.onerror = () => {
      console.error('Failed to load Google Maps script.');
    };
    document.head.appendChild(script);
  }, []);

  // Form Inputs
  const [startLocation, setStartLocation] = useState('Karur');
  const [endLocation, setEndLocation] = useState('Chennai');
  const [vehicleType, setVehicleType] = useState<'motorcycle' | 'car' | 'heavy'>('car');
  const [vehicleModel, setVehicleModel] = useState('Tata Nexon EV Max');
  const [batteryCapacity, setBatteryCapacity] = useState(40.5); // kWh
  const [currentCharge, setCurrentCharge] = useState(35); // %

  // Eco driving toggles
  const [ecoMode, setEcoMode] = useState(false);
  const [reduceSpeed, setReduceSpeed] = useState(false);
  const [acOff, setAcOff] = useState(false);

  // Analysis Result States
  const [analyzing, setAnalyzing] = useState(false);
  const [tripSolved, setTripSolved] = useState(false);
  const [rangeDeficit, setRangeDeficit] = useState(false);
  const [tripWarning, setTripWarning] = useState<string | null>(null);
  const [tripSummary, setTripSummary] = useState<any>(null);
  const [activeMapUrl, setActiveMapUrl] = useState('https://www.google.com/maps?saddr=Karur&daddr=Chennai&dirflg=d&output=embed');
  const [activeDirectLink, setActiveDirectLink] = useState('https://www.google.com/maps/dir/?api=1&origin=Karur&destination=Chennai&travelmode=driving');

  const normalizeCityName = (name: string): string => {
    let clean = name.toLowerCase().trim();
    clean = clean.replace(/h/g, ''); // madhurai -> madurai, chidambaram -> cidambaram
    if (clean.includes('madurai') || clean.includes('madura') || clean.includes('matuthavani')) return 'madurai';
    if (clean.includes('karur')) return 'karur';
    if (clean.includes('chennai') || clean.includes('madras') || clean.includes('velacery') || clean.includes('solinganallur')) return 'chennai';
    if (clean.includes('tricy') || clean.includes('tirucirapalli')) return 'trichy';
    if (clean.includes('coimbatore') || clean.includes('kovai') || clean.includes('brookefield') || clean.includes('avinasi')) return 'coimbatore';
    if (clean.includes('salem')) return 'salem';
    if (clean.includes('namakal')) return 'namakkal';
    if (clean.includes('dindigul')) return 'dindigul';
    if (clean.includes('erode')) return 'erode';
    if (clean.includes('kulitalai')) return 'kulithalai';
    if (clean.includes('ariyalur')) return 'ariyalur';
    if (clean.includes('vilupuram')) return 'villupuram';
    if (clean.includes('virudunagar')) return 'virudhunagar';
    if (clean.includes('ramnathapuram')) return 'ramanathapuram';
    if (clean.includes('oty') || clean.includes('ooty')) return 'ooty';
    if (clean.includes('conoor')) return 'nilgiris';
    if (clean.includes('kodaikanal')) return 'kodaikanal';
    return clean;
  };

  const cleanWaypointName = (name: string): string => {
    let clean = name.replace('Power2Go – ', '').replace('Power2Go (', '').replace(')', '').trim();
    clean = clean.replace(/nh\s*44/gi, '');
    clean = clean.replace(/nh-44/gi, '');
    clean = clean.replace(/nh/gi, '');
    clean = clean.replace(/national highway/gi, '');
    clean = clean.replace(/highway/gi, '');
    clean = clean.replace(/toll plaza/gi, '');
    clean = clean.trim();
    return clean;
  };

  const [selectedMarker, setSelectedMarker] = useState<RecommendedStop | null>(null);

  // History log state
  const [tripHistory, setTripHistory] = useState<TripPlan[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Load User and initial history logs
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/');
    } else {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      fetchTripHistory(parsedUser.name);
    }
  }, [router]);

  const fetchTripHistory = async (username: string) => {
    try {
      const res = await fetch(`/api/trips?username=${encodeURIComponent(username)}`);
      if (res.ok) {
        const data = await res.json();
        setTripHistory(data.trips);
      }
    } catch (err) {
      console.error('Error fetching trip history:', err);
    }
  };

  // Preset Auto-configs on Vehicle Type Change
  useEffect(() => {
    if (vehicleType === 'motorcycle') {
      setVehicleModel('Ola S1 Pro Gen 2');
      setBatteryCapacity(4.0);
      setCurrentCharge(80);
    } else if (vehicleType === 'car') {
      setVehicleModel('Tata Nexon EV Max');
      setBatteryCapacity(40.5);
      setCurrentCharge(35);
    } else if (vehicleType === 'heavy') {
      setVehicleModel('Olectra Electric Bus');
      setBatteryCapacity(250.0);
      setCurrentCharge(50);
    }
  }, [vehicleType]);

  // Derived base vehicle efficiency (km per kWh)
  const getBaseEfficiency = () => {
    if (vehicleType === 'motorcycle') return 6.5;
    if (vehicleType === 'car') return 5.2;
    return 2.8; // heavy vehicle
  };

  // Calculate efficiency adjustments based on Eco options
  const getAdjustedEfficiency = () => {
    let base = getBaseEfficiency();
    if (ecoMode) base *= 1.15; // 15% range boost
    if (reduceSpeed) base *= 1.10; // 10% range boost
    if (acOff) base *= 1.08; // 8% range boost
    return parseFloat(base.toFixed(2));
  };

  // Execute AI Solver using Google Maps Directions Service with robust Fallback
  const handleAnalyseTrip = () => {
    setAnalyzing(true);
    setTripSolved(false);
    setRangeDeficit(false);
    setTripWarning(null);
    setSelectedMarker(null);

    const startLoc = startLocation.trim();
    const endLoc = endLocation.trim();

    const runSolverWithData = (
      totalDist: number, 
      totalTime: string, 
      startLatLng: { lat: number, lng: number }, 
      endLatLng: { lat: number, lng: number }, 
      routeCoordinates: { lat: number, lng: number }[]
    ) => {
      // Candidate station proximity filtering strictly on/nearby the route
      const candidates: RecommendedStop[] = [];

      // Determine geographic bounding box with 0.15 degree margin
      const minLat = Math.min(startLatLng.lat, endLatLng.lat) - 0.15;
      const maxLat = Math.max(startLatLng.lat, endLatLng.lat) + 0.15;
      const minLng = Math.min(startLatLng.lng, endLatLng.lng) - 0.15;
      const maxLng = Math.max(startLatLng.lng, endLatLng.lng) + 0.15;

      POWER2GO_STATIONS.forEach((station) => {
        // Exclude stations outside bounding box
        if (station.lat < minLat || station.lat > maxLat || station.lng < minLng || station.lng > maxLng) {
          return;
        }

        let minDistance = Infinity;
        routeCoordinates.forEach((pt) => {
          const R = 6371;
          const dLat = (pt.lat - station.lat) * Math.PI / 180;
          const dLng = (pt.lng - station.lng) * Math.PI / 180;
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(station.lat * Math.PI / 180) * Math.cos(pt.lat * Math.PI / 180) * 
            Math.sin(dLng/2) * Math.sin(dLng/2); 
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
          const d = R * c;
          if (d < minDistance) minDistance = d;
        });

        // Station must be within 18 km of route path
        if (minDistance <= 18) {
          let closestIndex = 0;
          let closestDist = Infinity;
          routeCoordinates.forEach((pt, idx) => {
            const d = Math.abs(pt.lat - station.lat) + Math.abs(pt.lng - station.lng);
            if (d < closestDist) {
              closestDist = d;
              closestIndex = idx;
            }
          });
          const pct = closestIndex / Math.max(1, routeCoordinates.length);
          const distanceFromStart = Math.max(5, Math.round(totalDist * pct));

          candidates.push({
            id: `stop-${station.id}`,
            name: station.name,
            locationName: station.address,
            lat: station.lat,
            lng: station.lng,
            chargeRequiredKwh: 0,
            chargeTimeMins: 0,
            chargeCost: 0,
            batteryAtStop: 0,
            batteryAfterStop: 0,
            normalSlots: { total: 8, available: Math.floor(Math.random() * 5) + 1 },
            fastSlots: { total: 4, available: Math.floor(Math.random() * 3) + 1 },
            chargerType: station.type.includes('DC') ? 'Fast' : 'Normal',
            price: station.type.includes('DC') ? 18 : 12,
            mapX: 0,
            mapY: 0,
            distanceFromStart: distanceFromStart
          });
        }
      });

      // If no candidate stations found along custom route, include nearest major station on path
      if (candidates.length === 0 && POWER2GO_STATIONS.length > 0) {
        // Match closest station by lat/lng distance to midpoint
        const midLat = (startLatLng.lat + endLatLng.lat) / 2;
        const midLng = (startLatLng.lng + endLatLng.lng) / 2;
        let closestSt = POWER2GO_STATIONS[0];
        let minDist = Infinity;
        POWER2GO_STATIONS.forEach(s => {
          const d = Math.abs(s.lat - midLat) + Math.abs(s.lng - midLng);
          if (d < minDist) { minDist = d; closestSt = s; }
        });
        candidates.push({
          id: `stop-${closestSt.id}`,
          name: closestSt.name,
          locationName: closestSt.address,
          lat: closestSt.lat,
          lng: closestSt.lng,
          chargeRequiredKwh: 0,
          chargeTimeMins: 0,
          chargeCost: 0,
          batteryAtStop: 0,
          batteryAfterStop: 0,
          normalSlots: { total: 8, available: 4 },
          fastSlots: { total: 4, available: 2 },
          chargerType: 'Fast',
          price: 18,
          mapX: 0,
          mapY: 0,
          distanceFromStart: Math.round(totalDist * 0.5)
        });
      }

      candidates.sort((a, b) => a.distanceFromStart - b.distanceFromStart);

      const efficiency = getAdjustedEfficiency();
      const recommendedStops: RecommendedStop[] = [];
      let currentBatterySim = currentCharge;
      let costSum = 0;
      let chargeDurationTotal = 0;
      let isStranded = false;
      let strandedStopName = '';
      let lastDist = 0;

      candidates.forEach((stop) => {
        const segmentDist = stop.distanceFromStart - lastDist;
        lastDist = stop.distanceFromStart;

        const energyUsed = segmentDist / efficiency;
        const percentDrop = (energyUsed / batteryCapacity) * 100;
        stop.batteryAtStop = Math.round(currentBatterySim - percentDrop);

        if (stop.batteryAtStop <= 35 || currentCharge < 45) {
          if (stop.batteryAtStop <= 5) {
            isStranded = true;
            if (!strandedStopName) strandedStopName = stop.name;
          }

          stop.batteryAfterStop = 85;
          const chargeNeeded = Math.max(0, 85 - stop.batteryAtStop);
          stop.chargeRequiredKwh = parseFloat(((chargeNeeded / 100) * batteryCapacity).toFixed(1));
          stop.chargeCost = Math.round(stop.chargeRequiredKwh * stop.price);
          stop.chargeTimeMins = stop.chargerType === 'Fast'
            ? Math.round(stop.chargeRequiredKwh * 1.5)
            : Math.round(stop.chargeRequiredKwh * 3.5);

          costSum += stop.chargeCost;
          chargeDurationTotal += stop.chargeTimeMins;
          currentBatterySim = stop.batteryAfterStop;

          recommendedStops.push(stop);
        }
      });

      const finalSegmentDist = Math.max(0, totalDist - lastDist);
      const finalEnergyUsed = finalSegmentDist / efficiency;
      const finalPercentDrop = (finalEnergyUsed / batteryCapacity) * 100;
      const batteryAtDest = Math.round(currentBatterySim - finalPercentDrop);
      if (batteryAtDest <= 5) {
        isStranded = true;
        if (!strandedStopName) strandedStopName = endLoc;
      }

      if (isStranded) {
        setTripWarning(`Warning: Your battery will drop below safe reserves before reaching ${strandedStopName.split(' ')[0]}. Switch to Eco driving mode or request a Mobile Charging Van!`);
      }

      // Generate AI Battery Drain Advisory Feedback
      const maxVehicleRange = Math.round(batteryCapacity * (currentCharge / 100) * efficiency);
      const energyNeededTotal = totalDist / efficiency;
      const percentNeededTotal = Math.round((energyNeededTotal / batteryCapacity) * 100);
      const estimatedBatteryAtDest = Math.max(0, currentCharge - percentNeededTotal);

      let aiAdvisoryMessage = '';
      if (estimatedBatteryAtDest >= 18) {
        aiAdvisoryMessage = `✅ AI Battery Analysis: Your current charge (${currentCharge}%, ${maxVehicleRange} km range) is SUFFICIENT to reach ${endLoc} (${totalDist} km) without stopping! Estimated battery remaining at destination: ${estimatedBatteryAtDest}%. No mandatory charging stops required.`;
      } else if (recommendedStops.length > 0) {
        const primaryStop = recommendedStops[0];
        const cleanStopName = primaryStop.name.replace('Power2Go – ', '').replace('Power2Go (', '').replace(')', '');
        const drainKmMark = Math.max(10, Math.round(maxVehicleRange * 0.75));
        aiAdvisoryMessage = `⚡ AI Battery Drain Analysis: Your vehicle battery will drop to ~20% near km ${drainKmMark} of your trip. AI recommends recharging at ${cleanStopName} for ${primaryStop.chargeTimeMins} mins (cost: ₹${primaryStop.chargeCost}) to reach ${endLoc} safely with 85% battery reserve.`;
      } else {
        aiAdvisoryMessage = `⚠️ AI Range Advisory: Estimated arrival charge at ${endLoc} will be low (~${estimatedBatteryAtDest}%). Turn on Eco Driving Mode to gain +15% range reserve or top up at a nearby Power2Go station on the route.`;
      }

      const summary = {
        totalDistance: totalDist,
        routeDuration: totalTime,
        tripDuration: totalTime,
        vehicleRange: maxVehicleRange,
        stopsCount: recommendedStops.length,
        stops: candidates,
        recommendedStops: recommendedStops,
        totalChargingCost: costSum,
        totalChargingDuration: chargeDurationTotal,
        energyConsumedKwh: parseFloat((totalDist / efficiency).toFixed(1)),
        avgEfficiency: efficiency,
        acSavings: acOff ? 8 : 0,
        startLatLng: startLatLng,
        endLatLng: endLatLng,
        routeCoordinates: routeCoordinates,
        aiAdvisoryMessage: aiAdvisoryMessage
      };

      setTripSummary(summary);

      const shortestDist = Math.max(30, Math.round(totalDist * 0.88));
      const shortestHours = Math.floor(shortestDist / 65);
      const shortestMins = Math.round((shortestDist % 65) * 60 / 65);
      const shortestDuration = `${shortestHours}h ${shortestMins}m`;

      const expressDist = Math.round(totalDist * 0.95);
      const expressHours = Math.floor(expressDist / 75);
      const expressMins = Math.round((expressDist % 75) * 60 / 75);
      const expressDuration = `${expressHours}h ${expressMins}m`;

      const routeOptions = [
        {
          index: 0,
          title: 'AI Optimal Route',
          badge: 'AI Best',
          badgeColor: '#00ff87',
          distanceKm: totalDist,
          durationText: totalTime,
          description: 'Includes recommended Power2Go EV charging hubs along the path.',
          stops: candidates,
          recommendedStops: recommendedStops
        },
        {
          index: 1,
          title: 'Shortest Distance Route',
          badge: 'Shortest',
          badgeColor: '#00d2ff',
          distanceKm: shortestDist,
          durationText: shortestDuration,
          description: 'Direct shortest highway driving path with minimum distance.',
          stops: candidates,
          recommendedStops: []
        },
        {
          index: 2,
          title: 'Expressway Highway',
          badge: 'Fastest',
          badgeColor: '#ffaa00',
          distanceKm: expressDist,
          durationText: expressDuration,
          description: 'High-speed national expressway bypass route.',
          stops: candidates,
          recommendedStops: []
        }
      ];

      setAvailableRoutes(routeOptions);
      setSelectedRouteIdx(0);
      
      const startParam = encodeURIComponent(startLoc.trim());
      const endParam = encodeURIComponent(endLoc.trim());
      let embedUrl = '';
      let directLink = '';

      if (recommendedStops.length > 0) {
        const stopNames = recommendedStops.map((s: RecommendedStop) => {
          return encodeURIComponent(cleanWaypointName(s.name) + ', Tamil Nadu');
        });
        const waypoints = stopNames.join('+to:');
        embedUrl = `https://www.google.com/maps?saddr=${startParam}&daddr=${waypoints}+to:${endParam}&dirflg=d&output=embed`;
        directLink = `https://www.google.com/maps/dir/${startParam}/${stopNames.join('/')}/${endParam}?travelmode=driving`;
      } else {
        embedUrl = `https://www.google.com/maps?saddr=${startParam}&daddr=${endParam}&dirflg=d&output=embed`;
        directLink = `https://www.google.com/maps/dir/?api=1&origin=${startParam}&destination=${endParam}&travelmode=driving`;
      }

      setActiveMapUrl(embedUrl);
      setActiveDirectLink(directLink);

      setTripSolved(true);
      setAnalyzing(false);

      if (user) {
        try {
          const tripPayload: TripPlan = {
            userName: user.name,
            start_location: startLoc,
            end_location: endLoc,
            vehicle_type: vehicleType,
            vehicle_model: vehicleModel,
            battery_capacity: batteryCapacity,
            current_charge: currentCharge,
            total_distance: totalDist,
            total_duration: totalTime,
            stops_count: recommendedStops.length,
            stops_details: JSON.stringify(recommendedStops.map(s => ({ name: s.name, type: s.chargerType, cost: s.chargeCost }))),
            total_cost: costSum
          };

          fetch('/api/trips', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tripPayload),
          }).then(res => {
            if (res.ok) fetchTripHistory(user.name);
          });
        } catch (dbErr) {
          console.error('Failed to log trip to DB:', dbErr);
        }
      }
    };

    // Try Google Maps DirectionsService if available
    const google = typeof window !== 'undefined' ? (window as any).google : null;
    if (google && google.maps && google.maps.DirectionsService) {
      const directionsService = new google.maps.DirectionsService();
      directionsService.route({
        origin: startLoc,
        destination: endLoc,
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true
      }, (result: any, status: string) => {
        if (status === google.maps.DirectionsStatus.OK && result.routes && result.routes.length > 0) {
          const route = result.routes[0];
          const leg = route.legs[0];
          const totalDist = Math.round(leg.distance.value / 1000);
          const totalTime = leg.duration.text;
          const startLatLng = { lat: leg.start_location.lat(), lng: leg.start_location.lng() };
          const endLatLng = { lat: leg.end_location.lat(), lng: leg.end_location.lng() };
          const routeCoordinates = route.overview_path.map((p: any) => ({ lat: p.lat(), lng: p.lng() }));

          runSolverWithData(totalDist, totalTime, startLatLng, endLatLng, routeCoordinates);
          return;
        }

        // Fallback calculation if Google Maps API status is not OK
        runFallbackSolver();
      });
    } else {
      // Fallback calculation if google.maps is not loaded
      runFallbackSolver();
    }

    function runFallbackSolver() {
      // Robust fuzzy coordinate dictionary for common Tamil Nadu cities
      const cityCoords: Record<string, { lat: number; lng: number }> = {
        'karur': { lat: 10.9602, lng: 78.0766 },
        'madurai': { lat: 9.9252, lng: 78.1198 },
        'madhurai': { lat: 9.9252, lng: 78.1198 },
        'chennai': { lat: 13.0827, lng: 80.2707 },
        'velachery': { lat: 12.9915, lng: 80.2173 },
        'sholinganallur': { lat: 12.9010, lng: 80.2279 },
        'trichy': { lat: 10.8056, lng: 78.6856 },
        'tiruchirappalli': { lat: 10.8056, lng: 78.6856 },
        'namakkal': { lat: 11.2189, lng: 78.1673 },
        'salem': { lat: 11.6643, lng: 78.1460 },
        'dindigul': { lat: 10.3673, lng: 77.9803 },
        'virudhunagar': { lat: 9.5680, lng: 77.9624 },
        'kulithalai': { lat: 10.9392, lng: 78.4147 },
        'ariyalur': { lat: 11.1401, lng: 79.0786 },
        'erode': { lat: 11.3410, lng: 77.7172 },
        'coimbatore': { lat: 11.0168, lng: 76.9558 },
        'nilgiris': { lat: 11.4102, lng: 76.6950 },
        'ooty': { lat: 11.4102, lng: 76.6950 },
        'kodaikanal': { lat: 10.2381, lng: 77.4892 },
        'ramanathapuram': { lat: 9.3639, lng: 78.8394 },
        'villupuram': { lat: 11.9401, lng: 79.4861 },
        'vellore': { lat: 12.9165, lng: 79.1325 }
      };

      const startClean = startLoc.toLowerCase().trim();
      const endClean = endLoc.toLowerCase().trim();

      let sLat = 10.9602, sLng = 78.0766; // Defaults to Karur
      let eLat = 13.0827, eLng = 80.2707; // Defaults to Chennai

      let foundStart = false;
      let foundEnd = false;

      for (const city in cityCoords) {
        if (startClean.includes(city) || city.includes(startClean)) {
          sLat = cityCoords[city].lat;
          sLng = cityCoords[city].lng;
          foundStart = true;
          break;
        }
      }

      for (const city in cityCoords) {
        if (endClean.includes(city) || city.includes(endClean)) {
          eLat = cityCoords[city].lat;
          eLng = cityCoords[city].lng;
          foundEnd = true;
          break;
        }
      }

      if (!foundStart) {
        const matchStart = POWER2GO_STATIONS.find(s => s.name.toLowerCase().includes(startClean) || s.address.toLowerCase().includes(startClean));
        if (matchStart) { sLat = matchStart.lat; sLng = matchStart.lng; }
      }

      if (!foundEnd) {
        const matchEnd = POWER2GO_STATIONS.find(s => s.name.toLowerCase().includes(endClean) || s.address.toLowerCase().includes(endClean));
        if (matchEnd) { eLat = matchEnd.lat; eLng = matchEnd.lng; }
      }

      const R = 6371;
      const dLat = (eLat - sLat) * Math.PI / 180;
      const dLng = (eLng - sLng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(sLat * Math.PI / 180) * Math.cos(eLat * Math.PI / 180) * Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const approxDist = Math.max(50, Math.round(R * c * 1.3)); // 1.3 road multiplier factor

      const hours = Math.floor(approxDist / 60);
      const mins = Math.floor(approxDist % 60);
      const approxTime = `${hours}h ${mins}m`;

      const numPoints = 10;
      const routeCoordinates: { lat: number; lng: number }[] = [];
      for (let i = 0; i <= numPoints; i++) {
        const ratio = i / numPoints;
        routeCoordinates.push({
          lat: sLat + (eLat - sLat) * ratio,
          lng: sLng + (eLng - sLng) * ratio
        });
      }

      setTimeout(() => {
        runSolverWithData(approxDist, approxTime, { lat: sLat, lng: sLng }, { lat: eLat, lng: eLng }, routeCoordinates);
      }, 400);
    }
  };
  // Select alternative route
  const handleSelectRoute = (idx: number) => {
    setActiveRouteIndex(idx);
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setRouteIndex(idx);
    }
  };

  // Initialize Map and place Power2Go charging stations
  useEffect(() => {
    if (!googleMapsLoaded || typeof window === 'undefined') return;
    const google = (window as any).google;
    if (!google || !google.maps) return;

    const mapElement = document.getElementById('google-map-container');
    if (!mapElement) return;

    // Create Map (Dark Styled Theme)
    const map = new google.maps.Map(mapElement, {
      center: { lat: 11.1271, lng: 78.6569 }, // Center of Tamil Nadu
      zoom: 7,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      mapTypeControl: true,
      zoomControl: true,
      fullscreenControl: true,
      streetViewControl: true,
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#0c0f1d' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#0c0f1d' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
        {
          featureType: 'administrative.locality',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#d59563' }]
        },
        {
          featureType: 'poi',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#d59563' }]
        },
        {
          featureType: 'poi.park',
          elementType: 'geometry',
          stylers: [{ color: '#111528' }]
        },
        {
          featureType: 'poi.park',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#6b9a76' }]
        },
        {
          featureType: 'road',
          elementType: 'geometry',
          stylers: [{ color: '#1f243d' }]
        },
        {
          featureType: 'road',
          elementType: 'geometry.stroke',
          stylers: [{ color: '#2b3154' }]
        },
        {
          featureType: 'road',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#9ca5b9' }]
        },
        {
          featureType: 'road.highway',
          elementType: 'geometry',
          stylers: [{ color: '#00d2ff' }, { weight: 1.5 }]
        },
        {
          featureType: 'road.highway',
          elementType: 'geometry.stroke',
          stylers: [{ color: '#1f243d' }]
        },
        {
          featureType: 'road.highway',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#fff' }]
        },
        {
          featureType: 'water',
          elementType: 'geometry',
          stylers: [{ color: '#090b14' }]
        },
        {
          featureType: 'water',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#515c6d' }]
        },
        {
          featureType: 'water',
          elementType: 'labels.text.stroke',
          stylers: [{ color: '#17263c' }]
        }
      ]
    });
    mapInstanceRef.current = map;

    // Setup Directions Service
    directionsServiceRef.current = new google.maps.DirectionsService();
    directionsRendererRef.current = new google.maps.DirectionsRenderer({
      map: map,
      suppressMarkers: true // Keep our own clean markers & start/end labels!
    });

    // Setup Single Shared InfoWindow
    infoWindowRef.current = new google.maps.InfoWindow();

    // Clear previous markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    // Add Power2Go Stations as Vibrant Green Markers
    POWER2GO_STATIONS.forEach(station => {
      const marker = new google.maps.Marker({
        position: { lat: station.lat, lng: station.lng },
        map: map,
        title: station.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#00ff87',
          fillOpacity: 1,
          strokeColor: '#003311',
          strokeWeight: 2,
          scale: 9
        }
      });
      markersRef.current.push(marker);

      marker.addListener('click', () => {
        // Smoothly zoom in on click
        map.setZoom(13);
        map.panTo(marker.getPosition());

        // Create InfoWindow Content
        const contentString = `
          <div style="color: #333; font-family: Roboto, Arial, sans-serif; padding: 10px; max-width: 250px; line-height: 1.4;">
            <h3 style="margin: 0 0 6px 0; font-size: 14px; font-weight: bold; color: #00aa55;">${station.name}</h3>
            <p style="margin: 0 0 8px 0; font-size: 11px; color: #666;">${station.address}</p>
            <div style="font-size: 11px; margin-bottom: 4px;">⚡ <b>Type:</b> ${station.type}</div>
            <div style="font-size: 11px; margin-bottom: 4px; color: #00aa55; font-weight: bold;">🟢 <b>Availability:</b> ${station.availability}</div>
            <div style="font-size: 11px; margin-bottom: 10px; color: #888;">🕒 <b>Hours:</b> ${station.hours}</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <button onclick="window.preBookSlot('${station.name}')" style="background: #008855; color: white; border: none; padding: 6px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer;">Pre-Book</button>
              <a href="https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}" target="_blank" style="background: #0055aa; color: white; text-align: center; text-decoration: none; padding: 6px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; line-height: 1.4;">Get Directions</a>
            </div>
          </div>
        `;

        infoWindowRef.current.setContent(contentString);
        infoWindowRef.current.open(map, marker);
      });
    });

    // Expose pre-booking handler globally so inline button click can trigger Next.js router
    (window as any).preBookSlot = (stationName: string) => {
      const cleanName = stationName.replace('Power2Go – ', '').trim();
      router.push(`/power-station?station=${encodeURIComponent(cleanName)}`);
    };

    // Auto-fit viewport to show all markers
    const bounds = new google.maps.LatLngBounds();
    POWER2GO_STATIONS.forEach(station => {
      bounds.extend(new google.maps.LatLng(station.lat, station.lng));
    });
    map.fitBounds(bounds);

  }, [googleMapsLoaded]);

  // Load and update directions routing when trip solved
  useEffect(() => {
    if (!googleMapsLoaded || !tripSolved || !tripSummary || typeof window === 'undefined') return;
    const google = (window as any).google;
    if (!google || !google.maps) return;

    const directionsService = directionsServiceRef.current;
    const directionsRenderer = directionsRendererRef.current;
    const map = mapInstanceRef.current;

    if (!directionsService || !directionsRenderer || !map) return;

    directionsRenderer.setMap(map);

    const startLoc = startLocation.trim();
    const endLoc = endLocation.trim();

    // Prepare waypoints from charging stops
    const waypoints = tripSummary.stops.map((stop: RecommendedStop) => ({
      location: new google.maps.LatLng(stop.lat, stop.lng),
      stopover: true
    }));

    // Request directions with route alternatives
    directionsService.route({
      origin: startLoc,
      destination: endLoc,
      waypoints: waypoints,
      optimizeWaypoints: false,
      travelMode: google.maps.TravelMode.DRIVING,
      provideRouteAlternatives: true
    }, (result: any, status: string) => {
      if (status === google.maps.DirectionsStatus.OK) {
        directionsRenderer.setDirections(result);

        // Parse alternative routes
        const routes = result.routes;
        if (routes && routes.length > 0) {
          const routesInfo = routes.map((route: any, idx: number) => {
            let totalD = 0;
            let totalT = 0;
            route.legs.forEach((leg: any) => {
              totalD += leg.distance.value;
              totalT += leg.duration.value;
            });
            return {
              index: idx,
              summary: route.summary || `Route ${idx + 1}`,
              distanceText: `${(totalD / 1000).toFixed(1)} km`,
              durationText: `${Math.floor(totalT / 3600)}h ${Math.floor((totalT % 3600) / 60)}m`,
              distanceMeters: totalD
            };
          });
          setAlternativeRoutes(routesInfo);
          setActiveRouteIndex(0);
        }
      } else {
        console.warn('Google Maps Directions request failed:', status);
        
        // Dynamic Fallback: Draw straight polyline if directions API fails
        const pathPoints = [{ lat: tripSummary.startLatLng.lat, lng: tripSummary.startLatLng.lng }];
        tripSummary.stops.forEach((stop: RecommendedStop) => {
          pathPoints.push({ lat: stop.lat, lng: stop.lng });
        });
        pathPoints.push({ lat: tripSummary.endLatLng.lat, lng: tripSummary.endLatLng.lng });

        if ((window as any).fallbackPolyline) {
          (window as any).fallbackPolyline.setMap(null);
        }
        const fallbackPolyline = new google.maps.Polyline({
          path: pathPoints,
          geodesic: true,
          strokeColor: '#00d2ff',
          strokeOpacity: 0.8,
          strokeWeight: 4,
          map: map
        });
        (window as any).fallbackPolyline = fallbackPolyline;

        const bounds = new google.maps.LatLngBounds();
        pathPoints.forEach(pt => bounds.extend(pt));
        map.fitBounds(bounds);
      }
    });

  }, [googleMapsLoaded, tripSolved, tripSummary]);

  const handleSelectRouteCard = (index: number) => {
     setSelectedRouteIdx(index);
     if (availableRoutes[index]) {
       const sel = availableRoutes[index];
       setTripSummary((prev: any) => {
         if (!prev) return prev;
         return {
           ...prev,
           totalDistance: sel.distanceKm,
           routeDuration: sel.durationText,
           tripDuration: sel.durationText,
           stopsCount: sel.recommendedStops ? sel.recommendedStops.length : 0,
           stops: sel.stops || [],
           recommendedStops: sel.recommendedStops || [],
           energyConsumedKwh: parseFloat((sel.distanceKm / (prev.avgEfficiency || 5.2)).toFixed(1))
         };
       });

       const startParam = encodeURIComponent(startLocation.trim());
       const endParam = encodeURIComponent(endLocation.trim());
       let embedUrl = '';
       let directLink = '';

       const routeStops = sel.recommendedStops || [];
       if (routeStops.length > 0) {
         const stopNames = routeStops.map((s: RecommendedStop) => {
           return encodeURIComponent(cleanWaypointName(s.name) + ', Tamil Nadu');
         });
         const waypoints = stopNames.join('+to:');
         embedUrl = `https://www.google.com/maps?saddr=${startParam}&daddr=${waypoints}+to:${endParam}&dirflg=d&output=embed`;
         directLink = `https://www.google.com/maps/dir/${startParam}/${stopNames.join('/')}/${endParam}?travelmode=driving`;
       } else {
         embedUrl = `https://www.google.com/maps?saddr=${startParam}&daddr=${endParam}&dirflg=d&output=embed`;
         directLink = `https://www.google.com/maps/dir/?api=1&origin=${startParam}&destination=${endParam}&travelmode=driving`;
       }

       setActiveMapUrl(embedUrl);
       setActiveDirectLink(directLink);
     }
   };

  const getGoogleMapEmbedUrl = () => {
    const start = encodeURIComponent(startLocation.trim() || 'Karur');
    const end = encodeURIComponent(endLocation.trim() || 'Chennai');

    if (tripSolved && tripSummary && tripSummary.recommendedStops && tripSummary.recommendedStops.length > 0) {
      const stopNames = tripSummary.recommendedStops.map((s: RecommendedStop) => {
        return encodeURIComponent(cleanWaypointName(s.name) + ', Tamil Nadu');
      });
      const waypoints = stopNames.join('+to:');
      return `https://www.google.com/maps?saddr=${start}&daddr=${waypoints}+to:${end}&dirflg=d&output=embed`;
    }

    return `https://www.google.com/maps?saddr=${start}&daddr=${end}&dirflg=d&output=embed`;
  };

  const getGoogleMapDirectLink = () => {
    const start = encodeURIComponent(startLocation.trim() || 'Karur');
    const end = encodeURIComponent(endLocation.trim() || 'Chennai');

    if (tripSolved && tripSummary && tripSummary.recommendedStops && tripSummary.recommendedStops.length > 0) {
      const stopNames = tripSummary.recommendedStops.map((s: RecommendedStop) => {
        return encodeURIComponent(cleanWaypointName(s.name) + ', Tamil Nadu');
      });
      const waypoints = stopNames.join('/');
      return `https://www.google.com/maps/dir/${start}/${waypoints}/${end}?travelmode=driving`;
    }

    return `https://www.google.com/maps/dir/?api=1&origin=${start}&destination=${end}&travelmode=driving`;
  };

  return (
    <Layout 
      activeTab="AI Route Planner" 
      headerAction={
        <button 
          onClick={() => setHistoryOpen(!historyOpen)}
          className="glass-button secondary"
          style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #e2e8f0', borderRadius: '10px' }}
        >
          <Clock style={{ width: '16px', color: '#00aa55' }} />
          <span style={{ color: '#475569', fontSize: '0.85rem', fontWeight: 600 }}>Trip History ({tripHistory.length})</span>
        </button>
      }
    >
      <Head>
        <title>Power2Go - AI Route Planner</title>
      </Head>

      {/* Page Title & Back Button */}
      <div style={{ padding: '0 32px 24px 32px', display: 'flex', alignItems: 'center', gap: '16px', marginTop: '10px' }}>
        <button 
          onClick={() => router.push('/dashboard')}
          style={{
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}
        >
          <ArrowLeft style={{ width: '18px', color: '#64748b' }} />
        </button>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            🤖 AI Route Planner
          </h2>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Plan your EV journey with AI-powered route recommendations</span>
        </div>
      </div>

      {/* Main Layout Area */}
      <main className="container" style={{ flex: 1, display: 'grid', gridTemplateColumns: '400px 1fr', gap: '32px', padding: '0 32px 32px 32px' }}>
        
        {/* Left Control Sidebar */}
        <section className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', height: 'fit-content', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Compass style={{ color: 'var(--accent-blue)', width: '20px' }} />
              Trip Configuration
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }}>
              AI analyzes vehicle capacity, conditions, and charging stops.
            </p>
          </div>

          {/* Locations Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Starting Point</label>
              <div style={{ position: 'relative' }}>
                <MapPin style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-blue)', width: '16px' }} />
                <input 
                  type="text" 
                  value={startLocation}
                  onChange={(e) => setStartLocation(e.target.value)}
                  className="glass-input" 
                  style={{ paddingLeft: '36px', fontSize: '0.85rem' }} 
                  placeholder="e.g. Karur"
                />
              </div>
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Destination</label>
              <div style={{ position: 'relative' }}>
                <MapPin style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-red)', width: '16px' }} />
                <input 
                  type="text" 
                  value={endLocation}
                  onChange={(e) => setEndLocation(e.target.value)}
                  className="glass-input" 
                  style={{ paddingLeft: '36px', fontSize: '0.85rem' }} 
                  placeholder="e.g. Chennai"
                />
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-glass)' }} />

          {/* Vehicle Configs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Vehicle Class</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {['motorcycle', 'car', 'heavy'].map((type) => (
                  <button 
                    key={type}
                    type="button"
                    onClick={() => setVehicleType(type as any)}
                    className="glass-input"
                    style={{
                      padding: '8px',
                      textTransform: 'capitalize',
                      borderColor: vehicleType === type ? '#00aa55' : '#cbd5e1',
                      background: vehicleType === type ? '#eefdf4' : '#ffffff',
                      color: vehicleType === type ? '#00aa55' : '#475569',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Vehicle Model</label>
              <input 
                type="text" 
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                className="glass-input" 
                style={{ fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Capacity (kWh)</label>
                <input 
                  type="number" 
                  value={batteryCapacity}
                  onChange={(e) => setBatteryCapacity(parseFloat(e.target.value) || 0)}
                  className="glass-input" 
                  style={{ fontSize: '0.85rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Current Charge (%)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="range" 
                    min="5" 
                    max="100"
                    value={currentCharge}
                    onChange={(e) => setCurrentCharge(parseInt(e.target.value))}
                    style={{ flex: 1, accentColor: '#00aa55', height: '4px', background: '#cbd5e1', borderRadius: '2px', outline: 'none' }}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#00aa55', width: '32px', textAlign: 'right' }}>{currentCharge}%</span>
                </div>
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-glass)' }} />

          {/* Eco Advisory settings */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Leaf style={{ width: '14px', color: 'var(--accent-green)' }} />
              Eco-Drive Recommendations
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { state: ecoMode, setter: setEcoMode, label: 'Eco Driving Mode', desc: '+15% Range' },
                { state: reduceSpeed, setter: setReduceSpeed, label: 'Speed Limit 80km/h', desc: '+10% Range' },
                { state: acOff, setter: setAcOff, label: 'A/C Climate Off', desc: '+8% Range' }
              ].map((opt, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{opt.label}</div>
                    <div style={{ fontSize: '0.65rem', color: '#00aa55' }}>{opt.desc}</div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={opt.state}
                    onChange={(e) => opt.setter(e.target.checked)}
                    style={{ accentColor: '#00aa55', cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                </div>
              ))}
            </div>
          </div>

          <button 
            type="button" 
            onClick={handleAnalyseTrip}
            disabled={analyzing || !startLocation || !endLocation}
            className="glass-button"
            style={{ 
              marginTop: '10px',
              background: 'linear-gradient(135deg, var(--accent-blue) 0%, #0077aa 100%)',
              boxShadow: '0 4px 15px rgba(0, 210, 255, 0.25)',
              fontWeight: 700
            }}
          >
            {analyzing ? 'AI Analyzing Route...' : 'Analyse My Trip'}
          </button>
        </section>

        {/* Right Section - Map & Simulated Output */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: 'calc(100vh - 120px)' }}>
          
          {/* Map Area */}
          <div className="glass-panel" style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: '420px', borderRadius: '16px' }}>
            
            {/* Header Overlay Bar */}
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              right: '12px',
              zIndex: 10,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(12, 15, 29, 0.88)',
              backdropFilter: 'blur(12px)',
              padding: '10px 16px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#00ff87', boxShadow: '0 0 8px #00ff87' }}></span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                  Official Google Maps Live Navigation
                </span>
              </div>
              <a 
                href={activeDirectLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="glass-button"
                style={{
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                  background: 'linear-gradient(135deg, #0055aa 0%, #003388 100%)',
                  color: '#fff',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>Open in Google Maps App</span>
                <ExternalLink style={{ width: '12px', height: '12px' }} />
              </a>
            </div>

            {/* Route Map Render */}
            <div style={{
              width: '100%',
              height: '100%',
              background: '#0c0f1d',
              position: 'relative'
            }}>
              {isClient && (
                <iframe
                  key={activeMapUrl}
                  src={activeMapUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0, width: '100%', height: '100%', minHeight: '420px', background: '#0c0f1d' }}
                  allowFullScreen={true}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              )}

              {/* Loading AI spinner overlay */}
              {analyzing && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(8px)',
                  zIndex: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <RefreshCw className="spin-animation" style={{ width: '42px', height: '42px', color: '#00aa55', marginBottom: '15px' }} />
                  <h4 style={{ color: '#0f172a', fontWeight: 700, letterSpacing: '1px' }}>AI SOLVING TRIP ROUTE...</h4>
                  <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '6px' }}>
                    Calculating optimal charging stops along official Google Maps highway paths...
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Route Strategy Cards (Immediately below the Map) */}
          {tripSolved && availableRoutes.length > 0 && (
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#00aa55', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Navigation style={{ width: '16px', height: '16px', color: '#00aa55' }} />
                  Select Google Maps Route Strategy
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Click card to switch map route</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginTop: '4px' }}>
                {availableRoutes.map((route, idx) => {
                  const isSelected = selectedRouteIdx === idx;
                  const getBadgeColors = (title: string) => {
                    if (title.includes('Optimal')) return { bg: '#eefdf4', text: '#00aa55' };
                    if (title.includes('Shortest')) return { bg: '#eff6ff', text: '#3b82f6' };
                    return { bg: '#fffbeb', text: '#d97706' };
                  };
                  const colors = getBadgeColors(route.title);
                  return (
                    <div 
                      key={idx}
                      onClick={() => handleSelectRouteCard(idx)}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '12px',
                        background: isSelected ? '#eefdf4' : '#ffffff',
                        border: isSelected ? '2px solid #00aa55' : '1px solid #cbd5e1',
                        cursor: 'pointer',
                        transition: 'all 0.25s ease',
                        boxShadow: isSelected ? '0 4px 12px rgba(0, 170, 85, 0.08)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{route.title}</strong>
                        {route.badge && (
                          <span style={{ 
                            fontSize: '0.65rem', 
                            background: colors.bg, 
                            color: colors.text, 
                            padding: '2px 8px', 
                            borderRadius: '12px', 
                            fontWeight: 800 
                          }}>
                            {route.badge}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '1.15rem', fontWeight: 800, color: isSelected ? '#00aa55' : '#0f172a' }}>
                          {route.distanceKm} km
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          • {route.durationText}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0, lineHeight: '1.3' }}>
                        {route.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* Power2Go Recommendations & Warning Section (Below Route Strategy cards!) */}
          {tripSolved && (
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px' }}>
              
              {/* Warning / Advisory Message Banner (Light Amber Theme) */}
              {tripWarning && (
                <div style={{
                  background: '#fffbeb',
                  border: '1px solid #fcd34d',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <AlertTriangle style={{ color: '#d97706', width: '20px', height: '20px', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.85rem', color: '#b45309', fontWeight: 600, lineHeight: '1.4' }}>
                      {tripWarning}
                    </span>
                  </div>
                </div>
              )}

              {/* AI Battery Advisory Feedback Box (Light Blue/Green Theme) */}
              {tripSummary && tripSummary.aiAdvisoryMessage && (
                <div style={{
                  background: tripSummary.stopsCount > 0 ? '#eff6ff' : '#eefdf4',
                  border: tripSummary.stopsCount > 0 ? '1px solid #bfdbfe' : '1px solid #bbf7d0',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}>
                  <Zap style={{ color: tripSummary.stopsCount > 0 ? '#3b82f6' : '#00aa55', width: '22px', height: '22px', flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '0.88rem', color: '#0f172a', lineHeight: '1.5' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: tripSummary.stopsCount > 0 ? '#3b82f6' : '#00aa55', marginBottom: '4px' }}>
                      AI Battery & Range Advisory
                    </div>
                    {tripSummary.aiAdvisoryMessage}
                  </div>
                </div>
              )}

              {/* Power2Go Recommended Charging Stations Section */}
              {tripSummary && tripSummary.stops && tripSummary.stops.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Zap style={{ color: '#00aa55', width: '18px', height: '18px' }} />
                    Power2Go Recommended Charging Hubs ({tripSummary.stops.length})
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                    {tripSummary.stops.map((stop: RecommendedStop) => {
                      const cleanName = stop.name.replace('Power2Go (', '').replace(')', '');
                      const isSelected = selectedMarker?.id === stop.id;
                      return (
                        <div 
                          key={stop.id}
                          onClick={() => setSelectedMarker(stop)}
                          style={{
                            padding: '16px',
                            borderRadius: '12px',
                            background: isSelected ? '#eefdf4' : '#ffffff',
                            border: isSelected ? '2px solid #00aa55' : '1px solid #cbd5e1',
                            cursor: 'pointer',
                            transition: 'all 0.25s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '12px'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                              <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '10px', background: '#eefdf4', color: '#00aa55', fontWeight: 800 }}>
                                🟢 Power2Go Hub
                              </span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706' }}>
                                ₹{stop.chargeCost}
                              </span>
                            </div>

                            <h5 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: '4px 0 2px 0' }}>
                              {stop.name}
                            </h5>
                            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, lineHeight: '1.3' }}>
                              {stop.locationName}
                            </p>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '8px 0', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                            <div>
                              <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>Speed & Price</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6' }}>
                                {stop.chargerType} (₹{stop.price}/kWh)
                              </span>
                            </div>
                            <div>
                              <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>Available Slots</span>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#00aa55' }}>
                                {stop.fastSlots.available} Fast free
                              </span>
                            </div>
                          </div>

                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/power-station?station=${encodeURIComponent(cleanName)}`);
                            }}
                            className="glass-button"
                            style={{ 
                              width: '100%',
                              padding: '8px 12px', 
                              fontSize: '0.78rem', 
                              background: '#00aa55',
                              boxShadow: '0 2px 4px rgba(0, 170, 85, 0.15)',
                              color: '#ffffff',
                              fontWeight: 800,
                              borderRadius: '8px'
                            }}
                          >
                            Pre-Book Slot at {cleanName.replace('Power2Go – ', '')}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Results Summary Dashboard */}
          {tripSolved && tripSummary && (
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award style={{ color: 'var(--accent-green)', width: '18px' }} />
                  AI Journey Analysis Summary
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                <div style={{ borderRight: '1px solid var(--border-glass)', paddingRight: '15px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Total trip distance</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>{tripSummary.totalDistance} km</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block' }}>Map duration: {tripSummary.routeDuration}</span>
                </div>
                
                <div style={{ borderRight: '1px solid var(--border-glass)', paddingRight: '15px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Maximum vehicle range</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-blue)' }}>{tripSummary.vehicleRange} km</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block' }}>Avg efficiency: {tripSummary.avgEfficiency} km/kWh</span>
                </div>
                
                <div style={{ borderRight: '1px solid var(--border-glass)', paddingRight: '15px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Charging stop stops</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-green)' }}>{tripSummary.stopsCount} Stops</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block' }}>Total stop hold: {tripSummary.totalChargingDuration} mins</span>
                </div>
                
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Estimated trip cost</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-orange)' }}>₹{tripSummary.totalChargingCost}</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block' }}>Total energy: {tripSummary.energyConsumedKwh} kWh</span>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Trip History sliding drawer */}
      {historyOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '400px',
          height: '100vh',
          background: 'rgba(18, 20, 32, 0.95)',
          borderLeft: '1px solid var(--border-glass)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
          zIndex: 100,
          padding: '30px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock style={{ color: 'var(--accent-blue)', width: '18px' }} />
              Trip History Log
            </h3>
            <button 
              onClick={() => setHistoryOpen(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {tripHistory.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                No planned trips saved yet.
              </div>
            ) : (
              tripHistory.map((trip) => {
                const stops = JSON.parse(trip.stops_details || '[]');
                return (
                  <div key={trip.id} style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{trip.created_at ? new Date(trip.created_at).toLocaleDateString() : 'Recent'}</span>
                      <span style={{ color: 'var(--accent-orange)', fontWeight: 700 }}>₹{trip.total_cost}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', width: '100%' }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>Route</span>
                        <strong style={{ fontSize: '0.9rem', color: '#fff' }}>{trip.start_location} → {trip.end_location}</strong>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>Distance</span>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--accent-blue)' }}>{trip.total_distance} km</strong>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-glass)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Model: {trip.vehicle_model}</span>
                      <span>Stops: {trip.stops_count} ({stops.map((s: any) => s.name.split(' ')[0]).join(', ') || 'Direct'})</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <footer style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.8rem', borderTop: '1px solid var(--border-glass)' }}>
        © 2026 Power2Go Startup. All rights reserved. Servicing 24/7.
      </footer>
    </Layout>
  );
}
