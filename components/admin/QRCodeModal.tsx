"use client";

import { useRef, useCallback } from "react";
import { Download, Printer, X } from "@/components/icons/lucide-react";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableId: string;
  tableLabel: string;
  venueName: string;
  venueSlug: string;
  venueLogo?: string | null;
}

export function QRCodeModal({
  isOpen,
  onClose,
  tableId,
  tableLabel,
  venueName,
  venueSlug,
  venueLogo,
}: QRCodeModalProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  // Generate the stable table URL
  const tableUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/v/${venueSlug}/t/${tableId}`
      : `/v/${venueSlug}/t/${tableId}`;

  // Handle print - opens a new window with only the QR content
  const handlePrint = useCallback(() => {
    const printWindow = window.open("", "_blank", "width=600,height=700");
    if (!printWindow) {
      alert("Please allow popups for this site to print QR codes.");
      return;
    }

    const svgElement = qrRef.current?.querySelector("svg");
    const svgString = svgElement?.outerHTML ?? "";

    // Build logo HTML if available
    const logoHtml = venueLogo
      ? `<div class="logo-container"><img src="${venueLogo}" alt="Logo" class="logo-image" /></div>`
      : "";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${tableLabel}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              padding: 2rem;
            }
            .qr-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 1.5rem;
              text-align: center;
            }
            .logo-container {
              max-width: 200px;
              max-height: 100px;
              margin: 0 auto;
            }
            .logo-image {
              width: 100%;
              height: auto;
              object-fit: contain;
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            .qr-code svg {
              width: 400px;
              height: 400px;
            }
            .venue-name {
              font-size: 0.875rem;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 0.1em;
            }
            .table-label {
              font-size: 2rem;
              font-weight: 700;
              color: #1a1a1a;
            }
            .scan-instruction {
              font-size: 1rem;
              color: #666;
              margin-top: 0.5rem;
            }
            @media print {
              body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            ${logoHtml}
            <div class="venue-name">${venueName}</div>
            <div class="table-label">${tableLabel}</div>
            <div class="qr-code">${svgString}</div>
            <div class="scan-instruction">Scan to start your session</div>
          </div>
          <script>
            window.onload = function() {
              // Wait for images to load before printing
              const img = document.querySelector('.logo-image');
              if (img && !img.complete) {
                img.onload = function() {
                  setTimeout(function() {
                    window.print();
                    window.close();
                  }, 250);
                };
                img.onerror = function() {
                  console.error('Logo image failed to load');
                  setTimeout(function() {
                    window.print();
                    window.close();
                  }, 250);
                };
              } else {
                setTimeout(function() {
                  window.print();
                  window.close();
                }, 250);
              }
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }, [tableLabel, venueName, venueLogo]);

  // Handle SVG download
  const handleDownloadSVG = useCallback(() => {
    const svgElement = qrRef.current?.querySelector("svg");
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${venueName.replace(/\s+/g, "_")}-${tableLabel.replace(/\s+/g, "_")}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [tableLabel, venueName]);

  // Handle PNG download at high resolution
  const handleDownloadPNG = useCallback(() => {
    const svgElement = qrRef.current?.querySelector("svg");
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      // High resolution output (1024x1024)
      const size = 1024;
      canvas.width = size;
      canvas.height = size;

      // White background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);

      // Draw QR code
      ctx.drawImage(img, 0, 0, size, size);

      URL.revokeObjectURL(url);

      // Download
      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = `${venueName.replace(/\s+/g, "_")}-${tableLabel.replace(/\s+/g, "_")}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    img.src = url;
  }, [tableLabel, venueName]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-structure bg-surface shadow-token">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-structure p-6">
          <div>
            <CardTitle className="text-xl">Table QR Code</CardTitle>
            <p className="text-sm text-ink-secondary">
              Print or download this QR code to place at the table.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-ink-secondary"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* QR Code Display */}
        <div className="flex flex-col items-center gap-4 p-6">
          <p className="text-xs uppercase tracking-rulebook text-ink-secondary">
            {venueName}
          </p>
          <h3 className="text-2xl font-bold text-ink-primary">{tableLabel}</h3>

          {/* QR Code */}
          <div
            ref={qrRef}
            className="rounded-xl border border-structure bg-white p-6"
          >
            <QRCode
              value={tableUrl}
              size={256}
              level="H"
              bgColor="#ffffff"
              fgColor="#1a1a1a"
            />
          </div>

          <p className="text-sm text-ink-secondary text-center max-w-xs">
            Guests scan this code to start their session at this table.
          </p>

          {/* URL preview */}
          <code className="text-xs text-ink-subtle bg-muted px-3 py-1.5 rounded-lg break-all max-w-full">
            {tableUrl}
          </code>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-structure p-6">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={handleDownloadSVG}>
            <Download className="h-4 w-4 mr-2" />
            SVG
          </Button>
          <Button variant="secondary" onClick={handleDownloadPNG}>
            <Download className="h-4 w-4 mr-2" />
            PNG
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>
    </div>
  );
}
