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
