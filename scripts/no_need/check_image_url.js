import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xpkpegzwgrwfuotonvnh.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhwa3BlZ3p3Z3J3ZnVvdG9udm5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNzQ3OTQsImV4cCI6MjA4NTk1MDc5NH0.F1cO-Y2JGD79qXmJO30Dk7w0t-9q9X7n3qR-a8a9b8c'; // Generic Anon Key for testing public access

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkUrl() {
    console.log("Generating Public URL for 'Chinese/Main/Beef Chow Mein.jpg'...");

    // 1. Generate URL
    const { data } = supabase.storage
        .from('preset-images')
        .getPublicUrl('Chinese/Main/Beef Chow Mein.jpg');

    const publicUrl = data.publicUrl;
    console.log(`🔗 URL: ${publicUrl}`);

    // 2. Test Fetch
    console.log("Attempting to fetch...");
    try {
        const response = await fetch(publicUrl);
        console.log(`📡 Status: ${response.status} ${response.statusText}`);

        if (response.ok) {
            console.log("✅ Image is ACCESSIBLE publicly.");
            const blob = await response.blob();
            console.log(`📦 Size: ${blob.size} bytes`);
        } else {
            console.error("❌ Image is NOT accessible. Check Bucket Public status or RLS.");
        }
    } catch (err) {
        console.error("❌ Fetch failed:", err);
    }
}

checkUrl();
