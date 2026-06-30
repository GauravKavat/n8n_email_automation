import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, Download } from "lucide-react";
import { GeneratedReport } from "@/hooks/useReportUpload";

interface DownloadProgressModalProps {
  isOpen: boolean;
  progress: {
    current: number;
    total: number;
    client: string;
  } | null;
  results: {
    successful: GeneratedReport[];
    failed: string[];
  } | null;
  onCancel: () => void;
  onRetry: () => void;
  onClose: () => void;
  onDownload: (blob: Blob, filename: string) => void;
}

export function DownloadProgressModal({
  isOpen,
  progress,
  results,
  onCancel,
  onRetry,
  onClose,
  onDownload,
}: DownloadProgressModalProps) {
  const isFinished = results !== null;

  const handleDownloadAll = async () => {
    if (!results) return;
    
    for (const report of results.successful) {
      onDownload(report.blob, report.filename);
      // Small artificial delay to avoid browser choking on too many simultaneous downloads
      await new Promise(r => setTimeout(r, 300));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && isFinished && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-hidden flex flex-col" onPointerDownOutside={(e) => !isFinished && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            {isFinished ? "Download Complete" : "Generating Reports"}
          </DialogTitle>
        </DialogHeader>

        {!isFinished && progress && (
          <div className="py-6 space-y-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
              <div className="text-center">
                <p className="text-sm text-slate-500 mb-1">Current Client:</p>
                <p className="font-semibold text-lg text-slate-900">{progress.client}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-slate-500">Progress</span>
                <span className="text-slate-700">{progress.current} / {progress.total}</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${(progress.current / Math.max(progress.total, 1)) * 100}%` }}
                />
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={onCancel} className="w-full">
                Cancel Remaining
              </Button>
            </div>
          </div>
        )}

        {isFinished && results && (
          <div className="py-4 space-y-6 overflow-y-auto flex-1 pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 flex flex-col items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                <div className="text-2xl font-bold text-emerald-700">{results.successful.length}</div>
                <div className="text-sm text-emerald-600 font-medium">Successful</div>
              </div>
              
              <div className="bg-red-50 border border-red-100 rounded-lg p-4 flex flex-col items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
                <div className="text-2xl font-bold text-red-700">{results.failed.length}</div>
                <div className="text-sm text-red-600 font-medium">Failed</div>
              </div>
            </div>

            {results.successful.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-sm text-slate-900">Generated Reports:</h4>
                  <Button size="sm" variant="outline" onClick={handleDownloadAll} className="h-8 text-xs">
                    <Download className="mr-2 h-3 w-3" />
                    Download All
                  </Button>
                </div>
                <ul className="text-sm border rounded-md divide-y overflow-hidden max-h-48 overflow-y-auto">
                  {results.successful.map((report) => (
                    <li key={report.filename} className="flex items-center justify-between p-3 bg-white hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2 truncate pr-4">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        <span className="truncate" title={report.filename}>{report.filename}</span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 px-2 flex-shrink-0 hover:bg-blue-50 hover:text-blue-600"
                        onClick={() => onDownload(report.blob, report.filename)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {results.failed.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-slate-900">Failed Clients:</h4>
                <ul className="text-sm text-red-600 max-h-32 overflow-y-auto space-y-1 bg-red-50/50 p-3 rounded-md border border-red-100">
                  {results.failed.map((client) => (
                    <li key={client} className="flex items-center gap-2">
                      <AlertCircle className="h-3 w-3" />
                      {client}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t mt-4 sticky bottom-0 bg-white">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              {results.failed.length > 0 && (
                <Button onClick={onRetry} variant="default" className="bg-blue-600 hover:bg-blue-700">
                  Retry Failed
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
