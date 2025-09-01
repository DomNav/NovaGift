import { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import QRCode from "qrcode";
import { QrEvent } from "@/api/projects.api";

interface EventPosterProps {
  event: QrEvent & { name: string; assetCode: string };
  sampleCode: string;
}

export function EventPoster({ event, sampleCode }: EventPosterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    const url = `${window.location.origin}/qr-claim?code=${sampleCode}`;
    QRCode.toDataURL(url, { margin: 1, width: 320 }).then(setQrDataUrl);
  }, [sampleCode]);

  const downloadPng = async () => {
    if (!ref.current) return;
    const canvas = await html2canvas(ref.current, { backgroundColor: null, scale: 2 });
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${event.name.replace(/\s+/g, "_")}_poster.png`;
    a.click();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="rounded-2xl bg-gradient-to-b from-sky-700/40 to-sky-500/20 p-6 dark:from-sky-900/40 dark:to-sky-700/20">
      <div ref={ref} className="mx-auto w-[340px] rounded-2xl bg-white p-5 text-center shadow-xl dark:bg-zinc-900">
        {qrDataUrl && (
          <img src={qrDataUrl} alt="QR Code" className="mx-auto h-72 w-72" />
        )}
        <div className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
          {event.name}
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-400">
          {formatDate(event.startAt)} – {formatDate(event.endAt)}
        </div>
        <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">
          Scan to claim your {event.amount} {event.assetCode}
        </div>
        <div className="mt-3 text-xs text-slate-500 dark:text-slate-500">
          NovaGift
        </div>
      </div>
      <button 
        onClick={downloadPng} 
        className="mt-4 w-full rounded-xl bg-sky-500 px-4 py-2 text-white hover:bg-sky-600 transition-colors"
      >
        Download PNG
      </button>
    </div>
  );
}
