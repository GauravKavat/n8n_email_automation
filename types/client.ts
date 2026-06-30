export interface Client {
  id: string;
  excelClientName: string;
  displayName: string;
  companyName: string;
  toEmails: string;
  ccEmails: string;
  bccEmails: string;
  subject: string;
  bodyTemplate: string;
  sendReport: boolean;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

