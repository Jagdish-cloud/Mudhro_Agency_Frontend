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
import { Textarea } from "@/components/ui/textarea";
import { useMutationFeedback } from "@/context/mutation-feedback-context";
import { ApiError } from "@/lib/apiClient";
import {
  agencyVendorItemSchema,
  type AgencyVendorItemFormValues,
} from "@/schemas/agencyVendorItemSchema";
import { createVendorItemApi, updateVendorItemApi } from "@/services/agency/vendorItemsService";
import type { AgencyVendorItemDto } from "@/types/agencyInvoicing";

type VendorItemFormDialogProps = {
  open: boolean;
  orgId: string;
  vendorId: string;
  editing?: AgencyVendorItemDto | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (item: AgencyVendorItemDto) => void;
};

const emptyValues: AgencyVendorItemFormValues = {
  itemName: "",
  description: "",
  defaultQuantity: 1,
  defaultRate: 0,
};

export function VendorItemFormDialog({
  open,
  orgId,
  vendorId,
  editing,
  onOpenChange,
  onSaved,
}: VendorItemFormDialogProps) {
  const { run } = useMutationFeedback();
  const form = useForm<AgencyVendorItemFormValues>({
    resolver: zodResolver(agencyVendorItemSchema) as unknown as Resolver<AgencyVendorItemFormValues>,
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({
        itemName: editing.itemName,
        description: editing.description ?? "",
        defaultQuantity: editing.defaultQuantity,
        defaultRate: editing.defaultRate,
      });
    } else {
      form.reset(emptyValues);
    }
  }, [open, editing, form]);

  async function onSubmit(values: AgencyVendorItemFormValues) {
    try {
      const payload = {
        itemName: values.itemName,
        description: values.description || undefined,
        defaultQuantity: values.defaultQuantity,
        defaultRate: values.defaultRate,
      };
      const saved = await run(
        () =>
          editing
            ? updateVendorItemApi(orgId, vendorId, editing.id, payload)
            : createVendorItemApi(orgId, vendorId, payload),
        {
          successMessage: editing ? "Catalog item updated." : "Catalog item created.",
        },
      );
      onSaved(saved);
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Could not save catalog item.";
      form.setError("root", { type: "server", message });
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit catalog item" : "New catalog item"}</DialogTitle>
          <DialogDescription>
            Templates for expense line items for this vendor. Use “Add from catalog” in the expense
            form when this vendor is selected. The line item service will match the item name.
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
              name="itemName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Electricity units" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Optional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="defaultQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0.01}
                        step={0.01}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="defaultRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default rate (excl.)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                      />
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
                ) : editing ? (
                  "Save changes"
                ) : (
                  "Add item"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
