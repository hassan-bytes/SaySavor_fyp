import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xpkpegzwgrwfuotonvnh.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhwa3BlZ3p3Z3J3ZnVvdG9udm5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNzQ3OTQsImV4cCI6MjA4NTk1MDc5NH0.orw-RtI6_1bcFX26PbIQngOO-j-jg7oQObGRFEHiCUs';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const beveragesDir = path.join(__dirname, 'public', 'Beverages');

async function uploadFile(filePath, category, fileName) {
    const storageFilePath = `Beverages/${category}/${fileName}`;

    try {
        const fileBuffer = fs.readFileSync(filePath);

        const { data, error } = await supabase.storage
            .from('preset-images')
            .upload(storageFilePath, fileBuffer, {
                contentType: 'image/jpeg',
                upsert: true // Overwrite if exists
            });

        if (error) {
            console.error(`❌ Failed to upload ${fileName}:`, error.message);
            return false;
        }

        console.log(`✅ Uploaded: ${storageFilePath}`);
        return true;
    } catch (err) {
        console.error(`❌ Error uploading ${fileName}:`, err.message);
        return false;
    }
}

async function uploadCategory(categoryPath) {
    const categoryName = path.basename(categoryPath);
    const files = fs.readdirSync(categoryPath);

    console.log(`\n📂 Uploading category: ${categoryName}`);

    let uploaded = 0;

    for (const file of files) {
        if (file.endsWith('.jpg')) {
            const filePath = path.join(categoryPath, file);
            const success = await uploadFile(filePath, categoryName, file);
            if (success) uploaded++;

            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    console.log(`✨ ${categoryName}: ${uploaded}/${files.length} uploaded`);
    return uploaded;
}

async function main() {
    console.log('🚀 Starting Beverage Images Upload to Supabase...\n');

    if (!fs.existsSync(beveragesDir)) {
        console.error(`❌ Directory not found: ${beveragesDir}`);
        console.log('💡 Tip: Run convert_beverages.js first to create organized folders');
        return;
    }

    const categories = fs.readdirSync(beveragesDir, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);

    if (categories.length === 0) {
        console.error('❌ No category folders found in public/Beverages/');
        return;
    }

    let totalUploaded = 0;

    for (const category of categories) {
        const categoryPath = path.join(beveragesDir, category);
        const count = await uploadCategory(categoryPath);
        totalUploaded += count;
    }

    console.log(`\n✨ Upload Complete!`);
    console.log(`📊 Total images uploaded: ${totalUploaded}`);
    console.log(`\n✅ Your beverages are now live on Supabase!`);
    console.log(`🔗 Check: Supabase Dashboard > Storage > preset-images > Beverages/`);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
