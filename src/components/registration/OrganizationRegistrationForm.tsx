import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useMutationFeedback } from "@/context/mutation-feedback-context";
import { mapFormValuesToRegistrationPayload } from "@/lib/mapOrganizationPayload";
import {
  organizationRegistrationSchema,
  type OrganizationRegistrationFormValues,
} from "@/schemas/organizationRegistrationSchema";
import { registerOrganization } from "@/services/organizationService";

const defaultValues: OrganizationRegistrationFormValues = {
  organizationName: "",
  address: "",
  isUnregistered: false,
  gstNumber: "",
  companyPan: "",
  companyMobile: "",
  companyEmail: "",
  contactPersons: [{ name: "", email: "", number: "", designation: "" }],
  admins: [{ name: "", email: "", number: "", designation: "", password: "", confirmPassword: "" }],
};

export function OrganizationRegistrationForm() {
  const navigate = useNavigate();
  const { run } = useMutationFeedback();

  const form = useForm<OrganizationRegistrationFormValues>({
    resolver: zodResolver(organizationRegistrationSchema),
    defaultValues,
    mode: "onBlur",
  });

  const isUnregistered = form.watch("isUnregistered");

  useEffect(() => {
    if (isUnregistered) {
      form.setValue("gstNumber", "");
      form.clearErrors("gstNumber");
    }
  }, [form, isUnregistered]);

  const contacts = useFieldArray({ control: form.control, name: "contactPersons" });
  const admins = useFieldArray({ control: form.control, name: "admins" });

  async function onSubmit(values: OrganizationRegistrationFormValues) {
    form.clearErrors("root");
    try {
      await run(
        () =>
          registerOrganization(mapFormValuesToRegistrationPayload(values)),
        {
          successMessage: (res) => `${res.organizationName} registered successfully.`,
        },
      );
      navigate("/", { replace: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong. Please try again.";
      form.setError("root", { type: "server", message });
    }
  }

  return (
    <Form {...form}>
      <form className="space-y-8" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        {form.formState.errors.root?.message ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {form.formState.errors.root.message}
          </div>
        ) : null}

        <Card className="shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle>Section A — Organization details</CardTitle>
            <CardDescription>Legal entity information used for billing, tax workflows, and admin verification.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="organizationName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization name</FormLabel>
                  <FormControl>
                    <Input autoComplete="organization" placeholder="Acme Creative Pvt Ltd" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input autoComplete="street-address" placeholder="Registered office address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-6 lg:grid-cols-2">
            <FormField
                control={form.control}
                name="gstNumber"
                render={({ field }) => (
                  <FormItem >
                    <FormLabel>GST number (GSTIN)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="15-character GSTIN"
                        disabled={isUnregistered}
                        autoCapitalize="characters"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {isUnregistered ? "Not required for unregistered organizations." : "Required for GST-registered organizations."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isUnregistered"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start gap-3 space-y-0  p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(v) => field.onChange(v === true)}
                        aria-label="Organization is not GST registered"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Un-registered (No GST)</FormLabel>
                      <FormDescription className="mt-[10px]">
                        Check this if your organization is not GST registered. GSTIN will be disabled.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />


            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="companyPan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company PAN</FormLabel>
                    <FormControl>
                      <Input placeholder="ABCDE1234F" autoCapitalize="characters" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyMobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company mobile number</FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" autoComplete="tel" placeholder="10-digit mobile" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="companyEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" placeholder="finance@company.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle>Section B — Contact persons</CardTitle>
            <CardDescription>Add one or more operational contacts for client and vendor communications.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {contacts.fields.map((row, index) => (
              <div key={row.id} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm font-medium">Contact person {index + 1}</div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="bg-background"
                    disabled={contacts.fields.length <= 1}
                    onClick={() => contacts.remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                </div>
                <Separator className="my-4" />
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name={`contactPersons.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`contactPersons.${index}.designation`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Designation</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Operations Lead" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`contactPersons.${index}.email`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" autoComplete="email" placeholder="name@company.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`contactPersons.${index}.number`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile number</FormLabel>
                        <FormControl>
                          <Input inputMode="numeric" autoComplete="tel" placeholder="10-digit mobile" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ))}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">At least one contact person is required.</p>
              <Button
                type="button"
                variant="secondary"
                onClick={() => contacts.append({ name: "", email: "", number: "", designation: "" })}
              >
                <Plus className="h-4 w-4" />
                Add contact person
              </Button>
            </div>
            {typeof form.formState.errors.contactPersons?.message === "string" ? (
              <p className="text-sm font-medium text-destructive">{form.formState.errors.contactPersons.message}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle>Section C — Organization admins</CardTitle>
            <CardDescription>
              Create administrator accounts. Emails must be unique. Passwords must meet strong-password rules.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {admins.fields.map((row, index) => (
              <div key={row.id} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm font-medium">Admin {index + 1}</div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="bg-background"
                    disabled={admins.fields.length <= 1}
                    onClick={() => admins.remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                </div>
                <Separator className="my-4" />
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name={`admins.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`admins.${index}.designation`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Designation</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Finance Admin" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`admins.${index}.email`}
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
                    name={`admins.${index}.number`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile number</FormLabel>
                        <FormControl>
                          <Input inputMode="numeric" autoComplete="tel" placeholder="10-digit mobile" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`admins.${index}.password`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" autoComplete="new-password" placeholder="Strong password" {...field} />
                        </FormControl>
                        <FormDescription>8+ chars with upper, lower, number, and special character.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`admins.${index}.confirmPassword`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm password</FormLabel>
                        <FormControl>
                          <Input type="password" autoComplete="new-password" placeholder="Re-enter password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ))}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">At least one admin is required.</p>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  admins.append({
                    name: "",
                    email: "",
                    number: "",
                    designation: "",
                    password: "",
                    confirmPassword: "",
                  })
                }
              >
                <Plus className="h-4 w-4" />
                Add admin
              </Button>
            </div>
            {typeof form.formState.errors.admins?.message === "string" ? (
              <p className="text-sm font-medium text-destructive">{form.formState.errors.admins.message}</p>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            By submitting, you agree that the information provided is accurate to the best of your knowledge.
          </p>
          <Button type="submit" disabled={form.formState.isSubmitting} className="w-full sm:w-auto">
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              "Submit registration"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
