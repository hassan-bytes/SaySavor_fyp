"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"

import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/shared/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/shared/ui/popover"

interface CreatableSelectProps {
    options: { value: string; label: string }[]
    value?: string
    onChange: (value: string) => void
    onCreate?: (value: string) => void
    placeholder?: string
    emptyText?: string
    className?: string
    id?: string
    name?: string
}

export function CreatableSelect({
    options,
    value,
    onChange,
    onCreate,
    placeholder = "Select...",
    emptyText = "No results found.",
    className,
    id,
    name,
}: CreatableSelectProps) {
    const [open, setOpen] = React.useState(false)
    const [inputValue, setInputValue] = React.useState("")

    const handleSelect = (currentValue: string) => {
        onChange(currentValue === value ? "" : currentValue)
        setOpen(false)
    }

    const handleCreate = () => {
        if (onCreate) {
            onCreate(inputValue)
            onChange(inputValue)
            setOpen(false)
            setInputValue("")
        }
    }

    // Determine label for selected value
    const selectedLabel = value
        ? options.find((option) => option.value === value)?.label || value
        : placeholder

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between text-white border-slate-700 bg-slate-900 hover:bg-slate-800", className)}
                >
                    {selectedLabel}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0 bg-slate-900 border-slate-700"
                align="start"
                side="bottom"
            >
                <Command className="bg-slate-900">
                    <CommandInput
                        placeholder={placeholder}
                        value={inputValue}
                        onValueChange={setInputValue}
                        className="text-white placeholder:text-slate-400"
                    />
                    <CommandList className="max-h-[200px] overflow-y-auto custom-scrollbar">
                        <CommandEmpty className="py-6 text-center text-sm text-slate-400">{emptyText}</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.value}
                                    onSelect={handleSelect}
                                    className="text-white cursor-pointer hover:bg-slate-800 aria-selected:bg-slate-800 aria-selected:text-white"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === option.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {option.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        {onCreate && inputValue && !options.some(o => o.label.toLowerCase() === inputValue.toLowerCase()) && (
                            <>
                                <CommandSeparator className="bg-slate-700" />
                                <CommandGroup>
                                    <CommandItem
                                        value={inputValue}
                                        onSelect={handleCreate}
                                        className="text-white cursor-pointer font-medium hover:bg-slate-800 aria-selected:bg-slate-800 aria-selected:text-white"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Create "{inputValue}"
                                    </CommandItem>
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover >
    )
}
