import { useState } from "react";
import { toast } from "sonner";
import { Client } from "@/types/client";

export function useReportUpload() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const uploadReport = async (file: File) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. Fetch only active & sendReport clients
      const clientsRes = await fetch("/api/clients?active=true&sendReport=true");
      if (!clientsRes.ok) {
        throw new Error("Failed to fetch client configurations");
      }
      
      const clients: Client[] = await clientsRes.json();
      
      console.log(`[useReportUpload] Fetched ${clients.length} active clients from database.`);

      // 2. Build the O(1) clientMap payload
      const clientMap: Record<string, any> = {};
      clients.forEach((c) => {
        // Convert newline-separated emails to arrays
        const to = c.toEmails.split("\n").map(e => e.trim()).filter(e => e);
        const cc = c.ccEmails.split("\n").map(e => e.trim()).filter(e => e);
        const bcc = c.bccEmails.split("\n").map(e => e.trim()).filter(e => e);
        
        clientMap[c.excelClientName] = {
          displayName: c.displayName,
          companyName: c.companyName,
          to,
          cc,
          bcc,
          subject: c.subject,
          body: c.bodyTemplate
        };
      });

      console.log(`[useReportUpload] Generated clientMap keys:`, Object.keys(clientMap));
      console.log(`[useReportUpload] clientMap payload:`, clientMap);

      // 3. Send multipart Excel and JSON clientMap
      const formData = new FormData();
      formData.append("file", file);
      formData.append("clientMap", JSON.stringify(clientMap));

      // Debug: Log the FormData contents
      console.log("FormData contents being sent:");
      for (const [key, value] of formData.entries()) {
        console.log(`- ${key}:`, value);
      }

      const response = await fetch("http://localhost:5678/webhook-test/send-client-reports", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`n8n webhook error: ${response.status}`);
      }

      const data = await response.text();
      console.log("n8n webhook response:", data);
      
      setSuccess(true);
      toast.success("Upload successful!");
    } catch (err: any) {
      console.error("Upload error:", err);
      const errorMessage = err.message || "Failed to upload file";
      setError(errorMessage);
      toast.error("Upload Failed: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { uploadReport, loading, error, success };
}
