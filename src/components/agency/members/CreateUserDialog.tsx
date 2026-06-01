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
import { useMutationFeedback } from "@/context/mutation-feedback-context";
import { ApiError } from "@/lib/apiClient";
import {
  createUserFormSchema,
  type CreateUserFormValues,
} from "@/schemas/memberSchemas";
import { createAdmin, createMember } from "@/services/agency/membersService";
import type { OrgMember } from "@/types/member";

type CreateUserMode = "admin" | "member";

type CreateUserDialogProps = {
  open: boolean;
  mode: CreateUserMode;
  orgId: string;
  onOpenChange: (open: boolean) => void;
  onCreated: (member: OrgMember) => void;
};

const emptyValues: CreateUserFormValues = {
  name: "",
  email: "",
  number: "",
  designation: "",
  password: "",
  confirmPassword: "",
};

export function CreateUserDialog({
  open,
  mode,
  orgId,
  onOpenChange,
  onCreated,
}: CreateUserDialogProps) {
  const { run } = useMutationFeedback();
  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (open) {
      form.reset(emptyValues);
    }
  }, [open, form]);

  const title = mode === "admin" ? "Invite Admin" : "Invite Member";
  const description =
    mode === "admin"
      ? "Admins can create, edit, and remove members in this organization."
      : "Members get restricted access and cannot manage other users.";

  async function onSubmit(values: CreateUserFormValues) {
    const payload = {
      name: values.name,
      email: values.email,
      number: values.number,
      designation: values.designation,
      password: values.password,
    };
    try {
      const member = await run(
        () =>
          mode === "admin"
            ? createAdmin(orgId, payload)
            : createMember(orgId, payload),
        {
          successMessage: mode === "admin" ? "Admin created." : "Member created.",
        },
      );
      onCreated(member);
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Could not create user.";
      if (error instanceof ApiError && error.status === 409) {
        form.setError("email", { type: "server", message });
      } else {
        form.setError("root", { type: "server", message });
      }
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
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
                    <Input autoComplete="name" placeholder="Full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" placeholder="user@company.com" {...field} />
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
                    <Input inputMode="numeric" maxLength={10} placeholder="10-digit mobile" {...field} />
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
                    <Input placeholder="e.g. Project Manager" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm password</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
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
                ) : mode === "admin" ? (
                  "Create Admin"
                ) : (
                  "Create Member"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
