import rateLimit from "express-rate-limit";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { asText, asEnum } from "../utils/parse.js";

const LANGS = ["en", "ta"];

export const translateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "tooManyAttempts" },
});

/**
 * Keep brand codes / acronyms (MNB, SKU123) intact so MyMemory does not
 * drop or rewrite them into unrelated Tamil.
 */
function protectProperNouns(text) {
  const tokens = [];
  const masked = text.replace(/\b([A-Z]{2,}[A-Z0-9]*)\b/g, (match) => {
    const index = tokens.length;
    tokens.push(match);
    return `⟦${index}⟧`;
  });
  return { masked, tokens };
}

function restoreProperNouns(text, tokens) {
  let result = text;
  tokens.forEach((token, index) => {
    result = result.replace(new RegExp(`⟦\\s*${index}\\s*⟧`, "g"), token);
    result = result.replace(new RegExp(`\\[\\[\\s*${index}\\s*\\]\\]`, "g"), token);
  });
  return result;
}

async function translateChunk(chunk, from, to) {
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", chunk);
  url.searchParams.set("langpair", `${from}|${to}`);

  let data;
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    data = await response.json();
  } catch {
    throw ApiError.server("translateFailed");
  }

  const translated = data?.responseData?.translatedText;
  if (!translated || Number(data.responseStatus) !== 200) {
    throw ApiError.server("translateFailed");
  }

  return translated;
}

/**
 * On-demand EN ↔ TA translation for bilingual form fields.
 * Uses the free MyMemory API so the shop never needs a paid key.
 */
export const translateText = asyncHandler(async (req, res) => {
  const text = asText(req.body.text);
  const from = asEnum(req.body.from, LANGS, "en");
  const to = asEnum(req.body.to, LANGS, "ta");

  if (!text) throw ApiError.badRequest("required");
  if (from === to) return res.json({ text });

  const source = text.trim();
  const { masked, tokens } = from === "en" ? protectProperNouns(source) : { masked: source, tokens: [] };

  // MyMemory caps a single request around 500 characters.
  const chunks = [];
  for (let i = 0; i < masked.length; i += 450) {
    chunks.push(masked.slice(i, i + 450));
  }

  const parts = [];
  for (const chunk of chunks) {
    parts.push(await translateChunk(chunk, from, to));
  }

  const joined = parts.join(" ").trim();
  const result = restoreProperNouns(joined, tokens).trim();

  res.json({ text: result || source, from, to });
});
