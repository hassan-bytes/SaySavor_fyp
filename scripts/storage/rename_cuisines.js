// Rename all cuisine images to slugified format
// Converts "Bihari Kebab.jpg" -> "bihari-kebab.jpg"

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cuisinesDir = path.join(__dirname, 'public', 'cuisines');

// Slugify function - same as in DynamicFoodImage
const slugify = (text) => {
    return text
        .toLowerCase()
        .replace(/[()]/g, '') // Remove parentheses
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/[^a-z0-9-]/g, '') // Remove special characters
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .trim();
};

// Recursively process all folders
const processDirectory = (dirPath) => {
    const items = fs.readdirSync(dirPath);

    items.forEach(item => {
        const fullPath = path.join(dirPath, item);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
            // Recurse into subdirectory
            processDirectory(fullPath);
        } else if (stats.isFile() && item.endsWith('.jpg')) {
            // Get filename without extension
            const nameWithoutExt = item.replace('.jpg', '');
            const slugifiedName = slugify(nameWithoutExt);
            const newFilename = `${slugifiedName}.jpg`;

            // Only rename if needed
            if (item !== newFilename) {
                const newPath = path.join(dirPath, newFilename);

                try {
                    fs.renameSync(fullPath, newPath);
                    console.log(`✅ Renamed: ${item} -> ${newFilename}`);
                } catch (error) {
                    console.error(`❌ Failed to rename ${item}:`, error.message);
                }
            }
        }
    });
};

console.log('🚀 Starting image rename process...\n');
processDirectory(cuisinesDir);
console.log('\n✨ Done! All images renamed to slugified format.');
