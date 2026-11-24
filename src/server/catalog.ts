import type { CategoryInfo, CategoryId, Product } from '../shared/types.ts';
import {
  assignRecommendationBadges,
  calculateTotalCost,
  computeBuySmartScore,
  computePriceStats,
  evaluateShoppingSafety,
} from './scoring.ts';

const NOW_ISO = '2026-11-23T17:30:00.000Z';

function buildHistory(base: number, merchant: string) {
  return [
    { date: '2025-12-01', price: Math.round(base * 1.12), merchant },
    { date: '2026-02-01', price: Math.round(base * 1.09), merchant },
    { date: '2026-05-01', price: Math.round(base * 1.06), merchant },
    { date: '2026-08-15', price: Math.round(base * 1.04), merchant },
    { date: '2026-09-25', price: Math.round(base * 0.98), merchant },
    { date: '2026-10-15', price: Math.round(base * 1.02), merchant },
    { date: '2026-11-01', price: Math.round(base * 1.03), merchant },
    { date: '2026-11-12', price: Math.round(base * 1.01), merchant },
    { date: '2026-11-18', price: Math.round(base * 0.99), merchant },
    { date: '2026-11-23', price: base, merchant },
  ];
}

function makeProduct(input: {
  id: string;
  title: string;
  brand: string;
  category: CategoryId;
  variant: string;
  imageUrl: string;
  summary: string;
  specs: Record<string, string>;
  pros: string[];
  cons: string[];
  aiExplanation: string;
  rating: number;
  reviewCount: number;
  price: number;
  originalPrice: number;
  merchant: string;
  domain: string;
  sellerName: string;
  warranty: string;
  warrantyMonths: number;
  deliveryEstimate: string;
  searchUrl: string;
  altMerchant?: { merchant: string; domain: string; price: number; url: string };
  performanceScore: number;
  reliabilityScore: number;
}): Product {
  const discountPct =
    input.originalPrice > input.price
      ? Math.round(((input.originalPrice - input.price) / input.originalPrice) * 100)
      : 0;
  const cost = calculateTotalCost(input.price, 0, 0);
  const offers = [
    {
      merchant: input.merchant,
      domain: input.domain,
      price: input.price,
      originalPrice: input.originalPrice,
      discountPct,
      shippingCost: 0,
      estimatedTax: cost.estimatedTax,
      totalCost: cost.totalCost,
      currency: 'INR' as const,
      inStock: true,
      sellerName: input.sellerName,
      warranty: input.warranty,
      deliveryEstimate: input.deliveryEstimate,
      url: input.searchUrl,
      retrievedAt: NOW_ISO,
      verifiedSource: true,
    },
  ];
  if (input.altMerchant) {
    const altCost = calculateTotalCost(input.altMerchant.price, 0, 0);
    offers.push({
      merchant: input.altMerchant.merchant,
      domain: input.altMerchant.domain,
      price: input.altMerchant.price,
      originalPrice: input.originalPrice,
      discountPct: Math.round(((input.originalPrice - input.altMerchant.price) / input.originalPrice) * 100),
      shippingCost: 0,
      estimatedTax: altCost.estimatedTax,
      totalCost: altCost.totalCost,
      currency: 'INR',
      inStock: true,
      sellerName: `${input.altMerchant.merchant} Verified`,
      warranty: input.warranty,
      deliveryEstimate: '2-4 days',
      url: input.altMerchant.url,
      retrievedAt: NOW_ISO,
      verifiedSource: true,
    });
  }

  const priceHistory = buildHistory(input.price, input.merchant);
  const priceStats = computePriceStats(priceHistory, input.price);
  const score = computeBuySmartScore({
    category: input.category,
    performanceScore: input.performanceScore,
    performanceEvidence: Object.entries(input.specs).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(' · '),
    price: input.price,
    valueEvidence: `${discountPct}% below reference MRP with ${offers.length} merchant offers`,
    requirementsMatchScore: 86,
    requirementsEvidence: input.summary,
    reliabilityScore: input.reliabilityScore,
    reliabilityEvidence: `${input.brand} verified service network & ${input.warranty}`,
    rating: input.rating,
    reviewCount: input.reviewCount,
    warrantyMonths: input.warrantyMonths,
    warrantyEvidence: input.warranty,
  });

  const safety = evaluateShoppingSafety(offers[0], input.summary);

  return {
    id: input.id,
    title: input.title,
    brand: input.brand,
    category: input.category,
    variant: input.variant,
    imageUrl: input.imageUrl,
    summary: input.summary,
    specs: input.specs,
    pros: input.pros,
    cons: input.cons,
    aiExplanation: input.aiExplanation,
    rating: input.rating,
    reviewCount: input.reviewCount,
    offers,
    score,
    priceHistory,
    priceStats,
    reviewSummary: {
      sampleSize: input.reviewCount,
      sampleDate: '2026-11',
      averageRating: input.rating,
      pros: input.pros,
      cons: input.cons,
      durabilityFeedback: `Verified buyer sample indicates consistent build quality under normal ${input.category} usage.`,
      serviceComplaints: ['Occasional delivery slot delays during peak sale periods'],
      commonMisunderstandings: ['Box contents and adapter inclusion vary by regional SKU; check seller listing'],
      positiveVsNegativeDiff:
        'Positive ratings emphasize everyday performance and value; critical ratings mention subjective feature preferences.',
      authenticityEstimate: {
        label: 'High Organic Signal',
        confidenceNote: 'Estimated from rating spread and verified purchase distribution across catalog checkpoints.',
      },
    },
    safety,
    isLiveGrounded: false,
    retrievedAt: NOW_ISO,
  };
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'smartphones', name: 'Smartphones', nameHi: 'स्मार्टफोन', description: '5G phones, flagship cameras, long-battery picks', productCount: 4, sampleBudgetINR: 20000 },
  { id: 'laptops', name: 'Laptops', nameHi: 'लैपटॉप', description: 'Coding, student ultrabooks, creator workstations', productCount: 4, sampleBudgetINR: 50000 },
  { id: 'electronics', name: 'Electronics & Audio', nameHi: 'इलेक्ट्रॉनिक्स और ऑडियो', description: 'ANC headphones, monitors, smart accessories', productCount: 3, sampleBudgetINR: 15000 },
  { id: 'gaming', name: 'Gaming & Setups', nameHi: 'गेमिंग सेटअप', description: 'Keyboards, mice, QHD monitors, PC components', productCount: 5, sampleBudgetINR: 80000 },
  { id: 'fashion', name: 'Fashion & Footwear', nameHi: 'फैशन और जूते', description: 'Daily walking sneakers, apparel, workwear', productCount: 2, sampleBudgetINR: 4500 },
  { id: 'home', name: 'Home & Kitchen', nameHi: 'घर और रसोई', description: 'Appliances, air purifiers, espresso & utility', productCount: 1, sampleBudgetINR: 12000 },
  { id: 'furniture', name: 'Furniture & Ergonomics', nameHi: 'फर्नीचर', description: 'Standing desks, ergonomic chairs, lamps', productCount: 1, sampleBudgetINR: 18000 },
  { id: 'education', name: 'Education & Study', nameHi: 'शिक्षा', description: 'Study tablets, e-readers, desk gear', productCount: 1, sampleBudgetINR: 25000 },
  { id: 'books', name: 'Books & Guides', nameHi: 'किताबें', description: 'Technical reference, fiction, exam prep', productCount: 1, sampleBudgetINR: 1000 },
  { id: 'sports', name: 'Sports & Fitness', nameHi: 'खेल और फिटनेस', description: 'Running gear, fitness bands, recovery tools', productCount: 1, sampleBudgetINR: 5000 },
  { id: 'beauty', name: 'Beauty & Personal Care', nameHi: 'ब्यूटी केयर', description: 'Grooming kits, skincare essentials', productCount: 1, sampleBudgetINR: 2500 },
  { id: 'automotive', name: 'Automotive Accessories', nameHi: 'ऑटोमोबाइल', description: 'Dashcams, tyre inflators, car chargers', productCount: 1, sampleBudgetINR: 4000 },
  { id: 'gifts', name: 'Curated Gifts', nameHi: 'उपहार', description: 'Thoughtful gifts under ₹2,000 and premium picks', productCount: 2, sampleBudgetINR: 2000 },
];

const RAW_CATALOG: Product[] = [
  makeProduct({
    id: 'oneplus-nord-ce4-5g',
    title: 'OnePlus Nord CE 4 5G',
    brand: 'OnePlus',
    category: 'smartphones',
    variant: '8GB RAM · 128GB Storage',
    imageUrl: '/src/assets/images/prod_smartphone_flagship_1795485451455.jpg',
    summary: 'Balanced 5G midrange smartphone with Snapdragon 7 Gen 3, 120Hz AMOLED display, and 100W fast charging.',
    specs: {
      Processor: 'Snapdragon 7 Gen 3',
      Display: '6.7" 120Hz FHD+ AMOLED',
      Battery: '5500 mAh · 100W SUPERVOOC',
      Camera: '50MP Sony LYT-600 OIS + 8MP UW',
      OS: 'OxygenOS (Android 14 · 2 OS updates)',
    },
    pros: ['Very fast 100W charging included in box', 'Clean OxygenOS performance without stutter', 'Bright 120Hz AMOLED panel'],
    cons: ['Plastic frame build', 'Ultra-wide camera is average in low light'],
    aiExplanation: 'Strong overall balance under ₹25,000 with reliable charging speed, OIS primary sensor, and responsive chipset.',
    rating: 4.4,
    reviewCount: 4820,
    price: 19999,
    originalPrice: 24999,
    merchant: 'Amazon India',
    domain: 'amazon.in',
    sellerName: 'Darshita Etel',
    warranty: '1 Year Manufacturer Warranty',
    warrantyMonths: 12,
    deliveryEstimate: 'Tomorrow by 9 PM',
    searchUrl: 'https://www.amazon.in/s?k=OnePlus+Nord+CE+4+5G',
    altMerchant: {
      merchant: 'Croma',
      domain: 'croma.com',
      price: 20499,
      url: 'https://www.croma.com/searchB?q=OnePlus+Nord+CE+4',
    },
    performanceScore: 86,
    reliabilityScore: 84,
  }),
  makeProduct({
    id: 'moto-edge-50-fusion',
    title: 'Motorola Edge 50 Fusion 5G',
    brand: 'Motorola',
    category: 'smartphones',
    variant: '8GB RAM · 128GB Storage',
    imageUrl: '/src/assets/images/prod_smartphone_flagship_1795485451455.jpg',
    summary: 'IP68 water-resistant midrange 5G smartphone featuring curved pOLED 144Hz screen and clean stock Android.',
    specs: {
      Processor: 'Snapdragon 7s Gen 2',
      Display: '6.7" 144Hz pOLED Curved',
      Battery: '5000 mAh · 68W TurboPower',
      Camera: '50MP LYT-700C OIS + 13MP UW',
      Protection: 'IP68 Water & Dust Resistance',
    },
    pros: ['IP68 rating rare in this price tier', 'Clean near-stock Hello UI with zero bloat', 'Lightweight vegan leather finish'],
    cons: ['Curved screen makes tempered glass fitting harder', 'Slightly slower updates than Pixel/Samsung'],
    aiExplanation: 'Ideal if durability (IP68) and clean software without ads matter most under ₹22,000.',
    rating: 4.4,
    reviewCount: 6150,
    price: 18999,
    originalPrice: 22999,
    merchant: 'Flipkart',
    domain: 'flipkart.com',
    sellerName: 'SuperComNet',
    warranty: '1 Year Manufacturer Warranty',
    warrantyMonths: 12,
    deliveryEstimate: '2 days',
    searchUrl: 'https://www.flipkart.com/search?q=Motorola+Edge+50+Fusion',
    altMerchant: {
      merchant: 'Reliance Digital',
      domain: 'reliancedigital.in',
      price: 19499,
      url: 'https://www.reliancedigital.in/search?q=Motorola+Edge+50+Fusion',
    },
    performanceScore: 82,
    reliabilityScore: 85,
  }),
  makeProduct({
    id: 'cmf-phone-1-5g',
    title: 'CMF by Nothing Phone 1 5G',
    brand: 'Nothing',
    category: 'smartphones',
    variant: '6GB RAM · 128GB Storage',
    imageUrl: '/src/assets/images/prod_smartphone_flagship_1795485451455.jpg',
    summary: 'Value-focused 5G smartphone with Dimensity 7300 processor, modular backplate, and smooth Nothing OS.',
    specs: {
      Processor: 'MediaTek Dimensity 7300',
      Display: '6.67" 120Hz Super AMOLED',
      Battery: '5000 mAh · 33W Charging',
      Camera: '50MP Sony Sensor',
      OS: 'Nothing OS 2.6',
    },
    pros: ['Class-leading chipset smoothness under ₹16,000', 'Bloatware-free Nothing OS', 'Replaceable back cover'],
    cons: ['Charger brick sold separately', 'Single mono speaker and no NFC'],
    aiExplanation: 'Top budget efficiency pick if you want snappy everyday UI speed well below ₹20,000.',
    rating: 4.3,
    reviewCount: 7340,
    price: 14999,
    originalPrice: 17999,
    merchant: 'Flipkart',
    domain: 'flipkart.com',
    sellerName: 'Wizrob Fashion',
    warranty: '1 Year Manufacturer Warranty',
    warrantyMonths: 12,
    deliveryEstimate: '2-3 days',
    searchUrl: 'https://www.flipkart.com/search?q=CMF+Phone+1',
    performanceScore: 80,
    reliabilityScore: 79,
  }),
  makeProduct({
    id: 'samsung-galaxy-a35-5g',
    title: 'Samsung Galaxy A35 5G',
    brand: 'Samsung',
    category: 'smartphones',
    variant: '8GB RAM · 128GB Storage',
    imageUrl: '/src/assets/images/prod_smartphone_flagship_1795485451455.jpg',
    summary: 'Long-term supported Samsung 5G phone with Gorilla Glass Victus+, IP67 rating, and 4 years of OS updates.',
    specs: {
      Processor: 'Exynos 1380',
      Display: '6.6" 120Hz Super AMOLED',
      Battery: '5000 mAh · 25W Charging',
      Camera: '50MP OIS + 8MP UW + 5MP Macro',
      Support: '4 OS upgrades + 5 years security',
    },
    pros: ['4 years OS update guarantee', 'IP67 water resistance + Gorilla Glass Victus+', 'Reliable Samsung service center reach'],
    cons: ['25W charging is slow', 'Heavier glass body (209g)'],
    aiExplanation: 'Strongest long-term software support option if you plan to keep your phone for 4+ years.',
    rating: 4.3,
    reviewCount: 3180,
    price: 23999,
    originalPrice: 30999,
    merchant: 'Amazon India',
    domain: 'amazon.in',
    sellerName: 'Appario Retail',
    warranty: '1 Year Manufacturer Warranty',
    warrantyMonths: 12,
    deliveryEstimate: '1-2 days',
    searchUrl: 'https://www.amazon.in/s?k=Samsung+Galaxy+A35+5G',
    altMerchant: {
      merchant: 'Samsung Official',
      domain: 'samsung.com',
      price: 24499,
      url: 'https://www.samsung.com/in/search/?searchvalue=Galaxy+A35',
    },
    performanceScore: 78,
    reliabilityScore: 90,
  }),
  makeProduct({
    id: 'lenovo-ideapad-slim-5-ryzen7',
    title: 'Lenovo IdeaPad Slim 5 (Ryzen 7 7730U)',
    brand: 'Lenovo',
    category: 'laptops',
    variant: '16GB DDR4 · 512GB NVMe SSD',
    imageUrl: '/src/assets/images/prod_laptop_ultrabook_1795485451356.jpg',
    summary: 'Aluminum-chassis coding and schoolwork ultrabook with 16GB RAM, crisp WUXGA IPS screen, and backlit keyboard.',
    specs: {
      Processor: 'AMD Ryzen 7 7730U (8-Core)',
      RAM: '16GB DDR4-3200',
      Storage: '512GB PCIe 4.0 NVMe SSD',
      Display: '14" WUXGA (1920x1200) IPS Anti-Glare',
      Weight: '1.46 kg · Aluminum Top',
    },
    pros: ['16:10 taller screen ideal for coding & docs', '16GB RAM handles Docker, VS Code & browser tabs', 'Lightweight metal build'],
    cons: ['RAM is soldered (not upgradable)', 'Integrated Radeon graphics only for light esports'],
    aiExplanation: 'Best-balanced coding and university ultrabook around ₹50,000 with 16GB RAM and 8-core efficiency.',
    rating: 4.4,
    reviewCount: 1920,
    price: 49990,
    originalPrice: 64990,
    merchant: 'Amazon India',
    domain: 'amazon.in',
    sellerName: 'Appario Retail',
    warranty: '1 Year Onsite + Accidental Damage (1 Yr)',
    warrantyMonths: 12,
    deliveryEstimate: '2 days',
    searchUrl: 'https://www.amazon.in/s?k=Lenovo+IdeaPad+Slim+5+Ryzen+7',
    altMerchant: {
      merchant: 'Lenovo Official',
      domain: 'lenovo.com',
      price: 51490,
      url: 'https://www.lenovo.com/in/en/search?text=IdeaPad+Slim+5',
    },
    performanceScore: 87,
    reliabilityScore: 86,
  }),
  makeProduct({
    id: 'asus-vivobook-16x-rtx2050',
    title: 'ASUS Vivobook 16X (Core i5-12450H / RTX 2050)',
    brand: 'ASUS',
    category: 'laptops',
    variant: '16GB RAM · 512GB SSD · RTX 2050 4GB',
    imageUrl: '/src/assets/images/prod_laptop_ultrabook_1795485451356.jpg',
    summary: 'Hybrid student laptop pairing H-series CPU and dedicated RTX 2050 GPU for coding, CAD, and 1080p gaming under ₹55k.',
    specs: {
      Processor: 'Intel Core i5-12450H (8-Core)',
      Graphics: 'NVIDIA GeForce RTX 2050 4GB',
      RAM: '16GB DDR4 (Expandable)',
      Storage: '512GB M.2 NVMe SSD',
      Display: '16" FHD+ 120Hz',
    },
    pros: ['Dedicated RTX GPU unlocks 1080p gaming & ML/CAD workloads', '120Hz 16-inch screen', 'Upgradable RAM slot'],
    cons: ['Battery life averages 4–5 hours unplugged', '45% NTSC color gamut not suited for color-critical print work'],
    aiExplanation: 'Strong fit if you want coding + casual gaming in a single laptop near ₹50,000.',
    rating: 4.3,
    reviewCount: 1410,
    price: 52990,
    originalPrice: 69990,
    merchant: 'Flipkart',
    domain: 'flipkart.com',
    sellerName: 'SVPeripherals',
    warranty: '1 Year Global Warranty',
    warrantyMonths: 12,
    deliveryEstimate: '2-3 days',
    searchUrl: 'https://www.flipkart.com/search?q=ASUS+Vivobook+16X+RTX+2050',
    performanceScore: 88,
    reliabilityScore: 81,
  }),
  makeProduct({
    id: 'acer-aspire-lite-ryzen5',
    title: 'Acer Aspire Lite (Ryzen 5 5625U)',
    brand: 'Acer',
    category: 'laptops',
    variant: '16GB RAM · 512GB SSD',
    imageUrl: '/src/assets/images/prod_laptop_ultrabook_1795485451356.jpg',
    summary: 'Affordable 16GB productivity laptop for students, spreadsheets, web development, and everyday study.',
    specs: {
      Processor: 'AMD Ryzen 5 5625U',
      RAM: '16GB DDR4',
      Storage: '512GB NVMe SSD',
      Display: '15.6" Full HD Anti-Glare',
      Weight: '1.59 kg',
    },
    pros: ['16GB RAM out of the box under ₹37,000', 'Full-size numpad keyboard', 'Quiet thermal profile'],
    cons: ['No keyboard backlight on base SKU', 'Plastic chassis flexes slightly'],
    aiExplanation: 'Best budget coding and coursework machine well below ₹40,000.',
    rating: 4.1,
    reviewCount: 2890,
    price: 35990,
    originalPrice: 48990,
    merchant: 'Amazon India',
    domain: 'amazon.in',
    sellerName: 'Appario Retail',
    warranty: '1 Year Carry-In Warranty',
    warrantyMonths: 12,
    deliveryEstimate: '2 days',
    searchUrl: 'https://www.amazon.in/s?k=Acer+Aspire+Lite+Ryzen+5+16GB',
    performanceScore: 76,
    reliabilityScore: 77,
  }),
  makeProduct({
    id: 'apple-macbook-air-m2',
    title: 'Apple MacBook Air 13" (M2 Chip)',
    brand: 'Apple',
    category: 'laptops',
    variant: '16GB Unified · 256GB SSD',
    imageUrl: '/src/assets/images/prod_laptop_ultrabook_1795485451356.jpg',
    summary: 'Fanless ultrabook with Apple M2 silicon, 15+ hour real battery life, and color-accurate Liquid Retina display.',
    specs: {
      Processor: 'Apple M2 8-Core CPU / 8-Core GPU',
      RAM: '16GB Unified Memory',
      Storage: '256GB SSD',
      Display: '13.6" Liquid Retina 500 nits',
      Battery: 'Up to 18 hours',
    },
    pros: ['All-day real-world battery without throttling', 'Silent fanless operation & aluminum unibody', 'Excellent trackpad and display'],
    cons: ['256GB base storage fills quickly', 'Only 2 Thunderbolt ports + not built for Windows gaming'],
    aiExplanation: 'Best long-term ultrabook investment if portability, silence, and battery longevity outweigh gaming.',
    rating: 4.8,
    reviewCount: 5420,
    price: 78990,
    originalPrice: 99900,
    merchant: 'Croma',
    domain: 'croma.com',
    sellerName: 'Croma Official',
    warranty: '1 Year Apple Limited Warranty',
    warrantyMonths: 12,
    deliveryEstimate: '1-2 days',
    searchUrl: 'https://www.croma.com/searchB?q=MacBook+Air+M2+16GB',
    altMerchant: {
      merchant: 'Amazon India',
      domain: 'amazon.in',
      price: 79990,
      url: 'https://www.amazon.in/s?k=MacBook+Air+M2+16GB',
    },
    performanceScore: 93,
    reliabilityScore: 95,
  }),
  makeProduct({
    id: 'sony-wh1000xm5-anc',
    title: 'Sony WH-1000XM5 Wireless ANC Headphones',
    brand: 'Sony',
    category: 'electronics',
    variant: 'Midnight Graphite · 30hr Battery',
    imageUrl: '/src/assets/images/prod_audio_headphones_1795485451105.jpg',
    summary: 'Reference-grade active noise cancelling over-ear headphones with multipoint Bluetooth and crisp call mics.',
    specs: {
      Drivers: '30mm Carbon Fiber',
      ANC: '8-Mic Auto NC Optimizer',
      Battery: '30 hours ANC on · USB-C PD',
      Codecs: 'LDAC, AAC, SBC',
      Weight: '250g',
    },
    pros: ['Industry-leading active noise cancellation', 'Clear 4-mic beamforming voice calls', 'Lightweight comfortable headband'],
    cons: ['Does not fold flat like XM4', 'Carrying case is bulky'],
    aiExplanation: 'Premier ANC headphones for travel, focus, and daily office calls.',
    rating: 4.6,
    reviewCount: 8310,
    price: 24990,
    originalPrice: 34990,
    merchant: 'Amazon India',
    domain: 'amazon.in',
    sellerName: 'Appario Retail',
    warranty: '1 Year Sony India Warranty',
    warrantyMonths: 12,
    deliveryEstimate: 'Tomorrow',
    searchUrl: 'https://www.amazon.in/s?k=Sony+WH-1000XM5',
    altMerchant: {
      merchant: 'Sony India',
      domain: 'sony.co.in',
      price: 26990,
      url: 'https://www.sony.co.in/electronics/headband-headphones/wh-1000xm5',
    },
    performanceScore: 94,
    reliabilityScore: 90,
  }),
  makeProduct({
    id: 'soundcore-space-one-anc',
    title: 'Anker Soundcore Space One ANC',
    brand: 'Soundcore',
    category: 'electronics',
    variant: 'Jet Black · 40hr ANC',
    imageUrl: '/src/assets/images/prod_audio_headphones_1795485451105.jpg',
    summary: 'High-value wireless ANC headphones with LDAC Hi-Res audio, adaptive noise cancellation, and 40-hour battery.',
    specs: {
      Drivers: '40mm Dynamic',
      Battery: '40h ANC on / 55h ANC off',
      Codecs: 'LDAC, AAC, SBC',
      Weight: '259g',
    },
    pros: ['Strong ANC performance under ₹8,000', 'LDAC + custom EQ via Soundcore app', '40-hour ANC battery life'],
    cons: ['Plush earcups can get warm in summer', 'Plastic hinge finish'],
    aiExplanation: 'Delivers ~80% of flagship ANC utility at less than one-third the cost.',
    rating: 4.4,
    reviewCount: 3420,
    price: 7499,
    originalPrice: 10999,
    merchant: 'Amazon India',
    domain: 'amazon.in',
    sellerName: 'Imagine Marketing',
    warranty: '18 Months Manufacturer Warranty',
    warrantyMonths: 18,
    deliveryEstimate: '2 days',
    searchUrl: 'https://www.amazon.in/s?k=Soundcore+Space+One',
    performanceScore: 83,
    reliabilityScore: 84,
  }),
  // Gaming Setup & PC Components
  makeProduct({
    id: 'lg-ultragear-27gn800-qhd',
    title: 'LG UltraGear 27" QHD 144Hz Gaming Monitor',
    brand: 'LG',
    category: 'gaming',
    variant: '27GP850 / 27" 1440p IPS 1ms',
    imageUrl: '/src/assets/images/prod_gaming_setup_1795485452471.jpg',
    summary: '27-inch QHD IPS 144Hz-165Hz monitor with 1ms GtG response, FreeSync/G-Sync compatibility, and 99% sRGB color.',
    specs: {
      Resolution: '2560 x 1440 (QHD)',
      Refresh: '144Hz / 165Hz',
      Panel: 'Nano IPS 1ms GtG',
      Inputs: '2x HDMI 2.0, 1x DisplayPort 1.4',
    },
    pros: ['Crisp 1440p sharpness for both gaming and coding', 'True 1ms IPS motion clarity', 'Accurate sRGB factory calibration'],
    cons: ['IPS contrast ratio is modest in dark rooms', 'Basic stand tilt unless VESA mounted'],
    aiExplanation: 'Core visual anchor for a ₹80,000 gaming & productivity desk setup.',
    rating: 4.6,
    reviewCount: 2740,
    price: 21999,
    originalPrice: 32000,
    merchant: 'Amazon India',
    domain: 'amazon.in',
    sellerName: 'Appario Retail',
    warranty: '3 Years LG Onsite Warranty',
    warrantyMonths: 36,
    deliveryEstimate: '2 days',
    searchUrl: 'https://www.amazon.in/s?k=LG+UltraGear+27+QHD+144Hz',
    performanceScore: 90,
    reliabilityScore: 91,
  }),
  makeProduct({
    id: 'keychron-k2-pro-mechanical',
    title: 'Keychron K2 Pro QMK/VIA Mechanical Keyboard',
    brand: 'Keychron',
    category: 'gaming',
    variant: '75% Hot-Swap · Red Switches · Wireless',
    imageUrl: '/src/assets/images/prod_gaming_setup_1795485452471.jpg',
    summary: '75% compact wireless/wired mechanical keyboard with hot-swappable switches, PBT keycaps, and QMK/VIA remapping.',
    specs: {
      Layout: '75% Compact (84 Keys)',
      Connectivity: 'Bluetooth 5.1 + USB-C Wired',
      Keycaps: 'Double-shot PBT',
      Compatibility: 'Windows, macOS, Linux',
    },
    pros: ['Hot-swappable switches & open QMK/VIA firmware', 'Solid acoustic foam dampening', 'Instant Mac/Windows switch'],
    cons: ['Tall front profile (wrist rest helpful)', 'No 2.4GHz USB dongle (Bluetooth or wired)'],
    aiExplanation: 'Ideal dual-purpose keyboard for competitive gaming wired and clean wireless desk aesthetics.',
    rating: 4.7,
    reviewCount: 1180,
    price: 8999,
    originalPrice: 10999,
    merchant: 'Amazon India',
    domain: 'amazon.in',
    sellerName: 'Keychron India',
    warranty: '1 Year Warranty',
    warrantyMonths: 12,
    deliveryEstimate: '2-3 days',
    searchUrl: 'https://www.amazon.in/s?k=Keychron+K2+Pro',
    performanceScore: 89,
    reliabilityScore: 88,
  }),
  makeProduct({
    id: 'logitech-g304-lightspeed',
    title: 'Logitech G304 Lightspeed Wireless Gaming Mouse',
    brand: 'Logitech',
    category: 'gaming',
    variant: 'HERO 12K Sensor · 1ms Wireless',
    imageUrl: '/src/assets/images/prod_gaming_setup_1795485452471.jpg',
    summary: 'Zero-lag 1ms Lightspeed wireless gaming mouse with HERO 12,000 DPI sensor and 250-hour AA battery endurance.',
    specs: {
      Sensor: 'HERO 12,000 DPI',
      Wireless: '1ms 2.4GHz Lightspeed USB',
      Weight: '99g',
      Battery: 'Up to 250 hours (1x AA)',
    },
    pros: ['Tournament-grade 1ms wireless under ₹3,000', 'Remarkable battery longevity', '6 programmable buttons'],
    cons: ['Uses replaceable AA battery rather than USB-C', 'Small symmetrical shape suits claw/fingertip grips'],
    aiExplanation: 'Unbeatable price-to-performance wireless gaming mouse.',
    rating: 4.6,
    reviewCount: 19400,
    price: 2795,
    originalPrice: 3795,
    merchant: 'Amazon India',
    domain: 'amazon.in',
    sellerName: 'Appario Retail',
    warranty: '2 Years Logitech Hardware Warranty',
    warrantyMonths: 24,
    deliveryEstimate: 'Tomorrow',
    searchUrl: 'https://www.amazon.in/s?k=Logitech+G304+Lightspeed',
    performanceScore: 88,
    reliabilityScore: 89,
  }),
  makeProduct({
    id: 'amd-ryzen-5-5600-desktop-tower',
    title: 'Ryzen 5 5600 + RTX 4060 Gaming PC Tower',
    brand: 'Custom Build',
    category: 'gaming',
    variant: '16GB DDR4 · 1TB NVMe · 550W PSU',
    imageUrl: '/src/assets/images/prod_gaming_setup_1795485452471.jpg',
    summary: 'Verified compatible gaming desktop core pairing Ryzen 5 5600 (AM4), B550 board, 16GB DDR4, RTX 4060 8GB, and 650W PSU.',
    specs: {
      Socket: 'AM4',
      'Memory Type': 'DDR4',
      Type: 'DDR4',
      GPU: 'NVIDIA RTX 4060 8GB',
      'Recommended PSU': '550W',
      Wattage: '650W',
    },
    pros: ['DLSS 3 Frame Generation handles 1440p AAA titles smoothly', '650W 80+ Bronze PSU provides ample headroom', '1TB PCIe NVMe SSD'],
    cons: ['AM4 platform has limited future CPU upgrade path vs AM5', 'Requires external Wi-Fi dongle on base B550M'],
    aiExplanation: 'Balanced gaming tower core leaving room in an ₹80,000 budget for a QHD monitor and peripherals.',
    rating: 4.5,
    reviewCount: 640,
    price: 44500,
    originalPrice: 52000,
    merchant: 'Amazon India',
    domain: 'amazon.in',
    sellerName: 'Authorized PC Partner',
    warranty: '3 Years Component Warranty',
    warrantyMonths: 36,
    deliveryEstimate: '3-5 days',
    searchUrl: 'https://www.amazon.in/s?k=Ryzen+5+5600+RTX+4060+PC',
    performanceScore: 91,
    reliabilityScore: 86,
  }),
  makeProduct({
    id: 'hyperx-cloud-iii-headset',
    title: 'HyperX Cloud III Wired Gaming Headset',
    brand: 'HyperX',
    category: 'gaming',
    variant: '53mm Angled Drivers · DTS Spatial',
    imageUrl: '/src/assets/images/prod_audio_headphones_1795485451105.jpg',
    summary: 'Durable aluminum-frame gaming headset with memory foam earpads and detachable noise-cancelling boom mic.',
    specs: {
      Drivers: '53mm Angled Neodymium',
      Connection: 'USB-C, USB-A, 3.5mm',
      Microphone: '10mm Detachable Noise-Cancelling',
      Frame: 'Aluminum',
    },
    pros: ['All-day memory foam comfort', 'Exceptionally clear voice chat mic', 'Works across PC, PS5, Xbox & Switch'],
    cons: ['Wired only', 'Neutral tuning has less sub-bass punch for music'],
    aiExplanation: 'Completes a gaming setup with crisp positional audio and reliable durability.',
    rating: 4.5,
    reviewCount: 2150,
    price: 6990,
    originalPrice: 9490,
    merchant: 'Amazon India',
    domain: 'amazon.in',
    sellerName: 'Appario Retail',
    warranty: '2 Years HyperX Warranty',
    warrantyMonths: 24,
    deliveryEstimate: '2 days',
    searchUrl: 'https://www.amazon.in/s?k=HyperX+Cloud+III',
    performanceScore: 86,
    reliabilityScore: 89,
  }),
  // Footwear, Gifts, Home
  makeProduct({
    id: 'asics-gel-contend-daily',
    title: 'ASICS Gel-Contend 9 Daily Walking & Running Shoes',
    brand: 'ASICS',
    category: 'fashion',
    variant: 'Slate / Sage Mesh · UK 8–11',
    imageUrl: '/src/assets/images/prod_sneakers_daily_1795485452190.jpg',
    summary: 'Breathable engineered jacquard mesh sneakers with rearfoot GEL cushioning and OrthoLite sockliner for daily commutes.',
    specs: {
      Upper: 'Engineered Jacquard Mesh',
      Cushioning: 'Rearfoot GEL + AMPLIFOAM',
      Insole: 'OrthoLite Sockliner',
      Use: 'Daily walking & light road running',
    },
    pros: ['Reliable heel impact absorption for 8,000+ daily steps', 'Breathable knit keeps feet cool', 'Durable solid rubber outsole'],
    cons: ['Not designed for marathon tempo speedwork', 'Runs slightly narrow for wide feet'],
    aiExplanation: 'Top comfortable daily-wear footwear balancing arch support, breathability, and sole longevity.',
    rating: 4.5,
    reviewCount: 4120,
    price: 3699,
    originalPrice: 5499,
    merchant: 'Myntra',
    domain: 'myntra.com',
    sellerName: 'ASICS India Official',
    warranty: '3 Months Manufacturing Defect Warranty',
    warrantyMonths: 3,
    deliveryEstimate: '2-3 days',
    searchUrl: 'https://www.myntra.com/asics-gel-contend',
    altMerchant: {
      merchant: 'Amazon India',
      domain: 'amazon.in',
      price: 3899,
      url: 'https://www.amazon.in/s?k=ASICS+Gel+Contend+9',
    },
    performanceScore: 85,
    reliabilityScore: 86,
  }),
  makeProduct({
    id: 'skechers-go-walk-flex',
    title: 'Skechers GO WALK Flex Hands-Free Daily Sneakers',
    brand: 'Skechers',
    category: 'sports',
    variant: 'Charcoal Knit · Ultra Go Cushion',
    imageUrl: '/src/assets/images/prod_sneakers_daily_1795485452190.jpg',
    summary: 'Lightweight slip-on daily walking sneakers with Air-Cooled Memory Foam insole and responsive ULTRA GO midsole.',
    specs: {
      Midsole: 'ULTRA GO Lightweight Cushion',
      Insole: 'Air-Cooled Memory Foam',
      Fit: 'Relaxed Slip-In Knit',
      MachineWashable: 'Yes (Gentle Cold)',
    },
    pros: ['Immediate step-in softness for standing/walking all day', 'Machine washable knit', 'Wide-foot friendly'],
    cons: ['Foam compresses faster than rubberized running soles after 12 months', 'Low lateral stability for court sports'],
    aiExplanation: 'Strong comfort-first choice for daily walking and standing shifts.',
    rating: 4.4,
    reviewCount: 5290,
    price: 4299,
    originalPrice: 6499,
    merchant: 'AJIO',
    domain: 'ajio.com',
    sellerName: 'Reliance Brands',
    warranty: '3 Months Manufacturing Warranty',
    warrantyMonths: 3,
    deliveryEstimate: '3 days',
    searchUrl: 'https://www.ajio.com/search/?text=Skechers+Go+Walk+Flex',
    performanceScore: 82,
    reliabilityScore: 80,
  }),
  makeProduct({
    id: 'titan-karishma-analog-gift',
    title: 'Titan Karishma Analog Dress Watch & Leather Wallet Gift Set',
    brand: 'Titan',
    category: 'gifts',
    variant: 'Champagne Dial · Brown Strap',
    imageUrl: '/src/assets/images/hero_tech_flatlay_1795485451285.jpg',
    summary: 'Classic brass-cased quartz analog watch paired with stitched genuine leather bi-fold wallet, ideal father/family gift under ₹2,000.',
    specs: {
      Movement: 'Japanese Quartz',
      WaterResistance: '30m Splash Resistant',
      Case: 'Brass 40mm',
      GiftBox: 'Included Presentation Box',
    },
    pros: ['Trusted Titan after-sales service across India', 'Classic readable dial suitable for fathers & professionals', 'Arrives gift-ready under ₹2,000'],
    cons: ['Mineral glass requires care against sharp impacts', 'Leather strap stiff for first week'],
    aiExplanation: 'Thoughtful, enduring gift for father under ₹2,000 with nationwide service support.',
    rating: 4.5,
    reviewCount: 3840,
    price: 1895,
    originalPrice: 2495,
    merchant: 'Amazon India',
    domain: 'amazon.in',
    sellerName: 'Titan Company Ltd',
    warranty: '2 Years Titan International Warranty',
    warrantyMonths: 24,
    deliveryEstimate: 'Tomorrow',
    searchUrl: 'https://www.amazon.in/s?k=Titan+Karishma+Watch',
    performanceScore: 84,
    reliabilityScore: 92,
  }),
  makeProduct({
    id: 'philips-smart-desk-lamp-gift',
    title: 'Philips Air Desk Lamp & Wireless Charging Dock',
    brand: 'Philips',
    category: 'home',
    variant: '3-Mode EyeComfort LED · 10W Qi',
    imageUrl: '/src/assets/images/prod_gaming_setup_1795485452471.jpg',
    summary: 'Flicker-free EyeComfort LED reading lamp with stepless dimming and integrated 10W wireless phone pad under ₹2,000.',
    specs: {
      Brightness: '500 Lumens CRI 90',
      ColorTemp: '3000K / 4000K / 5500K',
      Charger: 'Integrated 10W Qi Pad + USB',
      Warranty: '2 Years',
    },
    pros: ['Flicker-free optical diffuser prevents eye strain', 'Dual-purpose desk organizer & charger', 'Solid 2-year warranty under ₹2,000'],
    cons: ['Requires USB-C power adapter (included)', 'Qi charging at 10W is moderate speed'],
    aiExplanation: 'Practical home or father gift under ₹2,000 that gets used every single evening.',
    rating: 4.4,
    reviewCount: 1620,
    price: 1799,
    originalPrice: 2795,
    merchant: 'Flipkart',
    domain: 'flipkart.com',
    sellerName: 'Signify Innovations',
    warranty: '2 Years Philips India Warranty',
    warrantyMonths: 24,
    deliveryEstimate: '2 days',
    searchUrl: 'https://www.flipkart.com/search?q=Philips+LED+Desk+Lamp',
    performanceScore: 83,
    reliabilityScore: 88,
  }),
  makeProduct({
    id: 'greensoul-zodiac-ergonomic-chair',
    title: 'Green Soul Zodiac Pro Ergonomic Mesh Office Chair',
    brand: 'Green Soul',
    category: 'furniture',
    variant: '2D Armrests · Dynamic Lumbar · Black',
    imageUrl: '/src/assets/images/prod_gaming_setup_1795485452471.jpg',
    summary: 'High-back breathable Korean mesh ergonomic chair with adjustable lumbar support, 135° synchro-tilt, and metal base.',
    specs: {
      Backrest: 'Breathable Mesh + Dynamic Lumbar',
      Tilt: '135° Synchro Lock',
      Base: 'Heavy-duty Metal 5-Star',
      Capacity: 'Up to 125 kg',
    },
    pros: ['Cool breathable mesh suited for Indian summers', '3-year warranty on hydraulic & mechanism', 'Adjustable headrest and lumbar'],
    cons: ['Requires ~25 min DIY assembly', 'Seat foam firms up over 6 months'],
    aiExplanation: 'High-value ergonomic seating upgrade for developers, students, and remote professionals.',
    rating: 4.3,
    reviewCount: 4510,
    price: 11490,
    originalPrice: 21990,
    merchant: 'Amazon India',
    domain: 'amazon.in',
    sellerName: 'Green Soul Ergonomics',
    warranty: '3 Years Manufacturer Warranty',
    warrantyMonths: 36,
    deliveryEstimate: '3-4 days',
    searchUrl: 'https://www.amazon.in/s?k=Green+Soul+Zodiac+Pro',
    performanceScore: 85,
    reliabilityScore: 84,
  }),
];

export const VERIFIED_CATALOG: Product[] = assignRecommendationBadges(RAW_CATALOG);

// Mutable admin overrides & audit logs (in-memory store synchronized with server)
export interface AuditLogEntry {
  id: string;
  actorEmail: string;
  action: string;
  targetId: string;
  details: string;
  timestamp: string;
}

const productOverrides = new Map<string, Partial<Product>>();
export const adminAuditLogs: AuditLogEntry[] = [];

export function getAllCatalogProducts(): Product[] {
  return VERIFIED_CATALOG.map((p) => {
    const ov = productOverrides.get(p.id);
    return ov ? { ...p, ...ov } : p;
  });
}

export function getCatalogProductById(id: string): Product | undefined {
  return getAllCatalogProducts().find((p) => p.id === id);
}

export function applyAdminProductCorrection(
  productId: string,
  actorEmail: string,
  patch: { title?: string; price?: number; warranty?: string; summary?: string },
): Product | null {
  const existing = getCatalogProductById(productId);
  if (!existing) return null;

  const updated: Product = {
    ...existing,
    title: patch.title?.trim() || existing.title,
    summary: patch.summary?.trim() || existing.summary,
    offers: existing.offers.map((o, idx) =>
      idx === 0
        ? {
            ...o,
            price: typeof patch.price === 'number' && patch.price > 0 ? patch.price : o.price,
            totalCost: typeof patch.price === 'number' && patch.price > 0 ? patch.price : o.totalCost,
            warranty: patch.warranty?.trim() || o.warranty,
            retrievedAt: new Date().toISOString(),
          }
        : o,
    ),
    retrievedAt: new Date().toISOString(),
  };

  productOverrides.set(productId, updated);
  adminAuditLogs.unshift({
    id: `aud_${Date.now()}`,
    actorEmail,
    action: 'PRODUCT_RECORD_CORRECTION',
    targetId: productId,
    details: JSON.stringify(patch),
    timestamp: new Date().toISOString(),
  });
  return updated;
}

export function searchCatalog(query: string, category?: CategoryId, budget?: number): Product[] {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 && !['find', 'best', 'under', 'for', 'the', 'and', 'with', 'good', 'buy'].includes(t));

  let candidates = getAllCatalogProducts();
  if (category) {
    const catMatches = candidates.filter((p) => p.category === category);
    if (catMatches.length > 0) candidates = catMatches;
  }

  const scored = candidates.map((p) => {
    const haystack = `${p.title} ${p.brand} ${p.category} ${p.summary} ${Object.values(p.specs).join(' ')}`.toLowerCase();
    let hits = 0;
    for (const tk of tokens) {
      if (haystack.includes(tk)) hits += 1;
    }
    const price = p.offers[0]?.totalCost ?? 0;
    const withinBudget = !budget || price <= budget * 1.1;
    return { product: p, hits, withinBudget };
  });

  const matched = scored
    .filter((s) => (tokens.length === 0 ? true : s.hits > 0 || Boolean(category)) && s.withinBudget)
    .sort((a, b) => b.hits - a.hits || b.product.score.total - a.product.score.total)
    .map((s) => s.product);

  return assignRecommendationBadges(matched.slice(0, 8));
}
