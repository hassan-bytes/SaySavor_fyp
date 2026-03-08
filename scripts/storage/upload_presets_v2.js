import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CONFIGURATION ---
// STRICTLY USE SERVICE KEY FOR ADMIN ACCESS (BYPASS RLS)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xpkpegzwgrwfuotonvnh.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhwa3BlZ3p3Z3J3ZnVvdG9udm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDM3NDc5NCwiZXhwIjoyMDg1OTUwNzk0fQ.yC-iJotauF_pwZ25a-HOoeQOZMTzlXJ2aBFS-0w1GcY'; // Hardcoded for this script only

const BUCKET_NAME = 'preset-images';
const LOCAL_DIR = path.join(__dirname, 'public', 'cuisines');

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
            const ext = path.extname(entry.name).toLowerCase();
            if (ext !== '.jpg') {
                // Skip non-jpgs (should be none after conversion, but safety check)
                return;
            }

            const relativePath = path.relative(LOCAL_DIR, fullPath).replace(/\\/g, '/'); // Ensure forward slashes
            const fileBuffer = fs.readFileSync(fullPath);
            const contentType = 'image/jpeg'; // Everything is JPG now

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

async function main() {
    console.log(`🚀 Starting Batch Upload to bucket: '${BUCKET_NAME}'`);

    // 1. Ensure bucket exists
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) {
        console.error("Error listing buckets:", bucketError);
        return;
    }

    const bucketExists = buckets.find(b => b.name === BUCKET_NAME);
    if (!bucketExists) {
        console.log(`Bucket '${BUCKET_NAME}' does not exist. Creating...`);
        const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
            public: true,
            allowedMimeTypes: ['image/jpeg'], // Restrict to JPG? Or keep generic. Let's keep generic for safety.
            fileSizeLimit: 5242880 // 5MB
        });
        if (createError) {
            console.error("Error creating bucket:", createError);
            return;
        }
        console.log(`✅ Bucket '${BUCKET_NAME}' created.`);
    } else {
        console.log(`ℹ️ Bucket '${BUCKET_NAME}' found.`);
        // OPTIONAL: Empty bucket first? 
        // User said "supabase me b change kr do". 
        // Overwriting (upsert: true) is sufficient and safer than delete-all.
    }

    // 2. Upload Files
    await uploadDirectory(LOCAL_DIR);
    console.log("✨ Upload process completed!");
}

main();
