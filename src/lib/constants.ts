import { Turf, User } from '../types';

export const DEMO_USERS: Record<string, User> = {
  customer: {
    id: 'usr_cust_01',
    name: 'Kabir Verma',
    email: 'customer@turf.test',
    role: 'customer',
    phone: '+91 98765 43210',
  },
  owner: {
    id: 'usr_owner_01',
    name: 'Rajesh Sharma',
    email: 'owner@turf.test',
    role: 'owner',
    phone: '+91 98111 22334',
  },
  admin: {
    id: 'usr_admin_01',
    name: 'Ananya Roy',
    email: 'admin@turf.test',
    role: 'admin',
    phone: '+91 99000 88776',
  },
};

export const INITIAL_TURFS: Turf[] = [
  {
    id: 'turf_marathahalli_fb',
    name: 'Parkview Pro Arena · 7v7 Arena',
    sport: 'football',
    city: 'Bengaluru',
    address: 'Outer Ring Rd, Marathahalli, Bengaluru, Karnataka 560037',
    surface: 'FIFA Quality Pro 50mm Monofilament Synthetic Turf with Eco-infill',
    pricePerHourPaise: 160000, // ₹1,600 / hr
    image: '/src/assets/images/turf_football_floodlights_1791734008362.jpg',
    rating: 4.9,
    reviewCount: 184,
    amenities: ['200 Lux LED Floodlights', 'Free Covered Parking', 'Shower & Locker Rooms', 'Chilled Drinking Water', 'Bibs & Match Balls'],
    dimensions: '55m × 35m (Ideal for 7v7 & 8v8)',
    lighting: 'Stadium grade flicker-free 200 Lux',
    ownerId: 'usr_owner_01',
    rules: ['Studs with rubber/plastic molded cleats only (no metal studs)', 'Arrive 10 minutes prior to your slot time', 'Cancellations follow 24h/2h tier policy'],
  },
  {
    id: 'turf_indiranagar_cricket',
    name: 'StrikeZone Indoor Box Cricket Arena',
    sport: 'cricket',
    city: 'Bengaluru',
    address: '100ft Road, Defence Colony, Indiranagar, Bengaluru 560038',
    surface: 'Heavy Duty 35mm High-Density Astro Pitch with Enclosed Perimeter Netting',
    pricePerHourPaise: 140000, // ₹1,400 / hr
    image: '/src/assets/images/turf_cricket_indoor_arena_1791734025266.jpg',
    rating: 4.8,
    reviewCount: 220,
    amenities: ['Overhead Netting (No Lost Balls)', 'Live LED Scoreboard', 'Full Cricket Kit Provided', 'Seating Dugouts', 'Air Cooled Lounges'],
    dimensions: '110ft × 45ft (Full box cricket specs)',
    lighting: 'Anti-glare industrial LED array',
    ownerId: 'usr_owner_01',
    rules: ['Rubber and tennis balls allowed only (no leather season balls)', 'Flat sole sports shoes compulsory', 'Maximum 16 players inside box at once'],
  },
  {
    id: 'turf_koramangala_badminton',
    name: 'SmashPoint International Badminton Club',
    sport: 'badminton',
    city: 'Bengaluru',
    address: '80ft Main Road, 4th Block, Koramangala, Bengaluru 560034',
    surface: 'BWF Certified Teak Hardwood subfloor with 4.5mm Yonex PVC Mats',
    pricePerHourPaise: 80000, // ₹800 / hr
    image: '/src/assets/images/turf_badminton_wooden_court_1791734043468.jpg',
    rating: 4.9,
    reviewCount: 312,
    amenities: ['BWF Court Dimensions', 'Non-Marking Shoe Rental', 'Stringing Machine Service', 'AC Pro Changing Rooms', 'Mineral Water Dispensers'],
    dimensions: '13.4m × 6.1m (Regulation Singles & Doubles)',
    lighting: 'BWF Grade-2 indirect diffuse LED',
    ownerId: 'usr_owner_01',
    rules: ['Strictly non-marking gum sole shoes only', 'Yonex Mavis 350 / Feather shuttles available at reception', 'Coaching requires prior permission'],
  },
  {
    id: 'turf_bandra_tennis',
    name: 'Apex Blue Grand Slam Tennis Court',
    sport: 'tennis',
    city: 'Mumbai',
    address: 'Pali Hill, Bandra West, Mumbai, Maharashtra 400050',
    surface: 'US Open 8-Coat Cushion Acrylic Hardcourt with Resilient Base',
    pricePerHourPaise: 180000, // ₹1,800 / hr
    image: '/src/assets/images/turf_tennis_hardcourt_blue_1791734063172.jpg',
    rating: 4.7,
    reviewCount: 145,
    amenities: ['Night Floodlighting', 'Ball Boy Facility on Request', 'Ball Machine Available', 'Clubhouse Cafe', 'Pro Umpire Chairs'],
    dimensions: '23.77m × 10.97m (Tournament Standard)',
    lighting: 'Precision pole-mounted 300 Lux LED',
    ownerId: 'usr_owner_01',
    rules: ['Tennis clay/hardcourt sneakers only', 'Proper sports attire required', 'Booking duration 60-120 minutes per match'],
  },
];

export const HOLD_DURATION_SECONDS = 10 * 60; // 10 minutes in seconds (600s)
export const MAX_ACTIVE_HOLDS_PER_USER = 3;

export const formatINR = (paise: number): string => {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
};

export const formatINRNumber = (paise: number): string => {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(rupees);
};
