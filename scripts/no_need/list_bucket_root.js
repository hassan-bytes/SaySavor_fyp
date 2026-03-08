import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xpkpegzwgrwfuotonvnh.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhwa3BlZ3p3Z3J3ZnVvdG9udm5oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDM3NDc5NCwiZXhwIjoyMDg1OTUwNzk0fQ.yC-iJotauF_pwZ25a-HOoeQOZMTzlXJ2aBFS-0w1GcY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function listRoot() {
    console.log("Listing root of 'preset-images' bucket:");
    const { data, error } = await supabase.storage
        .from('preset-images')
        .list('', { limit: 100 });

    if (error) {
        console.error("Error:", error);
        return;
    }

    data.forEach(f => {
        console.log(` - ${f.name} (${f.id ? 'Folder' : 'File'})`);
    });
}

listRoot();
