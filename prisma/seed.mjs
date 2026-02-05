// prisma/seed.mjs
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Local images (public/boats/)
const LOCAL = [
  "/boats/example-sailboat1.jpg",
  "/boats/example-sailboat2.jpg",
  "/boats/example-sailboat3.jpg",
  "/boats/example-sailboat4.jpg",
];

function fourPics(seedIndex) {
  return LOCAL.map((u, i) => `${u}?v=${seedIndex}-${i}`);
}

const baseDesc =
  "Well-kept cruising sloop with recent upgrades. EU/US shore power ready. Turn-key and ready to sail.";

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
  { title: "Beneteau Oceanis 40.1",    builder: "Beneteau",        model: "Oceanis 40.1",    year: 2021, price: 289000, locationCity: "Miami",           locationCountry: "USA" },
  { title: "Jeanneau Sun Odyssey 389", builder: "Jeanneau",        model: "Sun Odyssey 389", year: 2017, price: 168500, locationCity: "Annapolis",       locationCountry: "USA" },
  { title: "Hallberg-Rassy 372",       builder: "Hallberg-Rassy",  model: "372",             year: 2015, price: 325000, locationCity: "Cowes",           locationCountry: "UK"  },
  { title: "Lagoon 42",                builder: "Lagoon",          model: "42",              year: 2019, price: 479000, locationCity: "Fort Lauderdale", locationCountry: "USA" },
  { title: "Beneteau First 36",        builder: "Beneteau",        model: "First 36",        year: 2023, price: 345000, locationCity: "Newport",         locationCountry: "USA" },
  { title: "Jeanneau Sun Odyssey 440", builder: "Jeanneau",        model: "Sun Odyssey 440", year: 2019, price: 299000, locationCity: "Nice",            locationCountry: "France" },
  { title: "Bavaria C45",              builder: "Bavaria",         model: "C45",             year: 2018, price: 275000, locationCity: "Palma",           locationCountry: "Spain"  },
  { title: "Hanse 458",                builder: "Hanse",           model: "458",             year: 2020, price: 339000, locationCity: "Zadar",           locationCountry: "Croatia" },
  { title: "Dufour 430",               builder: "Dufour",          model: "430",             year: 2019, price: 295000, locationCity: "La Rochelle",     locationCountry: "France" },
  { title: "Catalina 445",             builder: "Catalina",        model: "445",             year: 2016, price: 259000, locationCity: "San Diego",       locationCountry: "USA" },
  { title: "Beneteau Sense 50",        builder: "Beneteau",        model: "Sense 50",        year: 2014, price: 349000, locationCity: "Athens",          locationCountry: "Greece" },
  { title: "Amel 55",                  builder: "Amel",            model: "55",              year: 2013, price: 699000, locationCity: "Marseilles",      locationCountry: "France" },
  { title: "Oyster 545",               builder: "Oyster",          model: "545",             year: 2012, price: 895000, locationCity: "Hamble",          locationCountry: "UK" },
  { title: "X-Yachts X4.3",            builder: "X-Yachts",        model: "X4.3",            year: 2021, price: 545000, locationCity: "Copenhagen",      locationCountry: "Denmark" },
  { title: "Swan 48",                  builder: "Nautor Swan",     model: "48",              year: 2020, price: 1150000, locationCity: "Helsinki",      locationCountry: "Finland" },
  { title: "Fountaine Pajot Saona 47", builder: "Fountaine Pajot", model: "Saona 47",        year: 2018, price: 649000, locationCity: "Tortola",         locationCountry: "BVI" },
];

function withContent(s, idx) {
  const images = fourPics(idx);
  const hero = LOCAL[idx % LOCAL.length];

  // seed “seller” fields using your current schema
  const sellerRole = "BROKER"; // or "OWNER" if you prefer

  return {
    ...s,
    currency: "USD",
    status: "PUBLISHED",

    heroImageUrl: hero,
    imageUrls: images,
    description: baseDesc,
    equipment: baseEquip,

    sellerRole,
    listingContactName: "Seller",
    contactEmail: "sales@sailboattrade.com",
    contactPhone: null,

    // brokerage fields (only make sense when sellerRole === "BROKER")
    brokerageName: sellerRole === "BROKER" ? "SailboatTrade" : null,
    brokerageAddress: null,
    brokerLogoUrl: "/images/burgee.png",
  };
}

async function main() {
  let i = 0;

  for (const s of samples.map((x) => withContent(x, i++))) {
    const existing = await prisma.listing.findFirst({
      where: { title: s.title, year: s.year },
      select: { id: true },
    });

    if (!existing) {
      await prisma.listing.create({ data: s });
      console.log(`Created: ${s.title} (${s.year})`);
    } else {
      await prisma.listing.update({
        where: { id: existing.id },
        data: {
          // keep “identity”
          title: s.title,
          year: s.year,
          builder: s.builder,
          model: s.model,

          // update common fields
          price: s.price,
          currency: s.currency,
          locationCity: s.locationCity,
          locationCountry: s.locationCountry,
          status: "PUBLISHED",

          heroImageUrl: s.heroImageUrl,
          imageUrls: s.imageUrls,
          description: s.description,
          equipment: s.equipment,

          // seller/contact
          sellerRole: s.sellerRole,
          listingContactName: s.listingContactName,
          contactEmail: s.contactEmail,
          contactPhone: s.contactPhone,

          brokerageName: s.brokerageName,
          brokerageAddress: s.brokerageAddress,
          brokerLogoUrl: s.brokerLogoUrl,
        },
      });
      console.log(`Updated: ${s.title} (${s.year})`);
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
