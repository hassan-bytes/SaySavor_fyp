// ============================================================
// FILE: ModifierManager.tsx
// SECTION: 2_partner > dashboard > components
// PURPOSE: Menu item ke modifiers manage karna — jaise extra sauce, no onion, etc.
// ============================================================
import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronRight, GripVertical, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Badge } from '@/shared/ui/badge';
import { Switch } from '@/shared/ui/switch';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/shared/ui/collapsible"

import { Modifier, ModifierGroup } from '@/shared/types/menu';

export type { Modifier, ModifierGroup };

interface ModifierManagerProps {
    groups: ModifierGroup[];
    setGroups: (groups: ModifierGroup[]) => void;
    formatPrice?: (price: number) => string;
    currencySymbol?: string;
}

const ModifierManager: React.FC<ModifierManagerProps> = ({ 
    groups, 
    setGroups,
    formatPrice = (p: number) => p.toLocaleString('en', { maximumFractionDigits: 0 }),
    currencySymbol = '$',
}) => {
    const [isAddingGroup, setIsAddingGroup] = useState(false);
    const [newGroup, setNewGroup] = useState<ModifierGroup>({
        name: '',
        min_selection: 0,
        max_selection: 1,
        required: false,
        modifiers: []
    });

    const addGroup = () => {
        if (!newGroup.name) return;
        setGroups([...groups, { ...newGroup, id: `temp-group-${Date.now()}` }]);
        setNewGroup({ name: '', min_selection: 0, max_selection: 1, required: false, modifiers: [] });
        setIsAddingGroup(false);
    };

    const deleteGroup = (id: string | undefined) => {
        setGroups(groups.filter(g => g.id !== id));
    };

    // --- Nested Modifier Logic ---
    const addModifierToGroup = (groupId: string | undefined, modifier: Modifier) => {
        setGroups(groups.map(g => {
            if (g.id === groupId) {
                return { ...g, modifiers: [...g.modifiers, { ...modifier, id: `temp-mod-${Date.now()}` }] };
            }
            return g;
        }));
    };

    const removeModifierFromGroup = (groupId: string | undefined, modId: string | undefined) => {
        setGroups(groups.map(g => {
            if (g.id === groupId) {
                return { ...g, modifiers: g.modifiers.filter(m => m.id !== modId) };
            }
            return g;
        }));
    };

    return (
        <div className="space-y-6 pt-6">
            <div className="flex justify-between items-center bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-xl relative overflow-hidden group/header">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover/header:rotate-12 transition-transform">
                    <Wand2 className="w-16 h-16 text-purple-500" />
                </div>
                <div className="flex items-center gap-6 relative z-10">
                    <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/30 shadow-inner">
                        <Plus className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                        <Label className="text-2xl font-black text-white leading-none tracking-tight">Add-ons & Modifiers</Label>
                        <p className="text-sm text-slate-500 font-bold mt-2">Create groups like "Choose Sauce" or "Extra Toppings".</p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    onClick={() => setIsAddingGroup(true)}
                    disabled={isAddingGroup}
                    className="h-12 gap-3 px-8 rounded-2xl font-black text-purple-400 border-purple-500/20 bg-purple-500/5 hover:bg-purple-500 hover:text-white transition-all shadow-lg shadow-purple-500/5 active:scale-95 z-10"
                >
                    <Plus className="w-5 h-5" /> Create New Group
                </Button>
            </div>

            {/* Empty State */}
            {groups.length === 0 && !isAddingGroup && (
                <div className="text-center p-20 border-2 border-dashed border-slate-800 rounded-[3rem] bg-slate-900/40 relative group cursor-pointer" onClick={() => setIsAddingGroup(true)}>
                    <div className="w-20 h-20 bg-slate-800 rounded-[2rem] border border-slate-700 shadow-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                        <Plus className="w-10 h-10 text-slate-500 group-hover:text-purple-400 transition-colors" />
                    </div>
                    <p className="text-xl font-black text-white mb-2">No modifiers yet</p>
                    <p className="text-sm text-slate-400 font-bold max-w-[280px] mx-auto leading-relaxed">Group your extras and options for easier management and better customer experience.</p>
                </div>
            )}

            {/* New Group Form */}
            {isAddingGroup && (
                <div className="p-10 bg-slate-900 border-2 border-purple-500/20 border-dashed rounded-[3rem] space-y-8 animate-in fade-in zoom-in-95 duration-500 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5">
                        <Sparkles className="w-24 h-24 text-purple-500 rotate-45" />
                    </div>
                    <div className="flex items-center gap-6 relative z-10">
                        <div className="w-14 h-14 bg-purple-500 text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-500/40">
                            <Plus className="w-7 h-7 font-black" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white tracking-tight">New Modifier Group</h3>
                            <p className="text-sm text-slate-500 font-bold">Define constraints for this set of options.</p>
                        </div>
                    </div>

                    <div className="space-y-6 relative z-10">
                        <div className="space-y-2 group/field">
                            <Label htmlFor="new-group-name" className="text-xs uppercase text-slate-500 font-black tracking-widest ml-1 group-focus-within/field:text-purple-400 transition-colors">Group Name</Label>
                            <Input
                                id="new-group-name"
                                value={newGroup.name}
                                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                                placeholder="e.g. Choose Your Dip"
                                className="bg-slate-800 border-slate-700 text-white rounded-2xl h-16 px-6 text-xl font-black focus:border-purple-500/50 transition-all shadow-inner"
                                autoComplete="off"
                                autoFocus
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <Label className="text-xs uppercase text-slate-500 font-black tracking-widest ml-1">Requirement Mode</Label>
                                <div className="flex items-center gap-5 bg-slate-800 px-6 py-5 rounded-2xl border border-slate-700 shadow-inner group/switch">
                                    <Switch
                                        id="new-group-required"
                                        checked={newGroup.required}
                                        onCheckedChange={(c) => setNewGroup({ ...newGroup, required: c, min_selection: c ? 1 : 0 })}
                                        className="data-[state=checked]:bg-purple-500 scale-125 transition-all"
                                    />
                                    <Label htmlFor="new-group-required" className="text-lg text-white font-black cursor-pointer group-hover/switch:text-purple-400 transition-colors">
                                        {newGroup.required ? ' Mandatory ' : ' Optional '}
                                    </Label>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="new-group-max" className="text-xs uppercase text-slate-500 font-black tracking-widest ml-1">Maximum Choices</Label>
                                <Input
                                    id="new-group-max"
                                    type="number"
                                    value={newGroup.max_selection || ''}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setNewGroup({ ...newGroup, max_selection: isNaN(val) ? 1 : val });
                                    }}
                                    className="bg-slate-800 border-slate-700 text-white rounded-2xl h-16 px-6 text-2xl font-black shadow-inner remove-arrow"
                                    placeholder="e.g. 3"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-6 pt-6 relative z-10">
                        <Button variant="ghost" className="h-14 rounded-2xl font-black px-10 text-slate-400 hover:bg-slate-800 hover:text-white transition-all text-lg" onClick={() => setIsAddingGroup(false)}>Cancel</Button>
                        <Button className="h-14 px-12 bg-purple-500 hover:bg-purple-600 text-white gap-3 font-black text-xl rounded-2xl shadow-2xl shadow-purple-500/30 active:scale-95 transition-all" onClick={addGroup}>
                            <Plus className="w-7 h-7" /> Create Group
                        </Button>
                    </div>
                </div>
            )}

            {/* Groups List */}
            <div className="space-y-10">
                {groups.map((group) => (
                    <ModifierGroupItem
                        key={group.id}
                        group={group}
                        onDelete={() => deleteGroup(group.id)}
                        onAddModifier={(mod) => addModifierToGroup(group.id, mod)}
                        onRemoveModifier={(modId) => removeModifierFromGroup(group.id, modId)}
                        formatPrice={formatPrice}
                        currencySymbol={currencySymbol}
                    />
                ))}
            </div>
        </div>
    );
};

// --- Sub-Component for Group Item ---
const ModifierGroupItem = ({ group, onDelete, onAddModifier, onRemoveModifier, formatPrice, currencySymbol }: {
    group: ModifierGroup,
    onDelete: () => void,
    onAddModifier: (m: Modifier) => void,
    onRemoveModifier: (id: string | undefined) => void,
    formatPrice: (price: number) => string,
    currencySymbol: string,
}) => {
    const [isOpen, setIsOpen] = useState(true);
    const [newMod, setNewMod] = useState<Modifier>({ name: '', price: 0, stock_count: null, is_available: true });

    const handleAdd = () => {
        if (!newMod.name) return;
        onAddModifier(newMod);
        setNewMod({ name: '', price: 0, stock_count: null, is_available: true });
    };

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="group/group border border-slate-800 rounded-[3rem] bg-slate-900 shadow-2xl overflow-hidden transition-all duration-500 hover:border-slate-700">
            <div className={`p-8 flex items-center justify-between transition-colors duration-500 ${isOpen ? 'bg-slate-800/30 border-b border-slate-800/80' : 'bg-transparent'}`}>
                <div className="flex items-center gap-8">
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-0 h-12 w-12 hover:bg-slate-800 rounded-2xl border border-slate-800 shadow-inner group/btn">
                            <ChevronDown className={`w-6 h-6 text-slate-500 group-hover/btn:text-white transition-all duration-500 ${!isOpen ? '-rotate-90' : ''}`} />
                        </Button>
                    </CollapsibleTrigger>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-5">
                            <span className="font-black text-2xl text-white group-hover/group:text-purple-400 transition-colors tracking-tight">{group.name}</span>
                            <Badge className={`px-4 py-1 rounded-xl font-black text-[10px] uppercase border tracking-widest ${group.required ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                                {group.required ? `Required (Min ${group.min_selection})` : 'Optional'}
                            </Badge>
                            <Badge variant="outline" className="px-4 py-1 rounded-xl font-black text-[10px] uppercase text-slate-500 border-slate-800 bg-slate-800/50 tracking-widest">
                                Limit: {group.max_selection}
                            </Badge>
                        </div>
                    </div>
                </div>
                <Button size="icon" variant="ghost" className="h-14 w-14 rounded-[1.5rem] text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all font-black shadow-sm" onClick={onDelete}>
                    <Trash2 className="w-6 h-6" />
                </Button>
            </div>

            <CollapsibleContent className="animate-in slide-in-from-top-6 duration-700">
                <div className="p-10 space-y-6">
                    <div className="grid grid-cols-1 gap-4">
                        {group.modifiers.map((mod, idx) => (
                            <div key={mod.id} className="flex items-center justify-between p-6 bg-slate-800/40 rounded-[2rem] border border-slate-800 group/mod hover:bg-slate-800 hover:border-purple-500/30 hover:shadow-2xl hover:shadow-purple-500/5 transition-all duration-500">
                                <div className="flex items-center gap-6">
                                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-xs font-black text-slate-500 group-hover/mod:text-purple-400 group-hover/mod:border-purple-500/50 transition-all shadow-inner">
                                        {idx + 1}
                                    </div>
                                    <span className="text-xl font-bold text-slate-300 group-hover/mod:text-white transition-colors">{mod.name}</span>
                                </div>
                                <div className="flex items-center gap-8">
                                    <div className="text-right">
                                        <p className="text-[10px] font-black uppercase text-slate-600 leading-none mb-1 tracking-widest">Extra Price</p>
                                        <span className="text-2xl font-black text-white group-hover/mod:text-amber-400 transition-colors">
                                            {mod.price > 0 ? `+${formatPrice(mod.price)}` : 'Free'}
                                        </span>
                                    </div>
                                    <Button size="icon" variant="ghost" className="h-12 w-12 rounded-2xl text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20" onClick={() => onRemoveModifier(mod.id)}>
                                        <Trash2 className="w-5 h-5" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Add Inline Modifier Form */}
                    <div className="mt-10 pt-10 border-t border-slate-800 space-y-6">
                        <div className="flex items-center gap-5">
                            <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white shadow-inner">
                                <Plus className="w-5 h-5 font-black text-purple-400" />
                            </div>
                            <h4 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">New Option for {group.name}</h4>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="flex-[3]">
                                <Input
                                    className="bg-slate-800 border-slate-700 text-white rounded-[1.5rem] h-16 px-6 text-lg font-bold shadow-inner focus:bg-slate-900 focus:border-purple-500/50 transition-all"
                                    placeholder="Option Name (e.g. Extra Cheese)"
                                    value={newMod.name}
                                    onChange={(e) => setNewMod({ ...newMod, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                    Extra Price ({currencySymbol})
                                </Label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={newMod.price || ''}
                                        onChange={e => {
                                            const val = parseFloat(e.target.value);
                                            setNewMod({ ...newMod, price: isNaN(val) ? 0 : val });
                                        }}
                                        className="h-11 w-32 bg-slate-800 border-slate-700 text-white rounded-xl remove-arrow [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-center font-black pr-8"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">
                                        {currencySymbol}
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-600">
                                    0 = Free
                                </p>
                            </div>
                            <Button className="h-16 px-10 bg-purple-500 hover:bg-purple-600 text-white rounded-[1.5rem] font-black text-xl shadow-2xl shadow-purple-500/20 active:scale-95 transition-all flex items-center gap-3" onClick={handleAdd}>
                                <Plus className="w-6 h-6" /> Add
                            </Button>
                        </div>
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
};

export default ModifierManager;
