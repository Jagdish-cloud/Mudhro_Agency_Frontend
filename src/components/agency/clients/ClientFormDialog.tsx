import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Loader2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMutationFeedback } from "@/context/mutation-feedback-context";
import { ApiError } from "@/lib/apiClient";
import {
  agencyClientSchema,
  validateInternationalVerification,
  type AgencyClientFormValues,
} from "@/schemas/agencyClientSchema";
import {
  createAgencyClientApi,
  downloadClientLegalDocumentApi,
  updateAgencyClientApi,
  uploadClientLegalDocumentApi,
} from "@/services/agency/clientsService";
import type { AgencyClientDto } from "@/types/agencyInvoicing";

type ClientFormDialogProps = {
  open: boolean;
  orgId: string;
  editing?: AgencyClientDto | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (client: AgencyClientDto) => void;
};

const emptyValues: AgencyClientFormValues = {
  clientRegion: "domestic",
  name: "",
  contactName: "",
  email: "",
  phone: "",
  billingAddress: "",
  gstNumber: "",
  panNumber: "",
  stateCode: "",
  legalIdLabel: "",
  legalIdNumber: "",
  status: "active",
  notes: "",
  tags: [],
};

const LEGAL_DOC_ACCEPT = ".pdf,.png,.jpg,.jpeg,.gif,.webp";

export function ClientFormDialog({
  open,
  orgId,
  editing,
  onOpenChange,
  onSaved,
}: ClientFormDialogProps) {
  const { run } = useMutationFeedback();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingLegalFile, setPendingLegalFile] = useState<File | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const form = useForm<AgencyClientFormValues>({
    resolver: zodResolver(agencyClientSchema) as unknown as Resolver<AgencyClientFormValues>,
    defaultValues: emptyValues,
  });

  const clientRegion = form.watch("clientRegion");

  useEffect(() => {
    if (!open) return;
    setPendingLegalFile(null);
    setVerificationError(null);
    if (editing) {
      form.reset({
        clientRegion: editing.clientRegion ?? "domestic",
        name: editing.name,
        contactName: editing.contactName ?? "",
        email: editing.email ?? "",
        phone: editing.phone ?? "",
        billingAddress: editing.billingAddress ?? "",
        gstNumber: editing.gstNumber ?? "",
        panNumber: editing.panNumber ?? "",
        stateCode: editing.stateCode ?? "",
        legalIdLabel: editing.legalIdLabel ?? "",
        legalIdNumber: editing.legalIdNumber ?? "",
        status: editing.status,
        notes: editing.notes ?? "",
        tags: editing.tags ?? [],
      });
    } else {
      form.reset(emptyValues);
    }
  }, [open, editing, form]);

  function buildPayload(values: AgencyClientFormValues) {
    const base = {
      name: values.name,
      clientRegion: values.clientRegion,
      contactName: values.contactName || undefined,
      email: values.email || undefined,
      phone: values.phone || undefined,
      billingAddress: values.billingAddress || undefined,
      status: values.status,
      notes: values.notes || undefined,
      tags: values.tags ?? [],
    };

    if (values.clientRegion === "international") {
      return {
        ...base,
        legalIdLabel: values.legalIdLabel || undefined,
        legalIdNumber: values.legalIdNumber || undefined,
      };
    }

    return {
      ...base,
      gstNumber: values.gstNumber || undefined,
      panNumber: values.panNumber || undefined,
      stateCode: values.stateCode || undefined,
    };
  }

  async function onSubmit(values: AgencyClientFormValues) {
    const intlError = validateInternationalVerification(values, {
      hasExistingLegalDocument: editing?.hasLegalDocument,
      pendingLegalFile,
    });
    if (intlError) {
      setVerificationError(intlError);
      return;
    }
    setVerificationError(null);

    try {
      const payload = buildPayload(values);
      const saved = await run(async () => {
        let client = editing
          ? await updateAgencyClientApi(orgId, editing.id, payload)
          : await createAgencyClientApi(orgId, payload);
        if (pendingLegalFile) {
          client = await uploadClientLegalDocumentApi(orgId, client.id, pendingLegalFile);
        }
        return client;
      }, {
        successMessage: editing ? "Client updated." : "Client created.",
      });

      onSaved(saved);
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Could not save client.";
      form.setError("root", { type: "server", message });
      toast.error(message);
    }
  }

  async function handleDownloadLegalDocument() {
    if (!editing) return;
    try {
      const blob = await downloadClientLegalDocumentApi(orgId, editing.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${editing.name}-legal-document`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Could not download document.";
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit client" : "New client"}</DialogTitle>
          <DialogDescription>
            Choose domestic (India) or international. Domestic clients can use GST/PAN for
            invoicing; international clients require a government ID or legal document.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
            {form.formState.errors.root?.message ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {form.formState.errors.root.message}
              </div>
            ) : null}
            {verificationError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {verificationError}
              </div>
            ) : null}

            <FormField
              control={form.control}
              name="clientRegion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client region</FormLabel>
                  <FormControl>
                    <RadioGroup
                      className="flex flex-col gap-2 sm:flex-row sm:gap-6"
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="domestic" id="client-region-domestic" />
                        <Label htmlFor="client-region-domestic" className="font-normal">
                          Domestic (India)
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="international" id="client-region-international" />
                        <Label htmlFor="client-region-international" className="font-normal">
                          International
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Client or company" {...field} />
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
                      <Input type="email" placeholder="billing@client.com" {...field} />
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
                      <Input
                        placeholder={clientRegion === "domestic" ? "+91 ..." : "+1 ..."}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {clientRegion === "domestic" ? (
                <>
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
                        <FormDescription className="text-xs">
                          Drives CGST/SGST vs IGST on invoices.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              ) : (
                <>
                  <FormField
                    control={form.control}
                    name="legalIdLabel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID type (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="VAT, EIN, Company Reg No." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="legalIdNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Government ID number</FormLabel>
                        <FormControl>
                          <Input placeholder="Government-authorized ID" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="sm:col-span-2 space-y-2">
                    <Label>Legal document</Label>
                    <p className="text-xs text-muted-foreground">
                      Provide a government ID number or upload one legal document (PDF or image).
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept={LEGAL_DOC_ACCEPT}
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        setPendingLegalFile(file);
                        setVerificationError(null);
                        e.target.value = "";
                      }}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="mr-1 h-4 w-4" />
                        {pendingLegalFile ? "Replace file" : "Upload document"}
                      </Button>
                      {pendingLegalFile ? (
                        <span className="text-sm text-muted-foreground">
                          {pendingLegalFile.name}
                        </span>
                      ) : editing?.hasLegalDocument ? (
                        <>
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <FileText className="h-4 w-4" />
                            Document on file
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleDownloadLegalDocument()}
                          >
                            Download
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </>
              )}

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
                    <Textarea rows={3} placeholder="Full billing address..." {...field} />
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
                  "Create client"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
