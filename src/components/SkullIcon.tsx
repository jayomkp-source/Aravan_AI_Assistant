import React from 'react';

interface SkullIconProps {
  className?: string;
  size?: number;
  glow?: boolean;
}

export const SkullIcon: React.FC<SkullIconProps> = ({
  className = 'w-5 h-5 text-cyan-400',
  size = 20,
  glow = false,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${glow ? 'drop-shadow-[0_0_8px_rgba(0,191,255,0.7)]' : ''}`}
    >
      {/* Cranium outline */}
      <path
        d="M12 2C6.47715 2 2 6.47715 2 12C2 15.3553 3.65213 18.3245 6.18342 20.1246C6.77093 20.5424 7.50284 20.7303 8.21989 20.6506L8.5 20.6195V22H15.5V20.6195L15.7801 20.6506C16.4972 20.7303 17.2291 20.5424 17.8166 20.1246C20.3479 18.3245 22 15.3553 22 12C22 6.47715 17.5228 2 12 2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Eye Sockets */}
      <path
        d="M8.5 12C9.32843 12 10 11.1046 10 10C10 8.89543 9.32843 8 8.5 8C7.67157 8 7 8.89543 7 10C7 11.1046 7.67157 12 8.5 12Z"
        fill="currentColor"
      />
      <path
        d="M15.5 12C16.3284 12 17 11.1046 17 10C17 8.89543 16.3284 8 15.5 8C14.6716 8 14 8.89543 14 10C14 11.1046 14.6716 12 15.5 12Z"
        fill="currentColor"
      />
      {/* Nasal Cavity */}
      <path
        d="M12 13.5L11 16H13L12 13.5Z"
        fill="currentColor"
      />
      {/* Teeth / Jaw lines */}
      <path d="M10 19V22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 19V22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14 19V22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Neural cyber circuits in cranium */}
      <path d="M12 4V7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="1 2" />
      <path d="M8 5L9.5 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M16 5L14.5 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
};
