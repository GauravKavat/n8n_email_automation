import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  loadClientStore,
  matchClientConfig,
  normalizeStore,
} from "@/lib/client-config";

export interface GeneratedReport {
  client: string;
  filename: string;
  blob: Blob;
}

interface ReportTask {
  client: string;
  rows: Record<string, unknown>[];
  selectedColumns?: string[];
  orderedColumns?: string[];
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
  const extractedDataRef = useRef<ReportTask[]>([]);
  const shownWarningsRef = useRef(new Set<string>());

  const uploadReport = async (
    file: File,
    previewMode: boolean = false,
    selectedColumns?: string[],
    orderedColumns?: string[],
  ) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    setIsProgressModalOpen(false);
    setProgress(null);
      setResults(null);
      cancelFlag.current = false;
      extractedDataRef.current = [];
      shownWarningsRef.current.clear();

    try {
      toast.info("Extracting data...");

      const formData = new FormData();
      formData.append("file", file);
      const extractRes = await fetch("/api/reports/extract", {
        method: "POST",
        body: formData
      });

      if (!extractRes.ok) throw new Error("Failed to extract data from Excel");
      const { grouped } = (await extractRes.json()) as {
        grouped: Record<string, Record<string, unknown>[]>;
      };

      const clientNames = Object.keys(grouped);
      if (clientNames.length === 0) {
        throw new Error("No clients found in the uploaded file.");
      }

      let clientConfiguration;
      try {
        clientConfiguration = normalizeStore(loadClientStore());
      } catch (error) {
        console.warn("Failed to read browser client configuration", error);
        toast.warning("Browser client configuration was corrupted and ignored for this upload.");
        clientConfiguration = normalizeStore({
          version: 1,
          updatedAt: new Date().toISOString(),
          clients: [],
        });
      }
      const matchedClients = clientNames
        .map((clientName) => ({
          clientName,
          config: matchClientConfig(clientName, clientConfiguration.clients),
        }))
        .filter(({ config }) => Boolean(config));
      const unknownClients = clientNames.filter(
        (clientName) => !matchClientConfig(clientName, clientConfiguration.clients),
      );
      if (unknownClients.length > 0) {
        toast.warning(
          `No browser client configuration matched: ${unknownClients.join(", ")}`,
        );
      }

      extractedDataRef.current = clientNames.map(client => ({
        client,
        rows: grouped[client],
        selectedColumns,
        orderedColumns,
      }));

      if (!previewMode) {
        const clientMap = matchedClients.reduce<Record<string, unknown>>(
          (acc, { clientName, config }) => {
            if (!config) return acc;
            acc[clientName] = {
              displayName: config.displayName,
              sender: config.sender,
              email: {
                to: config.to,
                cc: config.cc,
                subject: config.subject,
                body: config.body,
              },
            };
            return acc;
          },
          {},
        );

        const n8nFormData = new FormData();
        n8nFormData.append("file", file);
        n8nFormData.append("clientMap", JSON.stringify(clientMap));
        n8nFormData.append("clientConfiguration", JSON.stringify(clientConfiguration));
        if (selectedColumns) {
          n8nFormData.append("selectedColumns", JSON.stringify(selectedColumns));
        }
        if (orderedColumns) {
          n8nFormData.append("orderedColumns", JSON.stringify(orderedColumns));
        }

        const response = await fetch("http://localhost:5678/webhook-test/send-client-reports", {
          method: "POST",
          body: n8nFormData,
        });

        if (!response.ok) throw new Error(`n8n webhook error: ${response.status}`);
        
        setSuccess(true);
        toast.success("Upload successful! n8n is processing the reports.");
      } else {
        setIsProgressModalOpen(true);
        await processSequentialDownloads(extractedDataRef.current, { successful: [], failed: [] });
      }
    } catch (err: unknown) {
      console.error("Upload error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to process file";
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
    tasks: ReportTask[],
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

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => null);
          throw new Error(
            errorPayload?.error || `Generation failed with status: ${response.status}`,
          );
        }

        const warningsHeader = response.headers.get("X-Report-Warnings");
        if (warningsHeader) {
          try {
            const warnings = JSON.parse(decodeURIComponent(warningsHeader));
            if (Array.isArray(warnings)) {
              for (const warning of warnings) {
                if (
                  typeof warning === "string" &&
                  !shownWarningsRef.current.has(warning)
                ) {
                  shownWarningsRef.current.add(warning);
                  toast.warning(warning);
                }
              }
            }
          } catch {
            console.warn("Unable to parse report generation warnings");
          }
        }

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
