import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMutationFeedback } from "@/context/mutation-feedback-context";
import { ApiError } from "@/lib/apiClient";
import { deleteMember as deleteMemberService } from "@/services/agency/membersService";
import type { OrgMember } from "@/types/member";

type DeleteMemberDialogProps = {
  open: boolean;
  orgId: string;
  member: OrgMember | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: (id: string) => void;
};

export function DeleteMemberDialog({
  open,
  orgId,
  member,
  onOpenChange,
  onDeleted,
}: DeleteMemberDialogProps) {
  const { run } = useMutationFeedback();
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (!member) return;
    setSubmitting(true);
    try {
      await run(() => deleteMemberService(orgId, member.id), {
        successMessage: `Removed ${member.name}.`,
      });
      onDeleted(member.id);
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Could not remove the member.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Remove {member?.role === 1 ? "admin" : "member"}?</DialogTitle>
          <DialogDescription>
            {member ? (
              <>
                This will remove <span className="font-medium">{member.name}</span> from
                your organization. They will lose access immediately. You can re-invite
                them later with the same email.
              </>
            ) : (
              "This member will be removed from your organization."
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Removing...
              </>
            ) : (
              "Remove"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
