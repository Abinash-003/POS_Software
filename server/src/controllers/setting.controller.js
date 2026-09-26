import { asyncHandler } from "../utils/asyncHandler.js";
import { asText, asBool } from "../utils/parse.js";
import { Setting } from "../models/Setting.js";
import { removeUploadedImage } from "../middleware/upload.js";

const TEXT_FIELDS = [
  "shopNameEn",
  "shopNameTa",
  "phone",
  "addressEn",
  "addressTa",
  "gstin",
  "taglineEn",
  "taglineTa",
  "billFooterEn",
  "billFooterTa",
];

export const getSettings = asyncHandler(async (_req, res) => {
  const shop = await Setting.getShop();
  res.json({ settings: shop });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const shop = await Setting.getShop();
  const previousLogo = shop.logo;

  for (const field of TEXT_FIELDS) {
    if (req.body[field] !== undefined) shop[field] = asText(req.body[field], shop[field]);
  }

  if (req.uploadedImage) shop.logo = req.uploadedImage;
  else if (asBool(req.body.removeLogo)) shop.logo = "";

  await shop.save();
  if (previousLogo && previousLogo !== shop.logo) removeUploadedImage(previousLogo);

  res.json({ settings: shop });
});
