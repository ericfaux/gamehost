import * as React from "react";

export type IconProps = React.SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      role="img"
      viewBox="0 0 24 24"
      strokeWidth={1.6}
      stroke="currentColor"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export function Library(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 4h4v16H4z" />
      <path d="M10 4h4v16h-4z" />
      <path d="M16 7h4v13h-4z" />
    </IconBase>
  );
}

export function Play(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 5v14l11-7z" />
    </IconBase>
  );
}

export function Settings(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .7.4 1.34 1.02 1.64.31.16.66.26 1.01.26H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </IconBase>
  );
}

export function Wrench(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m21 3-2.2 2.2a4 4 0 0 1-5.6 5.6L8 16v5H3v-5l8-8a4 4 0 0 1 5.6-5.6L18 3" />
    </IconBase>
  );
}

export function Search(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </IconBase>
  );
}

export function Filter(props: IconProps) {
  return (
    <IconBase {...props}>
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="7" x2="17" y1="12" y2="12" />
      <line x1="10" x2="14" y1="18" y2="18" />
    </IconBase>
  );
}

export function Plus(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </IconBase>
  );
}

export function Pencil(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </IconBase>
  );
}

export function X(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </IconBase>
  );
}

export function Clock3(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </IconBase>
  );
}

export function PlayCircle(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m10 8 6 4-6 4Z" />
    </IconBase>
  );
}

export function StopCircle(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </IconBase>
  );
}

export function RefreshCcw(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 2v6h6" />
      <path d="M21 12A9 9 0 0 0 6 5.3L3 8" />
      <path d="M21 22v-6h-6" />
      <path d="M3 12a9 9 0 0 0 15 6.7l3-2.7" />
    </IconBase>
  );
}

export function Palette(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3c-4.97 0-9 3.58-9 8 0 2.21 1.79 4 4 4h1a2 2 0 0 1 2 2 2 2 0 0 0 3.07 1.64c1.88-1.12 3.48-2.86 3.48-5.14V9a6 6 0 0 0-6-6Z" />
      <circle cx="7.5" cy="10.5" r="1.5" />
      <circle cx="12" cy="7.5" r="1.5" />
      <circle cx="16.5" cy="10.5" r="1.5" />
    </IconBase>
  );
}

export function Shield(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3 5 6v6c0 5 3.8 7.4 7 9 3.2-1.6 7-4 7-9V6Z" />
    </IconBase>
  );
}

export function AlertTriangle(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m10.29 3.86-8.18 14A1 1 0 0 0 3 19h18a1 1 0 0 0 .87-1.5l-8.18-14a1 1 0 0 0-1.74 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </IconBase>
  );
}

export function Hammer(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 21 12 13" />
      <path d="M12 17l-2-2" />
      <path d="M18 3a2 2 0 0 0-2 2v2H9" />
      <path d="m2 5 7 7" />
      <path d="m14 11 6-6" />
    </IconBase>
  );
}

export function Sparkle(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3 13.5 8.5 19 10 13.5 11.5 12 17l-1.5-5.5L5 10l5.5-1.5Z" />
      <path d="M5 19l1-3 3-1-3-1-1-3-1 3-3 1 3 1Z" />
    </IconBase>
  );
}

export function ScanLine(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 7V5a1 1 0 0 1 1-1h2" />
      <path d="M18 4h2a1 1 0 0 1 1 1v2" />
      <path d="M20 17v2a1 1 0 0 1-1 1h-2" />
      <path d="M6 20H4a1 1 0 0 1-1-1v-2" />
      <path d="M7 12h10" />
    </IconBase>
  );
}

export function BarChart2(props: IconProps) {
  return (
    <IconBase {...props}>
      <line x1="12" x2="12" y1="20" y2="10" />
      <line x1="18" x2="18" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="14" />
    </IconBase>
  );
}

export function Bell(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </IconBase>
  );
}

export function Menu(props: IconProps) {
  return (
    <IconBase {...props}>
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </IconBase>
  );
}

export function ChevronDown(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m6 9 6 6 6-6" />
    </IconBase>
  );
}

export function ChevronUp(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m18 15-6-6-6 6" />
    </IconBase>
  );
}

export function ChevronsLeft(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m11 17-5-5 5-5" />
      <path d="m17 17-5-5 5-5" />
    </IconBase>
  );
}

export function ChevronsRight(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m13 17 5-5-5-5" />
      <path d="m7 17 5-5-5-5" />
    </IconBase>
  );
}

export function FileUp(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M12 12v6" />
      <path d="m15 15-3-3-3 3" />
    </IconBase>
  );
}

export function Download(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </IconBase>
  );
}

export function Loader2(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </IconBase>
  );
}

export function Trash2(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </IconBase>
  );
}

export function QrCode(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect width="5" height="5" x="3" y="3" rx="1" />
      <rect width="5" height="5" x="16" y="3" rx="1" />
      <rect width="5" height="5" x="3" y="16" rx="1" />
      <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
      <path d="M21 21v.01" />
      <path d="M12 7v3a2 2 0 0 1-2 2H7" />
      <path d="M3 12h.01" />
      <path d="M12 3h.01" />
      <path d="M12 16v.01" />
      <path d="M16 12h1" />
      <path d="M21 12v.01" />
      <path d="M12 21v-1" />
    </IconBase>
  );
}

export function Printer(props: IconProps) {
  return (
    <IconBase {...props}>
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect width="12" height="8" x="6" y="14" />
    </IconBase>
  );
}

export function ArrowDownWideNarrow(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m3 16 4 4 4-4" />
      <path d="M7 20V4" />
      <path d="M11 4h10" />
      <path d="M11 8h7" />
      <path d="M11 12h4" />
    </IconBase>
  );
}

export function Gamepad2(props: IconProps) {
  return (
    <IconBase {...props}>
      <line x1="6" x2="10" y1="11" y2="11" />
      <line x1="8" x2="8" y1="9" y2="13" />
      <line x1="15" x2="15.01" y1="12" y2="12" />
      <line x1="18" x2="18.01" y1="10" y2="10" />
      <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" />
    </IconBase>
  );
}

export function Users(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </IconBase>
  );
}

export function Clock(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </IconBase>
  );
}

export function Check(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M20 6 9 17l-5-5" />
    </IconBase>
  );
}

export function AlertCircle(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </IconBase>
  );
}

export function Star(props: IconProps) {
  return (
    <IconBase {...props}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </IconBase>
  );
}

export function Zap(props: IconProps) {
  return (
    <IconBase {...props}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </IconBase>
  );
}
