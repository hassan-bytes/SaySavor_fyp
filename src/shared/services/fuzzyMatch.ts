// ============================================================
// FILE: fuzzyMatch.ts
// SECTION: shared > services
// PURPOSE: Fuzzy text matching â€” approximate string matching.
//          Customer jo bolwe ya type kare, menu item se match karna.
// ============================================================
import { MENU_PRESETS } from '@/shared/data/menuPresets';

/**
 * Fuzzy name matching utility.
 * Matches AI-scanned dish names to preset dish names from menuPresets.ts
 * so that the correct image can be loaded from Supabase storage.
 */

// Flatten all preset names into a searchable list with their cuisine/category
export interface PresetMatch {
    name: string;
    cuisine: string;
    category: string;
    score: number;
}

// Build a flat list of all preset dish names on first call, then cache it
let _flatPresets: { name: string; cuisine: string; category: string; tokens: string[] }[] | null = null;

const getFlatPresets = () => {
    if (_flatPresets) return _flatPresets;
    _flatPresets = [];
    for (const [cuisine, categories] of Object.entries(MENU_PRESETS)) {
        for (const [category, dishes] of Object.entries(categories as Record<string, any[]>)) {
            for (const dish of dishes) {
                _flatPresets.push({
                    name: dish.name,
                    cuisine,
                    category,
                    tokens: tokenize(dish.name)
                });
            }
        }
    }
    return _flatPresets;
};

/**
 * Tokenize a name into lowercase alphanumeric words for comparison.
 * "Coca Cola (1.5 Liter)" -> ["coca", "cola", "1", "5", "liter"]
 */
const tokenize = (text: string): string[] => {
    return text.toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length > 0);
};

/**
 * Calculate similarity between two strings using token overlap (Jaccard-like).
 * Returns a score between 0 and 1.
 */
const tokenSimilarity = (tokensA: string[], tokensB: string[]): number => {
    if (tokensA.length === 0 || tokensB.length === 0) return 0;

    const setA = new Set(tokensA);
    const setB = new Set(tokensB);

    let intersection = 0;
    for (const t of setA) {
        if (setB.has(t)) intersection++;
    }

    const union = new Set([...setA, ...setB]).size;
    return union > 0 ? intersection / union : 0;
};

/**
 * Levenshtein distance between two strings (for short string comparison).
 */
const levenshtein = (a: string, b: string): number => {
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;

    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
};

/**
 * Combined similarity score using both token overlap and Levenshtein.
 * Weighted: 60% token similarity, 40% normalized Levenshtein.
 */
const combinedSimilarity = (scannedName: string, presetName: string, presetTokens: string[]): number => {
    const scannedTokens = tokenize(scannedName);

    // Token overlap score (Jaccard)
    const tokenScore = tokenSimilarity(scannedTokens, presetTokens);

    // Normalized Levenshtein (on lowercased full strings)
    const a = scannedName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const b = presetName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const maxLen = Math.max(a.length, b.length);
    const levScore = maxLen > 0 ? 1 - levenshtein(a, b) / maxLen : 0;

    return tokenScore * 0.6 + levScore * 0.4;
};

/**
 * Find the best matching preset name for a scanned item name.
 * 
 * @param scannedName - The raw name from AI scanning
 * @param cuisine - Optional cuisine hint to narrow search
 * @param category - Optional category hint to narrow search
 * @param threshold - Minimum similarity score (0-1), default 0.65
 * @returns The best matching preset or null if no good match found
 */
export const findBestPresetMatch = (
    scannedName: string,
    cuisine?: string,
    category?: string,
    threshold: number = 0.65
): PresetMatch | null => {
    const presets = getFlatPresets();

    let bestMatch: PresetMatch | null = null;
    let bestScore = 0;

    for (const preset of presets) {
        // If cuisine/category hints are given, prioritize same cuisine/category
        let bonus = 0;
        if (cuisine && preset.cuisine.toLowerCase() === cuisine.toLowerCase()) bonus += 0.1;
        if (category && preset.category.toLowerCase() === category.toLowerCase()) bonus += 0.05;

        const score = combinedSimilarity(scannedName, preset.name, preset.tokens) + bonus;

        if (score > bestScore) {
            bestScore = score;
            bestMatch = {
                name: preset.name,
                cuisine: preset.cuisine,
                category: preset.category,
                score: score
            };
        }
    }

    if (bestMatch && bestMatch.score >= threshold) {
        return bestMatch;
    }

    return null;
};

/**
 * Get a flat list of all preset dish names (for passing to AI prompt).
 */
export const getAllPresetNames = (): string[] => {
    return getFlatPresets().map(p => p.name);
};

/**
 * Normalize a scanned item: tries to match it to a preset and returns
 * the corrected name + cuisine + category. If no match, returns original.
 */
export const normalizeScannedItem = (
    item: { name: string; cuisine?: string; category?: string }
): { name: string; cuisine: string; category: string; wasMatched: boolean } => {
    const match = findBestPresetMatch(item.name, item.cuisine, item.category);

    if (match) {
        return {
            name: match.name,
            cuisine: match.cuisine,
            category: match.category,
            wasMatched: true
        };
    }

    return {
        name: item.name,
        cuisine: item.cuisine || 'Fast Food',
        category: item.category || 'Burgers',
        wasMatched: false
    };
};
