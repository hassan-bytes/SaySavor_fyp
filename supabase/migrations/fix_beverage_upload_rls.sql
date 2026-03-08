-- Fix RLS Policy for Beverage Image Uploads
-- Run this in Supabase SQL Editor

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated uploads to preset-images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to preset-images" ON storage.objects;

-- Allow authenticated users to upload to preset-images bucket
CREATE POLICY "Allow authenticated uploads to preset-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'preset-images'
);

-- Also allow public read access
CREATE POLICY "Public read access to preset-images"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'preset-images'
);

-- Verify policies were created
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage';
