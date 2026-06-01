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
  agencyClientItemSchema,
  type AgencyClientItemFormValues,
} from "@/schemas/agencyClientItemSchema";
import {
  createClientItemApi,
  updateClientItemApi,
} from "@/services/agency/clientItemsService";
import type { AgencyClientItemDto } from "@/types/agencyInvoicing";

type ClientItemFormDialogProps = {
  open: boolean;
  orgId: string;
  clientId: string;
  editing?: AgencyClientItemDto | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (item: AgencyClientItemDto) => void;
};

const emptyValues: AgencyClientItemFormValues = {
  itemName: "",
  description: "",
  hsnCode: "",
  defaultRate: 0,
  defaultTaxPercent: 18,
  defaultDiscountPercent: 0,
  unit: "",
};

export function ClientItemFormDialog({
  open,
  orgId,
  clientId,
  editing,
  onOpenChange,
  onSaved,
}: ClientItemFormDialogProps) {
  const { run } = useMutationFeedback();
  const form = useForm<AgencyClientItemFormValues>({
    resolver: zodResolver(agencyClientItemSchema) as unknown as Resolver<AgencyClientItemFormValues>,
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({
        itemName: editing.itemName,
        description: editing.description ?? "",
        hsnCode: editing.hsnCode,
        defaultRate: editing.defaultRate,
        defaultTaxPercent: editing.defaultTaxPercent,
        defaultDiscountPercent: editing.defaultDiscountPercent,
        unit: editing.unit ?? "",
      });
    } else {
      form.reset(emptyValues);
    }
  }, [open, editing, form]);

  async function onSubmit(values: AgencyClientItemFormValues) {
    try {
      const payload = {
        itemName: values.itemName,
        description: values.description || undefined,
        hsnCode: values.hsnCode,
        defaultRate: values.defaultRate,
        defaultTaxPercent: values.defaultTaxPercent,
        defaultDiscountPercent: values.defaultDiscountPercent,
        unit: values.unit || undefined,
      };
      const saved = await run(
        () =>
          editing
            ? updateClientItemApi(orgId, clientId, editing.id, payload)
            : createClientItemApi(orgId, clientId, payload),
        {
          successMessage: editing ? "Catalog item updated." : "Catalog item created.",
        },
      );
      onSaved(saved);
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Could not save item.";
      form.setError("root", { type: "server", message });
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit catalog item" : "New catalog item"}
          </DialogTitle>
          <DialogDescription>
            Reusable line items for this client. Selected from the Invoice
            Builder's "Add from catalog" dropdown.
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
                name="itemName"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Item name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Design retainer, Copywriting" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hsnCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>HSN / SAC code</FormLabel>
                    <FormControl>
                      <Input placeholder="998314" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <Input placeholder="hour / pc / month" {...field} />
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
                    <FormLabel>Default rate</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="defaultTaxPercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default tax %</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" max="100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="defaultDiscountPercent"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Default discount %</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" max="100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="What this item covers..." {...field} />
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
                  "Create item"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
