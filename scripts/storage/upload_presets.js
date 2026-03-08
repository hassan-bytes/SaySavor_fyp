import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- CONFIGURATION ---
const SUPABASE_URL = 'https://xpkpegzwgrwfuotonvnh.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhwa3BlZ3p3Z3J3ZnVvdG9udm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDM3NDc5NCwiZXhwIjoyMDg1OTUwNzk0fQ.yC-iJotauF_pwZ25a-HOoeQOZMTzlXJ2aBFS-0w1GcY';

const BUCKET_NAME = 'preset-images';
const LOCAL_DIR = 'public/cuisines'; // Path relative to project root

// --- SETUP ---
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function uploadDirectory(dir) {
    if (!fs.existsSync(dir)) {
        console.error(`❌ Directory not found: ${dir}`);
        return;
    }
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            await uploadDirectory(fullPath);
        } else {
            // It's a file
            const relativePath = path.relative(LOCAL_DIR, fullPath).replace(/\\/g, '/'); // Ensure forward slashes
            const fileBuffer = fs.readFileSync(fullPath);
            const contentType = getContentType(entry.name);

            console.log(`Uploading: ${relativePath}...`);

            const { data, error } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(relativePath, fileBuffer, {
                    contentType: contentType,
                    upsert: true
                });

            if (error) {
                console.error(`❌ Failed to upload ${relativePath}:`, error.message);
            } else {
                console.log(`✅ Uploaded: ${relativePath}`);
            }
        }
    }
}

function getContentType(filename) {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
        case '.jpg':
        case '.jpeg':
        case '.jfif':
        case '.pjpeg':
        case '.pjp': return 'image/jpeg';
        case '.png': return 'image/png';
        case '.webp': return 'image/webp';
        case '.svg': return 'image/svg+xml';
        case '.gif': return 'image/gif';
        case '.avif': return 'image/avif';
        case '.ico': return 'image/x-icon';
        case '.bmp': return 'image/bmp';
        case '.tiff': return 'image/tiff';
        default: return 'application/octet-stream';
    }
}

async function main() {
    console.log(`🚀 Starting upload to bucket: ${BUCKET_NAME}`);
    console.log(`Using Project: ${SUPABASE_URL}`);

    // 1. Check if bucket exists
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
        console.error("Error listing buckets (Check URL/Key):", error.message);
        return;
    }

    if (!buckets.find(b => b.name === BUCKET_NAME)) {
        console.log(`Bucket '${BUCKET_NAME}' not found. Creating...`);
        const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, { public: true });
        if (createError) {
            console.error("Failed to create bucket:", createError.message);
            return;
        }
    }

    // 2. Start Upload
    try {
        await uploadDirectory(LOCAL_DIR);
        console.log("\n🎉 All uploads completed!");
    } catch (err) {
        console.error("Script failed:", err);
    }
}

main();
