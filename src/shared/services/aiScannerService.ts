// ============================================================
// FILE: aiScannerService.ts
// SECTION: shared > services
// PURPOSE: AI image scanner service.
//          Customer ki photo se menu item match karna.
//          Google Gemini API use hoti hai image analysis ke liye.
// ============================================================
/**
 * Hybrid AI Menu Scanner Service
 * Step 1: OCR - Extract text using OCR.space
 * Step 2: LLM - Parse raw text into structured JSON using OpenRouter Qwen3
 */
import Tesseract from 'tesseract.js';
import { GoogleGenAI } from '@google/genai';
import { getAllPresetNames } from './fuzzyMatch';
import { findBestPresetImage } from '@/shared/services/imageMatchService';

export interface ScannedVariant {
    size_or_type: string;
    price: number;
}

export interface ScannedItem {
    item_name: string;
    description: string;
    dietary_preference: string;
    spice_level: string;
    special_tags: string[];
    variants: ScannedVariant[];
    image_url?: string;
    manualImage?: File | string | null;
}

export interface ScannedSubCategory {
    name: string;
    items: ScannedItem[];
}

export interface ScannedMainCategory {
    main_category: string;
    cuisine_type: string;
    sub_categories: ScannedSubCategory[];
}

export interface ScanResult {
    data: ScannedMainCategory[];
    success: boolean;
    error?: string;
}

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Attempts to repair and clean a JSON string returned by the LLM
 */
const cleanJsonResponse = (jsonStr: string): string => {
    let clean = jsonStr.trim();
    if (clean.startsWith('```json')) clean = clean.replace(/^```json/, '');
    if (clean.startsWith('```')) clean = clean.replace(/^```/, '');
    if (clean.endsWith('```')) clean = clean.slice(0, -3);
    return clean.trim();
};

/**
 * Main Hybrid Scanner Function (Tesseract Local OCR + Google Gemini LLM)
 */
export const scanMenuImage = async (file: File, onProgress?: (status: string) => void): Promise<ScanResult> => {
    const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();

    if (!geminiApiKey) return { data: [], success: false, error: "Gemini API Key is missing in .env" };

    try {
        // --- STEP 1: LOCAL OCR EXTRACTION (TESSERACT.JS) ---
        if (onProgress) onProgress("Initializing Local OCR...");
        console.log("Starting Local Tesseract OCR Extraction...");

        const { data: { text: extractedText } } = await Tesseract.recognize(file, 'eng', {
            logger: m => {
                console.log(m);
                if (m.status === 'recognizing text' && onProgress) {
                    onProgress(`Reading text... ${Math.round(m.progress * 100)}%`);
                }
            }
        });

        if (!extractedText || extractedText.trim().length === 0) {
            throw new Error("No text could be extracted from this image. Please ensure the menu is legible.");
        }

        console.log(`OCR Extracted ${extractedText.length} characters of raw text.`);

        // --- STEP 2: LLM PARSING (Google Gemini 3 Flash) ---
        if (onProgress) onProgress("Structuring Data with AI...");
        console.log("Sending raw text to Gemini for structuring...");

        const presetList = getAllPresetNames().join(', ');

        const systemPrompt = `You are a highly advanced AI data parser for a premium Restaurant SaaS. Parse the raw OCR text from a menu and return ONLY a perfectly formatted JSON array. Extract EVERY SINGLE MINUTE DETAIL including main categories, sub-categories, item names, prices, detailed descriptions (ingredients), dietary tags (Veg/Non-Veg/Vegan), spice levels (Mild/Medium/Hot), and variants/sizes with prices.
Return EXACTLY this JSON structure:
[{
  "main_category": "String",
  "cuisine_type": "String",
  "sub_categories": [{
    "name": "String",
    "items": [{
      "item_name": "String",
      "description": "String",
      "dietary_preference": "String",
      "spice_level": "String",
      "special_tags": ["String"],
      "variants": [{ "size_or_type": "String", "price": Number }]
    }]
  }]
}]
If an item has no variants, output a single variant with size_or_type: 'Regular'.
Return raw JSON only, no markdown blocks.
Known presets (if items closely match, use these exact names): [${presetList}]`;

        const ai = new GoogleGenAI({ apiKey: geminiApiKey });

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `RAW OCR TEXT TO PARSE:\n\n${extractedText}`,
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: "application/json",
                maxOutputTokens: 8192,
                temperature: 0.1
            }
        });

        const textResponse = response.text;

        if (!textResponse) {
            throw new Error("Empty response from Gemini parser.");
        }

        // --- STEP 3: JSON CLEANUP & PARSING ---
        let parsedData: ScannedMainCategory[];
        try {
            const cleanedJson = cleanJsonResponse(textResponse);
            parsedData = JSON.parse(cleanedJson);

            if (!Array.isArray(parsedData)) {
                throw new Error("JSON root is not an array");
            }
        } catch (e: any) {
            console.error("JSON Parsing Error. Raw text:", textResponse);
            throw new Error("AI returned an invalid data format. Please try scanning again.");
        }

        // --- STEP 4: SMART IMAGE AUTO-FILL ---
        if (onProgress) onProgress("Matching preset images...");
        console.log("Starting image keyword matching...");

        for (const mainCat of parsedData) {
            if (!mainCat.sub_categories) continue;
            for (const subCat of mainCat.sub_categories) {
                if (!subCat.items) continue;
                for (const item of subCat.items) {
                    const matchedUrl = await findBestPresetImage(item.item_name, mainCat.main_category || "");
                    if (matchedUrl) {
                        item.image_url = matchedUrl;
                    }
                }
            }
        }

        console.log(`Scan successful: Parsed ${parsedData.length} main categories.`);

        return {
            data: parsedData,
            success: true
        };

    } catch (error: any) {
        console.error("AI Scan Error:", error);
        return {
            data: [],
            success: false,
            error: error.message || "An unexpected error occurred during the scan"
        };
    }
};
