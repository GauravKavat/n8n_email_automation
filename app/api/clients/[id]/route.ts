import { NextResponse } from "next/server";
import { clientRepository } from "@/repositories/clientRepository";
import { z } from "zod";

const updateClientSchema = z.object({
  excelClientName: z.string().min(1, "Excel Client Name is required").optional(),
  displayName: z.string().min(1, "Display Name is required").optional(),
  companyName: z.string().min(1, "Company Name is required").optional(),
  toEmails: z.string().optional(),
  ccEmails: z.string().optional(),
  bccEmails: z.string().optional(),
  subject: z.string().optional(),
  bodyTemplate: z.string().optional(),
  sendReport: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    
    const body = await request.json();
    const parsedData = updateClientSchema.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsedData.error.format() },
        { status: 400 }
      );
    }

    const { data } = parsedData;

    const existingClient = await clientRepository.findById(id);
    if (!existingClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (data.excelClientName && data.excelClientName !== existingClient.excelClientName) {
      const existingExcel = await clientRepository.findByExcelClientName(data.excelClientName);
      if (existingExcel) {
        return NextResponse.json({ error: "Excel Client Name already exists" }, { status: 400 });
      }
    }

    const updatedClient = await clientRepository.update(id, data);
    return NextResponse.json(updatedClient, { status: 200 });
  } catch (error: any) {
    console.error("PUT /api/clients/[id] error:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "A client with this name already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const existingClient = await clientRepository.findById(id);
    if (!existingClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    await clientRepository.delete(id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/clients/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete client" }, { status: 500 });
  }
}
