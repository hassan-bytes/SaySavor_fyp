import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = 'public/cuisines';
const results = {};

function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            scanDir(fullPath);
        } else {
            // File found
            // Structure: public/cuisines/[Cuisine]/[Category]/File.ext
            // We need relative path from rootDir
            const relativePath = path.relative(rootDir, fullPath);
            const parts = relativePath.split(path.sep);

            if (parts.length >= 3) {
                const fileName = parts.pop();
                const category = parts.pop();
                const cuisine = parts.pop();

                const ext = path.extname(fileName);
                const name = path.basename(fileName, ext);

                if (!results[cuisine]) results[cuisine] = {};
                if (!results[cuisine][category]) results[cuisine][category] = {};

                results[cuisine][category][name] = ext;
            }
        }
    });
}

scanDir(rootDir);
console.log(JSON.stringify(results, null, 2));
