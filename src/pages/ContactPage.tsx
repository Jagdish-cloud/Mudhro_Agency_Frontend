import { Mail, MapPin, Phone } from "lucide-react";

import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const contactItems = [  
  // {
  //   title: "Sales",
  //   description: "Talk to our team about onboarding, pricing, or fit for your organization.",
  //   icon: Mail,
  //   primary: "sales@mudhro.com",
  //   href: "mailto:sales@mudhro.com",
  // },
  {
    title: "Email",
    description: "Existing organization? Reach our support desk for help with your workspace.",
    icon: Mail,
    primary: "admin@mudhro.com",
    href: "mailto:admin@mudhro.com",
  },
  {
    title: "Phone",
    description: "Available Monday to Sunday, 10:00 AM to 10:00 PM IST.",
    icon: Phone,
    primary: "+91 63620 68731 (Whatsapp Only)",
    href: "tel:+916362068731",
  },
] as const;

export function ContactPage() {
  return (
    <div className="min-h-dvh flex flex-col bg-app-surface">
      <SiteHeader />
      <main className="flex-1">
        <section className="relative overflow-hidden border-b bg-gradient-to-b from-background to-muted/40">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/15 via-transparent to-transparent" />
          <div className="relative mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-24">
            <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
              Get in touch with Mudhro Agency
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
              Onboarding to Mudhro Agency is handled by our team. Reach out below and we will help
              you get your organization set up.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {contactItems.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="shadow-sm">
                  <CardHeader className="space-y-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-5 w-5 text-foreground" />
                    </div>
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
                      {item.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <a
                      href={item.href}
                      className="text-sm font-medium text-foreground hover:underline"
                    >
                      {item.primary}
                    </a>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="mt-10 shadow-sm">
            <CardHeader className="flex flex-row items-start gap-3 space-y-0">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <MapPin className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <CardTitle className="text-base">Office</CardTitle>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Mudhro Agency
                  <br />
                  Bengaluru, Karnataka, India
                </p>
              </div>
            </CardHeader>
          </Card>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
