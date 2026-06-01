import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { adminLogin } from "@/services/authService";
import {
  ADMIN_INFO_STORAGE_KEY,
  ADMIN_ORG_STORAGE_KEY,
  ADMIN_TOKEN_STORAGE_KEY,
} from "@/types/auth";

const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type AdminLoginFormValues = z.infer<typeof adminLoginSchema>;

export function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const form = useForm<AdminLoginFormValues>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: AdminLoginFormValues) {
    form.clearErrors("root");
    try {
      const result = await adminLogin(values);
      localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, result.token);
      localStorage.setItem(ADMIN_INFO_STORAGE_KEY, JSON.stringify(result.admin));
      localStorage.setItem(ADMIN_ORG_STORAGE_KEY, JSON.stringify(result.organization));
      const fromPath = (location.state as { from?: string } | null)?.from;
      navigate(fromPath ?? "/agency", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign in failed.";
      form.setError("root", { type: "server", message });
    }
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
          <Card>
            <CardHeader>
              <CardTitle>Admin sign in</CardTitle>
              <CardDescription>
                Sign in with your administrator credentials to continue to Mudhro Agency.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
                  {form.formState.errors.root?.message ? (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                      {form.formState.errors.root.message}
                    </div>
                  ) : null}

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" autoComplete="email" placeholder="admin@company.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            autoComplete="current-password"
                            placeholder="Enter password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                    <Button type="submit" className="w-full sm:w-auto" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        "Sign in"
                      )}
                    </Button>
                    <Button asChild variant="ghost" className="w-full sm:w-auto">
                      <Link to="/">Back to home</Link>
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
