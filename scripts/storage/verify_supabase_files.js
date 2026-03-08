import { createClient } from '@supabase/supabase-js';

// STRICTLY USE SERVICE KEY FOR ADMIN ACCESS (BYPASS RLS)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xpkpegzwgrwfuotonvnh.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhwa3BlZ3p3Z3J3ZnVvdG9udm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDM3NDc5NCwiZXhwIjoyMDg1OTUwNzk0fQ.yC-iJotauF_pwZ25a-HOoeQOZMTzlXJ2aBFS-0w1GcY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function listFiles() {
    console.log("Checking 'preset-images' bucket...");

    // Check specific path that is failing
    const pathToCheck = 'Chinese/Main';
    console.log(`Listing files in: ${pathToCheck}`);

    const { data, error } = await supabase.storage
        .from('preset-images')
        .list(pathToCheck, { limit: 100 });

    if (error) {
        console.error("Error:", error);
        return;
    }

    if (data.length === 0) {
        console.log("⚠️ No files found in this folder!");
    } else {
        console.log(`✅ Found ${data.length} files:`);
        data.forEach(f => {
            console.log(` - ${f.name} (${f.metadata.mimetype})`);
        });
    }

    // Also check Desi/DESERTS for comparison (since it works)
    console.log("\nComparing with 'Desi/DESERTS' (Working):");
    const { data: desiData } = await supabase.storage
        .from('preset-images')
        .list('Desi/DESERTS', { limit: 5 });

    if (desiData) {
        desiData.forEach(f => console.log(` - ${f.name}`));
    }
}

listFiles();
