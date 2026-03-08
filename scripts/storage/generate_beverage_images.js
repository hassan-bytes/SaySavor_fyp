import Anthropic from "@anthropic-ai/sdk";
import fs from "fs/promises";
import path from "path";
import { createClient } from "@supabase/supabase-js";

/**
 * BEVERAGE IMAGE GENERATOR
 * Uses Claude 3.5 Sonnet with image generation capability
 * to create realistic beverage images for menu items
 */

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || "YOUR_SUPABASE_URL";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || "YOUR_SUPABASE_SERVICE_KEY";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "YOUR_ANTHROPIC_API_KEY";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// All beverages that need images
const BEVERAGES = {
    "Cold Drinks": [
        { name: "Coca Cola (Regular)", filename: "coca-cola-regular.jpg", prompt: "Professional product photo of a Coca-Cola 330ml can on white background, studio lighting, high quality" },
        { name: "Coca Cola (1 Liter)", filename: "coca-cola-1-liter.jpg", prompt: "Professional product photo of a 1 Liter Coca-Cola bottle on white background, studio lighting" },
        { name: "Coca Cola (1.5 Liter)", filename: "coca-cola-1-5-liter.jpg", prompt: "Professional product photo of a 1.5 Liter Coca-Cola bottle on white background" },
        { name: "Pepsi (Regular)", filename: "pepsi-regular.jpg", prompt: "Professional product photo of a Pepsi 330ml can on white background, studio lighting" },
        { name: "Pepsi (1 Liter)", filename: "pepsi-1-liter.jpg", prompt: "Professional product photo of a 1 Liter Pepsi bottle on white background" },
        { name: "Pepsi (1.5 Liter)", filename: "pepsi-1-5-liter.jpg", prompt: "Professional product photo of a 1.5 Liter Pepsi bottle on white background" },
        { name: "Sprite (Regular)", filename: "sprite-regular.jpg", prompt: "Professional product photo of a Sprite 330ml can on white background, studio lighting" },
        { name: "Sprite (1 Liter)", filename: "sprite-1-liter.jpg", prompt: "Professional product photo of a 1 Liter Sprite bottle on white background" },
        { name: "7UP (Regular)", filename: "7up-regular.jpg", prompt: "Professional product photo of a 7UP 330ml can on white background, studio lighting" },
        { name: "7UP (1 Liter)", filename: "7up-1-liter.jpg", prompt: "Professional product photo of a 1 Liter 7UP bottle on white background" },
        { name: "Fanta Orange (Regular)", filename: "fanta-orange-regular.jpg", prompt: "Professional product photo of a Fanta Orange 330ml can on white background, studio lighting" },
        { name: "Fanta Orange (1 Liter)", filename: "fanta-orange-1-liter.jpg", prompt: "Professional product photo of a 1 Liter Fanta Orange bottle on white background" },
        { name: "Mountain Dew (Regular)", filename: "mountain-dew-regular.jpg", prompt: "Professional product photo of a Mountain Dew 330ml can on white background, studio lighting" },
        { name: "Mountain Dew (1 Liter)", filename: "mountain-dew-1-liter.jpg", prompt: "Professional product photo of a 1 Liter Mountain Dew bottle on white background" },
        { name: "Mirinda (Regular)", filename: "mirinda-regular.jpg", prompt: "Professional product photo of a Mirinda 330ml can on white background, studio lighting" },
        { name: "Mirinda (1 Liter)", filename: "mirinda-1-liter.jpg", prompt: "Professional product photo of a 1 Liter Mirinda bottle on white background" },
    ],
    "Juices": [
        { name: "Mango Juice (Small)", filename: "mango-juice-small.jpg", prompt: "Professional photo of fresh mango juice in a 250ml glass, vibrant orange color, white background, studio lighting" },
        { name: "Mango Juice (Large)", filename: "mango-juice-large.jpg", prompt: "Professional photo of fresh mango juice in a 500ml glass, vibrant orange color, white background" },
        { name: "Orange Juice (Small)", filename: "orange-juice-small.jpg", prompt: "Professional photo of freshly squeezed orange juice in a 250ml glass, bright orange color, white background" },
        { name: "Orange Juice (Large)", filename: "orange-juice-large.jpg", prompt: "Professional photo of freshly squeezed orange juice in a 500ml glass, bright orange color" },
        { name: "Apple Juice (Small)", filename: "apple-juice-small.jpg", prompt: "Professional photo of fresh apple juice in a 250ml glass, golden color, white background, studio lighting" },
        { name: "Apple Juice (Large)", filename: "apple-juice-large.jpg", prompt: "Professional photo of fresh apple juice in a 500ml glass, golden color, white background" },
        { name: "Pineapple Juice (Small)", filename: "pineapple-juice-small.jpg", prompt: "Professional photo of fresh pineapple juice in a 250ml glass, yellow color, white background" },
        { name: "Pineapple Juice (Large)", filename: "pineapple-juice-large.jpg", prompt: "Professional photo of fresh pineapple juice in a 500ml glass, yellow color" },
        { name: "Mixed Fruit Juice", filename: "mixed-fruit-juice.jpg", prompt: "Professional photo of colorful mixed fruit juice in a 350ml glass, white background, studio lighting" },
        { name: "Watermelon Juice", filename: "watermelon-juice.jpg", prompt: "Professional photo of fresh watermelon juice in a glass, pink-red color, white background" },
    ],
    "Energy Drinks": [
        { name: "Red Bull (Regular)", filename: "red-bull-regular.jpg", prompt: "Professional product photo of a Red Bull 250ml can on white background, studio lighting" },
        { name: "Red Bull (Large)", filename: "red-bull-large.jpg", prompt: "Professional product photo of a Red Bull 355ml can on white background" },
        { name: "Monster Energy (Regular)", filename: "monster-energy-regular.jpg", prompt: "Professional product photo of a Monster Energy 500ml can on white background" },
        { name: "Monster Energy (Large)", filename: "monster-energy-large.jpg", prompt: "Professional product photo of a Monster Energy 710ml can on white background" },
        { name: "Sting Energy", filename: "sting-energy.jpg", prompt: "Professional product photo of a Sting Energy 330ml can on white background, yellow can" },
        { name: "Gatorade (Regular)", filename: "gatorade-regular.jpg", prompt: "Professional product photo of a Gatorade 500ml bottle on white background, blue liquid" },
        { name: "Gatorade (Large)", filename: "gatorade-large.jpg", prompt: "Professional product photo of a 1 Liter Gatorade bottle on white background" },
    ],
    "Water": [
        { name: "Mineral Water (Small)", filename: "mineral-water-small.jpg", prompt: "Professional product photo of a 500ml mineral water bottle on white background, clear bottle" },
        { name: "Mineral Water (Large)", filename: "mineral-water-large.jpg", prompt: "Professional product photo of a 1.5 Liter mineral water bottle on white background" },
        { name: "Sparkling Water (Small)", filename: "sparkling-water-small.jpg", prompt: "Professional product photo of a 330ml sparkling water bottle on white background, elegant glass bottle" },
        { name: "Sparkling Water (Large)", filename: "sparkling-water-large.jpg", prompt: "Professional product photo of a 750ml sparkling water bottle on white background" },
    ],
    "Specialty Drinks": [
        { name: "Iced Coffee (Small)", filename: "iced-coffee-small.jpg", prompt: "Professional photo of iced coffee in a 250ml glass, dark coffee with ice cubes, white background" },
        { name: "Iced Coffee (Large)", filename: "iced-coffee-large.jpg", prompt: "Professional photo of iced coffee in a 500ml glass, dark coffee with ice cubes" },
        { name: "Iced Tea (Small)", filename: "iced-tea-small.jpg", prompt: "Professional photo of iced tea in a 250ml glass, brown tea with ice and lemon, white background" },
        { name: "Iced Tea (Large)", filename: "iced-tea-large.jpg", prompt: "Professional photo of iced tea in a 500ml glass, brown tea with ice" },
        { name: "Lemonade (Small)", filename: "lemonade-small.jpg", prompt: "Professional photo of fresh lemonade in a 250ml glass, yellow color with lemon slices, white background" },
        { name: "Lemonade (Large)", filename: "lemonade-large.jpg", prompt: "Professional photo of fresh lemonade in a 500ml glass, yellow color with lemon slices" },
        { name: "Mint Margarita", filename: "mint-margarita.jpg", prompt: "Professional photo of mint margarita in a glass, green color with mint leaves, white background" },
        { name: "Lassi (Sweet)", filename: "lassi-sweet.jpg", prompt: "Professional photo of sweet lassi in a glass, white creamy yogurt drink, traditional Pakistani beverage" },
        { name: "Lassi (Salty)", filename: "lassi-salty.jpg", prompt: "Professional photo of salty lassi in a glass, white yogurt drink with foam, traditional drink" },
        { name: "Mango Lassi", filename: "mango-lassi.jpg", prompt: "Professional photo of mango lassi in a glass, yellow-orange creamy drink, traditional beverage" },
    ]
};

/**
 * NOTE: Claude cannot directly generate images via API yet.
 * This script provides the STRUCTURE for image generation.
 * 
 * RECOMMENDED ALTERNATIVES:
 * 1. Use Stability AI (stable-diffusion-xl-1024-v1-0)
 * 2. Use DALL-E 3 (OpenAI)
 * 3. Use Midjourney (Discord bot)
 * 4. Download from Unsplash/Pexels (free stock photos)
 * 
 * Below is an example using DALL-E 3:
 */

import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "YOUR_OPENAI_API_KEY"
});

async function generateImage(prompt, filename) {
    try {
        console.log(`🎨 Generating: ${filename}...`);

        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: "1024x1024",
            quality: "standard",
            style: "natural" // More realistic, less artistic
        });

        const imageUrl = response.data[0].url;

        // Download image
        const imageResponse = await fetch(imageUrl);
        const arrayBuffer = await imageResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        return buffer;
    } catch (error) {
        console.error(`❌ Error generating ${filename}:`, error.message);
        return null;
    }
}

async function uploadToSupabase(buffer, category, filename) {
    const filePath = `Beverages/${category}/${filename}`;

    try {
        const { data, error } = await supabase.storage
            .from("preset-images")
            .upload(filePath, buffer, {
                contentType: "image/jpeg",
                upsert: true
            });

        if (error) throw error;

        console.log(`✅ Uploaded: ${filePath}`);
        return true;
    } catch (error) {
        console.error(`❌ Upload failed for ${filename}:`, error.message);
        return false;
    }
}

async function main() {
    console.log("🚀 Starting Beverage Image Generation...\n");

    let totalGenerated = 0;
    let totalUploaded = 0;

    for (const [category, items] of Object.entries(BEVERAGES)) {
        console.log(`\n📂 Category: ${category}`);

        for (const item of items) {
            // Generate image
            const buffer = await generateImage(item.prompt, item.filename);

            if (!buffer) {
                console.log(`⏭️  Skipping ${item.filename} due to generation error`);
                continue;
            }

            totalGenerated++;

            // Upload to Supabase
            const uploaded = await uploadToSupabase(buffer, category, item.filename);
            if (uploaded) totalUploaded++;

            // Rate limit: Wait 1 second between requests
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    console.log("\n✨ Generation Complete!");
    console.log(`📊 Stats: ${totalGenerated} generated, ${totalUploaded} uploaded`);
}

// Run the script
main().catch(console.error);
