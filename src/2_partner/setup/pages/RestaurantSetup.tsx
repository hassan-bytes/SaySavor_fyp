// ============================================================
// FILE: RestaurantSetup.tsx
// SECTION: 2_partner > setup > pages
// PURPOSE: Collects restaurant details after first login.
//          Includes restaurant name, logo, cuisine type, address, and opening hours.
//          Dashboard access is available after this step is complete.
// ROUTE: /restaurant-setup (Protected - logged-in partners only)
// ============================================================
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import {
    ChefHat, Upload, ArrowRight, Clock, Plus,
    Utensils, Check, Image as ImageIcon, X, Loader2, Trash2, LogOut
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/shared/lib/supabaseClient';
import html2canvas from 'html2canvas';
import { v4 as uuidv4 } from 'uuid';
import { formatPrice, getCurrencyFromPhone, CurrencyInfo, DEFAULT_CURRENCY, getCurrencySymbol } from '@/shared/lib/currencyUtils';

import { MENU_PRESETS } from '@/shared/data/menuPresets';

// --- CONFIGURATION ---
// STRICT LOCAL IMAGE STRATEGY
// Cache: folder path → Set of filenames that exist in that folder
const folderFileCache = new Map<string, Set<string>>();
// Cache: full image URL → resolved URL (to avoid repeat lookups)
const resolvedUrlCache = new Map<string, string | null>();

/**
 * Use Supabase list() API to check which files exist in a folder.
 * Unlike HEAD fetch, list() returns JSON — no "Failed to load resource" 404 errors.
 */
export const getFilesInFolder = async (folderPath: string): Promise<Set<string>> => {
    if (folderFileCache.has(folderPath)) return folderFileCache.get(folderPath)!;

    try {
        const { data, error } = await supabase.storage
            .from('preset-images')
            .list(folderPath, { limit: 500 });

        const fileSet = new Set<string>(
            error || !data ? [] : data.filter(f => f.name).map(f => f.name)
        );
        folderFileCache.set(folderPath, fileSet);
        return fileSet;
    } catch {
        const empty = new Set<string>();
        folderFileCache.set(folderPath, empty);
        return empty;
    }
};

export const DynamicFoodImage = ({
    cuisine, category, name, className, manualImage, onClick, id, ext
}: {
    cuisine?: string, category?: string, name: string, className?: string, manualImage?: string | File | null, onClick?: () => void, id?: string, ext?: string
}) => {
    const [imgSrc, setImgSrc] = useState<string>('');
    const [hasError, setHasError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const slugify = (text: string): string => {
        return text.toString().toLowerCase()
            .replace(/[()]/g, '')
            .replace(/\./g, '-')
            .replace(/\s+/g, '-')
            .replace(/ñ/g, 'n')
            .replace(/[^a-z0-9-]/g, '')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '')
            .trim();
    };

    useEffect(() => {
        let cancelled = false;

        // Handle manual images (File objects or valid URLs)
        if (manualImage) {
            if (manualImage instanceof File) {
                const url = URL.createObjectURL(manualImage);
                setImgSrc(url);
                setHasError(false);
                setIsLoading(false);
                return () => { cancelled = true; URL.revokeObjectURL(url); };
            } else if (typeof manualImage === 'string') {
                // Block URLs that will cause CORS (share.google, etc.)
                const blocked = ['share.google', 'drive.google.com/uc'];
                if (blocked.some(b => manualImage.includes(b))) {
                    setHasError(true);
                    setIsLoading(false);
                    return;
                }
                setImgSrc(manualImage);
                setHasError(false);
                setIsLoading(false);
                return;
            }
        }

        if (!cuisine || !category || !name) {
            setHasError(true);
            setIsLoading(false);
            return;
        }

        let cleanCuisine = cuisine.trim() || 'Beverages';
        let cleanCategory = category.trim() || 'Cold Drinks';
        const extension = ext || '.jpg';

        const isBeverage = cleanCuisine === 'Beverages' ||
            cleanCategory.toLowerCase().includes('drink') ||
            cleanCategory.toLowerCase().includes('beverage');

        if (isBeverage) {
            cleanCuisine = 'Beverages';
            cleanCategory = 'Cold Drinks';
        }

        let targetName = name.trim();
        if (targetName.includes('Tex-Mex Jalapeño Popper Burger')) targetName = 'Jalapeno Popper Burgers';

        const folderPath = `${cleanCuisine}/${cleanCategory}`;

        // Build candidate filenames to check
        const candidateFiles: string[] = [];
        if (!isBeverage) {
            candidateFiles.push(`${targetName}${extension}`);
        }
        candidateFiles.push(`${slugify(targetName)}${extension}`);

        const getProxiedUrl = (rawUrl: string) => {
            if (!rawUrl || rawUrl.includes('placeholder')) return rawUrl;
            // Prevent double-proxying
            if (rawUrl.includes('wsrv.nl')) return rawUrl;
            const decodedUrl = decodeURI(rawUrl);
            let encodedUrl = encodeURIComponent(decodedUrl)
                .replace(/\(/g, '%28')
                .replace(/\)/g, '%29');
            return `https://wsrv.nl/?url=${encodedUrl}`;
        };

        // Check which files actually exist using Supabase list() — ZERO 404 errors
        const tryImages = async () => {
            // Check resolved cache first
            const cacheKey = `${folderPath}/${targetName}`;
            if (resolvedUrlCache.has(cacheKey)) {
                const cached = resolvedUrlCache.get(cacheKey);
                if (cached) {
                    if (!cancelled) { setImgSrc(cached); setHasError(false); setIsLoading(false); }
                } else {
                    if (!cancelled) { setHasError(true); setIsLoading(false); }
                }
                return;
            }

            // List files in the folder (cached per folder)
            const existingFiles = await getFilesInFolder(folderPath);
            if (cancelled) return;

            // Check candidates against the folder listing
            for (const fileName of candidateFiles) {
                if (existingFiles.has(fileName)) {
                    const fullPath = `${folderPath}/${fileName}`;
                    const { data } = supabase.storage.from('preset-images').getPublicUrl(fullPath);
                    const proxiedUrl = getProxiedUrl(data.publicUrl);
                    resolvedUrlCache.set(cacheKey, proxiedUrl);
                    if (!cancelled) { setImgSrc(proxiedUrl); setHasError(false); setIsLoading(false); }
                    return;
                }
            }

            // No file found — show placeholder, no network request made
            resolvedUrlCache.set(cacheKey, null);
            if (!cancelled) { setHasError(true); setIsLoading(false); }
        };

        setIsLoading(true);
        setHasError(false);
        tryImages();
        return () => { cancelled = true; };
    }, [cuisine, category, name, manualImage, ext]);

    return (
        <div className={`relative overflow-hidden bg-zinc-900 ${className}`} onClick={onClick} data-item-name={name}>
            {hasError || isLoading ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-800 text-zinc-600">
                    <ImageIcon className="w-8 h-8 opacity-50" />
                    <span className="text-[10px] mt-2 font-mono text-center px-1 truncate w-full">{name}</span>
                </div>
            ) : (
                <img
                    id={id}
                    src={imgSrc}
                    crossOrigin="anonymous"
                    alt={name}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                />
            )}
        </div>
    );
};

const CUISINE_LIST = Object.keys(MENU_PRESETS);

// --- CUSTOM COMPONENTS ---

const TimeDropdown = ({ label, value, options, onChange, id }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: any) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative space-y-2" ref={dropdownRef}>
            <Label htmlFor={id} className="text-zinc-400 text-sm font-medium block">{label}</Label>
            <button
                id={id}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                onClick={() => setIsOpen(!isOpen)}
                className={`relative w-full bg-[#151515] text-white border rounded-xl px-4 py-3 cursor-pointer transition-all flex items-center justify-between
        ${isOpen ? 'border-amber-500 ring-1 ring-amber-500' : 'border-white/10 hover:border-white/20'}`}
            >
                <span className={value ? "text-white" : "text-zinc-500"}>
                    {value || "Select Time"}
                </span>
                <Clock className="w-4 h-4 text-zinc-500" />
            </button>
            {isOpen && (
                <div className="absolute z-50 mb-2 bottom-full w-full bg-[#151515] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden origin-bottom">
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {options.map((time: string) => (
                            <div
                                key={time}
                                onClick={() => {
                                    onChange(time);
                                    setIsOpen(false);
                                }}
                                className={`px-4 py-2 text-sm cursor-pointer transition-colors border-b border-white/5 last:border-0
                  ${value === time ? 'bg-amber-500 text-black font-bold' : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'}
                `}
                            >
                                {time}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- MAIN WIZARD COMPONENT ---

const RestaurantSetup = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        const step = params.get('step');
        return step ? parseInt(step) : 1;
    });
    const [fromSource, setFromSource] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('from');
    });

    // --- STEP 1 & 2 STATE ---
    const [formData, setFormData] = useState({
        name: '', description: '', cuisine: [] as string[], logo: null as File | null, coverImage: null as File | null,
        phone: '', city: '', address: '', opensAt: '', closesAt: '', latitude: '', longitude: '',
    });
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // --- STEP 3 MENU STATE ---
    // Make MENU_PRESETS stateful to allow editing
    const [menuDatabase, setMenuDatabase] = useState(MENU_PRESETS);
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [activeCuisineTab, setActiveCuisineTab] = useState('');
    const [activeCategoryTab, setActiveCategoryTab] = useState('');
    const [showAddCuisineDropdown, setShowAddCuisineDropdown] = useState(false);
    const addCuisineRef = useRef<HTMLDivElement>(null);

    // --- STEP 3 PREVIEW CAPTURE REF ---
    const menuRef = useRef<HTMLDivElement>(null);

    // --- DISH FORM ---
    const [dishForm, setDishForm] = useState({
        name: '', price: '', desc: '', category: '', image: '' as string | File | undefined, isCustom: true
    });

    // --- CUSTOM DISH DIALOG STATE ---
    const [customDishDialogOpen, setCustomDishDialogOpen] = useState(false);
    const [customDishForm, setCustomDishForm] = useState({
        name: '',
        price: '',
        description: '',
        cuisine: '',
        category: '',
        image: null as File | null,
        imagePreview: '' as string,
        isCustom: true
    });

    // --- INITIALIZATION ---
    useEffect(() => {
        const fetchUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.user_metadata) {
                setFormData(prev => ({
                    ...prev,
                    name: user.user_metadata.restaurant_name || prev.name,
                    phone: user.user_metadata.phone || prev.phone
                }));
            }
        };
        fetchUserData();
    }, []);

    // Time Options constant
    const timeOptions = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].flatMap(h => ["00", "15", "30", "45"].map(m => `${h}:${m} AM`))
        .concat([12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].flatMap(h => ["00", "15", "30", "45"].map(m => `${h}:${m} PM`)));

    // --- EFFECT: TAB MANAGMENT ---
    useEffect(() => {
        if (currentStep === 3) {
            if (formData.cuisine.length > 0) {
                if (!activeCuisineTab || !formData.cuisine.includes(activeCuisineTab)) {
                    setActiveCuisineTab(formData.cuisine[0]);
                }
            } else {
                setActiveCuisineTab(Object.keys(menuDatabase)[0]);
            }
        }
    }, [currentStep, formData.cuisine, menuDatabase]);

    useEffect(() => {
        if (activeCuisineTab && (menuDatabase as any)[activeCuisineTab]) {
            const categories = Object.keys((menuDatabase as any)[activeCuisineTab]);
            if (categories.length > 0) {
                setActiveCategoryTab(categories[0]);
                // Init with fallback for custom
                if (dishForm.isCustom) {
                    setDishForm(prev => ({ ...prev, category: categories[0], image: undefined, cuisine: activeCuisineTab }));
                }
            }
        }
    }, [activeCuisineTab, menuDatabase]);

    // Close Dropdown
    useEffect(() => {
        const handleClickOutside = (event: any) => {
            if (addCuisineRef.current && !addCuisineRef.current.contains(event.target)) {
                setShowAddCuisineDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- HELPERS ---
    // Get currency from phone number
    const getCurrency = (): CurrencyInfo => {
        return getCurrencyFromPhone(formData.phone) || DEFAULT_CURRENCY;
    };

    const formatPriceDisplay = (priceStr: string) => {
        // Remove existing symbols and return clean number with new symbol
        const clean = priceStr.replace(/[^0-9.]/g, '');
        return formatPrice(parseFloat(clean) || 0, getCurrency());
    };

    const toNumberOrNull = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return null;
        const num = Number(trimmed);
        return Number.isFinite(num) ? num : null;
    };

    // --- HANDLERS ---

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error('Geolocation is not supported on this device.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude.toFixed(6);
                const lng = pos.coords.longitude.toFixed(6);
                setFormData(prev => ({
                    ...prev,
                    latitude: lat,
                    longitude: lng,
                }));
                toast.success('Location saved.');
            },
            () => {
                toast.error('Unable to access location.');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
            }
        );
    };

    const toggleCuisine = (c: string) => {
        setFormData(prev => ({
            ...prev,
            cuisine: prev.cuisine.includes(c) ? prev.cuisine.filter(x => x !== c) : [...prev.cuisine, c]
        }));
    };

    const handleRemoveCuisine = (c: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setFormData(prev => ({
            ...prev,
            cuisine: prev.cuisine.filter(x => x !== c)
        }));
        if (activeCuisineTab === c && formData.cuisine.length > 1) {
            setActiveCuisineTab(formData.cuisine.find(x => x !== c) || '');
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logo' | 'coverImage') => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData({ ...formData, [field]: file });
            if (field === 'logo') setLogoPreview(URL.createObjectURL(file));
            toast.success("Uploaded!");
        }
    };

    const handleDishImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setDishForm(prev => ({ ...prev, image: file }));
            toast.success("Used local image");
            e.target.value = ''; // Reset so same file can be selected again
        }
    };

    const handleAddMissingCuisine = (c: string) => {
        if (!formData.cuisine.includes(c)) {
            setFormData(prev => ({ ...prev, cuisine: [...prev.cuisine, c] }));
            setActiveCuisineTab(c);
            setShowAddCuisineDropdown(false);
            toast.success(`Added ${c}`);
        }
    };

    // UPDATED: Selection Toggle Logic
    const handlePresetDishClick = (dish: any, category: string) => {
        const alreadySelected = menuItems.some(item => item.name === dish.name);

        if (alreadySelected) {
            // Remove
            setMenuItems(prev => prev.filter(item => item.name !== dish.name));
        } else {
            // Add
            setMenuItems(prev => [...prev, {
                ...dish,
                category: category,
                cuisine: activeCuisineTab, // Validate this is available in scope or pass it in
                id: Date.now(),
            }]);
        }
    };

    // NEW: Handle Price Change for Menu grid cards
    const handlePriceChange = (cuisine: string, category: string, dishName: string, newVal: string) => {
        // Update Database
        setMenuDatabase(prev => ({
            ...prev,
            [cuisine]: {
                ...prev[cuisine as keyof typeof prev],
                [category]: (prev[cuisine as keyof typeof prev] as any)[category].map((dish: any) =>
                    dish.name === dishName ? { ...dish, price: newVal } : dish
                )
            }
        }));

        // Update Selected Menu Items if present
        setMenuItems(prev => prev.map(item =>
            item.name === dishName ? { ...item, price: newVal } : item
        ));
    };

    const handleCustomDishClick = (category?: string) => {
        setDishForm({
            name: '',
            price: '',
            desc: '',
            category: category || activeCategoryTab,
            image: undefined,
            isCustom: true,
            cuisine: activeCuisineTab // Ensure cuisine is tracked
        } as any);
    };

    const handleAddDishToMenu = () => {
        if (!dishForm.name || !dishForm.price) {
            toast.error("Name and Price required");
            return;
        }
        setMenuItems(prev => [...prev, { ...dishForm, id: Date.now() }]);
        toast.success(`Added ${dishForm.name}`);
        setDishForm(prev => ({ ...prev, name: '', price: '', desc: '', isCustom: true, image: undefined }));
    };

    // --- CUSTOM DISH HANDLERS ---
    const handleOpenCustomDishDialog = () => {
        // Set default cuisine to active tab if available
        setCustomDishForm({
            name: '',
            price: '',
            description: '',
            cuisine: activeCuisineTab || formData.cuisine[0] || '',
            category: '',
            image: null,
            imagePreview: '',
            isCustom: true
        });
        setCustomDishDialogOpen(true);
    };

    const handleCustomDishImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCustomDishForm(prev => ({
                ...prev,
                image: file,
                imagePreview: URL.createObjectURL(file)
            }));
            toast.success("Image selected!");
            e.target.value = ''; // Reset
        }
    };

    const handleAddCustomDish = () => {
        // Validation
        if (!customDishForm.name || !customDishForm.price || !customDishForm.cuisine || !customDishForm.category) {
            toast.error("Name, Price, Cuisine, and Category are required");
            return;
        }

        const newDish = {
            name: customDishForm.name,
            price: customDishForm.price,
            desc: customDishForm.description,
            description: customDishForm.description,
            image: customDishForm.image || customDishForm.imagePreview,
            category: customDishForm.category,
            cuisine: customDishForm.cuisine,
            isCustom: true,
            id: Date.now()
        };

        // Update menuDatabase structure
        setMenuDatabase(prev => {
            const updatedDb = { ...prev };

            // Ensure cuisine exists
            if (!updatedDb[customDishForm.cuisine as keyof typeof updatedDb]) {
                updatedDb[customDishForm.cuisine as keyof typeof updatedDb] = {} as any;
            }

            const cuisineData = updatedDb[customDishForm.cuisine as keyof typeof updatedDb] as any;

            // Check if category exists
            if (cuisineData[customDishForm.category]) {
                // Add to existing category
                cuisineData[customDishForm.category] = [
                    ...cuisineData[customDishForm.category],
                    newDish
                ];
            } else {
                // Create new category
                cuisineData[customDishForm.category] = [newDish];
            }

            return updatedDb;
        });

        // Add to menu items for preview
        setMenuItems(prev => [...prev, newDish]);

        toast.success(`Added ${customDishForm.name} to menu!`);
        setCustomDishDialogOpen(false);
    };

    // Validation
    const isStep1Valid = formData.name && formData.cuisine.length > 0;
    const isStep2Valid = formData.city && formData.address && formData.phone && formData.opensAt && formData.closesAt;
    const isStep3Valid = menuItems.length > 0;

    const handleNext = async () => {
        if (currentStep === 1 && isStep1Valid) setCurrentStep(2);
        else if (currentStep === 2 && isStep2Valid) setCurrentStep(3);
        else if (currentStep === 3 && isStep3Valid) {
            // FINISH & SAVE TO SUPABASE
            setLoading(true);
            try {
                // Step A: Check Auth
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error("No user found. Please login.");

                let logoUrl = null;

                // Step B: Upload Logo
                if (formData.logo) {
                    const fileExt = formData.logo.name.split('.').pop();
                    const fileName = `${user.id}/${uuidv4()}.${fileExt}`;

                    const { error: uploadError } = await supabase.storage
                        .from('restaurant-logos')
                        .upload(fileName, formData.logo);

                    if (uploadError) throw uploadError;

                    const { data: urlData } = supabase.storage
                        .from('restaurant-logos')
                        .getPublicUrl(fileName);

                    logoUrl = urlData.publicUrl;
                }

                // Step C: Check/Create Restaurant
                const { data: existingRest } = await supabase
                    .from('restaurants')
                    .select('id')
                    .eq('owner_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                const restaurantPayload = {
                    owner_id: user.id,
                    name: formData.name,
                    description: formData.description, // Updated from bio
                    phone: formData.phone,
                    address: `${formData.address}, ${formData.city}`,
                    latitude: toNumberOrNull(formData.latitude),
                    longitude: toNumberOrNull(formData.longitude),
                    cuisine_type: formData.cuisine,
                    logo_url: logoUrl,
                    opens_at: formData.opensAt,
                    closes_at: formData.closesAt,
                    currency: getCurrency().code, // Store currency code from phone
                    banner_url: null, // Placeholder if needed
                    slug: formData.name.toLowerCase().replace(/ /g, '-') + '-' + user.id.slice(0, 4) // Simple slug generation
                } as any;

                // If exists, add ID to payload to trigger update on primary key
                if (existingRest && (existingRest as any).id) {
                    restaurantPayload.id = (existingRest as any).id;
                }

                const { data: restData, error: restError } = await supabase
                    .from('restaurants')
                    .upsert(restaurantPayload)
                    .select()
                    .single();

                if (restError || !restData) throw restError || new Error('Failed to create restaurant');

                const restaurantId = (restData as any).id;

                // Step D: Handle Categories (Relational Schema)
                // 1. Extract unique categories from menuItems
                const uniqueCategories = Array.from(new Set(menuItems.map(item => item.category)));

                // 2. Insert/Get Categories
                // We use upsert logic or simple check-create. Since it's setup, we can just insert unique ones associated with this restaurant.
                // Note: If restarting setup, we might have duplicates if we don't check. 
                // For simplicity in this 'Setup' phase, we assume distinct names.

                const categoryMap: Record<string, string> = {};

                for (const catName of uniqueCategories) {
                    // Check if exists
                    const { data: existingCat } = await supabase
                        .from('categories')
                        .select('id')
                        .eq('restaurant_id', restaurantId)
                        .eq('name', catName)
                        .maybeSingle();

                    if (existingCat) {
                        categoryMap[catName as string] = (existingCat as any).id;
                    } else {
                        const { data: newCat, error: catError } = await ((supabase as any)
                            .from('categories')
                            .insert({ restaurant_id: restaurantId, name: catName })
                            .select()
                            .single());

                        if (catError) throw catError;
                        if (newCat) categoryMap[catName as string] = (newCat as any).id;
                    }
                }

                // Step E: Prepare & Insert Menu Items with Smart Image Upload
                if (menuItems.length > 0) {
                    const menuItemsPayload = await Promise.all(
                        menuItems.map(async (item) => {
                            let finalImageUrl = null;

                            // Smart Image Handling
                            if (item.image instanceof File) {
                                // Custom upload - upload to Supabase Storage
                                const fileExt = item.image.name.split('.').pop();
                                const fileName = `${user.id}/${uuidv4()}.${fileExt}`;

                                const { error: uploadError } = await supabase.storage
                                    .from('menu-images')
                                    .upload(fileName, item.image);

                                if (!uploadError) {
                                    const { data: urlData } = supabase.storage
                                        .from('menu-images')
                                        .getPublicUrl(fileName);
                                    finalImageUrl = urlData.publicUrl;
                                } else {
                                    console.error('Image upload failed:', uploadError);
                                }
                            }
                            // For preset items (string paths), leave image_url as NULL
                            // DynamicFoodImage will resolve using cuisine + category + name

                            return {
                                restaurant_id: restaurantId,
                                category_id: categoryMap[item.category], // Relational Link
                                name: item.name,
                                price: parseFloat(item.price.replace(/[^0-9.]/g, '')),
                                description: item.desc || item.description || '',
                                image_url: finalImageUrl,
                                cuisine: item.cuisine, // Add cuisine for image path resolution
                                is_available: true,
                                options: null // Future proofing
                            };
                        })
                    );

                    const { error: menuError } = await supabase
                        .from('menu_items')
                        .insert(menuItemsPayload as any);

                    if (menuError) throw menuError;
                }

                // Step F: Complete Setup

                // Update user metadata 
                const { error: authUpdateError } = await supabase.auth.updateUser({
                    data: { setup_complete: true }
                });


                // Update profiles table
                const { error: profileError } = await (supabase
                    .from('profiles') as any)
                    .update({ setup_complete: true })
                    .eq('id', user.id);

                if (profileError) console.warn("Profile update warning:", profileError);

                toast.success("Restaurant Setup Complete!");
                const redirectPath = fromSource === 'menu' ? '/dashboard/menu' : '/dashboard';
                setTimeout(() => navigate(redirectPath), 500);

            } catch (error: any) {
                console.error("Setup Error:", error);
                toast.error(error.message || "Failed to save restaurant data");
            } finally {
                setLoading(false);
            }
        }
    };

    const handleSkipMenu = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user found");

            // Check for existing restaurant
            const { data: existingRest } = await supabase
                .from('restaurants')
                .select('id')
                .eq('owner_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            const skipPayload = {
                owner_id: user.id,
                name: formData.name,
                description: formData.description, // Updated from bio
                phone: formData.phone,
                address: `${formData.address}, ${formData.city}`,
                latitude: toNumberOrNull(formData.latitude),
                longitude: toNumberOrNull(formData.longitude),
                cuisine_type: formData.cuisine,
                opens_at: formData.opensAt,
                closes_at: formData.closesAt,
                currency: getCurrency().code, // Store currency code from phone
                slug: formData.name.toLowerCase().replace(/ /g, '-') + '-' + user.id.slice(0, 4)
            } as any;

            if (existingRest && (existingRest as any).id) {
                skipPayload.id = (existingRest as any).id;
            }

            await supabase
                .from('restaurants')
                .upsert(skipPayload);

            await supabase.auth.updateUser({
                data: { setup_complete: true }
            });

            await (supabase
                .from('profiles') as any)
                .update({ setup_complete: true })
                .eq('id', user.id);

            toast.success("Restaurant profile created! You can add your menu later.");
            const redirectPath = fromSource === 'menu' ? '/dashboard/menu' : '/dashboard';
            setTimeout(() => navigate(redirectPath), 500);
        } catch (error: any) {
            console.error("Skip Error:", error);
            toast.error("Error saving restaurant profile");
        } finally {
            setLoading(false);
        }
    };

    // --- SIGN OUT ---
    const handleSignOut = async () => {
        await supabase.auth.signOut();
        navigate('/auth');
    };

    // --- DOWNLOAD FUNCTION ---
    // --- DOWNLOAD FUNCTION: MULTI-COLUMN GHOST RENDER ---
    const handleDownloadMenu = async () => {
        if (menuItems.length === 0) {
            toast.error("Menu is empty. Add items first.");
            return;
        }

        const dishCount = menuItems.length;
        let width = '700px';
        let columns = 1;
        let gap = '40px';

        // 1. Determine Layout
        if (dishCount >= 25) {
            width = '2000px';
            columns = 3;
            gap = '60px';
        } else if (dishCount >= 12) {
            width = '1400px';
            columns = 2;
            gap = '60px';
        }

        // 2. Create Ghost Container
        const ghost = document.createElement('div');
        ghost.style.position = 'fixed';
        ghost.style.left = '-9999px';
        ghost.style.top = '0';
        ghost.style.zIndex = '-1';
        ghost.style.width = width;
        ghost.style.backgroundColor = '#18181b'; // Zinc-900 like
        ghost.style.color = '#fff';
        ghost.style.padding = '60px';
        ghost.style.fontFamily = 'serif'; // Premium feel
        ghost.style.boxSizing = 'border-box';

        // 3. Construct HTML
        // Group items first
        const grouped = menuItems.reduce((acc: any, item: any) => {
            const cat = item.category || 'Specials';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(item);
            return acc;
        }, {});

        // Helper for image path - DOM SCRAPE STRATEGY
        const getImgSrc = (item: any) => {
            const imgId = `dish-img-${item.name.replace(/\s+/g, '-')}`;
            const visibleImg = document.getElementById(imgId) as HTMLImageElement;

            if (visibleImg && visibleImg.currentSrc) {
                return visibleImg.currentSrc;
            }

            // Fallback logic
            if (item.image) return item.image;
            return "/default-placeholder.jpg";
        };

        let htmlContent = `
            <div style="column-count: ${columns}; column-gap: ${gap}; width: 100%;">
                <!-- Header (Span All) -->
                <div style="break-inside: avoid; column-span: all; text-align: center; margin-bottom: 50px; border-bottom: 2px solid #f59e0b; padding-bottom: 30px;">
                     ${logoPreview ? `<img src="${logoPreview}" style="width: 120px; height: 120px; border-radius: 50%; border: 4px solid #f59e0b; object-fit: cover; margin-bottom: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">` : ''}
                    <h1 style="font-size: 64px; font-weight: 900; color: #fff; margin: 0; text-transform: uppercase; letter-spacing: 4px; line-height: 1;">${formData.name || 'Menu'}</h1>
                    <div style="font-size: 24px; color: #f59e0b; margin-top: 10px; font-style: italic;">${formData.description || 'A culinary journey...'}</div>
                </div>
        `;

        Object.entries(grouped).forEach(([cat, items]: any) => {
            htmlContent += `
                <div style="break-inside: avoid; margin-bottom: 40px;">
                    <h2 style="font-size: 32px; font-weight: bold; color: #f59e0b; border-bottom: 1px solid #3f3f46; padding-bottom: 10px; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 2px;">${cat}</h2>
                    <div style="display: flex; flex-direction: column; gap: 20px;">
            `;

            items.forEach((dish: any) => {
                htmlContent += `
                    <div style="break-inside: avoid; display: flex; align-items: center; background: #27272a; padding: 20px; border-radius: 16px; border: 1px solid #451a03; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
                        <div style="width: 100px; height: 100px; border-radius: 12px; overflow: hidden; flex-shrink: 0; border: 1px solid #52525b; margin-right: 20px; background: #000;">
                            <img src="${getImgSrc(dish)}" 
                                 style="width: 100%; height: 100%; object-fit: cover;" 
                                 onerror="this.onerror=null; this.src='https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800';" />
                        </div>
                        <div style="flex: 1;">
                            <h3 style="font-size: 24px; font-weight: 700; color: #fff; margin: 0 0 5px 0;">${dish.name}</h3>
                             <div style="font-size: 16px; color: #a1a1aa; margin-bottom: 5px; font-style: italic;">${dish.desc || ''}</div>
                            <div style="font-size: 20px; font-weight: 700; color: #f59e0b; font-family: monospace;">${formatPriceDisplay(dish.price)}</div>
                        </div>
                    </div>
                `;
            });

            htmlContent += `</div></div>`;
        });

        htmlContent += `
                <!-- Footer -->
                <div style="break-inside: avoid; column-span: all; text-align: center; margin-top: 40px; border-top: 1px solid #3f3f46; padding-top: 20px; color: #52525b; font-size: 18px; text-transform: uppercase; letter-spacing: 2px;">
                    ${formData.phone} • ${formData.city}
                </div>
            </div>
        `;

        ghost.innerHTML = htmlContent;
        document.body.appendChild(ghost);

        try {
            const canvas = await html2canvas(ghost, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#18181b', // Ensure bg is captured
            } as any);

            const link = document.createElement('a');
            link.download = `${formData.name || 'Menu'}-SaySavor.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            toast.success("Professional Menu Downloaded!");
        } catch (err) {
            console.error("Ghost download failed:", err);
            toast.error("Download failed");
        } finally {
            document.body.removeChild(ghost);
        }
    };

    return (
        <div className="flex h-screen w-full overflow-hidden bg-[#0a0a0a]">
            {/* LEFT PANEL */}
            <div className="w-full md:w-1/2 h-full overflow-y-auto bg-[#0a0a0a] relative custom-scrollbar">
                <div className="flex flex-col justify-center items-center min-h-full py-12 px-4 lg:px-12">
                    <div className="w-full max-w-lg">

                        {/* HEADER */}
                        <div className="mb-8">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20">
                                        <ChefHat className="w-6 h-6 text-amber-500" />
                                    </div>
                                    <div>
                                        <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-200 via-amber-500 to-amber-600 bg-clip-text text-transparent">
                                            Restaurant Setup
                                        </h1>
                                        <p className="text-sm text-gray-400">Step {currentStep} of 3</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleSignOut}
                                    className="text-zinc-500 hover:text-white"
                                >
                                    <LogOut className="w-4 h-4 mr-2" /> Sign Out
                                </Button>
                            </div>
                            {/* Stepper */}
                            <div className="flex items-center gap-2 mb-6">
                                {[1, 2, 3].map(s => (
                                    <div key={s} className={`h-1.5 rounded-full transition-all duration-500 ${currentStep >= s ? 'w-full bg-amber-500' : 'w-full bg-zinc-800'}`} />
                                ))}
                            </div>
                        </div>

                        <AnimatePresence mode="wait">
                            {/* STEP 1 */}
                            {currentStep === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="space-y-6"
                                >
                                    <div>
                                        <Label htmlFor="setup-name" className="text-white mb-2 block">Restaurant Name</Label>
                                        <Input
                                            id="setup-name"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            autoComplete="organization"
                                            className="bg-white/5 border-white/10 text-white h-12 focus:border-amber-500 text-lg"
                                            placeholder="The Golden Spoon"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-white">Cuisine Type</span>
                                            {formData.cuisine.length > 0 && <button onClick={() => setFormData({ ...formData, cuisine: [] })} className="text-xs text-red-400">Clear</button>}
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {CUISINE_LIST.map(c => {
                                                const isSelected = formData.cuisine.includes(c);
                                                return (
                                                    <motion.button
                                                        key={c}
                                                        onClick={() => toggleCuisine(c)}
                                                        className={`p-4 rounded-xl border text-left transition-all ${isSelected ? 'border-amber-500 bg-amber-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                                                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            <span className={`text-sm font-semibold ${isSelected ? 'text-amber-500' : 'text-gray-400'}`}>{c}</span>
                                                            {isSelected && <Check className="w-3 h-3 text-amber-500" strokeWidth={3} />}
                                                        </div>
                                                    </motion.button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="setup-desc" className="text-white mb-2 block">Short Bio</Label>
                                        <Textarea
                                            id="setup-desc"
                                            name="description"
                                            value={formData.description}
                                            onChange={handleInputChange}
                                            className="bg-white/5 border-white/10 text-white resize-none h-24"
                                            placeholder="Story..."
                                        />
                                    </div>

                                    {/* Logo Upload */}
                                    <div className="border border-dashed border-zinc-700 rounded-xl p-6 flex flex-col items-center justify-center text-zinc-500 hover:border-amber-500 hover:text-amber-500 cursor-pointer relative overflow-hidden group">
                                        <input
                                            id="logo-upload"
                                            name="logo"
                                            type="file"
                                            onChange={(e) => handleFileUpload(e, 'logo')}
                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                            aria-label="Upload Restaurant Logo"
                                        />
                                        {logoPreview ? (
                                            <img src={logoPreview} className="w-20 h-20 rounded-full object-cover border-2 border-amber-500" alt="logo" />
                                        ) : (
                                            <>
                                                <Upload className="w-8 h-8 mb-2" />
                                                <span className="text-sm">Upload Logo</span>
                                            </>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* STEP 2 */}
                            {currentStep === 2 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    <div>
                                        <Label htmlFor="setup-city" className="text-white mb-2 block">City</Label>
                                        <Input
                                            id="setup-city"
                                            name="city"
                                            value={formData.city}
                                            onChange={handleInputChange}
                                            autoComplete="address-level2"
                                            className="bg-white/5 border-white/10 text-white h-12"
                                            placeholder="New York"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="setup-address" className="text-white mb-2 block">Address</Label>
                                        <Textarea
                                            id="setup-address"
                                            name="address"
                                            value={formData.address}
                                            onChange={handleInputChange}
                                            autoComplete="street-address"
                                            className="bg-white/5 border-white/10 text-white"
                                            placeholder="Street..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <Label htmlFor="setup-latitude" className="text-white mb-2 block">Latitude</Label>
                                            <Input
                                                id="setup-latitude"
                                                name="latitude"
                                                value={formData.latitude}
                                                onChange={handleInputChange}
                                                className="bg-white/5 border-white/10 text-white h-12"
                                                placeholder="31.5204"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="setup-longitude" className="text-white mb-2 block">Longitude</Label>
                                            <Input
                                                id="setup-longitude"
                                                name="longitude"
                                                value={formData.longitude}
                                                onChange={handleInputChange}
                                                className="bg-white/5 border-white/10 text-white h-12"
                                                placeholder="74.3587"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleUseCurrentLocation}
                                        className="text-xs font-semibold px-4 py-2 rounded-lg transition-all"
                                        style={{ color: '#FF6B35', background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.2)' }}
                                    >
                                        Use current location
                                    </button>
                                    <div>
                                        <Label htmlFor="setup-phone" className="text-white mb-2 block">Phone</Label>
                                        <Input
                                            id="setup-phone"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            autoComplete="tel"
                                            className="bg-white/5 border-white/10 text-white h-12"
                                            placeholder="+1..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <TimeDropdown id="setup-opens-at" label="Opens" value={formData.opensAt} options={timeOptions} onChange={(v: string) => setFormData({ ...formData, opensAt: v })} />
                                        <TimeDropdown id="setup-closes-at" label="Closes" value={formData.closesAt} options={timeOptions} onChange={(v: string) => setFormData({ ...formData, closesAt: v })} />
                                    </div>
                                </motion.div>
                            )}

                            {/* STEP 3 - LOCAL IMAGES POWERED */}
                            {currentStep === 3 && (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    {/* Chip Tabs with Removal */}
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 overflow-x-auto custom-scrollbar flex gap-2 pb-2">
                                            {formData.cuisine.map(c => (
                                                <div key={c} className="relative group">
                                                    <button
                                                        onClick={() => setActiveCuisineTab(c)}
                                                        className={`px-4 py-2 pr-8 rounded-full text-sm font-medium whitespace-nowrap transition-all ${activeCuisineTab === c ? 'bg-amber-500 text-black' : 'bg-white/10 text-gray-400'}`}
                                                    >
                                                        {c}
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleRemoveCuisine(c, e)}
                                                        className={`absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/20 ${activeCuisineTab === c ? 'text-black/50 hover:text-black' : 'text-gray-500 hover:text-white'}`}
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="relative shrink-0" ref={addCuisineRef}>
                                            <button onClick={() => setShowAddCuisineDropdown(!showAddCuisineDropdown)} className="w-10 h-10 rounded-full border border-dashed border-zinc-700 text-zinc-500 flex items-center justify-center hover:text-amber-500"><Plus className="w-5 h-5" /></button>
                                            <AnimatePresence>
                                                {showAddCuisineDropdown && (
                                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-50 p-2 max-h-60 overflow-y-auto">
                                                        {CUISINE_LIST.filter(c => !formData.cuisine.includes(c)).map(c => (
                                                            <button key={c} onClick={() => handleAddMissingCuisine(c)} className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-white/10 rounded block">{c}</button>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    {/* Category Pills */}
                                    <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar">
                                        {(menuDatabase as any)[activeCuisineTab] && Object.keys((menuDatabase as any)[activeCuisineTab]).map(cat => (
                                            <button key={cat} onClick={() => { setActiveCategoryTab(cat); handleCustomDishClick(cat); }} className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase ${activeCategoryTab === cat ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}>{cat}</button>
                                        ))}
                                    </div>

                                    {/* Content Area */}
                                    <div className="space-y-6">
                                        {/* Grid Selection */}
                                        <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 max-h-[280px] overflow-y-auto custom-scrollbar pr-2">
                                            {/* Custom Dish Card */}
                                            <div onClick={handleOpenCustomDishDialog} className="p-3 rounded-xl border border-dashed flex flex-col items-center justify-center text-center cursor-pointer min-h-[100px] border-amber-500/50 hover:border-amber-500 hover:bg-amber-500/5 transition-all">
                                                <Plus className="w-8 h-8 mb-2 text-amber-500" />
                                                <span className="text-xs font-bold text-amber-500">Add Custom Dish</span>
                                                <span className="text-[10px] text-zinc-600 mt-1">Your own creation</span>
                                            </div>

                                            {/* Preset Dishes */}
                                            {(menuDatabase as any)[activeCuisineTab]?.[activeCategoryTab]?.map((dish: any, idx: number) => {
                                                const isSelected = menuItems.some(i => i.name === dish.name);
                                                return (
                                                    <div
                                                        key={idx}
                                                        onClick={() => handlePresetDishClick(dish, activeCategoryTab)}
                                                        className={`p-2 rounded-xl border cursor-pointer flex gap-3 relative overflow-hidden transition-all ${isSelected ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'border-white/5 hover:border-white/20'}`}
                                                    >
                                                        <DynamicFoodImage
                                                            cuisine={activeCuisineTab}
                                                            category={activeCategoryTab}
                                                            name={dish.name}
                                                            // ext prop removed as all are .jpg now
                                                            className="w-16 h-16 rounded-lg shrink-0"
                                                        />
                                                        <div className="flex flex-col justify-center min-w-0 flex-1">
                                                            <h4 className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-zinc-400'} mb-1`}>{dish.name}</h4>
                                                            {/* EDITABLE PRICE INPUT */}
                                                            <div className="flex items-center gap-1 bg-black/40 rounded px-2 py-1 w-fit">
                                                                <span className="text-amber-500 text-xs">{getCurrencySymbol()}</span>
                                                                <input
                                                                    id={`price-${dish.name}`}
                                                                    name={`price-${dish.name}`}
                                                                    type="text"
                                                                    value={dish.price.replace(/[^0-9.]/g, '')}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    onChange={(e) => handlePriceChange(activeCuisineTab, activeCategoryTab, dish.name, e.target.value)}
                                                                    className="w-12 bg-transparent text-amber-500 font-bold text-sm focus:outline-none text-right appearance-none"
                                                                    placeholder="0"
                                                                    aria-label={`Price for ${dish.name}`}
                                                                />
                                                            </div>
                                                        </div>
                                                        {isSelected && <div className="absolute top-1 right-1 bg-amber-500 rounded-full p-0.5"><Check className="w-3 h-3 text-black" /></div>}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Editor (Only for Custom Dish or Manual Entry) */}
                                        {dishForm.isCustom && (
                                            <div className="bg-zinc-900/50 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-xl">
                                                <div className="flex gap-4">
                                                    <div className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0 group border border-white/10">
                                                        <DynamicFoodImage
                                                            cuisine={activeCuisineTab}
                                                            category={activeCategoryTab}
                                                            name={dishForm.name}
                                                            manualImage={typeof dishForm.image === 'string' ? dishForm.image : dishForm.image instanceof File ? URL.createObjectURL(dishForm.image) : undefined}
                                                            className="w-full h-full"
                                                        />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                            <label htmlFor="dish-image-upload" className="p-1.5 bg-white text-black rounded-full hover:scale-110 transition-transform cursor-pointer" title="Upload Local">
                                                                <Upload className="w-4 h-4" />
                                                                <input id="dish-image-upload" name="dishImage" type="file" className="sr-only" onChange={handleDishImageUpload} />
                                                            </label>
                                                        </div>
                                                    </div>

                                                    <div className="flex-1 space-y-3">
                                                        <Input
                                                            id="custom-dish-name"
                                                            name="customDishName"
                                                            value={dishForm.name}
                                                            onChange={(e) => setDishForm({ ...dishForm, name: e.target.value })}
                                                            placeholder="Custom Dish Name"
                                                            className="bg-black/40 border-white/10 text-white h-10 focus:border-amber-500"
                                                            aria-label="Custom Dish Name"
                                                        />
                                                        <div className="flex gap-2">
                                                            <Input
                                                                id="custom-dish-price"
                                                                name="customDishPrice"
                                                                value={dishForm.price}
                                                                onChange={(e) => setDishForm({ ...dishForm, price: e.target.value })}
                                                                placeholder="Price"
                                                                className="bg-black/40 border-white/10 text-white h-10 w-24"
                                                                aria-label="Custom Dish Price"
                                                            />
                                                            <Button onClick={handleAddDishToMenu} className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-bold h-10"><Plus className="w-4 h-4 mr-2" /> Add Custom</Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Summary - Mini List */}
                                    {menuItems.length > 0 && (
                                        <div className="border-t border-white/10 pt-4">
                                            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                                {menuItems.map(item => (
                                                    <div key={item.id} className="shrink-0 w-32 p-2 rounded-xl bg-white/5 border border-white/10 relative group">
                                                        <DynamicFoodImage
                                                            cuisine={item.cuisine}
                                                            category={item.category}
                                                            name={item.name}
                                                            manualImage={item.image}
                                                            className="w-full h-16 rounded-lg mb-2"
                                                        />
                                                        <div className="text-xs text-white truncate font-bold">{item.name}</div>
                                                        <div className="text-amber-500 text-[10px] truncate">{formatPriceDisplay(item.price)}</div>
                                                        <button onClick={() => setMenuItems(prev => prev.filter(i => i.id !== item.id))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100"><X className="w-3 h-3" /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                        </AnimatePresence>

                        <div className="flex gap-4 mt-8 pt-4 border-t border-white/5">
                            {currentStep > 1 && (
                                <Button
                                    onClick={() => {
                                        if (fromSource === 'menu' && currentStep === 3) {
                                            navigate('/dashboard/menu');
                                        } else {
                                            setCurrentStep(p => p - 1);
                                        }
                                    }}
                                    className="w-1/3 bg-white/5 hover:bg-white/10 text-white h-12 rounded-xl"
                                >
                                    Back
                                </Button>
                            )}

                            {currentStep === 3 && (
                                <Button
                                    onClick={() => {
                                        if (fromSource === 'menu') {
                                            navigate('/dashboard/menu');
                                        } else {
                                            handleSkipMenu();
                                        }
                                    }}
                                    variant="ghost"
                                    className="text-zinc-500 hover:text-white"
                                >
                                    {fromSource === 'menu' ? 'Cancel' : 'Skip for now'}
                                </Button>
                            )}

                            <Button onClick={handleNext} disabled={currentStep === 1 ? !isStep1Valid : currentStep === 2 ? !isStep2Valid : false} className={`flex-1 h-12 font-bold rounded-xl ${((currentStep === 1 && isStep1Valid) || (currentStep === 2 && isStep2Valid) || currentStep === 3) ? 'bg-amber-500 hover:bg-amber-600 text-black' : 'bg-zinc-800 text-zinc-600'}`}>
                                {currentStep === 3 ? (fromSource === 'menu' ? 'Save & Return' : 'Finish') : 'Next'} <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        </div>

                    </div>
                </div>
            </div>

            {/* RIGHT PANEL - VISUALS */}
            <div className="hidden lg:flex w-1/2 h-full bg-[#050505] relative items-center justify-center overflow-hidden">
                <AnimatePresence mode="wait">
                    {/* Visuals mapped to steps */}
                    {currentStep === 3 ? (
                        <motion.div
                            key="v3"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="relative w-full h-full flex flex-col justify-center items-center text-center p-6 overflow-hidden"
                        >
                            {/* 1. Background Image Layer with Fallback */}
                            <img
                                src="/restaurant-bg.jpg"
                                onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = "https://images.pexels.com/photos/1579739/pexels-photo-1579739.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
                                }}
                                alt="Ambiance"
                                className="absolute inset-0 w-full h-full object-cover z-0"
                            />

                            {/* 2. Dark Overlay Layer */}
                            <div className="absolute inset-0 bg-black/50 z-10 backdrop-blur-[2px]" />

                            {/* 3. THE CAPTURABLE MENU CARD */}
                            <div
                                ref={menuRef}
                                className="relative z-20 w-full max-w-md bg-zinc-900/95 border border-amber-500/30 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                            >
                                {/* Header */}
                                <div className="p-6 text-center border-b border-white/10 shrink-0 bg-gradient-to-b from-black/50 to-transparent">
                                    <div className="w-24 h-24 rounded-full border-2 border-amber-500 mx-auto mb-3 overflow-hidden bg-black shadow-lg">
                                        {logoPreview ? (
                                            <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                                                <ChefHat className="w-10 h-10 text-amber-500" />
                                            </div>
                                        )}
                                    </div>
                                    <h2 className="text-2xl font-black text-amber-500 leading-tight mb-2 font-serif tracking-wide uppercase">{formData.name || "Your Restaurant"}</h2>
                                    <div className="flex justify-center items-center gap-2 mb-2">
                                        <div className="h-[1px] w-8 bg-amber-500/50"></div>
                                        <span className="text-[10px] text-amber-200 uppercase tracking-[0.2em]">Est. 2025</span>
                                        <div className="h-[1px] w-8 bg-amber-500/50"></div>
                                    </div>
                                    <p className="text-xs text-gray-400 italic line-clamp-2 px-4 font-serif">{formData.description || "A culinary journey..."}</p>
                                </div>

                                {/* Menu List - Grid Layout */}
                                <div className="p-4 overflow-y-auto custom-scrollbar flex-1 text-left space-y-6">
                                    {menuItems.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-40 text-gray-500 text-center space-y-3">
                                            <Utensils className="w-8 h-8 opacity-20" />
                                            <p className="text-sm">Menu is empty.</p>
                                        </div>
                                    ) : (
                                        Object.entries(menuItems.reduce((acc: any, item: any) => {
                                            const cat = item.category || 'Specials';
                                            if (!acc[cat]) acc[cat] = [];
                                            acc[cat].push(item);
                                            return acc;
                                        }, {})).map(([category, items]: any) => (
                                            <div key={category}>
                                                <h3 className="text-white text-sm font-bold uppercase tracking-widest mb-3 border-b-2 border-amber-500/50 pb-1 inline-block">{category}</h3>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {items.map((dish: any) => (
                                                        <div key={dish.id} className="flex gap-2 items-start bg-white/5 p-2 rounded-lg border border-white/5">
                                                            {/* Thumbnail */}
                                                            <div className="w-12 h-12 rounded-md overflow-hidden shrink-0 border border-white/10">
                                                                <DynamicFoodImage
                                                                    id={`dish-img-${dish.name.replace(/\s+/g, '-')}`}
                                                                    cuisine={dish.cuisine}
                                                                    category={dish.category}
                                                                    name={dish.name}
                                                                    manualImage={dish.image}
                                                                    className="w-full h-full"
                                                                />
                                                            </div>
                                                            {/* Content */}
                                                            <div className="min-w-0 flex-1">
                                                                <h4 className="text-white text-xs font-bold truncate leading-tight mb-0.5">{dish.name}</h4>
                                                                <span className="text-amber-500 text-xs font-mono font-bold">{formatPriceDisplay(dish.price)}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="p-3 bg-black text-center border-t border-white/10 text-[10px] text-zinc-500 uppercase tracking-widest flex justify-between items-center px-6">
                                    <span>{formData.phone || "+1 234 567 890"}</span>
                                    <span className="flex items-center gap-1"><span className="text-amber-600">●</span> {formData.city || "City"}</span>
                                </div>
                            </div>

                            {/* 3. FAB Download Button */}
                            <button
                                onClick={handleDownloadMenu}
                                className="absolute bottom-8 right-8 z-50 bg-amber-500 hover:bg-amber-400 text-black p-4 rounded-full shadow-2xl transition-transform hover:scale-110 flex items-center justify-center group"
                                title="Download Menu Card"
                            >
                                <Upload className="w-6 h-6 rotate-180" />
                            </button>

                        </motion.div>
                    ) : (
                        <motion.div
                            key="vGeneral"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="relative w-full h-full flex flex-col justify-center items-center text-center p-6 overflow-hidden"
                        >
                            {/* 1. Background Image Layer with Fallback */}
                            <img
                                src="/restaurant-bg.jpg"
                                onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = "https://images.pexels.com/photos/1579739/pexels-photo-1579739.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
                                }}
                                alt="Ambiance"
                                className="absolute inset-0 w-full h-full object-cover z-0"
                            />

                            {/* 2. Dark Overlay Layer */}
                            <div className="absolute inset-0 bg-black/50 z-10 backdrop-blur-[2px]" />

                            {/* 3. Content Layer (Z-Index 20) */}
                            <div className="relative z-20 flex flex-col items-center max-w-lg w-full">
                                {/* Logo / Icon */}
                                <div className="mb-8 relative group">
                                    <div className="w-36 h-36 rounded-full border-4 border-amber-500/50 flex items-center justify-center bg-black/60 backdrop-blur-md shadow-[0_0_50px_rgba(245,158,11,0.3)] overflow-hidden transition-all duration-500 group-hover:scale-105 group-hover:border-amber-400">
                                        {logoPreview ? (
                                            <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center">
                                                <ChefHat className="w-16 h-16 text-amber-500 mb-1 drop-shadow-lg" />
                                                <span className="text-[10px] uppercase tracking-widest text-amber-200/60 font-semibold">Brand Icon</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Restaurant Name */}
                                <h2 className="text-5xl md:text-6xl font-black text-white mb-6 drop-shadow-2xl tracking-tight leading-none break-words w-full">
                                    {formData.name || "Your Restaurant"}
                                </h2>

                                {/* Story / Quote */}
                                <div className="relative w-full">
                                    <span className="absolute -top-6 -left-4 text-6xl text-amber-500 opacity-80 font-serif leading-none">"</span>
                                    <p className="text-xl md:text-2xl text-gray-100 font-serif italic leading-relaxed drop-shadow-md px-6">
                                        {formData.description || "Where every flavor tells a unique story. We craft culinary experiences that linger in your memory."}
                                    </p>
                                    <span className="absolute -bottom-10 -right-4 text-6xl text-amber-500 opacity-80 font-serif leading-none">"</span>
                                </div>
                            </div>

                            {/* Bottom Tagline */}
                            <div className="absolute bottom-10 left-0 right-0 z-20 pointer-events-none">
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">Live Preview</span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Custom Dish Dialog */}
            <Dialog open={customDishDialogOpen} onOpenChange={setCustomDishDialogOpen}>
                <DialogContent className="bg-obsidian border-white/10 text-white max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold text-gold flex items-center gap-2">
                            <ChefHat className="w-6 h-6" />
                            Add Custom Dish
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Create your own signature dish with custom details
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 mt-4">
                        {/* Name */}
                        <div>
                            <Label htmlFor="custom-dish-name" className="text-white mb-2 block">Dish Name *</Label>
                            <Input
                                id="custom-dish-name"
                                value={customDishForm.name}
                                onChange={(e) => setCustomDishForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="e.g., Chef's Special Pasta"
                                className="bg-white/5 border-white/10 text-white"
                            />
                        </div>

                        {/* Price */}
                        <div>
                            <Label htmlFor="custom-dish-price" className="text-white mb-2 block">Price *</Label>
                            <Input
                                id="custom-dish-price"
                                type="number"
                                value={customDishForm.price}
                                onChange={(e) => setCustomDishForm(prev => ({ ...prev, price: e.target.value }))}
                                placeholder="0.00"
                                className="bg-white/5 border-white/10 text-white"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <Label htmlFor="custom-dish-desc" className="text-white mb-2 block">Description</Label>
                            <Textarea
                                id="custom-dish-desc"
                                value={customDishForm.description}
                                onChange={(e) => setCustomDishForm(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Brief description of your dish..."
                                className="bg-white/5 border-white/10 text-white min-h-[80px]"
                            />
                        </div>

                        {/* Cuisine Selection */}
                        <div>
                            <Label htmlFor="custom-dish-cuisine" className="text-white mb-2 block">Cuisine *</Label>
                            <Select value={customDishForm.cuisine} onValueChange={(value) => setCustomDishForm(prev => ({ ...prev, cuisine: value }))}>
                                <SelectTrigger id="custom-dish-cuisine" className="bg-white/5 border-white/10 text-white">
                                    <SelectValue placeholder="Select cuisine" />
                                </SelectTrigger>
                                <SelectContent className="bg-obsidian border-white/10">
                                    {formData.cuisine.map(cuisine => (
                                        <SelectItem key={cuisine} value={cuisine} className="text-white hover:bg-white/10">
                                            {cuisine}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Category */}
                        <div>
                            <Label htmlFor="custom-dish-category" className="text-white mb-2 block">Category *</Label>
                            <Input
                                id="custom-dish-category"
                                value={customDishForm.category}
                                onChange={(e) => setCustomDishForm(prev => ({ ...prev, category: e.target.value }))}
                                placeholder="e.g., Appetizers, Main Course, Chef's Specials"
                                className="bg-white/5 border-white/10 text-white"
                            />
                            <p className="text-xs text-zinc-500 mt-1">Enter existing category or create a new one</p>
                        </div>

                        {/* Image Upload */}
                        <div>
                            <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-white mb-2 block">Image</span>
                            <div className="flex items-center gap-4">
                                {customDishForm.imagePreview && (
                                    <img src={customDishForm.imagePreview} alt="Preview" className="w-20 h-20 rounded-lg object-cover" />
                                )}
                                <label htmlFor="custom-dish-image" className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-white/20 cursor-pointer hover:border-gold/50 transition-all">
                                    <Upload className="w-4 h-4 text-zinc-500" />
                                    <span className="text-sm text-zinc-400">
                                        {customDishForm.image ? 'Change Image' : 'Upload Image'}
                                    </span>
                                    <input
                                        id="custom-dish-image"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleCustomDishImageUpload}
                                        className="sr-only"
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCustomDishDialogOpen(false)}
                                className="flex-1 border-white/10 text-white hover:bg-white/5"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={handleAddCustomDish}
                                className="flex-1 bg-gold hover:bg-gold-light text-black font-semibold"
                            >
                                Add Dish
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default RestaurantSetup;
