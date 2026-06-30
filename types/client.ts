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
  accountManager?: string | null;
  sendReport: boolean;
  isActive: boolean;
  deliveryChannels: string; // Comma-separated string
  waGroupName?: string | null;
  waGroupId?: string | null;
  waCaption?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ReportResult {
  clientName: string;
  status: "success" | "failed";
  to?: string;
  cc?: string;
  generatedFile?: string;
  reason?: string;
}
