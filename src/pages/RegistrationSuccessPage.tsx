import { Link, useLocation } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type LocationState = {
  organizationName?: string;
};

export function RegistrationSuccessPage() {
  const location = useLocation();
  const state = (location.state ?? null) as LocationState | null;
  const organizationName = state?.organizationName;

  return (
    <div className="min-h-dvh flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
          <Card className="shadow-sm">
            <CardHeader className="space-y-2">
              <div className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Registration submitted
              </div>
              <CardTitle>Welcome to Mudhro Agency</CardTitle>
              <CardDescription>
                {organizationName ? (
                  <>
                    <span className="font-medium text-foreground">{organizationName}</span> has been registered
                    successfully. You’ll receive next steps at the admin email(s) you provided.
                  </>
                ) : (
                  <>Your organization registration was submitted successfully.</>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="w-full sm:w-auto">
                <Link to="/">Return home</Link>
              </Button>
              <Button asChild variant="outline" className="w-full bg-background sm:w-auto">
                <Link to="/sign-in">Go to sign in</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
