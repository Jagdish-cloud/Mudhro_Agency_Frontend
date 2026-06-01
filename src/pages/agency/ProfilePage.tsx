import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Save, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/page-status";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useMutationFeedback } from "@/context/mutation-feedback-context";
import { getStoredAdminInfo } from "@/lib/agencyAuth";
import { ApiError } from "@/lib/apiClient";
import {
  changePasswordFormSchema,
  updateSelfProfileFormSchema,
  type ChangePasswordFormValues,
  type UpdateSelfProfileFormValues,
} from "@/schemas/memberSchemas";
import {
  changeMyPassword,
  getMyProfile,
  updateMyProfile,
} from "@/services/agency/profileService";
import { ADMIN_INFO_STORAGE_KEY } from "@/types/auth";
import type { OrgMember } from "@/types/member";

function persistStoredName(member: OrgMember): void {
  try {
    const existing = getStoredAdminInfo() ?? {};
    const next = {
      ...existing,
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
    };
    localStorage.setItem(ADMIN_INFO_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // best effort; ignore storage failures
  }
}

export function ProfilePage() {
  const { run } = useMutationFeedback();
  const [profile, setProfile] = useState<OrgMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const profileForm = useForm<UpdateSelfProfileFormValues>({
    resolver: zodResolver(updateSelfProfileFormSchema),
    defaultValues: { name: "", number: "", designation: "" },
  });

  const canEditDesignation = profile?.role === 1;

  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const me = await getMyProfile();
        if (cancelled) return;
        setProfile(me);
        profileForm.reset({
          name: me.name,
          number: me.number,
          designation: me.designation,
        });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof ApiError ? err.message : "Unable to load your profile.";
        setLoadError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmitProfile(values: UpdateSelfProfileFormValues) {
    if (!profile) return;
    const patch: { name?: string; number?: string; designation?: string } = {};
    if (values.name !== profile.name) patch.name = values.name;
    if (values.number !== profile.number) patch.number = values.number;
    if (canEditDesignation && values.designation !== profile.designation) {
      patch.designation = values.designation;
    }
    if (Object.keys(patch).length === 0) {
      toast.info("Nothing to update.");
      return;
    }
    try {
      const updated = await run(() => updateMyProfile(patch), {
        successMessage: "Profile updated.",
      });
      setProfile(updated);
      persistStoredName(updated);
      profileForm.reset({
        name: updated.name,
        number: updated.number,
        designation: updated.designation,
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not update profile.";
      profileForm.setError("root", { type: "server", message });
      toast.error(message);
    }
  }

  async function onSubmitPassword(values: ChangePasswordFormValues) {
    try {
      await run(() => changeMyPassword(values), {
        successMessage: "Password updated.",
      });
      passwordForm.reset({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not change password.";
      if (err instanceof ApiError && err.status === 401) {
        passwordForm.setError("currentPassword", { type: "server", message });
      } else {
        passwordForm.setError("root", { type: "server", message });
      }
      toast.error(message);
    }
  }

  if (loading) {
    return <PageLoading label="Loading profile…" />;
  }

  if (loadError || !profile) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-destructive">
          {loadError ?? "Could not load your profile."}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound className="h-5 w-5 text-primary" />
            My profile
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {canEditDesignation
              ? "Update your name, mobile number, and designation. Email and role are managed by your admin."
              : "Update your name and mobile number. Designation, email, and role are managed by your admin."}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium">{profile.email}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Role</p>
              <div className="mt-1 flex items-center gap-2">
                {profile.role === 1 ? (
                  <Badge variant="admin">Admin</Badge>
                ) : (
                  <Badge variant="member">Member</Badge>
                )}
                {profile.status === "active" ? (
                  <Badge variant="active">Active</Badge>
                ) : (
                  <Badge variant="inactive">Inactive</Badge>
                )}
              </div>
            </div>
          </div>

          <Form {...profileForm}>
            <form
              className="space-y-4"
              onSubmit={profileForm.handleSubmit(onSubmitProfile)}
              noValidate
            >
              {profileForm.formState.errors.root?.message ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {profileForm.formState.errors.root.message}
                </div>
              ) : null}
              <FormField
                control={profileForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input autoComplete="name" placeholder="Full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile number</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="numeric"
                        maxLength={10}
                        placeholder="10-digit mobile"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="designation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Designation</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Project Manager"
                        readOnly={!canEditDesignation}
                        disabled={!canEditDesignation}
                        aria-readonly={!canEditDesignation}
                        {...field}
                      />
                    </FormControl>
                    {!canEditDesignation ? (
                      <p className="text-xs text-muted-foreground">
                        Only admins can change your designation.
                      </p>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="success"
                  disabled={profileForm.formState.isSubmitting || !profileForm.formState.isDirty}
                  loading={profileForm.formState.isSubmitting}
                  loadingText="Saving…"
                >
                  <Save className="h-4 w-4" />
                  Save changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Change password
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Use a strong password with at least 8 characters, including upper and lower case
            letters, a number, and a special character.
          </p>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form
              className="space-y-4"
              onSubmit={passwordForm.handleSubmit(onSubmitPassword)}
              noValidate
            >
              {passwordForm.formState.errors.root?.message ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {passwordForm.formState.errors.root.message}
                </div>
              ) : null}
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current password</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New password</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm new password</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="success"
                  loading={passwordForm.formState.isSubmitting}
                  loadingText="Updating…"
                >
                  Update password
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
