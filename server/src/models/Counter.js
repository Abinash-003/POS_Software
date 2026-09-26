import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model("Counter", counterSchema);

/**
 * Atomically produces gap-free, human readable bill numbers per day,
 * e.g. BILL-20260926-0007.
 */
export async function nextBillNumber(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const scope = `${year}${month}${day}`;

  const counter = await Counter.findByIdAndUpdate(
    `bill:${scope}`,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return `BILL-${scope}-${String(counter.seq).padStart(4, "0")}`;
}

export { Counter };
