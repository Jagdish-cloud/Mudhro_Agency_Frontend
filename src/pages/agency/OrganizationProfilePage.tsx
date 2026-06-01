import { Building2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/page-status";
import { getCurrentOrganizationId } from "@/lib/agencyAuth";
import { ApiError } from "@/lib/apiClient";
import { getOrganization } from "@/services/agency/organizationService";
import type { OrganizationProfile } from "@/types/organization";

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm font-medium break-words">{value}</div>
    </div>
  );
}

export function OrganizationProfilePage() {
  const orgId = getCurrentOrganizationId();
  const [org, setOrg] = useState<OrganizationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) {
      setError("You are not signed in to an organization.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getOrganization(orgId);
        if (cancelled) return;
        setOrg(data);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof ApiError ? err.message : "Unable to load organization.";
        setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  if (loading) {
    return <PageLoading label="Loading organization…" />;
  }

  if (error || !org) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-destructive">
          {error ?? "Could not load organization."}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {org.name}
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Organization profile (read-only). Contact your admin for changes.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <DetailItem label="Organization name" value={org.name} />
            <DetailItem label="Address" value={org.address} />
            <DetailItem
              label="GST number"
              value={
                org.isUnregistered ? (
                  <Badge variant="inactive">Unregistered</Badge>
                ) : (
                  <span className="font-mono">{org.gstNumber ?? "-"}</span>
                )
              }
            />
            <DetailItem label="Company mobile" value={org.companyMobile} />
            <DetailItem label="Company email" value={org.companyEmail} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
