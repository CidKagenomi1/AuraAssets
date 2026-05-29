/**
 * CarDatabase.js - Comprehensive Real-World Luxury Car Database
 * Categorized from Entry-Level Luxury to Ultra-Rare Limited Editions.
 * Prices are in USD ($)
 */

export const CAR_TIERS = {
    EXECUTIVE: { id: 'executive', name: 'Executive Luxury', prestige: 10 },
    FLAGSHIP: { id: 'flagship', name: 'Flagship Luxury', prestige: 25 },
    EXOTIC: { id: 'exotic', name: 'Exotic Supercar', prestige: 60 },
    LEGENDARY: { id: 'legendary', name: 'Legendary & Limited', prestige: 150 }
};

export const CAR_DATABASE = [
    // === TIER 1: EXECUTIVE LUXURY (ENTRY LEVEL) ===
    {
        id: 'bmw_3_series',
        brand: 'BMW',
        model: '330i M Sport',
        year: 2024,
        tier: CAR_TIERS.EXECUTIVE.id,
        price: 60000,
        prestige: 12,
        icon: '🚗',
        desc: 'The ultimate sports sedan. Agile, modern, and prestigious.'
    },
    {
        id: 'merc_c_class',
        brand: 'Mercedes-Benz',
        model: 'C300 AMG Line',
        year: 2024,
        tier: CAR_TIERS.EXECUTIVE.id,
        price: 65000,
        prestige: 13,
        icon: '🚘',
        desc: 'Baby S-Class. Elegant interior with cutting-edge technology.'
    },
    {
        id: 'audi_a4',
        brand: 'Audi',
        model: 'A4 2.0 TFSI Quattro',
        year: 2023,
        tier: CAR_TIERS.EXECUTIVE.id,
        price: 55000,
        prestige: 11,
        icon: '🏎️',
        desc: 'Sleek German engineering with legendary AWD system.'
    },
    {
        id: 'lexus_is',
        brand: 'Lexus',
        model: 'IS 300h F Sport',
        year: 2024,
        tier: CAR_TIERS.EXECUTIVE.id,
        price: 62000,
        prestige: 14,
        icon: '🚗',
        desc: 'Japanese reliability meets sharp, aggressive luxury styling.'
    },
    {
        id: 'tesla_model_3',
        brand: 'Tesla',
        model: 'Model 3 Performance',
        year: 2024,
        tier: CAR_TIERS.EXECUTIVE.id,
        price: 75000,
        prestige: 15,
        icon: '⚡',
        desc: 'Instant torque and futuristic autopilot technology.'
    },
    {
        id: 'volvo_s90',
        brand: 'Volvo',
        model: 'S90 Recharge Ultimate',
        year: 2024,
        tier: CAR_TIERS.EXECUTIVE.id,
        price: 65000,
        prestige: 12,
        icon: '🇸🇪',
        desc: 'Scandinavian luxury with a focus on safety and sustainable hybrid power.'
    },
    {
        id: 'jaguar_xf',
        brand: 'Jaguar',
        model: 'XF R-Dynamic SE',
        year: 2023,
        tier: CAR_TIERS.EXECUTIVE.id,
        price: 70000,
        prestige: 15,
        icon: '🐆',
        desc: 'British elegance with a sport-tuned chassis and striking design.'
    },
    {
        id: 'genesis_g80',
        brand: 'Genesis',
        model: 'G80 Electrified',
        year: 2024,
        tier: CAR_TIERS.EXECUTIVE.id,
        price: 80000,
        prestige: 16,
        icon: '🇰🇷',
        desc: 'Korean luxury that rivals the Germans. Silent and incredibly refined.'
    },
    {
        id: 'maserati_ghibli',
        brand: 'Maserati',
        model: 'Ghibli Modena',
        year: 2023,
        tier: CAR_TIERS.EXECUTIVE.id,
        price: 95000,
        prestige: 20,
        icon: '🔱',
        desc: 'Italian flair and a soulful exhaust note. The sports sedan with passion.'
    },

    // === TIER 2: FLAGSHIP LUXURY (HIGH END) ===
    {
        id: 'merc_s_class',
        brand: 'Mercedes-Benz',
        model: 'S450 4MATIC Luxury',
        year: 2024,
        tier: CAR_TIERS.FLAGSHIP.id,
        price: 130000,
        prestige: 35,
        icon: '👑',
        desc: 'The world standard for luxury sedans. Pure comfort and status.'
    },
    {
        id: 'bmw_7_series',
        brand: 'BMW',
        model: '735i M Sport',
        year: 2024,
        tier: CAR_TIERS.FLAGSHIP.id,
        price: 120000,
        prestige: 32,
        icon: '🏢',
        desc: 'Bold design with a massive theatre screen in the back.'
    },
    {
        id: 'lexus_ls',
        brand: 'Lexus',
        model: 'LS 500 Executive',
        year: 2024,
        tier: CAR_TIERS.FLAGSHIP.id,
        price: 140000,
        prestige: 38,
        icon: '🏮',
        desc: 'Omotenashi hospitality in a car. Exquisite craftsmanship.'
    },
    {
        id: 'porsche_panamera',
        brand: 'Porsche',
        model: 'Panamera 4S E-Hybrid',
        year: 2024,
        tier: CAR_TIERS.FLAGSHIP.id,
        price: 160000,
        prestige: 40,
        icon: '🐎',
        desc: 'The sports car of luxury sedans. Performance for four.'
    },
    {
        id: 'range_rover',
        brand: 'Land Rover',
        model: 'Range Rover Autobiography',
        year: 2024,
        tier: CAR_TIERS.FLAGSHIP.id,
        price: 220000,
        prestige: 45,
        icon: '🏔️',
        desc: 'Peerless luxury on and off-road. The SUV of kings.'
    },
    {
        id: 'audi_r8',
        brand: 'Audi',
        model: 'R8 V10 Performance',
        year: 2023,
        tier: CAR_TIERS.FLAGSHIP.id,
        price: 250000,
        prestige: 50,
        icon: '🏁',
        desc: 'The everyday supercar with a screaming V10 engine.'
    },
    {
        id: 'merc_maybach_s680',
        brand: 'Mercedes-Maybach',
        model: 'S680 V12 Edition',
        year: 2024,
        tier: CAR_TIERS.FLAGSHIP.id,
        price: 280000,
        prestige: 60,
        icon: '🥂',
        desc: 'Beyond S-Class. The ultimate rear-seat experience with a V12 heart.'
    },
    {
        id: 'lamborghini_urus',
        brand: 'Lamborghini',
        model: 'Urus Performante',
        year: 2024,
        tier: CAR_TIERS.FLAGSHIP.id,
        price: 260000,
        prestige: 55,
        icon: '🐂',
        desc: 'Supercar soul in an SUV body. The ultimate status symbol for the family.'
    },
    {
        id: 'rolls_royce_cullinan',
        brand: 'Rolls-Royce',
        model: 'Cullinan Black Badge',
        year: 2024,
        tier: CAR_TIERS.FLAGSHIP.id,
        price: 480000,
        prestige: 95,
        icon: '⛰️',
        desc: 'Effortless everywhere. The most luxurious SUV ever conceived.'
    },
    {
        id: 'ferrari_purosangue',
        brand: 'Ferrari',
        model: 'Purosangue V12',
        year: 2024,
        tier: CAR_TIERS.FLAGSHIP.id,
        price: 520000,
        prestige: 100,
        icon: '🏎️',
        desc: 'Ferrari’s first four-door, four-seater. A purebred V12 naturally aspirated monster.'
    },
    {
        id: 'bmw_m8',
        brand: 'BMW',
        model: 'M8 Competition Gran Coupe',
        year: 2024,
        tier: CAR_TIERS.FLAGSHIP.id,
        price: 180000,
        prestige: 42,
        icon: 'Ⓜ️',
        desc: 'The peak of BMW performance. Luxury, speed, and precision.'
    },

    // === TIER 3: EXOTIC SUPERCARS ===
    {
        id: 'porsche_911_gt3',
        brand: 'Porsche',
        model: '911 GT3 (992)',
        year: 2024,
        tier: CAR_TIERS.EXOTIC.id,
        price: 280000,
        prestige: 65,
        icon: '🏎️',
        desc: 'A precision instrument for the track and the road.'
    },
    {
        id: 'lamborghini_huracan',
        brand: 'Lamborghini',
        model: 'Huracan Tecnica',
        year: 2023,
        tier: CAR_TIERS.EXOTIC.id,
        price: 320000,
        prestige: 75,
        icon: '🐂',
        desc: 'Italian drama and V10 symphony. Head-turner guaranteed.'
    },
    {
        id: 'ferrari_296_gtb',
        brand: 'Ferrari',
        model: '296 GTB Assetto Fiorano',
        year: 2024,
        tier: CAR_TIERS.EXOTIC.id,
        price: 380000,
        prestige: 85,
        icon: '🐎',
        desc: 'Hybrid V6 power. The definition of Italian driving passion.'
    },
    {
        id: 'mclaren_750s',
        brand: 'McLaren',
        model: '750S Spider',
        year: 2024,
        tier: CAR_TIERS.EXOTIC.id,
        price: 360000,
        prestige: 80,
        icon: '🧡',
        desc: 'Lightweight, brutal acceleration, and alien-like aerodynamics.'
    },
    {
        id: 'aston_martin_dbs',
        brand: 'Aston Martin',
        model: 'DBS 770 Ultimate',
        year: 2023,
        tier: CAR_TIERS.EXOTIC.id,
        price: 400000,
        prestige: 90,
        icon: '🤵',
        desc: 'Gentleman’s brute. A V12 powerhouse with Bond-level class.'
    },
    {
        id: 'bentley_continental',
        brand: 'Bentley',
        model: 'Continental GT Mulliner',
        year: 2024,
        tier: CAR_TIERS.EXOTIC.id,
        price: 350000,
        prestige: 70,
        icon: '💎',
        desc: 'The finest grand tourer. Luxury without compromise.'
    },
    {
        id: 'lamborghini_aventador_svj',
        brand: 'Lamborghini',
        model: 'Aventador SVJ',
        year: 2021,
        tier: CAR_TIERS.EXOTIC.id,
        price: 600000,
        prestige: 120,
        icon: '🔥',
        desc: 'The wildest V12 Bull. Active aerodynamics and record-breaking track times.'
    },
    {
        id: 'ferrari_812_comp',
        brand: 'Ferrari',
        model: '812 Competizione',
        year: 2023,
        tier: CAR_TIERS.EXOTIC.id,
        price: 680000,
        prestige: 130,
        icon: '🇮🇹',
        desc: 'The ultimate expression of the front-engine V12 Ferrari. Pure speed.'
    },
    {
        id: 'porsche_911_turbo_s',
        brand: 'Porsche',
        model: '911 Turbo S (992)',
        year: 2024,
        tier: CAR_TIERS.EXOTIC.id,
        price: 240000,
        prestige: 58,
        icon: '🐌',
        desc: 'The benchmark for all-weather performance. Faster than almost anything.'
    },
    {
        id: 'mclaren_artura',
        brand: 'McLaren',
        model: 'Artura Performance',
        year: 2024,
        tier: CAR_TIERS.EXOTIC.id,
        price: 260000,
        prestige: 52,
        icon: '🔌',
        desc: 'The future of McLaren. Hybrid tech meets carbon-fiber mastery.'
    },
    {
        id: 'ford_gt',
        brand: 'Ford',
        model: 'GT Heritage Edition',
        year: 2022,
        tier: CAR_TIERS.EXOTIC.id,
        price: 500000,
        prestige: 90,
        icon: '🇺🇸',
        desc: 'A Le Mans winner for the road. Extremely rare and aerodynamic.'
    },

    // === TIER 4: LEGENDARY & LIMITED (ULTRA LUXURY / HYPERCARS) ===
    {
        id: 'rolls_royce_phantom',
        brand: 'Rolls-Royce',
        model: 'Phantom Series II',
        year: 2024,
        tier: CAR_TIERS.LEGENDARY.id,
        price: 550000,
        prestige: 150,
        icon: '🏰',
        desc: 'The pinnacle of luxury. If you have to ask the price, you can’t afford it.'
    },
    {
        id: 'lamborghini_revuelto',
        brand: 'Lamborghini',
        model: 'Revuelto (V12 Hybrid)',
        year: 2024,
        tier: CAR_TIERS.LEGENDARY.id,
        price: 650000,
        prestige: 160,
        icon: '⚡',
        desc: 'The new era of the V12 bull. 1001 Horsepower.'
    },
    {
        id: 'ferrari_sf90',
        brand: 'Ferrari',
        model: 'SF90 XX Stradale',
        year: 2024,
        tier: CAR_TIERS.LEGENDARY.id,
        price: 750000,
        prestige: 180,
        icon: '🔴',
        desc: 'Street-legal race car. Limited production of 799 units.'
    },
    {
        id: 'bugatti_chiron',
        brand: 'Bugatti',
        model: 'Chiron Super Sport',
        year: 2022,
        tier: CAR_TIERS.LEGENDARY.id,
        price: 3800000,
        prestige: 300,
        icon: '🌌',
        desc: 'A masterpiece of engineering. 300+ mph capability.'
    },
    {
        id: 'koenigsegg_jesko',
        brand: 'Koenigsegg',
        model: 'Jesko Absolut',
        year: 2024,
        tier: CAR_TIERS.LEGENDARY.id,
        price: 3500000,
        prestige: 280,
        icon: '👻',
        desc: 'The fastest car the world has ever seen. Pure mechanical art.'
    },
    {
        id: 'pagani_utopia',
        brand: 'Pagani',
        model: 'Utopia',
        year: 2024,
        tier: CAR_TIERS.LEGENDARY.id,
        price: 3000000,
        prestige: 250,
        icon: '🎭',
        desc: 'An analog heart in a digital world. Sculpted carbon fiber.'
    },
    {
        id: 'merc_project_one',
        brand: 'Mercedes-AMG',
        model: 'ONE',
        year: 2023,
        tier: CAR_TIERS.LEGENDARY.id,
        price: 2800000,
        prestige: 270,
        icon: '🌟',
        desc: 'F1 engine for the road. The most complex car ever built.'
    },
    {
        id: 'bugatti_mistral',
        brand: 'Bugatti',
        model: 'W16 Mistral',
        year: 2024,
        tier: CAR_TIERS.LEGENDARY.id,
        price: 5000000,
        prestige: 350,
        icon: '💨',
        desc: 'The final farewell to the W16 engine. The ultimate roadster.'
    },
    {
        id: 'koenigsegg_gemera',
        brand: 'Koenigsegg',
        model: 'Gemera (HV8)',
        year: 2024,
        tier: CAR_TIERS.LEGENDARY.id,
        price: 1900000,
        prestige: 240,
        icon: '👨‍👩‍👧‍👦',
        desc: 'The world’s first Mega-GT. Seats four adults and does 0-100 in 1.9s.'
    },
    {
        id: 'rimac_nevera',
        brand: 'Rimac',
        model: 'Nevera',
        year: 2023,
        tier: CAR_TIERS.LEGENDARY.id,
        price: 2200000,
        prestige: 260,
        icon: '⚡',
        desc: 'The electric hypercar that redefines physics. Instant madness.'
    },
    {
        id: 'aston_valkyrie',
        brand: 'Aston Martin',
        model: 'Valkyrie',
        year: 2023,
        tier: CAR_TIERS.LEGENDARY.id,
        price: 3500000,
        prestige: 400,
        icon: '🛸',
        desc: 'Designed by Adrian Newey. Essentially an F1 car with a license plate.'
    },
    {
        id: 'pagani_huayra_bc',
        brand: 'Pagani',
        model: 'Huayra Roadster BC',
        year: 2022,
        tier: CAR_TIERS.LEGENDARY.id,
        price: 2800000,
        prestige: 220,
        icon: '🍃',
        desc: 'Carbon-titanium monocoque and a twin-turbo V12. Art on wheels.'
    },

    // === RARE CLASSICS & COLLECTORS ===
    {
        id: 'ferrari_250_gto',
        brand: 'Ferrari',
        model: '250 GTO',
        year: 1962,
        tier: CAR_TIERS.LEGENDARY.id,
        price: 75000000, // $75 Million USD (Accurate market value)
        prestige: 1000,
        icon: '🍷',
        desc: 'The Holy Grail of car collecting. Only 36 ever made.'
    },
    {
        id: 'mclaren_f1',
        brand: 'McLaren',
        model: 'F1 LM',
        year: 1995,
        tier: CAR_TIERS.LEGENDARY.id,
        price: 20000000, // $20 Million USD
        prestige: 500,
        icon: '🏎️',
        desc: 'The greatest supercar ever made. Gold-lined engine bay.'
    },
    {
        id: 'merc_300sl',
        brand: 'Mercedes-Benz',
        model: '300 SL Gullwing',
        year: 1954,
        tier: CAR_TIERS.LEGENDARY.id,
        price: 1800000, // $1.8 Million USD
        prestige: 200,
        icon: '🕊️',
        desc: 'Iconic gullwing doors. The first true supercar.'
    },
    {
        id: 'lamborghini_miura',
        brand: 'Lamborghini',
        model: 'Miura P400SV',
        year: 1971,
        tier: CAR_TIERS.LEGENDARY.id,
        price: 2500000, // $2.5 Million USD
        prestige: 220,
        icon: '🐂',
        desc: 'The car that started the supercar trend. Pure Italian soul.'
    }
];

/**
 * Get cars by tier
 */
export function getCarsByTier(tierId) {
    return CAR_DATABASE.filter(car => car.tier === tierId);
}

/**
 * Get car by ID
 */
export function getCarById(id) {
    return CAR_DATABASE.find(car => car.id === id);
}

/**
 * Get all brands available
 */
export function getAllBrands() {
    return [...new Set(CAR_DATABASE.map(car => car.brand))].sort();
}

export default CAR_DATABASE;
