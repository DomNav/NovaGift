import { QrCode } from "@/api/projects.api";

interface QrPackTableProps {
  codes: QrCode[];
  onGenerateMore?: () => void;
  onExportCsv?: () => void;
}

export function QrPackTable({ codes, onGenerateMore, onExportCsv }: QrPackTableProps) {
  const getStatusStyle = (status: QrCode['status']) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'USED':
        return 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
      case 'EXPIRED':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
      default:
        return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  const downloadSingleQr = async (code: string) => {
    // This would generate a QR code for the individual code
    // For now, we'll create a simple download link
    const url = `${window.location.origin}/qr-claim?code=${code}`;
    window.open(`data:text/plain;charset=utf-8,${encodeURIComponent(url)}`, '_blank');
  };

  if (!codes.length) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 text-center">
        <p className="text-zinc-600 dark:text-zinc-400 mb-4">No QR codes generated yet</p>
        {onGenerateMore && (
          <button 
            onClick={onGenerateMore}
            className="rounded-xl bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 transition-colors"
          >
            Generate Codes
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          QR Pack ({codes.length} codes)
        </h3>
        <div className="flex gap-2">
          {onExportCsv && (
            <button 
              onClick={onExportCsv}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Export CSV
            </button>
          )}
          {onGenerateMore && (
            <button 
              onClick={onGenerateMore}
              className="rounded-lg bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600 transition-colors"
            >
              Generate More
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900/40">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Code</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Claimed</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((code, i) => (
              <tr key={code.id} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="p-3 text-slate-900 dark:text-slate-100">
                  QR-{String(i + 1).padStart(3, "0")}
                </td>
                <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                  {code.code}
                </td>
                <td className="p-3 text-center">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusStyle(code.status)}`}>
                    {code.status === 'ACTIVE' ? 'Active' : code.status === 'USED' ? 'Used' : 'Expired'}
                  </span>
                </td>
                <td className="p-3 text-center text-slate-600 dark:text-slate-400">
                  {code.claimedAt ? new Date(code.claimedAt).toLocaleDateString() : '—'}
                </td>
                <td className="p-3 text-right">
                  <button 
                    onClick={() => downloadSingleQr(code.code)}
                    className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
