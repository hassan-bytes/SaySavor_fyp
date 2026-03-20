import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';
import { SectionCard } from './SectionCard';

interface DangerZoneSectionProps {
  disabled: boolean;
  onDeleteConfirm: () => void;
}

export const DangerZoneSection = ({ disabled, onDeleteConfirm }: DangerZoneSectionProps) => {
  return (
    <SectionCard
      title="Delete restaurant"
      description="Delete your restaurant profile and menu permanently."
    >
      <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4">
        <p className="text-sm text-red-100">
          This action cannot be undone. All menu items and restaurant details will be removed.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              disabled={disabled}
              className="mt-4 bg-red-600 hover:bg-red-500"
            >
              Delete restaurant
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete restaurant permanently?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove your restaurant profile and all menu items. You will be signed out.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDeleteConfirm}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SectionCard>
  );
};
