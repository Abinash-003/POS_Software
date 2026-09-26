/**
 * Optional sample data so the dashboard, statistics and reports have something
 * to show on a fresh install.
 *
 *   npm run seed:demo    add sample products, stock-in, sales and expenses
 *   npm run seed:reset   remove all business data (accounts and settings stay)
 *
 * Safe to run repeatedly: it resets the business collections first.
 */
import { connectDatabase, disconnectDatabase } from "../config/db.js";
import { bootstrapDatabase } from "../services/bootstrap.js";
import { User } from "../models/User.js";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import { Purchase } from "../models/Purchase.js";
import { Sale } from "../models/Sale.js";
import { Expense } from "../models/Expense.js";
import { Counter } from "../models/Counter.js";
import { round2 } from "../utils/dateRange.js";

const CATALOGUE = [
  ["Aavin Milk 500ml", "ஆவின் பால் 500ml", "MLK-500", "Dairy", "Aavin", 22, 26, "packet", 8],
  ["Idli Rice 5kg", "இட்லி அரிசி 5kg", "RIC-IDL5", "Grocery", "Local", 245, 285, "kg", 4],
  ["Toor Dal 1kg", "துவரம் பருப்பு 1kg", "DAL-TOOR1", "Grocery", "Local", 132, 158, "kg", 5],
  ["Sunflower Oil 1L", "சூரியகாந்தி எண்ணெய் 1L", "OIL-SUN1", "Grocery", "Gold Winner", 138, 162, "litre", 5],
  ["Sugar 1kg", "சர்க்கரை 1kg", "SUG-1", "Grocery", "Local", 42, 50, "kg", 6],
  ["Tea Powder 250g", "தேயிலை தூள் 250g", "TEA-250", "Beverages", "Three Roses", 118, 140, "packet", 5],
  ["Coconut Oil 500ml", "தேங்காய் எண்ணெய் 500ml", "OIL-COC500", "Grocery", "Parachute", 165, 195, "bottle", 4],
  ["Wheat Flour 1kg", "கோதுமை மாவு 1kg", "ATT-1", "Grocery", "Aashirvaad", 52, 62, "kg", 6],
  ["Biscuits Pack", "பிஸ்கட் பாக்கெட்", "BIS-MAR", "Snacks", "Britannia", 22, 30, "packet", 12],
  ["Bath Soap", "குளியல் சோப்பு", "SOP-BTH", "Personal Care", "Lifebuoy", 28, 36, "piece", 10],
  ["Detergent 1kg", "துணி சோப்பு தூள் 1kg", "DET-1", "Household", "Surf Excel", 118, 142, "packet", 4],
  ["Banana (dozen)", "வாழைப்பழம் (டஜன்)", "FRU-BAN", "Fruits", "Local", 38, 50, "other", 5],
  ["Tomato 1kg", "தக்காளி 1kg", "VEG-TOM", "Vegetables", "Local", 24, 34, "kg", 5],
  ["Bread Loaf", "பிரெட்", "BAK-BRD", "Bakery", "Modern", 32, 40, "piece", 6],
];

const EXPENSES = [
  ["Electricity bill", 1850, "electricity", 12],
  ["Shop rent", 9000, "rent", 20],
  ["Auto transport for stock", 450, "transport", 6],
  ["Helper wages", 2400, "staff", 9],
  ["Weighing scale repair", 600, "maintenance", 15],
  ["Cleaning supplies", 320, "other", 3],
  ["Electricity bill", 1740, "electricity", 42],
];

const PAYMENTS = ["cash", "cash", "cash", "upi", "upi", "card", "other"];

function daysAgo(days, hour = 10, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

/** Deterministic pseudo-random so repeated runs produce comparable numbers. */
function makeRandom(seed = 7) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

async function clearBusinessData() {
  await Promise.all([
    Sale.deleteMany({}),
    Purchase.deleteMany({}),
    Expense.deleteMany({}),
    Product.deleteMany({}),
    Counter.deleteMany({}),
  ]);
}

async function seedDemo() {
  const admin = await User.findOne({ role: "admin" });
  const categories = await Category.find();
  const categoryByName = new Map(categories.map((category) => [category.nameEn, category._id]));

  await clearBusinessData();

  // ------------------------------- products -------------------------------
  const products = await Product.insertMany(
    CATALOGUE.map(
      ([nameEn, nameTa, sku, category, brand, purchasePrice, sellingPrice, unit, minimumStock]) => ({
        nameEn,
        nameTa,
        sku,
        brand,
        category: categoryByName.get(category) || null,
        purchasePrice,
        sellingPrice,
        unit,
        minimumStock,
        stock: 0,
      })
    )
  );
  console.log(`[demo] ${products.length} products`);

  // ------------------------- opening stock purchases -----------------------
  const random = makeRandom();
  const purchases = [];

  for (const product of products) {
    // Opening stock, then a mid-period restock, so the stock-in screen and the
    // purchase totals both look like a fortnight of real trading.
    const opening = Math.round(90 + random() * 90);
    const restock = Math.round(40 + random() * 50);

    purchases.push({
      product: product._id,
      productNameEn: product.nameEn,
      productNameTa: product.nameTa,
      quantity: opening,
      purchasePrice: product.purchasePrice,
      totalCost: round2(product.purchasePrice * opening),
      supplier: "Opening stock",
      date: daysAgo(14, 9),
      stockBefore: 0,
      stockAfter: opening,
      createdBy: admin?._id || null,
    });
    purchases.push({
      product: product._id,
      productNameEn: product.nameEn,
      productNameTa: product.nameTa,
      quantity: restock,
      purchasePrice: product.purchasePrice,
      totalCost: round2(product.purchasePrice * restock),
      supplier: product.brand || "Local supplier",
      date: daysAgo(6, 10),
      stockBefore: opening,
      stockAfter: opening + restock,
      createdBy: admin?._id || null,
    });

    product.stock = opening + restock;
  }

  await Purchase.insertMany(purchases);
  await Promise.all(products.map((product) => product.save()));
  console.log(`[demo] ${purchases.length} stock-in entries`);

  // --------------------------------- sales --------------------------------
  const sales = [];
  let billSequence = new Map();

  for (let day = 13; day >= 0; day -= 1) {
    // Weekends are busier, like a real neighbourhood shop.
    const weekday = daysAgo(day).getDay();
    const busy = weekday === 0 || weekday === 6;
    const billsToday = (busy ? 22 : 14) + Math.floor(random() * 8);

    for (let bill = 0; bill < billsToday; bill += 1) {
      const createdAt = daysAgo(day, 9 + Math.floor(random() * 11), Math.floor(random() * 60));
      const lineCount = 2 + Math.floor(random() * 5);

      const chosen = new Map();
      for (let line = 0; line < lineCount; line += 1) {
        const product = products[Math.floor(random() * products.length)];
        const quantity = 1 + Math.floor(random() * 3);
        if (product.stock - (chosen.get(product) || 0) < quantity) continue;
        chosen.set(product, (chosen.get(product) || 0) + quantity);
      }
      if (chosen.size === 0) continue;

      const items = [];
      let subtotal = 0;
      let cost = 0;
      let unitsCount = 0;

      for (const [product, quantity] of chosen) {
        const lineTotal = round2(product.sellingPrice * quantity);
        const lineCost = round2(product.purchasePrice * quantity);
        subtotal = round2(subtotal + lineTotal);
        cost = round2(cost + lineCost);
        unitsCount += quantity;
        product.stock = round2(product.stock - quantity);

        items.push({
          product: product._id,
          nameEn: product.nameEn,
          nameTa: product.nameTa,
          sku: product.sku,
          unit: product.unit,
          quantity,
          sellingPrice: product.sellingPrice,
          purchasePrice: product.purchasePrice,
          total: lineTotal,
          profit: round2(lineTotal - lineCost),
        });
      }

      const stamp = `${createdAt.getFullYear()}${String(createdAt.getMonth() + 1).padStart(2, "0")}${String(
        createdAt.getDate()
      ).padStart(2, "0")}`;
      const sequence = (billSequence.get(stamp) || 0) + 1;
      billSequence.set(stamp, sequence);

      sales.push({
        billNumber: `BILL-${stamp}-${String(sequence).padStart(4, "0")}`,
        items,
        itemsCount: items.length,
        unitsCount,
        subtotal,
        discount: 0,
        total: subtotal,
        cost,
        profit: round2(subtotal - cost),
        paymentMethod: PAYMENTS[Math.floor(random() * PAYMENTS.length)],
        customerName: "",
        customerPhone: "",
        createdBy: admin?._id || null,
        createdAt,
        updatedAt: createdAt,
      });
    }
  }

  await Sale.insertMany(sales);
  await Promise.all(products.map((product) => product.save()));

  // Keep the live counter ahead of the generated bill numbers.
  for (const [stamp, sequence] of billSequence) {
    await Counter.findByIdAndUpdate(`bill:${stamp}`, { seq: sequence }, { upsert: true });
  }
  console.log(`[demo] ${sales.length} sales across 14 days`);

  // ------------------------------- expenses -------------------------------
  await Expense.insertMany(
    EXPENSES.map(([name, amount, category, day]) => ({
      name,
      amount,
      category,
      date: daysAgo(day, 11),
      createdBy: admin?._id || null,
    }))
  );
  console.log(`[demo] ${EXPENSES.length} expenses`);

  // Push a few products into the low-stock band so the alerts screen is useful.
  const [first, second, third] = products;
  first.stock = Math.max(first.minimumStock - 1, 1);
  second.stock = 0;
  third.stock = third.minimumStock;
  await Promise.all([first.save(), second.save(), third.save()]);
  console.log("[demo] 3 products moved into the low / out-of-stock band");
}

async function run() {
  const mode = process.argv[2] === "reset" ? "reset" : "demo";

  await connectDatabase();
  await bootstrapDatabase();

  if (mode === "reset") {
    await clearBusinessData();
    console.log("[demo] business data cleared (users and settings kept)");
  } else {
    await seedDemo();
    console.log("[demo] done — sign in and open the dashboard");
  }

  await disconnectDatabase();
  process.exit(0);
}

run().catch((error) => {
  console.error("[demo] failed:", error);
  process.exit(1);
});
