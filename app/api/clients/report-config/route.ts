import { NextResponse } from "next/server";
import { clientRepository } from "@/repositories/clientRepository";
import { Client } from "@/types/client";

export async function GET() {
  try {
    // Fetch only clients that are both active and have sendReport enabled
    const activeClients = await clientRepository.findAll(true, true);
    
    // Transform array into a keyed object using excelClientName
    const clientMap: Record<string, any> = {};
    
    for (const rawClient of activeClients) {
      const client = rawClient as unknown as Client;
      const channels = (client.deliveryChannels || "email").split(",").map((c: string) => c.trim()).filter(Boolean);

      const payload: any = {
        displayName: client.displayName,
        companyName: client.companyName,
        accountManager: client.accountManager || null,
        channels,
      };

      if (channels.includes("email")) {
        const to = (client.toEmails || "").split("\n").map(e => e.trim()).filter(Boolean);
        const cc = (client.ccEmails || "").split("\n").map(e => e.trim()).filter(Boolean);
        const bcc = (client.bccEmails || "").split("\n").map(e => e.trim()).filter(Boolean);
        
        payload.email = {
          to,
          cc,
          bcc,
          subject: client.subject || "",
          body: client.bodyTemplate || "",
        };
      }

      if (channels.includes("whatsapp")) {
        payload.whatsapp = {
          groupName: client.waGroupName || "",
          groupId: client.waGroupId || null,
          caption: client.waCaption || "",
        };
      }
      
      clientMap[client.excelClientName] = payload;
    }
    
    return NextResponse.json(clientMap);
  } catch (error) {
    console.error("GET /api/clients/report-config error:", error);
    return NextResponse.json({ error: "Failed to fetch report configuration" }, { status: 500 });
  }
}
