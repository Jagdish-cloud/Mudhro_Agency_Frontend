import { Lock, Server } from "lucide-react";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export function TrustSection() {
  return (
    <section className="border-y bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Security you can explain to your CFO</h2>
          <p className="mt-3 text-muted-foreground">
            Mudhro Agency is designed with a B2B mindset: least-privilege collaboration, careful handling of financial
            artifacts, and operational transparency for administrators.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          <Card className="shadow-sm lg:col-span-2">
            <CardHeader className="flex flex-row items-start gap-3 space-y-0">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-background shadow-sm">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Data handling & access</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Financial records deserve structured access. Mudhro Agency separates organization administration from
                  day-to-day collaboration so permissions can evolve cleanly as your team grows.
                </p>
              </div>
            </CardHeader>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-start gap-3 space-y-0">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-background shadow-sm">
                <Server className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Operational reliability</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Built for consistent monthly close rituals: exports, reporting, and review-friendly summaries your team
                  can trust.
                </p>
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>
    </section>
  );
}
