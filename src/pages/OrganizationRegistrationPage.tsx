import { Link } from "react-router-dom";

import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { OrganizationRegistrationForm } from "@/components/registration/OrganizationRegistrationForm";

export function OrganizationRegistrationPage() {
  return (
    <div className="min-h-dvh flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="mb-8 space-y-3">
            <p className="text-sm text-muted-foreground">
              <Link className="text-foreground underline-offset-4 hover:underline" to="/">
                ← Back to home
              </Link>
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">Register your organization</h1>
            <p className="max-w-2xl text-muted-foreground">
              Create your organization profile, add operational contacts, and provision administrator accounts. All fields
              are validated inline before submission.
            </p>
          </div>

          <OrganizationRegistrationForm />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
