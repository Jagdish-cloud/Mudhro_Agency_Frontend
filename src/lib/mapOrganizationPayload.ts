import type { OrganizationRegistrationFormValues } from "@/schemas/organizationRegistrationSchema";
import type { OrganizationRegistrationPayload } from "@/types/organization";

export function mapFormValuesToRegistrationPayload(
  values: OrganizationRegistrationFormValues,
): OrganizationRegistrationPayload {
  const gstNormalized = values.gstNumber?.trim().toUpperCase() ?? "";

  return {
    organization: {
      name: values.organizationName.trim(),
      address: values.address.trim(),
      gstNumber: values.isUnregistered ? null : gstNormalized,
      isUnregistered: values.isUnregistered,
      companyPan: values.companyPan,
      companyMobile: values.companyMobile.trim(),
      companyEmail: values.companyEmail.trim().toLowerCase(),
    },
    contactPersons: values.contactPersons.map((c) => ({
      name: c.name.trim(),
      email: c.email.trim().toLowerCase(),
      number: c.number.trim(),
      designation: c.designation.trim(),
    })),
    admins: values.admins.map((a) => ({
      name: a.name.trim(),
      email: a.email.trim().toLowerCase(),
      number: a.number.trim(),
      designation: a.designation.trim(),
      password: a.password,
    })),
  };
}
