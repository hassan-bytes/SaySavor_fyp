// ============================================================
// FILE: QRBuilder.tsx
// SECTION: 2_partner > dashboard > pages
// PURPOSE: Restaurant ka QR code generate karna.
//          Customer yeh scan karke menu dekhta hai.
// ROUTE: /dashboard/qr
// ============================================================
import React, { useState, useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '@/shared/lib/supabaseClient';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Download, QrCode, Grid2X2, Save, Wand2, PlusCircle, X, Image as ImageIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmModal from '@/2_partner/dashboard/components/ConfirmModal';
import { useRestaurant } from '@/shared/contexts/RestaurantContext';

const QRBuilder = () => {
    const { currencySymbol, currencyCode, restaurantName } = useRestaurant();
    const [restaurantId, setRestaurantId] = useState<string>('');
    const [tables, setTables] = useState<number[]>([1]);
    const [newTableNo, setNewTableNo] = useState<number | ''>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        action: () => void;
    }>({ isOpen: false, title: '', message: '', action: () => { } });

    // We will use an array of refs to target each QR canvas for download
    const qrRefs = useRef<(HTMLDivElement | null)[]>([]);

    const MAX_TABLES = 8;

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // Get restaurant ID first
                const { data: restaurant } = await supabase
                    .from('restaurants')
                    .select('id')
                    .eq('owner_id', user.id)
                    .single();

                if (restaurant) {
                    const restId = (restaurant as any).id;
                    setRestaurantId(restId);

                    // Load tables from restaurant_tables database table (not user_metadata)
                    const { data: tablesData, error: tablesError } = await supabase
                        .from('restaurant_tables')
                        .select('table_number')
                        .eq('restaurant_id', restId)
                        .order('table_number', { ascending: true });

                    if (tablesError) {
                        console.error('Error fetching tables:', tablesError);
                        // If table doesn't exist yet, start with empty array
                        setTables([]);
                    } else if (tablesData && tablesData.length > 0) {
                        // Extract table numbers from database
                        const tableNumbers = tablesData.map(t => t.table_number);
                        setTables(tableNumbers);
                    } else {
                        // No tables created yet
                        setTables([]);
                    }
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    const baseUrl = window.location.origin;

    const saveTablesToDB = async (updatedTables: number[]) => {
        if (!restaurantId) {
            toast.error('Restaurant ID not found');
            return;
        }

        setSaving(true);
        try {
            // Insert new tables into restaurant_tables (generic for any restaurant)
            const tablesToInsert = updatedTables.map(tableNum => ({
                restaurant_id: restaurantId,
                table_number: tableNum,
                capacity: 4
            }));

            const { error } = await supabase
                .from('restaurant_tables')
                .upsert(tablesToInsert, {
                    onConflict: 'restaurant_id,table_number',
                    ignoreDuplicates: false
                });

            if (error) throw error;
            toast.success(`Tables configuration saved!`);
        } catch (error) {
            console.error('Error saving table list:', error);
            toast.error('Failed to save table configuration.');
        } finally {
            setSaving(false);
        }
    };

    const handleAddTable = async () => {
        if (tables.length >= MAX_TABLES) return toast.error(`Maximum ${MAX_TABLES} tables allowed.`);
        if (!newTableNo) return toast.error("Please enter a valid table number.");
        if (tables.includes(Number(newTableNo))) return toast.error("Table already exists!");

        const updated = [...tables, Number(newTableNo)].sort((a, b) => a - b);
        setTables(updated);
        setNewTableNo('');
        await saveTablesToDB(updated);
    };

    const handleDeleteTable = async (tableToDelete: number) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete QR Code',
            message: `Are you sure you want to delete Table ${tableToDelete}? You will have to print a new QR code if you add it back.`,
            action: async () => {
                if (!restaurantId) {
                    toast.error('Restaurant ID not found');
                    return;
                }

                setSaving(true);
                try {
                    // Delete from restaurant_tables database
                    const { error } = await supabase
                        .from('restaurant_tables')
                        .delete()
                        .eq('restaurant_id', restaurantId)
                        .eq('table_number', tableToDelete);

                    if (error) throw error;

                    // Update local state
                    const updated = tables.filter(t => t !== tableToDelete);
                    setTables(updated);
                    toast.success(`Table ${tableToDelete} deleted!`);
                } catch (error) {
                    console.error('Error deleting table:', error);
                    toast.error('Failed to delete table.');
                } finally {
                    setSaving(false);
                    setConfirmDialog(p => ({ ...p, isOpen: false }));
                }
            }
        });
    };

    const handleDownloadSingle = (tableIdx: number, tableNo: number) => {
        const ref = qrRefs.current[tableIdx];
        if (!ref) return;

        const canvas = ref.querySelector('canvas');
        if (!canvas) {
            toast.error("QR Code not ready yet.");
            return;
        }

        const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        const normalizedName = (restaurantName || 'Restaurant').replace(/[^a-zA-Z0-9]+/g, '_');
        downloadLink.download = `${normalizedName}_Table_${tableNo}_QR.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        toast.success(`Table ${tableNo} QR Downloaded!`);
    };

    // ── Jarvis voice bridge — listens for window events from PartnerActionHandler ──
    useEffect(() => {
        const onAddTable = (e: Event) => {
            const tableNo = (e as CustomEvent<{ tableNo: number }>).detail?.tableNo;
            if (!tableNo || isNaN(tableNo)) { toast.error('Table number invalid'); return; }
            if (tables.length >= MAX_TABLES) { toast.error(`Maximum ${MAX_TABLES} tables allowed`); return; }
            if (tables.includes(tableNo)) { toast.error(`Table ${tableNo} already exists`); return; }
            const updated = [...tables, tableNo].sort((a, b) => a - b);
            setTables(updated);
            void saveTablesToDB(updated);
            toast.success(`Jarvis: Table ${tableNo} add ho gaya!`);
        };
        const onDeleteTable = (e: Event) => {
            const tableNo = (e as CustomEvent<{ tableNo: number }>).detail?.tableNo;
            if (!tableNo || !tables.includes(tableNo)) { toast.error(`Table ${tableNo} exist nahi karta`); return; }
            void handleDeleteTable(tableNo);
        };
        window.addEventListener('jarvis:qr:add-table', onAddTable);
        window.addEventListener('jarvis:qr:delete-table', onDeleteTable);
        return () => {
            window.removeEventListener('jarvis:qr:add-table', onAddTable);
            window.removeEventListener('jarvis:qr:delete-table', onDeleteTable);
        };
    }, [tables, restaurantId]);

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading Configuration...</div>;
    }

    return (
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar pt-20 lg:pt-8 pb-24 h-full relative z-0">
            {/* Ambient Background Glows */}
            <div className="fixed top-[10%] left-[-10%] w-[50%] h-[50%] ambient-glow-red pointer-events-none z-0 hidden dark:block opacity-70"></div>
            <div className="fixed bottom-[-10%] right-[0%] w-[60%] h-[60%] ambient-glow-gold pointer-events-none z-0 hidden dark:block opacity-50"></div>

            <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500 relative z-10">
                {/* Page Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-lg">
                                <Wand2 className="w-5 h-5" />
                            </div>
                            <h1 className="text-white text-3xl sm:text-4xl font-black tracking-tight drop-shadow-md">Bulk QR Generator</h1>
                        </div>
                        <p className="text-slate-400 text-sm sm:text-base font-medium sm:pl-14">High-fidelity cinematic QR codes for your venue.</p>
                    </div>
                    {tables.length > 0 && (
                        <button onClick={() => toast("Export All functionality coming soon.")} className="bg-primary hover:bg-primary/90 text-white font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20">
                            <Download size={18} />
                            Export All (PNG)
                        </button>
                    )}
                </div>

                <div className="flex flex-col lg:flex-row gap-8 items-start">
                    {/* Left Panel: Settings */}
                    <div className="w-full lg:w-96 flex-shrink-0">
                        <div className="glass-panel rounded-3xl p-6 flex flex-col gap-8 sticky top-24">
                            <div>
                                <h3 className="text-white text-lg font-bold mb-1">Configuration</h3>
                                <p className="text-slate-400 text-xs">Customize your luxury QR table fleet.</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Restaurant Preview Context</p>
                                <p className="text-sm font-bold text-white truncate">{restaurantName || 'Restaurant'}</p>
                                <p className="text-xs text-slate-400">Currency: {currencyCode}</p>
                                <div className="flex items-center justify-between text-xs text-slate-300 border-t border-white/10 pt-2">
                                    <span>Sample Dish</span>
                                    <span className="font-black text-amber-400">{currencySymbol} 499</span>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="table-number" className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Table Identity</Label>
                                    <div className="relative">
                                        <Grid2X2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                                        <input
                                            id="table-number"
                                            type="number"
                                            min={1}
                                            value={newTableNo}
                                            onChange={(e) => setNewTableNo(e.target.value === '' ? '' : parseInt(e.target.value))}
                                            disabled={tables.length >= MAX_TABLES}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white placeholder:text-slate-600 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all"
                                            placeholder="e.g. 5"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={handleAddTable}
                                    disabled={saving || tables.length >= MAX_TABLES}
                                    className="w-full bg-white text-black font-extrabold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-all shadow-xl shadow-white/5 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                                >
                                    <PlusCircle className="w-5 h-5" />
                                    Add to Batch
                                </button>
                                {tables.length >= MAX_TABLES ? (
                                    <p className="text-xs text-red-500 font-bold px-1">Maximum {MAX_TABLES} tables reached. Delete one to add more.</p>
                                ) : (
                                    <p className="text-xs text-slate-400 px-1">{tables.length} of {MAX_TABLES} table slots used.</p>
                                )}
                            </div>
                            <div className="pt-6 border-t border-white/5">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-sm font-bold text-white">Saved Tables</h4>
                                    <span className="text-[10px] font-bold px-2 py-0.5 bg-primary/20 text-primary rounded-full uppercase">{tables.length} Total</span>
                                </div>
                                <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 min-h-[200px]">
                                    {tables.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {tables.map(t => (
                                                <span key={t} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-slate-300 flex items-center justify-between min-w-[100px] gap-2 hover:border-primary/50 transition-colors group">
                                                    Table {t < 10 ? `0${t}` : t}
                                                    <button onClick={() => handleDeleteTable(t)} className="flex items-center justify-center p-0.5 rounded hover:bg-white/10 group-hover:text-primary transition-colors text-slate-500">
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full opacity-20 text-center py-10">
                                            <Grid2X2 className="w-8 h-8 mb-2" />
                                            <p className="text-[10px] uppercase tracking-[0.2em]">Ready for Generation</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: QR Grid */}
                    <div className="flex-1 w-full">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
                            {tables.map((tableNo, idx) => {
                                const qrValue = `${baseUrl}/menu/${restaurantId}?table=${tableNo}`;

                                return (
                                    <div key={tableNo} className="qr-card-glass rounded-3xl p-8 flex flex-col items-center relative group transition-all hover:-translate-y-2 hover:border-primary/30">
                                        <button
                                            onClick={() => handleDeleteTable(tableNo)}
                                            className="absolute top-4 right-4 size-8 bg-primary rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-110 z-20"
                                            title={`Delete Table ${tableNo}`}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>

                                        <h3 className="text-slate-100 text-xl font-bold mb-8">Table {tableNo < 10 ? `0${tableNo}` : tableNo}</h3>

                                        <div className="w-full text-center mb-4">
                                            <p className="text-xs text-slate-400 truncate">{restaurantName || 'Restaurant'}</p>
                                            <p className="text-[11px] text-slate-500">Currency: {currencyCode} • Preview: {currencySymbol} 499</p>
                                        </div>

                                        <div
                                            ref={(el) => qrRefs.current[idx] = el}
                                            className="bg-slate-100/95 p-6 rounded-2xl mb-8 shadow-inner relative overflow-hidden group/qr border-[6px] border-white/10 w-48 h-48 flex items-center justify-center"
                                        >
                                            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/qr:opacity-100 transition-opacity pointer-events-none"></div>
                                            <QRCodeCanvas
                                                value={qrValue}
                                                size={160}
                                                level="H"
                                                includeMargin={false}
                                                className="mix-blend-multiply relative z-10"
                                                style={{ backgroundColor: 'transparent' }}
                                            />
                                        </div>

                                        <button
                                            onClick={() => handleDownloadSingle(idx, tableNo)}
                                            className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-4 rounded-xl transition-all border border-white/5 flex items-center justify-center gap-2 shadow-md"
                                        >
                                            <ImageIcon className="w-5 h-5" /> Download PNG
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <ConfirmModal
                    isOpen={confirmDialog.isOpen}
                    title={confirmDialog.title}
                    message={confirmDialog.message}
                    isDestructive={true}
                    confirmText="Delete"
                    onConfirm={confirmDialog.action}
                    onCancel={() => setConfirmDialog(p => ({ ...p, isOpen: false }))}
                />
            </div>
        </div>
    );
};

export default QRBuilder;
