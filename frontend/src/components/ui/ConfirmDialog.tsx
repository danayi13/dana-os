import { Dialog } from "@/components/ui/Dialog";
import { FormButton } from "@/components/ui/FormButton";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: React.ReactNode;
  onConfirm: () => void;
  confirmLabel: string;
  isPending?: boolean;
  pendingLabel?: string;
}

export function ConfirmDialog({
  open,
  onClose,
  title,
  message,
  onConfirm,
  confirmLabel,
  isPending,
  pendingLabel = "…",
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <p className="text-sm mb-4" style={{ color: "var(--text)" }}>{message}</p>
      <div className="flex justify-end gap-2">
        <FormButton intent="cancel" onClick={onClose}>Cancel</FormButton>
        <FormButton intent="submit" type="button" onClick={onConfirm} disabled={isPending}>
          {isPending ? pendingLabel : confirmLabel}
        </FormButton>
      </div>
    </Dialog>
  );
}
