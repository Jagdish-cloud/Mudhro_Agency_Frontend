import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm">
            M
          </span>
          <span>Mudhro Agency</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Button variant="secondary" asChild>
            <Link to="/sign-in">Sign in</Link>
          </Button>
          <Button asChild>
            <Link to="/contact">Book Onboarding</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
