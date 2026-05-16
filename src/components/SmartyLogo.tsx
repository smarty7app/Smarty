import React from "react";

export const SmartyLogo = ({ className, size = 32 }: { className?: string; size?: number }) => (
  <img
    src="/android-chrome-192x192.png"
    width={size}
    height={size}
    alt="Smarty AI"
    className={className}
    style={{ borderRadius: size > 32 ? '12px' : '8px' }} // زوايا دائرية لتناسب التصميم الأصلي
  />
);
