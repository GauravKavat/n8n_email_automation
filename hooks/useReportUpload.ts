import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Client } from "@/types/client";

export interface GeneratedReport {
  client: string;
  filename: string;
  blob: Blob;
}

export function useReportUpload() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Progress Modal State
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; client: string } | null>(null);
  const [results, setResults] = useState<{ successful: GeneratedReport[]; failed: string[] } | null>(null);
  
  const cancelFlag = useRef(false);
  const extractedDataRef = useRef<{ client: string; rows: any[] }[]>([]);

  // Cleanup old results when a new upload starts or component unmounts
  const cleanupBlobs = () => {
    if (results && results.successful) {
      // Blobs are garbage collected when there are no references to them, 
      // so simply clearing the state is enough.
      // But if we had active Object URLs, we'd revoke them here.
    }
  };

  useEffect(() => {
    return cleanupBlobs;
  }, [results]);

  const uploadReport = async (file: File, previewMode: boolean = false) => {
    cleanupBlobs();
    setLoading(true);
    setError(null);
    setSuccess(false);
    setIsProgressModalOpen(false);
    setProgress(null);
    setResults(null);
    cancelFlag.current = false;
    extractedDataRef.current = [];

    try {
      if (!previewMode) {
        // --- EXISTING n8n WORKFLOW ---
        const clientsRes = await fetch("/api/clients?active=true&sendReport=true");
        if (!clientsRes.ok) throw new Error("Failed to fetch client configurations");
        
        const clients: Client[] = await clientsRes.json();
        const clientMap: Record<string, any> = {};
        
        clients.forEach((c) => {
          const to = c.toEmails.split("\n").map(e => e.trim()).filter(e => e);
          const cc = c.ccEmails.split("\n").map(e => e.trim()).filter(e => e);
          const bcc = c.bccEmails.split("\n").map(e => e.trim()).filter(e => e);
          
          clientMap[c.excelClientName] = {
            displayName: c.displayName,
            companyName: c.companyName,
            to, cc, bcc,
            subject: c.subject,
            body: c.bodyTemplate
          };
        });

        const formData = new FormData();
        formData.append("file", file);
        formData.append("clientMap", JSON.stringify(clientMap));

        const response = await fetch("http://localhost:5678/webhook-test/send-client-reports", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error(`n8n webhook error: ${response.status}`);
        
        setSuccess(true);
        toast.success("Upload successful! n8n is processing the reports.");
      } else {
        // --- PREVIEW MODE (BROWSER DOWNLOAD LOOP) ---
        toast.info("Extracting data...");
        
        const formData = new FormData();
        formData.append("file", file);
        const extractRes = await fetch("/api/reports/extract", {
          method: "POST",
          body: formData
        });
        
        if (!extractRes.ok) throw new Error("Failed to extract data from Excel");
        const { grouped } = await extractRes.json();
        
        const configRes = await fetch("/api/clients/report-config");
        if (!configRes.ok) throw new Error("Failed to fetch active clients");
        const activeClientsMap = await configRes.json();
        
        const clientsToProcess = Object.keys(grouped).filter(clientName => activeClientsMap[clientName]);
        
        if (clientsToProcess.length === 0) {
          throw new Error("No active clients found in the uploaded file.");
        }
        
        extractedDataRef.current = clientsToProcess.map(client => ({
          client,
          rows: grouped[client]
        }));
        
        setIsProgressModalOpen(true);
        await processSequentialDownloads(extractedDataRef.current, { successful: [], failed: [] });
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      const errorMessage = err.message || "Failed to process file";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const processSequentialDownloads = async (
    tasks: { client: string; rows: any[] }[], 
    initialResults: { successful: GeneratedReport[]; failed: string[] }
  ) => {
    let currentCount = 0;
    const totalCount = tasks.length;
    const successful = [...initialResults.successful];
    const failed = [...initialResults.failed];

    for (const task of tasks) {
      if (cancelFlag.current) break;

      currentCount++;
      setProgress({
        current: currentCount,
        total: totalCount,
        client: task.client
      });

      try {
        const response = await fetch("/api/reports/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(task)
        });

        if (!response.ok) throw new Error(`Generation failed with status: ${response.status}`);

        const blob = await response.blob();
        const filename = `${task.client}.xlsx`;
        
        // Auto-download the file immediately
        triggerDownload(blob, filename);

        successful.push({
          client: task.client,
          filename,
          blob
        });
      } catch (err) {
        console.error(`Failed to generate report for ${task.client}:`, err);
        failed.push(task.client);
      }
    }

    setResults({ successful, failed });
  };

  const handleCancel = () => {
    cancelFlag.current = true;
    toast.info("Canceling remaining downloads...");
  };

  const handleRetry = async () => {
    if (!results || results.failed.length === 0) return;
    
    const tasksToRetry = extractedDataRef.current.filter(t => results.failed.includes(t.client));
    
    const currentSuccess = [...results.successful];
    setResults(null);
    setProgress(null);
    cancelFlag.current = false;
    
    // Pass existing successes so we append to them
    await processSequentialDownloads(tasksToRetry, { successful: currentSuccess, failed: [] });
  };

  const closeProgressModal = () => {
    setIsProgressModalOpen(false);
    // Note: Do NOT clear results here, so the user can still download from memory 
    // unless they upload a new file.
  };

  return { 
    uploadReport, 
    loading, 
    error, 
    success,
    isProgressModalOpen,
    progress,
    results,
    handleCancel,
    handleRetry,
    closeProgressModal,
    triggerDownload
  };
}
