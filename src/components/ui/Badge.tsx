import React, { HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'error' | 'warning' | 'info';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'info', className = '', ...props }) => {
  const variants = {
    success: "bg-green-100 text-green-800",
    error: "bg-red-100 text-red-800",
    warning: "bg-yellow-100 text-yellow-800",
    info: "bg-blue-100 text-blue-800"
  };

  return (
    <span className={`px-2.5 py-0.5 rounded text-xs font-medium ${variants[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
};
