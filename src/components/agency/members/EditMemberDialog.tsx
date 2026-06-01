import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useMutationFeedback } from "@/context/mutation-feedback-context";
import { ApiError } from "@/lib/apiClient";
import {
  updateMemberFormSchema,
  type UpdateMemberFormValues,
} from "@/schemas/memberSchemas";
import { updateMember as updateMemberService } from "@/services/agency/membersService";
import type { OrgMember } from "@/types/member";

type EditMemberDialogProps = {
  open: boolean;
  orgId: string;
  member: OrgMember | null;
  canChangeRole: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (member: OrgMember) => void;
};

export function EditMemberDialog({
  open,
  orgId,
  member,
  canChangeRole,
  onOpenChange,
  onUpdated,
}: EditMemberDialogProps) {
  const { run } = useMutationFeedback();
  const form = useForm<UpdateMemberFormValues>({
    resolver: zodResolver(updateMemberFormSchema),
    defaultValues: {
      name: "",
      number: "",
      designation: "",
      status: "active",
      role: 2,
    },
  });

  useEffect(() => {
    if (open && member) {
      form.reset({
        name: member.name,
        number: member.number,
        designation: member.designation,
        status: member.status,
        role: member.role,
      });
    }
  }, [open, member, form]);

  async function onSubmit(values: UpdateMemberFormValues) {
    if (!member) return;
    const payload: Parameters<typeof updateMemberService>[2] = {
      name: values.name,
      number: values.number,
      designation: values.designation,
      status: values.status,
    };
    if (canChangeRole && values.role !== member.role) {
      payload.role = values.role;
    }

    try {
      const updated = await run(() => updateMemberService(orgId, member.id, payload), {
        successMessage: "Member updated.",
      });
      onUpdated(updated);
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Could not update member.";
      form.setError("root", { type: "server", message });
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit member</DialogTitle>
          <DialogDescription>
            Update profile details{canChangeRole ? " and role" : ""}. Email cannot be
            changed.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
            {form.formState.errors.root?.message ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {form.formState.errors.root.message}
              </div>
            ) : null}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile number</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" maxLength={10} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="designation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Designation</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <Select {...field}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <FormControl>
                      <Select
                        disabled={!canChangeRole}
                        value={String(field.value)}
                        onChange={(event) => field.onChange(Number(event.target.value) as 1 | 2)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      >
                        <option value="1">Admin</option>
                        <option value="2">Member</option>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
