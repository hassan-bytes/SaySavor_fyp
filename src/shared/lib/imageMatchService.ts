// ============================================================
// FILE: imageMatchService.ts
// SECTION: shared > lib
// PURPOSE: Unified image matching service using Supabase 'preset-images' bucket.
//          Renamed from services/imageMatchService.ts to follow modern structure.
// ============================================================
import { supabase } from '@/shared/lib/supabaseClient';

const BUCKET = 'preset-images';
const FOLDERS = ['Beverages', 'Chinese', 'Desi', 'Fast Food', 'Italian', 'Japanese'];

let cachedImagePaths: string[] | null = null;

/**
 * Recursively fetches all files from a Supabase storage bucket, iterating through subfolders.
 */
async function fetchAllFiles(folder = ''): Promise<string[]> {
    try {
        const { data, error } = await supabase.storage.from(BUCKET).list(folder, { limit: 1000 });
        if (error || !data) {
            console.error(`Error fetching folder contents for [${folder}]:`, error);
            return [];
        }

        let allPaths: string[] = [];

        for (const item of data) {
            if (!item.id || item.metadata === null || Object.keys(item.metadata || {}).length === 0) {
                // Determine if it's a folder
                if (item.name !== '.emptyFolder' && item.name !== '.DS_Store') {
                    const subFolderName = folder ? `${folder}/${item.name}` : item.name;
                    const subPaths = await fetchAllFiles(subFolderName);
                    allPaths = [...allPaths, ...subPaths];
                }
            } else {
                // It's a file
                if (item.name !== '.emptyFolder' && item.name !== '.DS_Store') {
                    allPaths.push(folder ? `${folder}/${item.name}` : item.name);
                }
            }
        }
        return allPaths;
    } catch (e) {
        console.error("Failed to list bucket:", e);
        return [];
    }
}

/**
 * Primary function to resolve a preset image based on dish details.
 */
export async function resolvePresetImage(
    itemName: string,
    categoryName: string = "",
    cuisineName: string = ""
): Promise<string | null> {
    try {
        if (!cachedImagePaths) {
            console.log(`Caching ${BUCKET} bucket file list from predefined folders...`);
            let allPaths: string[] = [];
            for (const folder of FOLDERS) {
                const subPaths = await fetchAllFiles(folder);
                allPaths = [...allPaths, ...subPaths];
            }
            cachedImagePaths = allPaths;
            console.log(`Cached ${cachedImagePaths.length} image paths from specified folders.`);
        }

        if (!cachedImagePaths || cachedImagePaths.length === 0) return null;

        const cleanItemName = itemName.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
        const words = cleanItemName.split(/\s+/).filter(w => w.length > 2);

        if (words.length === 0) return null;

        let bestMatchPath: string | null = null;
        let maxScore = 0;

        for (const path of cachedImagePaths) {
            const fileName = path.split('/').pop() || '';
            const cleanFileName = fileName.toLowerCase().replace(/\.[a-z0-9]+$/i, '').replace(/[^a-z0-9\s]/g, ' ');
            const fileWords = cleanFileName.split(/\s+/);

            let score = 0;
            for (const kw of words) {
                if (fileWords.some(fw => fw.includes(kw) || kw.includes(fw))) {
                    score += 1;
                }
            }

            // Category/Cuisine bonus
            if (path.toLowerCase().includes(categoryName.toLowerCase()) || 
                path.toLowerCase().includes(cuisineName.toLowerCase())) {
                score *= 2;
            }

            if (score > maxScore) {
                maxScore = score;
                bestMatchPath = path;
            }
        }

        if (bestMatchPath && maxScore > 0) {
            const { data } = supabase.storage.from(BUCKET).getPublicUrl(bestMatchPath);
            return data.publicUrl;
        }

        return null;
    } catch (error) {
        console.error("Error finding preset image:", error);
        return null;
    }
}

// Keep findBestPresetImage as an alias for shared service compatibility
export const findBestPresetImage = resolvePresetImage;
