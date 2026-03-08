import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStorage() {
    console.log("--- Checking Buckets ---");
    const { data: buckets, error: bError } = await supabase.storage.listBuckets();
    if (bError) console.error("Error listing buckets:", bError);
    else console.log("Available Buckets:", buckets.map(b => b.name));

    const targetBuckets = ['preset-images', 'preset-dishes'];

    for (const bName of targetBuckets) {
        console.log(`\n--- Searching in Bucket: ${bName} ---`);
        // Try to find Coca Cola
        const { data: files, error: fError } = await supabase.storage.from(bName).list('Beverages/Cold Drinks');
        if (fError) {
            console.log(`Error listing Beverages/Cold Drinks in ${bName}:`, fError.message);
        } else {
            console.log(`Found ${files.length} files in Beverages/Cold Drinks:`);
            files.slice(0, 10).forEach(f => console.log(` - ${f.name}`));
        }

        // Try to find Tex-Mex
        const { data: burgerFiles, error: bgError } = await supabase.storage.from(bName).list('Fast Food/Burgers');
        if (bgError) {
            console.log(`Error listing Fast Food/Burgers in ${bName}:`, bgError.message);
        } else {
            console.log(`Found ${burgerFiles.length} files in Fast Food/Burgers:`);
            burgerFiles.slice(0, 10).forEach(f => console.log(` - ${f.name}`));
        }
    }
}

checkStorage();
