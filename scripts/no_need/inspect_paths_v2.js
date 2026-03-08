import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xpkpegzwgrwfuotonvnh.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhwa3BlZ3p3Z3J3ZnVvdG9udm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDM3NDc5NCwiZXhwIjoyMDg1OTUwNzk0fQ.yC-iJotauF_pwZ25a-HOoeQOZMTzlXJ2aBFS-0w1GcY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function inspectFailingPaths() {
    const paths = [
        'Beverages/Cold Drinks',
        'Fast Food/Burgers'
    ];

    for (const path of paths) {
        console.log(`\n--- Listing: ${path} ---`);
        const { data, error } = await supabase.storage
            .from('preset-images')
            .list(path, { limit: 100 });

        if (error) {
            console.error(`Error listing ${path}:`, error);
            continue;
        }

        if (data && data.length > 0) {
            data.forEach(f => console.log(` - ${f.name}`));
        } else {
            console.log("No files found.");
        }
    }
}

inspectFailingPaths();
