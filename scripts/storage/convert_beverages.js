import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.join(__dirname, 'public', 'Bevrages');

// Filename mapping: Current name -> Standardized name (matching menuPresets.ts)
const FILENAME_MAPPING = {
    // Cold Drinks
    "Coca Cola 330ml can.jfif": "coca-cola-regular.jpg",
    "Coca Cola regular.jfif": "coca-cola-regular.jpg", // duplicate
    "Coca Cola 1 liter.jfif": "coca-cola-1-liter.jpg",
    "Coca Cola 1.5 liter.jfif": "coca-cola-1-5-liter.jpg",
    "Pepsi Regular.jfif": "pepsi-regular.jpg",
    "Pepsi 330ml.jfif": "pepsi-regular.jpg", // duplicate
    "Pepsi 1ltr.jfif": "pepsi-1-liter.jpg",
    "Pepsi 1.5ltr.jfif": "pepsi-1-5-liter.jpg",
    "Sprite Bottle 1 ltr.jfif": "sprite-1-liter.jpg",
    "Sprite Bottle 1.5L.jfif": "sprite-1-5-liter.jpg",
    "FANTA ORANGE 1 ltr.jfif": "fanta-orange-1-liter.jpg",
    "FANTA ORANGE 1.5 ltr.jfif": "fanta-orange-1-5-liter.jpg",
    "Mountain Dew 2L.jfif": "mountain-dew-1-liter.jpg", // Using 2L for 1L

    // Juices
    "Fresh mango juice glass.jfif": "mango-juice-small.jpg",
    "Orange juice glass.jfif": "orange-juice-small.jpg",
    "Apple juice glass.jfif": "apple-juice-small.jpg"
};

// Organize by category for proper folder structure
const CATEGORY_MAPPING = {
    // Cold Drinks
    "coca-cola-regular.jpg": "Cold Drinks",
    "coca-cola-1-liter.jpg": "Cold Drinks",
    "coca-cola-1-5-liter.jpg": "Cold Drinks",
    "pepsi-regular.jpg": "Cold Drinks",
    "pepsi-1-liter.jpg": "Cold Drinks",
    "pepsi-1-5-liter.jpg": "Cold Drinks",
    "sprite-1-liter.jpg": "Cold Drinks",
    "sprite-1-5-liter.jpg": "Cold Drinks",
    "fanta-orange-1-liter.jpg": "Cold Drinks",
    "fanta-orange-1-5-liter.jpg": "Cold Drinks",
    "mountain-dew-1-liter.jpg": "Cold Drinks",

    // Juices
    "mango-juice-small.jpg": "Juices",
    "orange-juice-small.jpg": "Juices",
    "apple-juice-small.jpg": "Juices"
};

async function processDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            await processDirectory(fullPath);
        } else if (entry.isFile()) {
            const standardizedName = FILENAME_MAPPING[entry.name];

            if (standardizedName) {
                const category = CATEGORY_MAPPING[standardizedName];
                const categoryDir = path.join(__dirname, 'public', 'Beverages', category);

                // Create category directory if it doesn't exist
                if (!fs.existsSync(categoryDir)) {
                    fs.mkdirSync(categoryDir, { recursive: true });
                }

                const newFilePath = path.join(categoryDir, standardizedName);

                // Skip if already exists
                if (fs.existsSync(newFilePath)) {
                    console.log(`⏭️  Skipping (already exists): ${standardizedName}`);
                    continue;
                }

                console.log(`Converting: ${entry.name} -> ${category}/${standardizedName}`);

                try {
                    await sharp(fullPath)
                        .jpeg({ quality: 90 })
                        .toFile(newFilePath);

                    console.log(`✅ Converted: ${standardizedName}`);

                } catch (err) {
                    console.error(`❌ Failed to convert ${entry.name}:`, err.message);
                }
            } else {
                console.log(`⚠️  No mapping for: ${entry.name}`);
            }
        }
    }
}

console.log("🚀 Starting Beverage Image Conversion...");
if (fs.existsSync(rootDir)) {
    processDirectory(rootDir).then(() => {
        console.log("✨ All done! Beverage images converted to JPG and organized by category.");
        console.log("📂 Output directory: public/Beverages/");
    });
} else {
    console.error(`❌ Directory not found: ${rootDir}`);
}
