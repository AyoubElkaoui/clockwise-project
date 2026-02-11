"use client";

interface ClockdLogoProps {
  className?: string;
  height?: number;
}

export default function ClockdLogo({ className = "", height = 40 }: ClockdLogoProps) {
  // Aspect ratio based on the design: roughly 5:1
  const width = height * 5.2;

  return (
    <svg
      viewBox="0 0 520 100"
      width={width}
      height={height}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="CLOCKD logo"
    >
      {/* C */}
      <path
        d="M55 10C28 10 8 30 8 50s20 40 47 40c15 0 28-6 36-16l-14-12c-5 6-13 10-22 10-17 0-29-12-29-22s12-22 29-22c9 0 17 4 22 10l14-12C83 16 70 10 55 10z"
        fill="currentColor"
      />
      {/* L */}
      <path
        d="M100 12h18v60h36v16h-54V12z"
        fill="currentColor"
      />
      {/* O - Clock face */}
      <g>
        {/* Outer circle */}
        <circle cx="208" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="14" />
        {/* Hour hand */}
        <line x1="208" y1="50" x2="208" y2="30" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
        {/* Minute hand */}
        <line x1="208" y1="50" x2="224" y2="42" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
        {/* Center dot */}
        <circle cx="208" cy="50" r="4" fill="currentColor" />
      </g>
      {/* C */}
      <path
        d="M310 10c-27 0-47 20-47 40s20 40 47 40c15 0 28-6 36-16l-14-12c-5 6-13 10-22 10-17 0-29-12-29-22s12-22 29-22c9 0 17 4 22 10l14-12c-8-10-21-16-36-16z"
        fill="currentColor"
      />
      {/* K */}
      <path
        d="M358 12h18v28l32-28h22l-34 30 36 46h-22l-26-34-8 7v27h-18V12z"
        fill="currentColor"
      />
      {/* D */}
      <path
        d="M440 12h30c30 0 50 17 50 38s-20 38-50 38h-30V12zm18 60h12c20 0 32-10 32-22s-12-22-32-22h-12v44z"
        fill="currentColor"
      />
    </svg>
  );
}
