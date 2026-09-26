import { config } from "../config/env.js";
import { User } from "../models/User.js";
import { Category } from "../models/Category.js";
import { Product } from "../models/Product.js";
import { Setting } from "../models/Setting.js";

const DEFAULT_CATEGORIES = [
  { nameEn: "Grocery", nameTa: "மளிகை" },
  { nameEn: "Dairy", nameTa: "பால் பொருட்கள்" },
  { nameEn: "Beverages", nameTa: "பானங்கள்" },
  { nameEn: "Snacks", nameTa: "சிற்றுண்டி" },
  { nameEn: "Personal Care", nameTa: "தனிப்பட்ட பராமரிப்பு" },
  { nameEn: "Household", nameTa: "வீட்டு பொருட்கள்" },
  { nameEn: "Bakery", nameTa: "பேக்கரி" },
  { nameEn: "Fruits", nameTa: "பழங்கள்" },
  { nameEn: "Vegetables", nameTa: "காய்கறிகள்" },
  { nameEn: "Other", nameTa: "மற்றது" },
];

/**
 * MongoDB cannot change the options of an existing index, and Mongoose will not
 * drop one for you. Databases created by an earlier version of this app carry a
 * `sparse` unique index on `barcode`, which wrongly rejects a second product
 * saved without a barcode. Drop it so the partial index takes over.
 */
async function reconcileProductIndexes() {
  try {
    const indexes = await Product.collection.indexes();
    const barcodeIndex = indexes.find((index) => index.name === "barcode_1");

    if (barcodeIndex && !barcodeIndex.partialFilterExpression) {
      await Product.collection.dropIndex("barcode_1");
      console.log("[seed] replaced the outdated barcode index");
    }

    await Product.syncIndexes();
  } catch (error) {
    // Never block start-up on index housekeeping.
    console.warn("[seed] could not reconcile product indexes:", error.message);
  }
}

/**
 * Idempotent first-boot setup: owner account, starter categories, shop profile.
 */
export async function bootstrapDatabase() {
  await reconcileProductIndexes();

  const userCount = await User.estimatedDocumentCount();

  if (userCount === 0) {
    const passwordHash = await User.hashPassword(config.seed.password);
    await User.create({
      username: config.seed.username,
      passwordHash,
      role: "admin",
      name: config.seed.name,
    });
    console.log(`[seed] created admin "${config.seed.username}" / "${config.seed.password}"`);
  }

  const categoryCount = await Category.estimatedDocumentCount();
  if (categoryCount === 0) {
    await Category.insertMany(DEFAULT_CATEGORIES);
    console.log(`[seed] inserted ${DEFAULT_CATEGORIES.length} default categories`);
  }

  await Setting.getShop();
}
