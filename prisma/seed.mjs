// prisma/seed.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const LOCAL = [
  "/boats/example-sailboat1.jpg",
  "/boats/example-sailboat2.jpg",
  "/boats/example-sailboat3.jpg",
  "/boats/example-sailboat4.jpg",
];

function pics(seedIndex) {
  return LOCAL.map((u, i) => `${u}?v=${seedIndex}-${i}`);
}

function normalizeCountry(c) {
  const s = String(c ?? "").trim();
  const lower = s.toLowerCase();
  if (lower === "usa" || lower === "us" || lower === "united states") return "United States";
  if (lower === "uk" || lower === "united kingdom") return "United Kingdom";
  return s || null;
}

const baseDesc =
  "Well-kept cruising sailboat with recent upgrades. Turn-key and ready to sail.";

const baseEquip = [
  "Autopilot",
  "Bimini & dodger",
  "Electric windlass",
  "Solar panels",
  "Chartplotter & AIS",
  "VHF w/ DSC",
  "Hot water & shower",
  "Swim platform",
];

const samples = [
  { title: "Beneteau Oceanis 40.1",    builder: "Beneteau",        model: "Oceanis 40.1",    year: 2021, price: 289000, loa: 40.1, type: "MONOHULL",  locationCity: "Miami",          locationCountry: "USA" },
  { title: "Jeanneau Sun Odyssey 389", builder: "Jeanneau",        model: "Sun Odyssey 389", year: 2017, price: 168500, loa: 38.9, type: "MONOHULL",  locationCity: "Annapolis",      locationCountry: "USA" },
  { title: "Hallberg-Rassy 372",       builder: "Hallberg-Rassy",  model: "372",             year: 2015, price: 325000, loa: 37.2, type: "MONOHULL",  locationCity: "Cowes",          locationCountry: "UK"  },
  { title: "Lagoon 42",                builder: "Lagoon",          model: "42",              year: 2019, price: 479000, loa: 42.0, type: "CATAMARAN", locationCity: "Fort Lauderdale",locationCountry: "USA" },
  { title: "Beneteau First 36",        builder: "Beneteau",        model: "First 36",        year: 2023, price: 345000, loa: 36.0, type: "MONOHULL",  locationCity: "Newport",        locationCountry: "USA" },
  { title: "Jeanneau Sun Odyssey 440", builder: "Jeanneau",        model: "Sun Odyssey 440", year: 2019, price: 299000, loa: 44.0, type: "MONOHULL",  locationCity: "Nice",           locationCountry: "France" },
  { title: "Bavaria C45",              builder: "Bavaria",         model: "C45",             year: 2018, price: 275000, loa: 45.0, type: "MONOHULL",  locationCity: "Palma",          locationCountry: "Spain" },
  { title: "Hanse 458",                builder: "Hanse",           model: "458",             year: 2020, price: 339000, loa: 45.8, type: "MONOHULL",  locationCity: "Zadar",          locationCountry: "Croatia" },
];

async function main() {
  // Listing.ownerId is REQUIRED, so we must ensure a user exists.
  const seedUser = await prisma.user.upsert({
    where: { email: "seed@sailboattrade.com" },
    update: {},
    create: {
      email: "seed@sailboattrade.com",
      name: "Seed User",
      // Your schema requires passwordHash. This is just a placeholder for seed data.
      passwordHash: "seed-do-not-use",
    },
    select: { id: true },
  });

  let idx = 0;

  for (const s of samples) {
    const i = idx++;
    const hero = LOCAL[i % LOCAL.length];

    const data = {
      ownerId: seedUser.id,

      title: s.title,
      description: baseDesc,

      status: "PUBLISHED",
      publishedAt: new Date(),

      price: s.price,
      currency: "USD",

      year: s.year,
      builder: s.builder,
      model: s.model,
      boatCondition: "USED",

      type: s.type,

      loa: s.loa,
      loaUnit: "ft",

      locationCountry: normalizeCountry(s.locationCountry),
      locationCity: s.locationCity,

      heroImageUrl: hero,
      imageUrls: pics(i),
      equipment: baseEquip,

      sellerRole: "BROKER",
      listingContactName: "SailboatTrade Sales",
      contactEmail: "sales@sailboattrade.com",
      contactPhone: "555-555-5555",
      brokerageName: "SailboatTrade",
      brokerageAddress: "Online",
      brokerLogoUrl: "/images/burgee.png",
    };

    const existing = await prisma.listing.findFirst({
      where: { title: data.title, year: data.year },
      select: { id: true },
    });

    if (!existing) {
      await prisma.listing.create({ data });
      console.log(`Created: ${data.title} (${data.year})`);
    } else {
      await prisma.listing.update({
        where: { id: existing.id },
        data,
      });
      console.log(`Updated: ${data.title} (${data.year})`);
    }
  }

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
