import { NextResponse } from "next/server";
import { clientRepository } from "@/repositories/clientRepository";
import { z } from "zod";

const createClientSchema = z.object({
  excelClientName: z.string().min(1, "Excel Client Name is required"),
  displayName: z.string().min(1, "Display Name is required"),
  companyName: z.string().min(1, "Company Name is required"),
  toEmails: z.string(),
  ccEmails: z.string(),
  bccEmails: z.string(),
  subject: z.string(),
  bodyTemplate: z.string(),
  accountManager: z.string().optional().nullable(),
  sendReport: z.boolean().default(true),
  isActive: z.boolean().default(true),
  deliveryChannels: z.string().default("email"),
  waGroupName: z.string().optional().nullable(),
  waGroupId: z.string().optional().nullable(),
  waCaption: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeParam = searchParams.get("active");
    const sendReportParam = searchParams.get("sendReport");

    const active = activeParam === "true" ? true : activeParam === "false" ? false : undefined;
    const sendReport = sendReportParam === "true" ? true : sendReportParam === "false" ? false : undefined;

    const clients = await clientRepository.findAll(active, sendReport);
    return NextResponse.json(clients);
  } catch (error) {
    console.error("GET /api/clients error:", error);
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsedData = createClientSchema.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsedData.error.format() },
        { status: 400 }
      );
    }

    const { data } = parsedData;

    // Check for existing excelClientName
    const existingExcel = await clientRepository.findByExcelClientName(data.excelClientName);
    if (existingExcel) {
      return NextResponse.json({ error: "Excel Client Name already exists" }, { status: 400 });
    }

    // Since we don't have findByDisplayName in repository, we can just let Prisma throw 
    // a unique constraint error and catch it, or add it to repository. Let's rely on Prisma catch.
    const newClient = await clientRepository.create(data);
    return NextResponse.json(newClient, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/clients error:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "A client with this name already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
