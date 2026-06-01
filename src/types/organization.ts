export type OrganizationRegistrationPayload = {
  organization: {
    name: string;
    address: string;
    gstNumber: string | null;
    isUnregistered: boolean;
    companyPan: string;
    companyMobile: string;
    companyEmail: string;
  };
  contactPersons: Array<{
    name: string;
    email: string;
    number: string;
    designation: string;
  }>;
  admins: Array<{
    name: string;
    email: string;
    number: string;
    designation: string;
    password: string;
  }>;
};

export type OrganizationRegistrationResponse = {
  id: string;
  organizationName: string;
  message: string;
};

export type OrgContactPerson = {
  id: string;
  name: string;
  email: string;
  number: string;
  designation: string;
};

export type OrganizationProfile = {
  id: string;
  name: string;
  address: string;
  gstNumber: string | null;
  isUnregistered: boolean;
  companyPan: string;
  companyMobile: string;
  companyEmail: string;
  contactPersons: OrgContactPerson[];
  createdAt: string;
  updatedAt: string;
};
