import { PrismaClient, PromotionType } from '@prisma/client';

const prisma = new PrismaClient();

const img = (id: string, w = 800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

const days = (n: number) => new Date(Date.now() + n * 86400000);

type R = {
  key: string;
  name: string;
  cuisine: string;
  cover: string;
  logo: string;
  rating: number;
  reviewCount: number;
  addressLine: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  lat: number;
  lng: number;
  priceRange: string;
};

const restaurants: R[] = [
  { key: 'spice-route', name: 'Spice Route Kitchen', cuisine: 'North Indian', cover: img('1585937421612-70a008356fbe'), logo: img('1517248135467-4c7edcad34c4', 200), rating: 4.6, reviewCount: 842, addressLine: '1420 Curry Ave', city: 'Edison', state: 'NJ', zip: '08817', phone: '+1 732-555-0142', lat: 40.5187, lng: -74.4121, priceRange: '$$' },
  { key: 'dosa-junction', name: 'Dosa Junction', cuisine: 'South Indian', cover: img('1630383249896-424e482df921'), logo: img('1567188040759-fb8a883dc6d8', 200), rating: 4.4, reviewCount: 511, addressLine: '88 Madras St', city: 'Jersey City', state: 'NJ', zip: '07302', phone: '+1 201-555-0188', lat: 40.7178, lng: -74.0431, priceRange: '$' },
  { key: 'biryani-house', name: 'Biryani House', cuisine: 'Biryani', cover: img('1563379091339-03b21ab4a4f8'), logo: img('1588166524941-3bf61a9c41db', 200), rating: 4.8, reviewCount: 1204, addressLine: '305 Hyderabad Rd', city: 'Iselin', state: 'NJ', zip: '08830', phone: '+1 732-555-0199', lat: 40.5754, lng: -74.3232, priceRange: '$$' },
  { key: 'tandoori-flames', name: 'Tandoori Flames', cuisine: 'North Indian', cover: img('1599487488170-d11ec9c172f0'), logo: img('1601050690597-df0568f70950', 200), rating: 4.3, reviewCount: 376, addressLine: '12 Clay St', city: 'New York', state: 'NY', zip: '10013', phone: '+1 212-555-0123', lat: 40.7193, lng: -74.0036, priceRange: '$$$' },
];

type P = {
  rkey: string;
  type: PromotionType;
  title: string;
  description: string;
  badge: string;
  image: string;
  start: number;
  end: number;
  views: number;
};

const promotions: P[] = [
  { rkey: 'biryani-house', type: 'DISCOUNT', title: 'Weekend Biryani Bonanza', description: 'Flat 30% off on all dum biryanis this weekend. Dine-in and takeout. Hyderabadi, Lucknowi and Veg dum specials included.', badge: '30% OFF', image: img('1563379091339-03b21ab4a4f8'), start: -2, end: 4, views: 3120 },
  { rkey: 'spice-route', type: 'BUFFET', title: 'Unlimited Lunch Buffet', description: 'All-you-can-eat North Indian lunch buffet with 40+ items, live tandoor and dessert counter. Mon-Fri, 11:30am-3pm.', badge: '$14.99', image: img('1555939594-58d7cb561ad1'), start: -10, end: 20, views: 1890 },
  { rkey: 'dosa-junction', type: 'COUPON', title: 'Buy 2 Dosas, Get 1 Free', description: 'Show this coupon at the counter. Valid on all dosa varieties including Mysore Masala and Ghee Roast.', badge: 'B2G1', image: img('1630383249896-424e482df921'), start: -5, end: 3, views: 980 },
  { rkey: 'tandoori-flames', type: 'EVENT', title: 'Diwali Grand Dinner Night', description: 'A festive 7-course tasting menu with live ghazal performance. Limited seats - reserve now.', badge: 'EVENT', image: img('1606491956689-2ea866880c84'), start: 6, end: 8, views: 642 },
  { rkey: 'spice-route', type: 'CATERING', title: 'Party Catering Packages', description: 'Custom catering for 25-500 guests. Weddings, corporate events and house parties. Free tasting on bookings above $500.', badge: 'CATERING', image: img('1517248135467-4c7edcad34c4'), start: -20, end: 40, views: 455 },
  { rkey: 'biryani-house', type: 'FLYER', title: 'New Menu Launch', description: 'Introducing our new Awadhi kebab platter and Nawabi curries. Check out the full flyer.', badge: 'NEW', image: img('1588166524941-3bf61a9c41db'), start: -1, end: 14, views: 1230 },
];

async function main() {
  const rIds: Record<string, string> = {};

  for (const r of restaurants) {
    const owner = await prisma.user.upsert({
      where: { firebaseUid: `seed-owner-${r.key}` },
      update: {},
      create: {
        firebaseUid: `seed-owner-${r.key}`,
        email: `${r.key}@dealplate-demo.com`,
        name: `${r.name} Owner`,
        role: 'OWNER',
      },
    });

    const restaurant = await prisma.restaurant.upsert({
      where: { ownerId: owner.id },
      update: {
        name: r.name, cuisine: r.cuisine, coverImageUrl: r.cover, logoUrl: r.logo,
        rating: r.rating, reviewCount: r.reviewCount, addressLine: r.addressLine,
        city: r.city, state: r.state, zip: r.zip, phone: r.phone,
        latitude: r.lat, longitude: r.lng, priceRange: r.priceRange,
      },
      create: {
        ownerId: owner.id, name: r.name, cuisine: r.cuisine, coverImageUrl: r.cover,
        logoUrl: r.logo, rating: r.rating, reviewCount: r.reviewCount,
        addressLine: r.addressLine, city: r.city, state: r.state, zip: r.zip,
        phone: r.phone, latitude: r.lat, longitude: r.lng, priceRange: r.priceRange,
        subscription: { create: { plan: 'PRO', promosLimit: 15 } },
      },
    });
    rIds[r.key] = restaurant.id;
  }

  // Reset + insert promotions (so re-seeding stays clean)
  await prisma.promotion.deleteMany({
    where: { restaurantId: { in: Object.values(rIds) } },
  });
  for (const p of promotions) {
    await prisma.promotion.create({
      data: {
        restaurantId: rIds[p.rkey],
        type: p.type,
        title: p.title,
        description: p.description,
        badge: p.badge,
        imageUrl: p.image,
        startDate: days(p.start),
        endDate: days(p.end),
        status: 'APPROVED',
        views: p.views,
        clicks: Math.round(p.views * 0.18),
        flyerViews: Math.round(p.views * 0.5),
      },
    });
  }

  console.log(
    `Seeded ${restaurants.length} restaurants and ${promotions.length} promotions.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
