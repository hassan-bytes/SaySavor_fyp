import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION ---
const SUPABASE_URL = 'https://xpkpegzwgrwfuotonvnh.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhwa3BlZ3p3Z3J3ZnVvdG9udm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDM3NDc5NCwiZXhwIjoyMDg1OTUwNzk0fQ.yC-iJotauF_pwZ25a-HOoeQOZMTzlXJ2aBFS-0w1GcY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkData() {
    console.log("Checking menu_items data...");

    // Select name, category, cuisine for items that seem to be presets (created recently or matching known names)
    // Let's just dump the last 10 items.
    const { data, error } = await supabase
        .from('menu_items')
        .select('name, category, cuisine')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error("Error fetching data:", error);
    } else {
        console.table(data);
    }
}

checkData();
