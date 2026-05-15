import React from "react";

export const SmartyLogo = ({ className, size = 32 }: { className?: string; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    id="smarty-logo-svg"
  >
    <defs>
      <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f97316" />
        <stop offset="100%" stopColor="#ea580c" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="24" fill="url(#logo-gradient)" />
    <path
      d="M30 40C30 31.7157 36.7157 25 45 25H55C63.2843 25 70 31.7157 70 40V40C70 42.7614 67.7614 45 65 45H55C52.2386 45 50 47.2386 50 50V55C50 63.2843 43.2843 70 35 70V70C32.2386 70 30 67.7614 30 65V40Z"
      fill="white"
      fillOpacity="0.2"
    />
    <path
      d="M40 35H60M40 50H60M40 65H50"
      stroke="white"
      strokeWidth="6"
      strokeLinecap="round"
    />
    <circle cx="70" cy="30" r="4" fill="white">
      <animate
        attributeName="opacity"
        values="1;0.4;1"
        dur="2s"
        repeatCount="indefinite"
      />
    </circle>
  </svg>
);
