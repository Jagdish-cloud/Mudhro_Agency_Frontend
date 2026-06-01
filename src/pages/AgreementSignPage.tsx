import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import { AgreementPreview, type AgreementPreviewModel } from "@/components/agency/projects/AgreementPreview";
import { SignaturePad, type SignaturePadHandle } from "@/components/agency/projects/SignaturePad";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutationFeedback } from "@/context/mutation-feedback-context";
import { ApiError } from "@/lib/apiClient";
import {
  downloadAgreementPdfByTokenApi,
  getAgreementByTokenApi,
  submitClientSignatureApi,
} from "@/services/agency/agreementsService";
import type { PortalAgreementResponse } from "@/types/agency/agreement";

function toPreviewModel(payload: Extract<PortalAgreementResponse, { valid: true }>): AgreementPreviewModel {
  const a = payload.agreement;
  return {
    serviceProviderName: a.serviceProviderName,
    agreementDate: a.agreementDate,
    serviceType: a.serviceType,
    deliverables: a.deliverables.map((d) => ({ description: d.description })),
    startDate: a.startDate,
    endDate: a.endDate,
    duration: a.duration,
    durationUnit: a.durationUnit,
    numberOfRevisions: a.numberOfRevisions,
    jurisdiction: a.jurisdiction,
    paymentTerms: a.paymentTerms,
    signatures: a.signatures,
    currency: payload.project.currency,
    serviceProviderSignaturePreviewUrl: a.serviceProviderSignaturePreviewUrl ?? null,
  };
}

export function AgreementSignPage() {
  const { run } = useMutationFeedback();
  const { token: tokenParam } = useParams<{ token: string }>();
  const token = tokenParam ?? "";

  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<PortalAgreementResponse | null>(null);
  const [signerName, setSignerName] = useState("");
  const padRef = useRef<SignaturePadHandle>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    void (async () => {
      setLoading(true);
      try {
        const res = await getAgreementByTokenApi(token);
        setPayload(res);
        if (res.valid && res.client.contactName) {
          setSignerName(res.client.contactName);
        }
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : "Could not load agreement.";
        toast.error(msg);
        setPayload({ valid: false, expired: false, reason: msg });
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const submit = async () => {
    if (!payload || !payload.valid) return;
    if (payload.alreadySigned) {
      toast.info("You have already signed this agreement.");
      return;
    }
    if (!signerName.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    const img = padRef.current?.toDataURL();
    if (!img || padRef.current?.isEmpty()) {
      toast.error("Please draw your signature.");
      return;
    }
    setSubmitting(true);
    try {
      await run(
        async (): Promise<string> => {
          const submitRes = await submitClientSignatureApi(token, {
            signerName: signerName.trim(),
            signatureImage: img,
          });
          try {
            await downloadAgreementPdfByTokenApi(token, `agreement-${payload.agreement.id}.pdf`);
          } catch {
            toast.warning("Signature saved. Open this page again to download the PDF if needed.");
          }
          const refreshed = await getAgreementByTokenApi(token);
          setPayload(refreshed);
          return submitRes.completed
            ? "All parties have signed. Thank you."
            : "Signature submitted. Thank you.";
        },
        {
          successMessage: (msg) => msg,
        },
      );
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Submission failed.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return <p className="p-6 text-sm text-muted-foreground">Invalid signing link.</p>;
  }

  if (loading) {
    return <p className="p-6 text-sm text-muted-foreground">Loading agreement…</p>;
  }

  if (!payload || !payload.valid) {
    const expired = payload && "expired" in payload && payload.expired;
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6">
        <Card>
          <CardHeader>
            <CardTitle>{expired ? "Link expired" : "Unable to open agreement"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>{payload && "reason" in payload ? payload.reason : "This link is not valid."}</p>
            {expired ? (
              <p>Please contact the sender to request a new signing link.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (payload.alreadySigned) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Already signed</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>Your signature was already recorded for this agreement.</p>
          </CardContent>
        </Card>
        <AgreementPreview model={toPreviewModel(payload)} />
      </div>
    );
  }

  const preview = toPreviewModel(payload);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Service agreement</h1>
        <p className="text-muted-foreground text-sm">
          Project: {payload.project.name} · Link expires {new Date(payload.link.expiresAt).toLocaleString()}
        </p>
      </div>

      <AgreementPreview model={preview} className="rounded-md border border-border bg-card p-4" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your signature</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="signer">Full name *</Label>
            <Input id="signer" value={signerName} onChange={(e) => setSignerName(e.target.value)} />
          </div>
          <SignaturePad ref={padRef} className="w-full" />
          <Button type="button" disabled={submitting} onClick={() => void submit()}>
            {submitting ? "Submitting…" : "Sign agreement"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
