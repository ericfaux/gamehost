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
      <path d="M7 4.5v15l11-7.5z" />
    </IconBase>
  );
}

export function Wrench(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M14.7 6.3a5 5 0 0 1-6.4 6.4L3 18l3 3 5.3-5.3a5 5 0 0 1 6.4-6.4l-3.2 3.2z" />
    </IconBase>
  );
}

export function Settings(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </IconBase>
  );
}

export function Search(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-3.5-3.5" />
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
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </IconBase>
  );
}

export function Scan(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 8V4h4" />
      <path d="M20 8V4h-4" />
      <path d="M4 16v4h4" />
      <path d="M20 16v4h-4" />
      <rect width="8" height="8" x="8" y="8" rx="1" />
    </IconBase>
  );
}

export function Check(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m5 12 5 5L20 7" />
    </IconBase>
  );
}

export function AlertTriangle(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M10.3 3.1 1.8 18a1.1 1.1 0 0 0 1 1.6h18.4a1.1 1.1 0 0 0 1-1.6L13.7 3.1a1.1 1.1 0 0 0-1.9 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
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
