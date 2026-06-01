import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AgreementPreview, type AgreementPreviewModel } from "@/components/agency/projects/AgreementPreview";
import { SignaturePad, type SignaturePadHandle } from "@/components/agency/projects/SignaturePad";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { AgencyClientDto } from "@/types/agencyInvoicing";
import { useMutationFeedback } from "@/context/mutation-feedback-context";
import {
  createAgreementApi,
  downloadAgreementPdfApi,
  sendAgreementToClientsApi,
  updateAgreementApi,
} from "@/services/agency/agreementsService";
import type {
  AgreementDto,
  AgreementPaymentStructure,
  CreateAgreementInput,
  MilestoneInput,
  UpdateAgreementInput,
} from "@/types/agency/agreement";

const TOTAL_STEPS = 7;
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

function computeDurationBand(
  startDate: string | null,
  endDate: string | null,
): { duration: number; durationUnit: "days" | "weeks" | "months" } | null {
  if (!startDate || !endDate) return null;
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  if (end < start) return null;
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
  if (days < 7) return { duration: days, durationUnit: "days" };
  if (days < 30) return { duration: Math.max(1, Math.ceil(days / 7)), durationUnit: "weeks" };
  return { duration: Math.max(1, Math.ceil(days / 30)), durationUnit: "months" };
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export type AgreementModalProjectData = {
  budget: number | null;
  startDate: string | null;
  endDate: string | null;
  currency: string;
};

type AgreementModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  projectId: string;
  projectName: string;
  projectData: AgreementModalProjectData;
  assignedClientIds: string[];
  clients: AgencyClientDto[];
  existingAgreement: AgreementDto | null;
  providerDefaults: { serviceProviderName: string; signerName: string };
  onSaveProject?: () => Promise<string>;
  onComplete?: () => void;
};

export function AgreementModal({
  open,
  onOpenChange,
  orgId,
  projectId,
  projectName,
  projectData,
  assignedClientIds,
  clients,
  existingAgreement,
  providerDefaults,
  onSaveProject,
  onComplete,
}: AgreementModalProps) {
  const { run } = useMutationFeedback();
  const [step, setStep] = useState(1);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSnapshot, setPreviewSnapshot] = useState<AgreementPreviewModel | null>(null);
  const [sending, setSending] = useState(false);

  const [serviceProviderName, setServiceProviderName] = useState("");
  const [agreementDate, setAgreementDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [serviceType, setServiceType] = useState("");
  const [deliverables, setDeliverables] = useState<string[]>([""]);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [paymentStructure, setPaymentStructure] = useState<AgreementPaymentStructure>("50-50");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [milestones, setMilestones] = useState<MilestoneInput[]>([
    { description: "", amount: 0, date: null },
  ]);
  const [numberOfRevisions, setNumberOfRevisions] = useState(0);
  const [jurisdiction, setJurisdiction] = useState("");
  const [signerName, setSignerName] = useState("");
  const padRef = useRef<SignaturePadHandle>(null);
  /** Kept when the signature pad unmounts on the review step so create payload can still upload the PNG. */
  const [serviceProviderSignatureDataUrl, setServiceProviderSignatureDataUrl] = useState<string | null>(null);
  const [sendClientIds, setSendClientIds] = useState<string[]>([]);

  const durationBand = useMemo(() => computeDurationBand(startDate, endDate), [startDate, endDate]);

  const milestoneRemaining = useMemo(() => {
    const budget = projectData.budget;
    if (budget == null) return null;
    const used = milestones.reduce((s, m) => s + (Number.isFinite(m.amount) ? m.amount : 0), 0);
    return Math.max(0, budget - used);
  }, [projectData.budget, milestones]);

  const isEditLocked = useMemo(() => {
    if (!existingAgreement) return false;
    return Date.now() - new Date(existingAgreement.createdAt).getTime() > TWO_DAYS_MS;
  }, [existingAgreement]);

  const resetForOpen = useCallback(() => {
    setStep(1);
    setPreviewOpen(false);
    setSending(false);
    setServiceProviderName(providerDefaults.serviceProviderName);
    setAgreementDate(new Date().toISOString().slice(0, 10));
    setServiceType("");
    setDeliverables([""]);
    setStartDate(projectData.startDate);
    setEndDate(projectData.endDate);
    setPaymentStructure("50-50");
    setPaymentMethod("");
    setMilestones([{ description: "", amount: 0, date: null }]);
    setNumberOfRevisions(0);
    setJurisdiction("");
    setSignerName(providerDefaults.signerName);
    setSendClientIds([...assignedClientIds]);
    setServiceProviderSignatureDataUrl(null);
    padRef.current?.clear();
  }, [providerDefaults, projectData.startDate, projectData.endDate, assignedClientIds]);

  useEffect(() => {
    if (!open) return;
    if (existingAgreement) {
      setServiceProviderName(existingAgreement.serviceProviderName);
      setAgreementDate(existingAgreement.agreementDate);
      setServiceType(existingAgreement.serviceType);
      setDeliverables(
        existingAgreement.deliverables.length
          ? existingAgreement.deliverables.map((d) => d.description)
          : [""],
      );
      setStartDate(existingAgreement.startDate);
      setEndDate(existingAgreement.endDate);
      const pt = existingAgreement.paymentTerms;
      if (pt) {
        setPaymentStructure(pt.paymentStructure);
        setPaymentMethod(pt.paymentMethod ?? "");
        setMilestones(
          pt.milestones.length
            ? pt.milestones.map((m) => ({
                description: m.description,
                amount: m.amount,
                date: m.date,
              }))
            : [{ description: "", amount: 0, date: null }],
        );
      }
      setNumberOfRevisions(existingAgreement.numberOfRevisions);
      setJurisdiction(existingAgreement.jurisdiction ?? "");
      const sp = existingAgreement.signatures.find((s) => s.signerType === "service_provider");
      setSignerName(sp?.signerName ?? providerDefaults.signerName);
      setSendClientIds([...assignedClientIds]);
      setStep(1);
      setPreviewOpen(false);
      setSending(false);
      setServiceProviderSignatureDataUrl(null);
      padRef.current?.clear();
    } else {
      resetForOpen();
    }
  }, [open, existingAgreement, providerDefaults, assignedClientIds, resetForOpen]);

  const selectedClientNames = useMemo(
    () =>
      clients
        .filter((c) => assignedClientIds.includes(c.id))
        .map((c) => c.name),
    [clients, assignedClientIds],
  );

  const buildPreviewSnapshot = (): AgreementPreviewModel => {
    const cleanDeliverables = deliverables.map((d) => d.trim()).filter(Boolean).map((d) => ({ description: d }));
    const padData = padRef.current?.toDataURL() ?? null;
    const spUrl =
      padData || serviceProviderSignatureDataUrl || existingAgreement?.serviceProviderSignaturePreviewUrl || null;
    const clientOnly = existingAgreement?.signatures.filter((s) => s.signerType === "client") ?? [];
    return {
      serviceProviderName: serviceProviderName.trim(),
      agreementDate,
      serviceType: serviceType.trim(),
      deliverables: cleanDeliverables,
      startDate,
      endDate,
      duration: durationBand?.duration ?? null,
      durationUnit: durationBand?.durationUnit ?? null,
      numberOfRevisions,
      jurisdiction: jurisdiction.trim() || null,
      paymentTerms: {
        id: "preview",
        paymentStructure,
        paymentMethod: paymentMethod.trim() || null,
        milestones:
          paymentStructure === "milestone-based"
            ? milestones
                .filter((m) => m.description.trim() && m.date)
                .map((m, i) => ({
                  id: `m-${i}`,
                  description: m.description,
                  amount: m.amount,
                  date: m.date,
                  order: i,
                  status: "pending" as const,
                }))
            : [],
      },
      signatures: clientOnly,
      currency: projectData.currency,
      serviceProviderSignaturePreviewUrl: spUrl,
      serviceProviderSignerDisplay: signerName.trim(),
    };
  };

  const validateStep = (s: number): boolean => {
    if (s === 1) {
      if (!serviceProviderName.trim()) {
        toast.error("Service provider name is required.");
        return false;
      }
      if (!agreementDate) {
        toast.error("Agreement date is required.");
        return false;
      }
    }
    if (s === 2 && !serviceType.trim()) {
      toast.error("Service type is required.");
      return false;
    }
    if (s === 3 && startDate && endDate && new Date(endDate) < new Date(startDate)) {
      toast.error("End date must be on or after start date.");
      return false;
    }
    if (s === 4) {
      if (paymentStructure === "milestone-based") {
        const valid = milestones.filter((m) => m.description.trim() && m.date);
        if (valid.length === 0) {
          toast.error("Add at least one milestone with description and date.");
          return false;
        }
        if (projectData.budget != null) {
          const total = valid.reduce((sum, m) => sum + m.amount, 0);
          if (total > projectData.budget + 0.005) {
            toast.error("Milestone total exceeds project budget.");
            return false;
          }
        }
      }
    }
    if (s === 7) {
      if (!signerName.trim()) {
        toast.error("Signer name is required.");
        return false;
      }
      const fresh = padRef.current?.toDataURL();
      const hasCaptured = Boolean(serviceProviderSignatureDataUrl);
      if (
        !existingAgreement?.serviceProviderSignaturePreviewUrl &&
        (!fresh || padRef.current?.isEmpty()) &&
        !hasCaptured
      ) {
        toast.error("Please draw your signature.");
        return false;
      }
    }
    return true;
  };

  const buildCreatePayload = (): CreateAgreementInput => {
    const cleanDeliverables = deliverables.map((d) => ({ description: d.trim() })).filter((d) => d.description);
    const band = computeDurationBand(startDate, endDate);
    const fromPad =
      padRef.current && !padRef.current.isEmpty() ? padRef.current.toDataURL() : null;
    const sig = fromPad ?? serviceProviderSignatureDataUrl;
    if (!sig) {
      throw new Error("missing signature");
    }
    return {
      serviceProviderName: serviceProviderName.trim(),
      agreementDate,
      serviceType: serviceType.trim(),
      startDate,
      endDate,
      duration: band?.duration ?? null,
      durationUnit: band?.durationUnit ?? null,
      numberOfRevisions,
      jurisdiction: jurisdiction.trim() || null,
      deliverables: cleanDeliverables,
      paymentTerms: {
        paymentStructure,
        paymentMethod: paymentMethod.trim() || null,
        milestones:
          paymentStructure === "milestone-based"
            ? milestones
                .filter((m) => m.description.trim() && m.date)
                .map((m) => ({
                  description: m.description.trim(),
                  amount: m.amount,
                  date: m.date,
                }))
            : [],
      },
      serviceProviderSignerName: signerName.trim(),
      serviceProviderSignatureImage: sig,
    };
  };

  const buildUpdatePayload = (): UpdateAgreementInput => ({
    serviceProviderName: serviceProviderName.trim(),
    agreementDate,
    serviceType: serviceType.trim(),
    startDate,
    endDate,
    duration: durationBand?.duration ?? null,
    durationUnit: durationBand?.durationUnit ?? null,
    numberOfRevisions,
    jurisdiction: jurisdiction.trim() || null,
    deliverables: deliverables.map((d) => ({ description: d.trim() })).filter((d) => d.description),
    paymentTerms: {
      paymentStructure,
      paymentMethod: paymentMethod.trim() || null,
      milestones:
        paymentStructure === "milestone-based"
          ? milestones
              .filter((m) => m.description.trim() && m.date)
              .map((m) => ({
                description: m.description.trim(),
                amount: m.amount,
                date: m.date,
              }))
          : [],
    },
  });

  const handleConfirmSave = async () => {
    if (isEditLocked) {
      toast.error("This agreement can no longer be edited; the 2-day window has expired.");
      return;
    }
    try {
      let pid = projectId;
      if ((!pid || pid === "new") && onSaveProject) {
        pid = await onSaveProject();
      }
      if (!pid || pid === "new") {
        toast.error("Save the project before creating an agreement.");
        return;
      }

      await run(async (): Promise<string> => {
          let saved: AgreementDto;
          if (existingAgreement) {
            saved = await updateAgreementApi(orgId, existingAgreement.id, buildUpdatePayload());
          } else {
            saved = await createAgreementApi(orgId, pid, buildCreatePayload());
          }

          try {
            await downloadAgreementPdfApi(orgId, saved.id, `agreement-${saved.id}.pdf`);
          } catch {
            toast.warning("Agreement saved but PDF download failed. Use Download PDF on the project page.");
          }

          let msg = existingAgreement ? "Agreement updated." : "Agreement saved.";
          if (sendClientIds.length > 0) {
            setSending(true);
            try {
              const sendRes = await sendAgreementToClientsApi(orgId, saved.id, sendClientIds);
              const failed = sendRes.failures?.length ?? 0;
              if (failed > 0) {
                toast.warning("Agreement saved but failed to send emails. You can send them later.");
              } else {
                msg = "Agreement saved and sent to clients.";
              }
            } catch {
              toast.warning("Agreement saved but failed to send emails. You can send them later.");
            } finally {
              setSending(false);
            }
          }
          return msg;
        }, {
          successMessage: (msg) => msg,
        });

      setPreviewOpen(false);
      setPreviewSnapshot(null);
      onOpenChange(false);
      onComplete?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save agreement.";
      toast.error(msg);
    }
  };

  const canShowAgreementCTA = assignedClientIds.length > 0 || Boolean(existingAgreement);

  const splitPreview =
    paymentStructure === "50-50" && projectData.budget != null ? (
      <p className="text-muted-foreground text-sm">
        Split: {formatMoney(projectData.budget / 2, projectData.currency)} upfront,{" "}
        {formatMoney(projectData.budget / 2, projectData.currency)} on completion.
      </p>
    ) : null;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            setPreviewOpen(false);
            setPreviewSnapshot(null);
          }
          onOpenChange(next);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {previewOpen
                ? "Review agreement"
                : `${existingAgreement ? "Edit agreement" : "New agreement"} — ${projectName}`}
            </DialogTitle>
            {!previewOpen ? (
              <>
                <DialogDescription>
                  Step {step} of {TOTAL_STEPS}
                </DialogDescription>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
                  />
                </div>
              </>
            ) : (
              <DialogDescription>Confirm the legal text before saving.</DialogDescription>
            )}
          </DialogHeader>

          {!canShowAgreementCTA ? (
            <p className="text-muted-foreground text-sm">Assign at least one client to the project to create an agreement.</p>
          ) : isEditLocked ? (
            <p className="text-destructive text-sm">This agreement is outside the 2-day edit window.</p>
          ) : previewOpen && previewSnapshot ? (
            <AgreementPreview model={previewSnapshot} className="max-h-[55vh] overflow-y-auto pr-2" />
          ) : (
            <div className="space-y-4 py-2">
              {step === 1 && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="sp-name">Service provider name *</Label>
                    <Input
                      id="sp-name"
                      value={serviceProviderName}
                      onChange={(e) => setServiceProviderName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="agr-date">Agreement date *</Label>
                    <Input id="agr-date" type="date" value={agreementDate} onChange={(e) => setAgreementDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>Clients on this project</Label>
                    <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
                      {selectedClientNames.length ? selectedClientNames.map((n) => <li key={n}>{n}</li>) : <li>None assigned</li>}
                    </ul>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="svc-type">Service type *</Label>
                    <Textarea id="svc-type" value={serviceType} onChange={(e) => setServiceType(e.target.value)} rows={3} />
                  </div>
                  <Label>Deliverables</Label>
                  {deliverables.map((line, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={line}
                        onChange={(e) => {
                          const next = [...deliverables];
                          next[idx] = e.target.value;
                          setDeliverables(next);
                        }}
                        placeholder="Deliverable description"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDeliverables(deliverables.filter((_, i) => i !== idx))}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="secondary" size="sm" onClick={() => setDeliverables([...deliverables, ""])}>
                    Add deliverable
                  </Button>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Start date</Label>
                      <Input type="date" value={startDate ?? ""} onChange={(e) => setStartDate(e.target.value || null)} />
                    </div>
                    <div>
                      <Label>End date</Label>
                      <Input type="date" value={endDate ?? ""} onChange={(e) => setEndDate(e.target.value || null)} />
                    </div>
                  </div>
                  {durationBand ? (
                    <p className="text-sm text-muted-foreground">
                      Duration (computed): {durationBand.duration} {durationBand.durationUnit} (read-only)
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Set start and end dates to compute duration.</p>
                  )}
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <Label>Payment structure *</Label>
                  <RadioGroup
                    value={paymentStructure}
                    onValueChange={(v) => setPaymentStructure(v as AgreementPaymentStructure)}
                    className="grid gap-2"
                  >
                    {(
                      [
                        ["50-50", "50% upfront / 50% on completion"],
                        ["100-upfront", "100% upfront"],
                        ["100-completion", "100% on completion"],
                        ["milestone-based", "Milestone-based"],
                      ] as const
                    ).map(([value, label]) => (
                      <div key={value} className="flex items-center space-x-2">
                        <RadioGroupItem value={value} id={`pay-${value}`} />
                        <Label htmlFor={`pay-${value}`} className="font-normal">
                          {label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  {splitPreview}
                  <div>
                    <Label htmlFor="pay-method">Payment method</Label>
                    <Input id="pay-method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} />
                  </div>
                  {paymentStructure === "milestone-based" ? (
                    <div className="space-y-2 rounded-md border border-border p-3">
                      {projectData.budget != null ? (
                        <p className="text-sm font-medium">
                          Total budget {formatMoney(projectData.budget, projectData.currency)} — Remaining{" "}
                          {formatMoney(milestoneRemaining ?? 0, projectData.currency)}
                        </p>
                      ) : null}
                      {milestones.map((m, idx) => (
                        <div key={idx} className="grid gap-2 border-t border-border pt-2 sm:grid-cols-3">
                          <Input
                            placeholder="Description *"
                            value={m.description}
                            onChange={(e) => {
                              const next = [...milestones];
                              next[idx] = { ...next[idx], description: e.target.value };
                              setMilestones(next);
                            }}
                          />
                          <Input
                            type="number"
                            placeholder="Amount *"
                            value={m.amount || ""}
                            onChange={(e) => {
                              const amount = Number(e.target.value);
                              const next = [...milestones];
                              if (projectData.budget != null) {
                                const others = milestones.reduce((s, x, i) => (i === idx ? s : s + x.amount), 0);
                                const max = projectData.budget - others;
                                if (amount > max + 1e-6) {
                                  toast.error("Amount exceeds remaining budget.");
                                  return;
                                }
                              }
                              next[idx] = { ...next[idx], amount: Number.isFinite(amount) ? amount : 0 };
                              setMilestones(next);
                            }}
                          />
                          <Input
                            type="date"
                            value={m.date ?? ""}
                            onChange={(e) => {
                              const next = [...milestones];
                              next[idx] = { ...next[idx], date: e.target.value || null };
                              setMilestones(next);
                            }}
                          />
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={projectData.budget != null && (milestoneRemaining ?? 0) <= 0}
                        onClick={() => {
                          if (projectData.budget != null && (milestoneRemaining ?? 0) <= 0) {
                            toast.error("No remaining budget for another milestone.");
                            return;
                          }
                          setMilestones([...milestones, { description: "", amount: 0, date: null }]);
                        }}
                      >
                        Add milestone
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}

              {step === 5 && (
                <div className="space-y-2">
                  <Label htmlFor="revs">Number of revisions (≥ 0)</Label>
                  <Input
                    id="revs"
                    type="number"
                    min={0}
                    value={numberOfRevisions}
                    onChange={(e) => setNumberOfRevisions(Math.max(0, Number(e.target.value) || 0))}
                  />
                  <p className="text-muted-foreground text-xs">
                    A revision = minor adjustments within scope. Major changes are billed separately.
                  </p>
                </div>
              )}

              {step === 6 && (
                <div>
                  <Label htmlFor="jur">Jurisdiction (optional)</Label>
                  <Input id="jur" value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} />
                </div>
              )}

              {step === 7 && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="signer">Signer name *</Label>
                    <Input id="signer" value={signerName} onChange={(e) => setSignerName(e.target.value)} />
                  </div>
                  {existingAgreement?.serviceProviderSignaturePreviewUrl ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Signature on file. Draw below only if replacing (not yet supported on save).</p>
                      <img
                        src={existingAgreement.serviceProviderSignaturePreviewUrl}
                        alt="Existing signature"
                        className="max-h-28 max-w-xs border border-border bg-white object-contain p-1"
                      />
                    </div>
                  ) : null}
                  <SignaturePad
                    ref={padRef}
                    className="w-full max-w-full"
                    onInkChange={(url) => setServiceProviderSignatureDataUrl(url)}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            {previewOpen ? (
              <div className="flex w-full justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPreviewOpen(false);
                    setPreviewSnapshot(null);
                  }}
                >
                  Back
                </Button>
                <Button type="button" onClick={() => void handleConfirmSave()}>
                  Confirm &amp; Save
                </Button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  {step > 1 ? (
                    <Button type="button" variant="secondary" onClick={() => setStep((s) => Math.max(1, s - 1))}>
                      Back
                    </Button>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  {step < TOTAL_STEPS ? (
                    <Button
                      type="button"
                      onClick={() => {
                        if (!validateStep(step)) return;
                        setStep((s) => Math.min(TOTAL_STEPS, s + 1));
                      }}
                    >
                      Next
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      disabled={!canShowAgreementCTA || isEditLocked}
                      onClick={() => {
                        if (!validateStep(step)) return;
                        if (!existingAgreement) {
                          const snap = padRef.current?.toDataURL() ?? serviceProviderSignatureDataUrl;
                          if (snap) setServiceProviderSignatureDataUrl(snap);
                        }
                        setPreviewSnapshot(buildPreviewSnapshot());
                        setPreviewOpen(true);
                      }}
                    >
                      Preview &amp; Save Agreement
                    </Button>
                  )}
                </div>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {sending ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <p className="text-lg font-medium">Sending agreement to clients...</p>
        </div>
      ) : null}
    </>
  );
}
