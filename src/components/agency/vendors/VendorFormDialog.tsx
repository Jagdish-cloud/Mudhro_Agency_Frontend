import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { useMutationFeedback } from "@/context/mutation-feedback-context";
import { ApiError } from "@/lib/apiClient";
import {
  agencyVendorSchema,
  type AgencyVendorFormValues,
} from "@/schemas/agencyVendorSchema";
import { createAgencyVendorApi, updateAgencyVendorApi } from "@/services/agency/vendorsService";
import type { AgencyVendorDto } from "@/types/agencyInvoicing";

type VendorFormDialogProps = {
  open: boolean;
  orgId: string;
  editing?: AgencyVendorDto | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (vendor: AgencyVendorDto) => void;
};

const emptyValues: AgencyVendorFormValues = {
  name: "",
  contactName: "",
  email: "",
  phone: "",
  billingAddress: "",
  gstNumber: "",
  panNumber: "",
  stateCode: "",
  status: "active",
  notes: "",
  tags: [],
};

export function VendorFormDialog({
  open,
  orgId,
  editing,
  onOpenChange,
  onSaved,
}: VendorFormDialogProps) {
  const { run } = useMutationFeedback();
  const form = useForm<AgencyVendorFormValues>({
    resolver: zodResolver(agencyVendorSchema) as unknown as Resolver<AgencyVendorFormValues>,
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({
        name: editing.name,
        contactName: editing.contactName ?? "",
        email: editing.email ?? "",
        phone: editing.phone ?? "",
        billingAddress: editing.billingAddress ?? "",
        gstNumber: editing.gstNumber ?? "",
        panNumber: editing.panNumber ?? "",
        stateCode: editing.stateCode ?? "",
        status: editing.status,
        notes: editing.notes ?? "",
        tags: editing.tags ?? [],
      });
    } else {
      form.reset(emptyValues);
    }
  }, [open, editing, form]);

  async function onSubmit(values: AgencyVendorFormValues) {
    try {
      const payload = {
        name: values.name,
        contactName: values.contactName || undefined,
        email: values.email || undefined,
        phone: values.phone || undefined,
        billingAddress: values.billingAddress || undefined,
        gstNumber: values.gstNumber || undefined,
        panNumber: values.panNumber || undefined,
        stateCode: values.stateCode || undefined,
        status: values.status,
        notes: values.notes || undefined,
        tags: values.tags ?? [],
      };
      const saved = await run(
        () =>
          editing
            ? updateAgencyVendorApi(orgId, editing.id, payload)
            : createAgencyVendorApi(orgId, payload),
        {
          successMessage: editing ? "Vendor updated." : "Vendor created.",
        },
      );
      onSaved(saved);
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Could not save vendor.";
      form.setError("root", { type: "server", message });
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit vendor" : "New vendor"}</DialogTitle>
          <DialogDescription>
            Vendors are payees on expense bills, separate from billing clients.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
            {form.formState.errors.root?.message ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {form.formState.errors.root.message}
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Vendor or company" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact person</FormLabel>
                    <FormControl>
                      <Input placeholder="Primary contact" {...field} />
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
                      <Input type="email" placeholder="accounts@vendor.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+91 ..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gstNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GST number</FormLabel>
                    <FormControl>
                      <Input placeholder="22ABCDE1234F1Z5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="panNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PAN</FormLabel>
                    <FormControl>
                      <Input placeholder="ABCDE1234F" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stateCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State code</FormLabel>
                    <FormControl>
                      <Input maxLength={2} placeholder="29" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                        <option value="archived">Archived</option>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="billingAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Billing address</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Full address..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Internal notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                ) : editing ? (
                  "Save changes"
                ) : (
                  "Create vendor"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
