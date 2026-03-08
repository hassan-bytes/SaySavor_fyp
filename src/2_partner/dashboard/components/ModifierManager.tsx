// ============================================================
// FILE: ModifierManager.tsx
// SECTION: 2_partner > dashboard > components
// PURPOSE: Menu item ke modifiers manage karna â€” jaise extra sauce, no onion, etc.
// ============================================================
import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
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
}

const ModifierManager: React.FC<ModifierManagerProps> = ({ groups, setGroups }) => {
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
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <Label className="text-base font-semibold text-black">Add-ons & Modifiers</Label>
                    <p className="text-xs text-slate-700">Create groups like "Choose Sauce" or "Extra Toppings".</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingGroup(true)}
                    disabled={isAddingGroup}
                    className="h-8 gap-1 text-purple-600 border-purple-200 hover:bg-purple-50"
                >
                    <Plus className="w-3.5 h-3.5" /> Add Group
                </Button>
            </div>

            {/* Empty State */}
            {groups.length === 0 && !isAddingGroup && (
                <div className="text-center p-8 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                    <p className="text-sm text-black mb-2">No modifier groups created.</p>
                </div>
            )}

            {/* New Group Form */}
            {isAddingGroup && (
                <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-lg animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-3">
                        <div>
                            <Label htmlFor="new-group-name" className="text-xs font-semibold text-black mb-1.5 block">Group Name</Label>
                            <Input
                                id="new-group-name"
                                name="new-group-name"
                                value={newGroup.name}
                                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                                placeholder="e.g. Choose Your Dip"
                                className="force-black-input bg-white text-black placeholder:text-black"
                                autoComplete="off"
                                autoFocus
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-xs font-semibold text-black mb-1.5 block">Selection Type</Label>
                                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-md border border-slate-200">
                                    <Switch
                                        id="new-group-required"
                                        name="new-group-required"
                                        checked={newGroup.required}
                                        onCheckedChange={(c) => setNewGroup({ ...newGroup, required: c, min_selection: c ? 1 : 0 })}
                                        className="scale-75 data-[state=checked]:bg-purple-600"
                                    />
                                    <Label htmlFor="new-group-required" className="text-sm text-black cursor-pointer">{newGroup.required ? 'Required' : 'Optional'}</Label>
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="new-group-max" className="text-xs font-semibold text-black mb-1.5 block">Max Selection</Label>
                                <Input
                                    id="new-group-max"
                                    name="new-group-max"
                                    type="number"
                                    value={newGroup.max_selection || ''}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setNewGroup({ ...newGroup, max_selection: isNaN(val) ? 1 : val });
                                    }}
                                    className="force-black-input bg-white text-black placeholder:text-black"
                                    autoComplete="off"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="ghost" size="sm" onClick={() => setIsAddingGroup(false)}>Cancel</Button>
                            <Button size="sm" onClick={addGroup} className="bg-purple-600 hover:bg-purple-700 text-white">
                                Create Group
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Groups List */}
            <div className="space-y-4">
                {groups.map((group) => (
                    <ModifierGroupItem
                        key={group.id}
                        group={group}
                        onDelete={() => deleteGroup(group.id)}
                        onAddModifier={(mod) => addModifierToGroup(group.id, mod)}
                        onRemoveModifier={(modId) => removeModifierFromGroup(group.id, modId)}
                    />
                ))}
            </div>
        </div>
    );
};

// --- Sub-Component for Group Item ---
const ModifierGroupItem = ({ group, onDelete, onAddModifier, onRemoveModifier }: {
    group: ModifierGroup,
    onDelete: () => void,
    onAddModifier: (m: Modifier) => void,
    onRemoveModifier: (id: string | undefined) => void
}) => {
    const [isOpen, setIsOpen] = useState(true);
    const [newMod, setNewMod] = useState<Modifier>({ name: '', price: 0, stock_count: null, is_available: true });

    const handleAdd = () => {
        if (!newMod.name) return;
        onAddModifier(newMod);
        setNewMod({ name: '', price: 0, stock_count: null, is_available: true });
    };

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border border-slate-200 rounded-lg bg-white shadow-sm">
            <div className="flex items-center justify-between p-3 bg-slate-50/50 border-b border-slate-100 rounded-t-lg">
                <div className="flex items-center gap-2">
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-1 h-6 w-6">
                            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </Button>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-black">{group.name}</span>
                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-slate-200 text-slate-600">
                            {group.required ? `Required (Min ${group.min_selection})` : 'Optional'}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-slate-500">
                            Max {group.max_selection}
                        </Badge>
                    </div>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-600" onClick={onDelete}>
                    <Trash2 className="w-3.5 h-3.5" />
                </Button>
            </div>

            <CollapsibleContent className="p-3 bg-white">
                <div className="space-y-2 pl-2">
                    {group.modifiers.map((mod) => (
                        <div key={mod.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                            <span className="text-sm text-black">{mod.name}</span>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-black">+{mod.price}</span>
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-300 hover:text-red-500" onClick={() => onRemoveModifier(mod.id)}>
                                    <X className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>
                    ))}

                    {/* Add Inline Modifier */}
                    <div className="flex items-center gap-2 pt-2 mt-2 border-t border-slate-100">
                        <div className="flex-1">
                            <Label htmlFor={`mod-name-${group.id}`} className="sr-only">Option Name</Label>
                            <Input
                                id={`mod-name-${group.id}`}
                                name={`mod-name-${group.id}`}
                                className="force-black-input h-8 text-sm w-full placeholder:text-black bg-white text-black"
                                placeholder="Option Name (e.g. Garlic Mayo)"
                                value={newMod.name}
                                onChange={(e) => setNewMod({ ...newMod, name: e.target.value })}
                                autoComplete="off"
                            />
                        </div>
                        <div>
                            <Label htmlFor={`mod-price-${group.id}`} className="sr-only">Option Price</Label>
                            <Input
                                id={`mod-price-${group.id}`}
                                name={`mod-price-${group.id}`}
                                className="force-black-input h-8 text-sm w-24 placeholder:text-black bg-white text-black"
                                type="number"
                                placeholder="Price"
                                value={newMod.price || ''}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    setNewMod({ ...newMod, price: isNaN(val) ? 0 : val });
                                }}
                                autoComplete="off"
                            />
                        </div>
                        <Button size="sm" variant="secondary" className="h-8" onClick={handleAdd}> Add </Button>
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
};

export default ModifierManager;
