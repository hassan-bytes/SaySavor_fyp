
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sxyvgetkwmuikmjkyabd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4eXZnZXRrd211aWttamt5YWJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTc0MDksImV4cCI6MjA4NTA5MzQwOX0.x_0Xa43YmcSIf5PVz4WZOFceS0TsWj0iYfYvkswFrcU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkProfile() {
    const email = 'hassansajid098@gmail.com';
    console.log(`Checking profile for: ${email}`);

    const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .maybeSingle();

    if (error) {
        console.error('Error fetching profile:', error);
    } else {
        console.log('Query successful.');
        if (data) {
            console.log('Profile FOUND:', data);
        } else {
            console.log('Profile NOT FOUND (returned null). User exists per user claim, so RLS is likely blocking read access.');
        }
    }
}

checkProfile();
