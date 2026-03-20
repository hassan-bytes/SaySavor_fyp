// ============================================================
// FILE: imageMatchService.ts
// SECTION: shared > services
// PURPOSE: Image matching service â€” menu items ki images ko scan se match karna.
//          fuzzyMatch aur visualMappingUtils ke saath kaam karta hai.
// ============================================================
import { supabase } from '@/shared/lib/supabaseClient';
import { predictVisuals } from '@/shared/services/visualMappingUtils';

const BUCKET = 'preset-images';
const FOLDERS = ['Beverages', 'Chinese', 'Desi', 'Fast Food', 'Italian', 'Japanese'];const BUCKET_NAME = BUCKET; // Keep for backward compatibility if needed internally

let cachedImagePaths: string[] | null = null;

// The user specifically requested filtering out generic words to ensure highly aggressive keyword matching
const GENERIC_WORDS = new Set([
    'and', 'the', 'with', 'for', 'special', 'regular', 'large', 'small', 'medium', 'extra', 'hot', 'cold', 'spicy', 'mild', 'deal', 'combo'
]);

// Negative keywords used to strictly disqualify conflicting dish types (Legacy approach - partially replaced by Silos)
const NEGATIVE_KEYWORDS = [
    'pizza', 'burger', 'drink', 'fries', 'karahi', 'wrap', 'shake', 'pasta', 'beef', 'chicken', 'fish', 'rice',
    'sandwich', 'roll', 'platter', 'beverage', 'tea', 'coffee', 'water', 'juice', 'soda', 'cake', 'ice cream',
    'dessert', 'soup', 'salad', 'bread', 'naan', 'roti', 'steak', 'wings', 'nuggets', 'shawarma'
];

// --- FUZZY MATCHING HELPERS ---
function getLevenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1)); // deletion
            }
        }
    }
    return matrix[b.length][a.length];
}

function isFuzzyMatch(word1: string, word2: string): boolean {
    if (word1 === word2) return true;
    if (word1.includes(word2) || word2.includes(word1)) return true;
    const distance = getLevenshteinDistance(word1, word2);
    const minLength = Math.min(word1.length, word2.length);
    const maxTypos = minLength > 4 ? 2 : 1;
    return distance <= maxTypos;
}

// --- HARD-LOCKED CATEGORY FOLDERS ---
const CATEGORY_TO_FOLDER: Record<string, string> = {
    'Pizzas': 'Italian',
    'Burgers & Wraps': 'Fast Food',
    'Value Deals': 'Fast Food', // Deals should mostly look for Fast Food images
    'Desi / BBQ': 'Desi',
    'Beverages': 'Beverages',
    'Cold Drinks': 'Beverages',
    'Juices': 'Beverages',
    'Desserts': 'Desi/DESERTS',
    'Fries': 'Fast Food',
    'Pasta': 'Italian',
    'Beef': 'Fast Food',
    'Grilled': 'Fast Food',
    'Sonami': 'Fast Food',
    'Wings': 'Fast Food',
    'Nuggets': 'Fast Food'
};

const CORE_FOODS = [
    'pizza', 'burger', 'wrap', 'fries', 'wings', 'nuggets', 'drink', 'shake', 'cola',
    'pasta', 'karahi', 'tikka', 'sandwich', 'shawarma', 'kheer', 'ice cream', 'cake'
];

/**
 * Recursively fetches all files from a Supabase storage bucket, iterating through subfolders.
 */
async function fetchAllFiles(folder = ''): Promise<string[]> {
    try {
        const { data, error } = await supabase.storage.from(BUCKET_NAME).list(folder, { limit: 1000 });
        if (error || !data) {
            console.error(`Error fetching folder contents for [${folder}]:`, error);
            return [];
        }

        let allPaths: string[] = [];

        for (const item of data) {
            // In Supabase storage, folders don't have an `id` or they have specific metadata
            // Another robust way to check if it's a folder is if it doesn't have an extension
            if (!item.id || item.metadata === null || Object.keys(item.metadata || {}).length === 0) {
                // Determine if it's a folder
                // Saftey check: ignore empty placeholder files like `.emptyFolder`
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
 * Finds the best preset image URL from the bucket based on aggressive keyword matching.
 */
export async function findBestPresetImage(itemName: string, categoryName: string = ""): Promise<string | null> {
    try {
        if (!cachedImagePaths) {
            console.log("Caching preset-dishes bucket file list...");
            cachedImagePaths = await fetchAllFiles();
            console.log(`Cached ${cachedImagePaths.length} image paths.`);
        }

        if (cachedImagePaths.length === 0) return null;

        // 1. Sanitize itemName and categoryName
        const cleanItemName = itemName.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
        const cleanCategoryName = categoryName.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
        const words = cleanItemName.split(/\s+/);
        const categoryWords = cleanCategoryName.split(/\s+/);

        // --- MAP CATEGORY TO STRICT FOLDER ---
        let targetFolder = "";

        // First, check if predictVisuals gives us a hint for Beverages/Italian/etc.
        const { cuisine: predictedCuisine, category: predictedCategory } = predictVisuals(itemName);
        if (predictedCuisine === 'Beverages' || predictedCategory === 'Beverages') {
            targetFolder = 'beverages';
        }

        if (!targetFolder) {
            for (const [appCategory, folderName] of Object.entries(CATEGORY_TO_FOLDER)) {
                if (cleanCategoryName.includes(appCategory.toLowerCase().replace(/[^a-z0-9\s]/g, ' '))) {
                    targetFolder = folderName.toLowerCase();
                    break;
                }
            }
        }

        // If no direct category match, check if itemName implies a category
        if (!targetFolder) {
            for (const [appCategory, folderName] of Object.entries(CATEGORY_TO_FOLDER)) {
                if (words.some(w => isFuzzyMatch(w, appCategory.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')))) {
                    targetFolder = folderName.toLowerCase();
                    break;
                }
            }
        }

        if (!targetFolder) {
            // Final fallback: check for any beverage-like words manually
            const isBev = words.some(w => ['coffee', 'tea', 'drink', 'beverage', 'cola', 'pepsi', 'sprite', 'juice', 'shake'].includes(w));
            if (isBev) targetFolder = 'beverages';
        }

        if (!targetFolder) {
            targetFolder = 'fast food';
            console.log(`No distinct category folder found for '${itemName}'. Defaulting safely to folder: '${targetFolder}'`);
        } else {
            console.log(`Searching for '${itemName}' strictly in folder: '${targetFolder}'`);
        }

        // Extract Core Foods for this item
        const itemCoreFoods = CORE_FOODS.filter(cf => words.some(w => isFuzzyMatch(w, cf)));

        // 2. Filter out generic words
        const keywords = words.filter(w => w.length > 2 && !GENERIC_WORDS.has(w));

        if (keywords.length === 0) {
            keywords.push(...words.filter(w => w.length > 2));
        }

        if (keywords.length === 0) return null;

        let bestMatchPath: string | null = null;
        let maxScore = 0;

        for (const path of cachedImagePaths) {
            const folderPath = path.toLowerCase();
            const fileName = path.split('/').pop() || '';
            const cleanFileName = fileName.toLowerCase().replace(/\.[a-z0-9]+$/i, '').replace(/[^a-z0-9\s]/g, ' ');
            const fileWords = cleanFileName.split(/\s+/);

            // --- STRICT FOLDER FILTERING (THE JAIL) ---
            if (targetFolder) {
                // If the path doesn't start with the target folder, discard immediately.
                // Doing `folderPath.includes` or checking if it starts with the target is required.
                if (!folderPath.startsWith(targetFolder) && !folderPath.includes(`/${targetFolder}/`)) {
                    continue; // 100% ignored.
                }
            }

            // --- STRICT CROSS-CONTAMINATION PENALTY ---
            if (itemCoreFoods.length > 0) {
                let hasConflict = false;
                // If the item IS a pizza, but the file is explicitly named burger, reject it.
                for (const cf of CORE_FOODS) {
                    if (fileWords.some(fw => isFuzzyMatch(fw, cf)) && !itemCoreFoods.includes(cf)) {
                        hasConflict = true;
                        break;
                    }
                }
                if (hasConflict) continue;
            }

            let score = 0;

            // --- KEYWORD BASE SCORE (WITH FUZZY MATCHING) ---
            for (const kw of keywords) {
                if (fileWords.some(fw => isFuzzyMatch(fw, kw))) {
                    score += 1;
                }
            }

            // --- CORE FOOD MATCH BONUS ---
            // If the file explicitly names the specific core food we are looking for, give a massive bonus.
            if (itemCoreFoods.length > 0) {
                for (const cf of itemCoreFoods) {
                    if (fileWords.some(fw => isFuzzyMatch(fw, cf))) {
                        score += 1000;
                    }
                }
            }

            // --- CATEGORY MATCH SCORE ---
            // Tiny point bump if it matches category specific terms
            for (const catWord of categoryWords) {
                if (catWord.length > 2 && !GENERIC_WORDS.has(catWord)) {
                    if (folderPath.includes(catWord) || fileWords.some(fw => isFuzzyMatch(fw, catWord))) {
                        score += 50;
                    }
                }
            }

            // Exact full-name match boost
            if (cleanFileName === cleanItemName && score > 0) {
                score += 100;
            }

            if (score > maxScore) {
                maxScore = score;
                bestMatchPath = path;
            }
        }

        if (bestMatchPath && maxScore > 0) {
            console.log(`Matched '${itemName}' to '${bestMatchPath}' with score: ${maxScore}`);
            const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(bestMatchPath);
            return data.publicUrl;
        }

        console.log(`No match found for '${itemName}'.`);
        return null;

    } catch (error) {
        console.error("Error finding best preset image:", error);
        return null;
    }
}
