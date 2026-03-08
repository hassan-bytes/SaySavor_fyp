import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.join(__dirname, 'public', 'cuisines');

async function processDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            await processDirectory(fullPath);
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            // Process only non-jpg images that are images
            if (['.png', '.webp', '.jfif', '.jpeg', '.tiff', '.bmp'].includes(ext)) {

                const newFileName = path.basename(entry.name, ext) + '.jpg';
                const newFilePath = path.join(dir, newFileName);

                console.log(`Converting: ${entry.name} -> ${newFileName}`);

                try {
                    await sharp(fullPath)
                        .jpeg({ quality: 90 })
                        .toFile(newFilePath);

                    // Optional: Remove original file if successful? 
                    // User said "convert sb ko jpg me", implies replacement.
                    // But for safety, let's keep original for a moment or just delete.
                    // Let's delete to avoid clutter and confusion.
                    fs.unlinkSync(fullPath);
                    console.log(`✅ Converted & Deleted Original: ${entry.name}`);

                } catch (err) {
                    console.error(`❌ Failed to convert ${entry.name}:`, err);
                }
            } else if (ext === '.jpg') {
                // Already jpg, skip
                // console.log(`Skipping (already jpg): ${entry.name}`);
            }
        }
    }
}

console.log("🚀 Starting Image Conversion to JPG...");
if (fs.existsSync(rootDir)) {
    processDirectory(rootDir).then(() => {
        console.log("✨ All done! Images converted to JPG.");
    });
} else {
    console.error(`Directory not found: ${rootDir}`);
}
