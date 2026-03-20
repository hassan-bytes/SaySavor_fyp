import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { AlertTriangle } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  restaurantName: string
  saving: boolean
}

export function DeleteConfirmModal({ open, onClose, onConfirm, restaurantName, saving }: Props) {
  const [confirmText, setConfirmText] = useState('')

  useEffect(() => {
    if (!open) setConfirmText('')
  }, [open])

  const isMatch = confirmText === restaurantName

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border border-white/10 rounded-[2rem] p-8 max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="text-red-500" size={24} />
            <DialogTitle className="text-white text-xl font-black">Delete Restaurant?</DialogTitle>
          </div>
          <DialogDescription className="text-slate-400 text-sm leading-relaxed">
            This will permanently delete your restaurant, all menu items, and all data. This action cannot
            be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-3">
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Type your restaurant name to confirm
          </Label>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={restaurantName}
            className="h-14 input-glass rounded-2xl"
          />
        </div>

        <div className="flex gap-4 mt-8">
          <Button
            onClick={onClose}
            className="flex-1 bg-white/5 hover:bg-white/10 text-white rounded-2xl h-14"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!isMatch || saving}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black rounded-2xl h-14"
          >
            {saving ? 'Deleting...' : 'Delete Forever'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
