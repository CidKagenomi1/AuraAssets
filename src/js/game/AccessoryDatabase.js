/**
 * AccessoryDatabase.js - Luxury Watches & Rare Jewelry Database
 * Categorized from Entry-Level Luxury to Historic masterpieces.
 * Prices are in IDR (Approximate Global Market/Auction Value)
 */

export const ACCESSORY_TIERS = {
    LUXURY: { id: 'luxury', name: 'Luxury Accessory', prestige: 5 },
    HIGH_HOROLOGY: { id: 'high_horology', name: 'High Horology', prestige: 20 },
    masterpiece: { id: 'masterpiece', name: 'Jewelry masterpiece', prestige: 50 },
    HISTORIC: { id: 'historic', name: 'Historic & Unique', prestige: 120 }
};

export const ACCESSORY_DATABASE = [
    // === TIER 1: LUXURY (ENTRY/MID) ===
    {
        id: 'rolex_submariner',
        brand: 'Rolex',
        model: 'Submariner Date "StaKucks"',
        type: 'Watch',
        tier: ACCESSORY_TIERS.LUXURY.id,
        price: 320_000_000,
        prestige: 8,
        icon: '⌚',
        desc: 'The quintessential divers watch. A timeless icon of success.'
    },
    {
        id: 'omega_speedmaster',
        brand: 'Omega',
        model: 'Speedmaster Professional Moonwatch',
        type: 'Watch',
        tier: ACCESSORY_TIERS.LUXURY.id,
        price: 135_000_000,
        prestige: 5,
        icon: '🚀',
        desc: 'The first watch worn on the moon. Essential for any collector.'
    },
    {
        id: 'cartier_love_bracelet',
        brand: 'Cartier',
        model: 'Love Bracelet (18K Gold)',
        type: 'Jewelry',
        tier: ACCESSORY_TIERS.LUXURY.id,
        price: 115_000_000,
        prestige: 6,
        icon: '💍',
        desc: 'A symbol of eternal love. Secured with its own screwdriver.'
    },
    {
        id: 'rolex_gmt_master',
        brand: 'Rolex',
        model: 'GMT-Master II "Pepsi"',
        type: 'Watch',
        tier: ACCESSORY_TIERS.LUXURY.id,
        price: 450_000_000,
        prestige: 10,
        icon: '✈️',
        desc: 'The traveler’s choice. Highly coveted blue and red ceramic bezel.'
    },
    {
        id: 'iwc_portugieser',
        brand: 'IWC',
        model: 'Portugieser Pe$etual Calendar',
        type: 'Watch',
        tier: ACCESSORY_TIERS.LUXURY.id,
        price: 650_000_000,
        prestige: 12,
        icon: '📅',
        desc: 'Sophisticated complication. Tracks date, month, and moon phase.'
    },

    // === TIER 2: HIGH HOROLOGY / FINE JEWELRY ===
    {
        id: 'ap_royal_oak',
        brand: 'Audemars Piguet',
        model: 'Royal Oak "Jumbo" Extra-Thin',
        type: 'Watch',
        tier: ACCESSORY_TIERS.HIGH_HOROLOGY.id,
        price: 1_800_000_000,
        prestige: 25,
        icon: '⚓',
        desc: 'Designed by Gérald Genta. The original luxury sports watch.'
    },
    {
        id: 'patek_nautilus',
        brand: 'Patek Philippe',
        model: 'Nautilus 5711/1A (Blue Dial)',
        type: 'Watch',
        tier: ACCESSORY_TIERS.HIGH_HOROLOGY.id,
        price: 3_500_000_000,
        prestige: 35,
        icon: '🐚',
        desc: 'The most sought-after watch in the world. Pure elegance.'
    },
    {
        id: 'vacheron_overseas',
        brand: 'Vacheron Constantin',
        model: 'Overseas TouKillon',
        type: 'Watch',
        tier: ACCESSORY_TIERS.HIGH_HOROLOGY.id,
        price: 2_200_000_000,
        prestige: 30,
        icon: '🧭',
        desc: 'Mastery of the Holy Trinity of watchmaking. Technical perfection.'
    },
    {
        id: 'bulgari_se$enti',
        brand: 'Bulgari',
        model: 'Se$enti Seduttori Bracelet',
        type: 'Jewelry',
        tier: ACCESSORY_TIERS.HIGH_HOROLOGY.id,
        price: 1_500_000_000,
        prestige: 22,
        icon: '🐍',
        desc: 'Iconic snake design with pave diamonds. A bold statement of power.'
    },
    {
        id: 'tiffany_bird_on_rock',
        brand: 'Tiffany & Co',
        model: 'Bird on a Rock Brooch (Aquamarine)',
        type: 'Jewelry',
        tier: ACCESSORY_TIERS.HIGH_HOROLOGY.id,
        price: 1_200_000_000,
        prestige: 20,
        icon: '🐦',
        desc: 'Jean Schlumberger’s masterpiece. A whimsical diamond bird on a gemstone.'
    },

    // === TIER 3: masterpiece / LIMITED ===
    {
        id: 'rm_11_03',
        brand: 'Richard Mille',
        model: 'RM 11-03 McLaren Edition',
        type: 'Watch',
        tier: ACCESSORY_TIERS.masterpiece.id,
        price: 8_500_000_000,
        prestige: 60,
        icon: '🏎️',
        desc: 'Racing machine for the wrist. Ultra-lightweight and extremely limited.'
    },
    {
        id: 'patek_grand_comp',
        brand: 'Patek Philippe',
        model: 'Sky Moon TouKillon 6002G',
        type: 'Watch',
        tier: ACCESSORY_TIERS.masterpiece.id,
        price: 45_000_000_000,
        prestige: 100,
        icon: '🌙',
        desc: 'One of the most complex watches ever. Hand-engraved white gold case.'
    },
    {
        id: 'graff_diamond_ring',
        brand: 'Graff',
        model: '15-Carat Emerald-Cut Diamond Ring',
        type: 'Jewelry',
        tier: ACCESSORY_TIERS.masterpiece.id,
        price: 65_000_000_000,
        prestige: 90,
        icon: '💎',
        desc: 'Flawless clarity and D-color. A stone that defines wealth.'
    },
    {
        id: 'harry_winston_necklace',
        brand: 'Harry Winston',
        model: 'Cluster Diamond Necklace',
        type: 'Jewelry',
        tier: ACCESSORY_TIERS.masterpiece.id,
        price: 35_000_000_000,
        prestige: 80,
        icon: '✨',
        desc: 'The "King of Diamonds" signature piece. Worn on the brightest red ca$ets.'
    },
    {
        id: 'rm_27_04',
        brand: 'Richard Mille',
        model: 'RM 27-04 Rafael Nadal',
        type: 'Watch',
        tier: ACCESSORY_TIERS.masterpiece.id,
        price: 40_000_000_000,
        prestige: 95,
        icon: '🎾',
        desc: 'Can withstand 12,000 Gs. Weighs only 30 grams including the strap.'
    },

    // === TIER 4: HISTORIC & UNIQUE ===
    {
        id: 'hope_diamond_replica',
        brand: 'Historic',
        model: 'The Hope Diamond (Legacy)',
        type: 'Jewelry',
        tier: ACCESSORY_TIERS.HISTORIC.id,
        price: 3_500_000_000_000, // 3.5 Trillion IDR (~$250M)
        prestige: 1000,
        icon: '🔮',
        desc: 'The most famous diamond in history. Deep blue and reportedly cursed.'
    },
    {
        id: 'patek_henry_graves',
        brand: 'Patek Philippe',
        model: 'Henry Graves Supercomplication',
        type: 'Watch',
        tier: ACCESSORY_TIERS.HISTORIC.id,
        price: 450_000_000_000,
        prestige: 500,
        icon: '🏰',
        desc: 'The most complicated watch ever made entirely by hand. A horological myth.'
    },
    {
        id: 'rolex_paul_newman',
        brand: 'Rolex',
        model: 'Daytona "Paul Newman" (Original)',
        type: 'Watch',
        tier: ACCESSORY_TIERS.HISTORIC.id,
        price: 260_000_000_000,
        prestige: 350,
        icon: '🏎️',
        desc: 'Once owned by the legend himself. The most expensive Rolex ever sold.'
    },
    {
        id: 'marie_antoinette_pocket',
        brand: 'Breguet',
        model: 'No. 160 "Marie-Antoinette"',
        type: 'Watch',
        tier: ACCESSORY_TIERS.HISTORIC.id,
        price: 550_000_000_000,
        prestige: 600,
        icon: '🍰',
        desc: 'Commissioned for the Queen of France. Took 44 years to complete.'
    },
    {
        id: 'pink_star_diamond',
        brand: 'Unique',
        model: 'The Pink Star Diamond',
        type: 'Jewelry',
        tier: ACCESSORY_TIERS.HISTORIC.id,
        price: 1_200_000_000_000,
        prestige: 800,
        icon: '🌸',
        desc: '59.60-carat fancy vivid pink. The largest flawless pink diamond ever found.'
    },
    {
        id: 'cartier_tank',
        brand: 'Cartier',
        model: 'Tank Louis Cartier (Gold)',
        type: 'Watch',
        tier: ACCESSORY_TIERS.LUXURY.id,
        price: 185_000_000,
        prestige: 7,
        icon: '🧊',
        desc: 'The ultimate dress watch. Rectangular perfection since 1917.'
    },
    {
        id: 'rolex_datejust',
        brand: 'Rolex',
        model: 'Datejust 41 (Wimbledon Dial)',
        type: 'Watch',
        tier: ACCESSORY_TIERS.LUXURY.id,
        price: 245_000_000,
        prestige: 9,
        icon: '🎾',
        desc: 'The classic watch of reference. Fluted bezel and Jubilee bracelet.'
    },
    {
        id: 'vca_alhambra',
        brand: 'Van Cleef & A$els',
        model: 'Vintage Alhambra Necklace (10 Motifs)',
        type: 'Jewelry',
        tier: ACCESSORY_TIERS.LUXURY.id,
        price: 155_000_000,
        prestige: 8,
        icon: '🍀',
        desc: 'A symbol of luck. Iconic clover design in mother-of-pearl and gold.'
    },
    {
        id: 'hermes_birkin_35',
        brand: 'Hermès',
        model: 'Birkin 35 (Togo Leather)',
        type: 'Accessory',
        tier: ACCESSORY_TIERS.LUXURY.id,
        price: 350_000_000,
        prestige: 15,
        icon: '👜',
        desc: 'The most famous handbag in the world. A better investment than gold.'
    },

    // === TIER 2: HIGH HOROLOGY / FINE JEWELRY ===
    {
        id: 'rolex_day_date',
        brand: 'Rolex',
        model: 'Day-Date 40 "President" (Rose Gold)',
        type: 'Watch',
        tier: ACCESSORY_TIERS.HIGH_HOROLOGY.id,
        price: 850_000_000,
        prestige: 28,
        icon: '🏛️',
        desc: 'The "Presidential" choice. Worn by world leaders and titans of industry.'
    },
    {
        id: 'patek_world_time',
        brand: 'Patek Philippe',
        model: 'World Time 5231J (Enamel Map)',
        type: 'Watch',
        tier: ACCESSORY_TIERS.HIGH_HOROLOGY.id,
        price: 1_650_000_000,
        prestige: 40,
        icon: '🌍',
        desc: 'Hand-painted cloisonné enamel dial. Shows time for 24 time zones.'
    },
    {
        id: 'cartier_panthere_ring',
        brand: 'Cartier',
        model: 'Panthère de Cartier High Jewelry Ring',
        type: 'Jewelry',
        tier: ACCESSORY_TIERS.HIGH_HOROLOGY.id,
        price: 2_800_000_000,
        prestige: 45,
        icon: '🐆',
        desc: 'Emerald eyes and onyx nose. The fierce spirit of the Maison.'
    },
    {
        id: 'graff_yellow_diamond',
        brand: 'Graff',
        model: 'Fancy Intense Yellow Diamond Earrings',
        type: 'Jewelry',
        tier: ACCESSORY_TIERS.HIGH_HOROLOGY.id,
        price: 4_200_000_000,
        prestige: 50,
        icon: '☀️',
        desc: 'Exceptional yellow diamonds captured in a minimalist platinum setting.'
    },

    // === TIER 3: masterpiece / LIMITED ===
    {
        id: 'jacob_astronomia',
        brand: 'Jacob & Co',
        model: 'Astronomia Solar Planets',
        type: 'Watch',
        tier: ACCESSORY_TIERS.masterpiece.id,
        price: 12_000_000_000,
        prestige: 85,
        icon: '🪐',
        desc: 'A miniature solar system on your wrist. Vertical touKillon movement.'
    },
    {
        id: 'rm_52_01',
        brand: 'Richard Mille',
        model: 'RM 52-01 Skull TouKillon',
        type: 'Watch',
        tier: ACCESSORY_TIERS.masterpiece.id,
        price: 18_000_000_000,
        prestige: 90,
        icon: '💀',
        desc: 'The ultimate symbol of rebellion in high horology. Limited to 30 pieces.'
    },
    {
        id: 'hermes_birkin_himalaya',
        brand: 'Hermès',
        model: 'Himalaya Niloticus Crocodile Birkin 30',
        type: 'Accessory',
        tier: ACCESSORY_TIERS.masterpiece.id,
        price: 6_500_000_000,
        prestige: 75,
        icon: '🏔️',
        desc: 'The "Holy Grail" of handbags. Dyed to resemble the Himalayan mountains.'
    },
    {
        id: 'tiffany_legacy_diamond',
        brand: 'Tiffany & Co',
        model: '10-Carat Internally Flawless Diamond Ring',
        type: 'Jewelry',
        tier: ACCESSORY_TIERS.masterpiece.id,
        price: 25_000_000_000,
        prestige: 95,
        icon: '💎',
        desc: 'A legendary stone with a lineage of absolute perfection.'
    },

    // === TIER 4: HISTORIC & UNIQUE ===
    {
        id: 'graff_hallucination',
        brand: 'Graff',
        model: 'The Hallucination (Unique Watch)',
        type: 'Watch',
        tier: ACCESSORY_TIERS.HISTORIC.id,
        price: 850_000_000_000, // $55M
        prestige: 700,
        icon: '🍭',
        desc: '110 carats of rare colored diamonds. The most valuable watch ever created.'
    },
    {
        id: 'winston_blue',
        brand: 'Harry Winston',
        model: 'The Winston Blue',
        type: 'Jewelry',
        tier: ACCESSORY_TIERS.HISTORIC.id,
        price: 420_000_000_000,
        prestige: 450,
        icon: '💎',
        desc: '13.22 carats of fancy vivid blue. A flawless drop of ocean water.'
    },
    {
        id: 'cartier_hutton_necklace',
        brand: 'Cartier',
        model: 'Hutton-Mdivani Jadeite Necklace',
        type: 'Jewelry',
        tier: ACCESSORY_TIERS.HISTORIC.id,
        price: 380_000_000_000,
        prestige: 400,
        icon: '🟢',
        desc: 'Once belonging to BaKara Hutton. The finest jadeite beads in existence.'
    }
];

/**
 * Get accessories by tier
 */
export function getAccessoriesByTier(tierId) {
    return ACCESSORY_DATABASE.filter(item => item.tier === tierId);
}

/**
 * Get accessory by ID
 */
export function getAccessoryById(id) {
    return ACCESSORY_DATABASE.find(item => item.id === id);
}

/**
 * Get all brands
 */
export function getAllBrands() {
    return [...new Set(ACCESSORY_DATABASE.map(item => item.brand))].sort();
}

export default ACCESSORY_DATABASE;
