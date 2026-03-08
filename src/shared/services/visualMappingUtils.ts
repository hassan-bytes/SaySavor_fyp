// ============================================================
// FILE: visualMappingUtils.ts
// SECTION: shared > services
// PURPOSE: Visual search ke liye mapping utilities.
//          Food names aur visual features ko map karta hai.
// ============================================================
export const MAPPING_DICTIONARY: Record<string, { cuisine: string; category: string }> = {
    // Fast Food
    "burger": { cuisine: "Fast Food", category: "Burgers" },
    "zinger": { cuisine: "Fast Food", category: "Burgers" },
    "cheezor": { cuisine: "Fast Food", category: "Burgers" },
    "monster": { cuisine: "Fast Food", category: "Burgers" },
    "patty": { cuisine: "Fast Food", category: "Burgers" },
    "pizza": { cuisine: "Fast Food", category: "Pizzas" },
    "fries": { cuisine: "Fast Food", category: "Fries" },
    "chips": { cuisine: "Fast Food", category: "Fries" },
    "nuggets": { cuisine: "Fast Food", category: "Fried" },
    "wings": { cuisine: "Fast Food", category: "Fried" },
    "drumsticks": { cuisine: "Fast Food", category: "Fried" },
    "sandwich": { cuisine: "Fast Food", category: "Sandwirches" },
    "club": { cuisine: "Fast Food", category: "Sandwirches" },
    "shawarma": { cuisine: "Fast Food", category: "Sandwirches" },
    "wrap": { cuisine: "Fast Food", category: "Sandwirches" },
    "roll": { cuisine: "Fast Food", category: "Sandwirches" },

    // Desi
    "biryani": { cuisine: "Desi", category: "Rice" },
    "pulao": { cuisine: "Desi", category: "Rice" },
    "tikka": { cuisine: "Desi", category: "BBQ" },
    "kebab": { cuisine: "Desi", category: "BBQ" },
    "kebap": { cuisine: "Desi", category: "BBQ" },
    "seekh": { cuisine: "Desi", category: "BBQ" },
    "karahi": { cuisine: "Desi", category: "Karahi" },
    "handi": { cuisine: "Desi", category: "Karahi" },
    "nihari": { cuisine: "Desi", category: "Specials" },
    "paya": { cuisine: "Desi", category: "Specials" },
    "haleem": { cuisine: "Desi", category: "Specials" },
    "naan": { cuisine: "Desi", category: "Breads" },
    "roti": { cuisine: "Desi", category: "Breads" },
    "paratha": { cuisine: "Desi", category: "Breads" },
    "halwa": { cuisine: "Desi", category: "DESERTS" },
    "kheer": { cuisine: "Desi", category: "DESERTS" },
    "gulab": { cuisine: "Desi", category: "DESERTS" },

    // Beverages
    "coke": { cuisine: "Beverages", category: "Cold Drinks" },
    "pepsi": { cuisine: "Beverages", category: "Cold Drinks" },
    "sprite": { cuisine: "Beverages", category: "Cold Drinks" },
    "fanta": { cuisine: "Beverages", category: "Cold Drinks" },
    "dew": { cuisine: "Beverages", category: "Cold Drinks" },
    "cola": { cuisine: "Beverages", category: "Cold Drinks" },
    "juice": { cuisine: "Beverages", category: "Juices" },
    "shake": { cuisine: "Beverages", category: "Cold Drinks" },
    "tea": { cuisine: "Beverages", category: "Cold Drinks" },
    "coffee": { cuisine: "Beverages", category: "Cold Drinks" },
    "water": { cuisine: "Beverages", category: "Cold Drinks" },

    // Italian
    "pasta": { cuisine: "Italian", category: "Gourmet Pastas" },
    "lasagna": { cuisine: "Italian", category: "Lasagna & Baked Dishes" },
    "spaghetti": { cuisine: "Italian", category: "Gourmet Pastas" },
    "fettuccine": { cuisine: "Italian", category: "Gourmet Pastas" },

    // Chinese
    "chow mein": { cuisine: "Chinese", category: "Main" },
    "manchurian": { cuisine: "Chinese", category: "Main" },
    "soup": { cuisine: "Chinese", category: "Soups" },
};

export const predictVisuals = (name: string, description: string = ""): { cuisine: string; category: string } => {
    const text = (name + " " + description).toLowerCase();

    for (const [keyword, mapping] of Object.entries(MAPPING_DICTIONARY)) {
        if (text.includes(keyword)) {
            return mapping;
        }
    }

    // Default fallbacks
    if (text.includes("drink") || text.includes("bev")) return { cuisine: "Beverages", category: "Cold Drinks" };
    if (text.includes("curry") || text.includes("masala")) return { cuisine: "Desi", category: "Karahi" };

    return { cuisine: "Fast Food", category: "Burgers" }; // Safest default for modern apps
};
