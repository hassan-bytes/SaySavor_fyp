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
            if (ext === '.jpg') {
                const tempPath = fullPath.replace('.jpg', '.temp.jpg');

                try {
                    const metadata = await sharp(fullPath).metadata();

                    // Only resize if width is greater than 400
                    if (metadata.width > 400) {
                        console.log(`Optimizing: ${entry.name} (${metadata.width}px -> 400px)`);

                        await sharp(fullPath)
                            .resize({ width: 400 })
                            .jpeg({ quality: 80, mozjpeg: true }) // Good quality, better compression
                            .toFile(tempPath);

                        // Replace original
                        fs.unlinkSync(fullPath);
                        fs.renameSync(tempPath, fullPath);
                        console.log(`✅ Optimized: ${entry.name}`);
                    } else {
                        console.log(`Skipping (already small): ${entry.name}`);
                    }

                } catch (err) {
                    console.error(`❌ Failed to optimize ${entry.name}:`, err);
                    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
                }
            }
        }
    }
}

console.log("🚀 Starting Image Optimization (Max Width: 400px)...");
if (fs.existsSync(rootDir)) {
    processDirectory(rootDir).then(() => {
        console.log("✨ All done! Images optimized.");
    });
} else {
    console.error(`Directory not found: ${rootDir}`);
}
