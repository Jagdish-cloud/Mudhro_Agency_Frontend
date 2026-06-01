import { Link } from "react-router-dom";

import { Separator } from "@/components/ui/separator";

export function SiteFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-3">
            <div className="font-semibold">Mudhro Agency</div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Financial operations for organizations—designed for clarity, compliance-friendly workflows, and team-scale
              collaboration.
            </p>
          </div>
          <div className="space-y-3">
            <div className="text-sm font-medium">Product</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link className="hover:text-foreground" to="/contact">
                  Contact us
                </Link>
              </li>
              <li>
                <Link className="hover:text-foreground" to="/sign-in">
                  Sign in
                </Link>
              </li>
            </ul>
          </div>
          {/* <div className="space-y-3">
            <div className="text-sm font-medium">Contact</div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                Sales:{" "}
                <a className="hover:text-foreground" href="mailto:sales@mudhro.com">
                  sales@mudhro.com
                </a>
              </li>
              <li>
                Support:{" "}
                <a className="hover:text-foreground" href="mailto:support@mudhro.com">
                  support@mudhro.com
                </a>
              </li>
              <li>Phone: +91 80 0000 0000</li>
              <li>Bengaluru, India</li>
            </ul>
          </div> */}
          <div className="space-y-3">
            <div className="text-sm font-medium">Compliance note</div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tax outcomes depend on your jurisdiction and filings. Mudhro Agency helps you organize data—always confirm
              with a qualified professional.
            </p>
          </div>
        </div>
        <Separator className="my-8" />
        <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Mudhro. All rights reserved.</span>
          <span className="sm:text-right">Mudhro Agency is the team edition of Mudhro.</span>
        </div>
      </div>
    </footer>
  );
}
