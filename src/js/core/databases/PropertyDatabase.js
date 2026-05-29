/**
 * PropertyDatabase.js - Real-world global real estate database
 * Categories: Retail, Residential, Commercial, Luxury, Iconic, Legendary
 */

export const PROPERTY_TIERS = {
    RETAIL: { id: 'retail', label: 'Retail & Kiosk', color: '#94a3b8' },
    RESIDENTIAL: { id: 'residential', label: 'Residential', color: '#60a5fa' },
    COMMERCIAL: { id: 'commercial', label: 'Commercial Office', color: '#818cf8' },
    LUXURY: { id: 'luxury', label: 'Luxury Estate', color: '#a855f7' },
    ICONIC: { id: 'iconic', label: 'Iconic Landmark', color: '#f59e0b' },
    LEGENDARY: { id: 'legendary', label: 'World Wonder', color: '#ef4444' }
};

export const PROPERTY_DATABASE = [
    // --- RETAIL & KIOSK ---
    {
        id: 'kiosk_pasar',
        name: 'Kios Pasar Tradisional',
        location: 'Jakarta, Indonesia',
        tier: PROPERTY_TIERS.RETAIL.id,
        price: 10_000,
        monthlyRent: 165,
        prestige: 5,
        icon: '🏪',
        desc: 'Small retail space in a busy traditional market. High traffic, low margin.'
    },
    {
        id: 'ruko_pinggir_jalan',
        name: 'Ruko 2 Lantai',
        location: 'Tangerang, Indonesia',
        tier: PROPERTY_TIERS.RETAIL.id,
        price: 166_000,
        monthlyRent: 1_000,
        prestige: 15,
        icon: '🏢',
        desc: 'Strategic shophouse for retail or small office usage.'
    },
    {
        id: 'boutique_space_shibuya',
        name: 'Boutique Space Shibuya',
        location: 'Tokyo, Japan',
        tier: PROPERTY_TIERS.RETAIL.id,
        price: 1_000_000,
        monthlyRent: 8_000,
        prestige: 45,
        icon: '🏬',
        desc: 'Premium retail spot in the heart of Shibuya Crossing district.'
    },

    // --- RESIDENTIAL ---
    {
        id: 'apartment_studio_kemang',
        name: 'Studio Kemang Village',
        location: 'Jakarta, Indonesia',
        tier: PROPERTY_TIERS.RESIDENTIAL.id,
        price: 120_000,
        monthlyRent: 800,
        prestige: 12,
        icon: '🏢',
        desc: 'Trendy studio apartment in a high-demand expat area.'
    },
    {
        id: 'penthouse_singapore',
        name: 'Marina Bay Penthouse',
        location: 'Singapore',
        tier: PROPERTY_TIERS.RESIDENTIAL.id,
        price: 5_666_000,
        monthlyRent: 30_000,
        prestige: 150,
        icon: '💎',
        desc: 'Ultra-luxury penthouse with a 360-degree view of the Singapore skyline.'
    },
    {
        id: 'manhattan_loft',
        name: 'Tribeca Industrial Loft',
        location: 'New York, USA',
        tier: PROPERTY_TIERS.RESIDENTIAL.id,
        price: 8_000_000,
        monthlyRent: 56_000,
        prestige: 180,
        icon: '🗽',
        desc: 'Spacious loft in NYC’s most prestigious residential neighborhood.'
    },

    // --- COMMERCIAL ---
    {
        id: 'coworking_space_bali',
        name: 'Canggu Hub Coworking',
        location: 'Bali, Indonesia',
        tier: PROPERTY_TIERS.COMMERCIAL.id,
        price: 533_000,
        monthlyRent: 4_333,
        prestige: 30,
        icon: '💻',
        desc: 'Digital nomad hub with high occupancy and community value.'
    },
    {
        id: 'office_floor_sudirman',
        name: 'Sudirman Office Floor',
        location: 'Jakarta, Indonesia',
        tier: PROPERTY_TIERS.COMMERCIAL.id,
        price: 3_000_000,
        monthlyRent: 23_333,
        prestige: 80,
        icon: '🏢',
        desc: 'High-grade office space in Jakarta’s SCBD central business district.'
    },
    {
        id: 'tech_campus_dublin',
        name: 'Silicon Docks HQ',
        location: 'Dublin, Ireland',
        tier: PROPERTY_TIERS.COMMERCIAL.id,
        price: 23_333_000,
        monthlyRent: 186_666,
        prestige: 400,
        icon: '🏢',
        desc: 'Modern tech campus home to major multi-national Corporations.'
    },

    // --- LUXURY ---
    {
        id: 'villa_ubud',
        name: 'Royal Ubud Retreat',
        location: 'Bali, Indonesia',
        tier: PROPERTY_TIERS.LUXURY.id,
        price: 1_666_000,
        monthlyRent: 12_000,
        prestige: 120,
        icon: '🎋',
        desc: 'Exclusive private villa overlooking lush jungle ravines.'
    },
    {
        id: 'chateau_france',
        name: 'Château du Loire',
        location: 'Loire Valley, France',
        tier: PROPERTY_TIERS.LUXURY.id,
        price: 30_000_000,
        monthlyRent: 233_333,
        prestige: 850,
        icon: '🏰',
        desc: 'Historic French estate with vast vineyards and royal architecture.'
    },
    {
        id: 'private_island_bahamas',
        name: 'Little Pipe Cay',
        location: 'Exumas, Bahamas',
        tier: PROPERTY_TIERS.LUXURY.id,
        price: 80_000_000,
        monthlyRent: 533_333,
        prestige: 1500,
        icon: '🏝️',
        desc: 'A complete private island with 5 luxury villas and a deep-water dock.'
    },

    // --- ICONIC LANDMARKS ---
    {
        id: 'burj_khalifa_floor',
        name: 'Burj Khalifa Sky Floor',
        location: 'Dubai, UAE',
        tier: PROPERTY_TIERS.ICONIC.id,
        price: 166_666_000,
        monthlyRent: 1_000_000,
        prestige: 3500,
        icon: '🏙️',
        desc: 'The highest habitable floor in the world. Symbol of global ambition.'
    },
    {
        id: 'empire_state_building',
        name: 'Empire State Building',
        location: 'New York, USA',
        tier: PROPERTY_TIERS.ICONIC.id,
        price: 1_000_000_000,
        monthlyRent: 8_000_000,
        prestige: 8000,
        icon: '🗽',
        desc: 'The most famous skyscraper in human history. A New York icon.'
    },
    {
        id: 'eiffel_tower_lease',
        name: 'Eiffel Tower Commercial Lease',
        location: 'Paris, France',
        tier: PROPERTY_TIERS.ICONIC.id,
        price: 1_666_666_000,
        monthlyRent: 16_666_666,
        prestige: 12000,
        icon: '🗼',
        desc: 'Control the commercial rights to the Iron Lady of Paris.'
    },

    // --- LEGENDARY / WORLD WONDERS ---
    {
        id: 'apple_park',
        name: 'Apple Park (Infinite Loop)',
        location: 'Cupertino, USA',
        tier: PROPERTY_TIERS.LEGENDARY.id,
        price: 5_000_000_000,
        monthlyRent: 40_000_000,
        prestige: 25000,
        icon: '🍎',
        desc: 'The spaceship campus. A masterpiece of engineering and corporate power.'
    },
    {
        id: 'antilia_mumbai',
        name: 'Antilia Residence',
        location: 'Mumbai, India',
        tier: PROPERTY_TIERS.LEGENDARY.id,
        price: 2_000_000_000,
        monthlyRent: 3_333_333,
        prestige: 15000,
        icon: '🏢',
        desc: 'The world’s most expensive private residence. 27 floors for one family.'
    },
    {
        id: 'neom_the_line_section',
        name: 'NEOM "The Line" Sector',
        location: 'Saudi Arabia',
        tier: PROPERTY_TIERS.LEGENDARY.id,
        price: 10_000_000_000,
        monthlyRent: 80_000_000,
        prestige: 50000,
        icon: '🛤️',
        desc: 'A slice of the future. The first linear city in the middle of the desert.'
    },
    {
        id: 'buckingham_palace',
        name: 'Buckingham Palace (Sovereign Rights)',
        location: 'London, UK',
        tier: PROPERTY_TIERS.LEGENDARY.id,
        price: 16_666_666_000,
        monthlyRent: 0, // No rent, pure prestige
        prestige: 100000,
        icon: '👑',
        desc: 'The ultimate trophy. The home of the British Monarchy. Priceless.'
    }
];

export default PROPERTY_DATABASE;
