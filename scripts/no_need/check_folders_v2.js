import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xpkpegzwgrwfuotonvnh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhwa3BlZ3p3Z3J3ZnVvdG9udm5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNzQ3OTQsImV4cCI6MjA4NTk1MDc5NH0.orw-RtI6_1bcFX26PbIQngOO-j-jg7oQObGRFEHiCUs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listFolders() {
    const bucketName = 'preset-images';

    console.log(`--- Listing root of ${bucketName} ---`);
    const { data: rootFolders, error: rError } = await supabase.storage.from(bucketName).list('', { limit: 100 });
    if (rError) console.error("Error listing root:", rError);
    else rootFolders.forEach(f => console.log(` - ${f.name}${f.id ? '' : '/'}`));

    const checkDirs = ['Beverages', 'Fast Food', 'Chinese', 'Desi', 'Italian', 'Japanese'];

    for (const dir of checkDirs) {
        console.log(`\n--- Listing ${dir} ---`);
        const { data: subFolders, error: sError } = await supabase.storage.from(bucketName).list(dir, { limit: 100 });
        if (sError) {
            console.log(`Error listing ${dir}:`, sError.message);
        } else {
            subFolders.forEach(f => {
                if (f.id === null) {
                    console.log(` [Folder] ${f.name}`);
                } else {
                    console.log(` [File]   ${f.name}`);
                }
            });
        }
    }

    // Specifically check for Cold Drinks and Burgers
    const specificDirs = ['Beverages/Cold Drinks', 'Fast Food/Burgers'];
    for (const dir of specificDirs) {
        console.log(`\n--- Listing ${dir} ---`);
        const { data: items, error: iError } = await supabase.storage.from(bucketName).list(dir, { limit: 100 });
        if (iError) {
            console.log(`Error listing ${dir}:`, iError.message);
        } else {
            items.forEach(f => console.log(` - ${f.name}`));
        }
    }
}

listFolders();
