import os

file_path = "e:/semester 7/saysavor-web/saysavor-golden-voice-main/src/pages/dashboard/MenuManager.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Sync slugify
old_slugify = """            const slugify = (text: string) => {
                return text.trim().toLowerCase().replace(/[()]/g, '').replace(/\./g, '-').replace(/\s+/g, '-').replace(/ñ/g, 'n').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
            };"""
            
new_slugify = """            const slugify = (text: string) => {
                return text.toString().toLowerCase()
                    .replace(/[()]/g, '')
                    .replace(/\./g, '-')
                    .replace(/\s+/g, '-')
                    .replace(/ñ/g, 'n')
                    .replace(/[^a-z0-9-]/g, '')
                    .replace(/-+/g, '-')
                    .replace(/^-+|-+$/g, '')
                    .trim();
            };"""

if old_slugify in content:
    content = content.replace(old_slugify, new_slugify)
else:
    # Try a slightly different variation if the indentation or spacing is off
    print("Direct slugify match failed, trying alternative match...")
    import re
    content = re.sub(r"const slugify = \(text: string\) => \{.*?return text\.trim\(\)\.toLowerCase\(\)\.replace\(/\[\(\)\]/g, ''\)\.replace\(/\./g, '-'\).*?\};", new_slugify, content, flags=re.DOTALL)

# 2. Sync getSafeImg
old_safe_img = """            const getSafeImg = (rawUrl: string | null) => {
                if (!rawUrl) return null;
                if (rawUrl.startsWith('data:')) return rawUrl;
                return `https://wsrv.nl/?url=${encodeURIComponent(rawUrl)}`;
            };"""

new_safe_img = """            const getSafeImg = (rawUrl: string | null) => {
                if (!rawUrl) return null;
                if (rawUrl.startsWith('data:')) return rawUrl;
                // Prevent double encoding
                const decodedUrl = decodeURI(rawUrl);
                return `https://wsrv.nl/?url=${encodeURIComponent(decodedUrl)}`;
            };"""

if old_safe_img in content:
    content = content.replace(old_safe_img, new_safe_img)

# 3. Sync getRealImgSrc
old_get_real = """                if (item.cuisine && item.category && item.name) {
                    const cleanCuisine = item.cuisine.trim();
                    let cleanCategory = item.category.trim();
                    if (cleanCuisine === 'Beverages' && (cleanCategory === 'ColdDrinks' || cleanCategory === 'Cold Drinks')) cleanCategory = 'Cold Drinks';
                    let targetName = item.name.trim();
                    if (targetName.includes('Tex-Mex')) targetName = 'Jalapeno Popper Burgers';
                    const bucket = supabase.storage.from('preset-images');
                    if (cleanCuisine === 'Beverages') {
                        const { data } = bucket.getPublicUrl(`${cleanCuisine}/${cleanCategory}/${slugify(targetName)}.jpg`);
                        return data.publicUrl;
                    }
                    const { data } = bucket.getPublicUrl(`${cleanCuisine}/${cleanCategory}/${targetName}.jpg`);
                    return data.publicUrl;
                }"""

new_get_real = """                if (item.cuisine && item.category && item.name) {
                    const cleanCuisine = item.cuisine.trim();
                    let cleanCategory = item.category.trim();
                    if (cleanCuisine === 'Beverages' && (cleanCategory === 'ColdDrinks' || cleanCategory === 'Cold Drinks')) cleanCategory = 'Cold Drinks';
                    let targetName = item.name.trim();
                    if (targetName.includes('Tex-Mex')) targetName = 'Jalapeno Popper Burgers';
                    const bucket = supabase.storage.from('preset-images');
                    
                    // Beverages and special items always use slugified paths in storage
                    if (cleanCuisine === 'Beverages') {
                        const { data } = bucket.getPublicUrl(`${cleanCuisine}/${cleanCategory}/${slugify(targetName)}.jpg`);
                        return data.publicUrl;
                    }
                    const { data } = bucket.getPublicUrl(`${cleanCuisine}/${cleanCategory}/${targetName}.jpg`);
                    return data.publicUrl;
                }"""

if old_get_real in content:
    content = content.replace(old_get_real, new_get_real)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully synced image logic to MenuManager.tsx")
