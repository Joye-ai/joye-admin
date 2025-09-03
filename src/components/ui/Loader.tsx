import React from "react";

export interface LoaderProps {
  /**
   * Size of the loader
   */
  size?: "sm" | "md" | "lg" | "xl";
  /**
   * Color variant of the loader
   */
  variant?: "primary" | "secondary" | "white" | "gray";
  /**
   * Type of loader animation
   */
  type?: "spinner" | "dots" | "bars" | "pulse";
  /**
   * Text to display below the loader
   */
  text?: string;
  /**
   * Whether to show the loader inline or as a block
   */
  inline?: boolean;
  /**
   * Custom className for additional styling
   */
  className?: string;
  /**
   * Whether to center the loader
   */
  centered?: boolean;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
};

const variantClasses = {
  primary: "border-[#1f00a3] bg-[#1f00a3]",
  secondary: "border-gray-600 bg-gray-600",
  white: "border-white bg-white",
  gray: "border-gray-400 bg-gray-400",
};

const textSizeClasses = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
};

const dotSizeClasses = {
  sm: "h-1 w-1",
  md: "h-2 w-2",
  lg: "h-3 w-3",
  xl: "h-4 w-4",
};

const barSizeClasses = {
  sm: "h-3 w-1",
  md: "h-4 w-1",
  lg: "h-6 w-1",
  xl: "h-8 w-2",
};

// Spinner Loader Component
const SpinnerLoader: React.FC<{
  size: keyof typeof sizeClasses;
  variant: keyof typeof variantClasses;
  className: string;
}> = ({ size, variant, className }) => (
  <div
    className={`animate-spin rounded-full border-b-2 ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
  />
);

// Dots Loader Component
const DotsLoader: React.FC<{
  size: keyof typeof sizeClasses;
  variant: keyof typeof variantClasses;
  className: string;
}> = ({ size, variant, className }) => (
  <div className={`flex space-x-1 ${className}`}>
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className={`${dotSizeClasses[size]} ${variantClasses[variant]} rounded-full animate-pulse`}
        style={{ animationDelay: `${i * 0.2}s` }}
      />
    ))}
  </div>
);

// Bars Loader Component
const BarsLoader: React.FC<{
  size: keyof typeof sizeClasses;
  variant: keyof typeof variantClasses;
  className: string;
}> = ({ size, variant, className }) => (
  <div className={`flex space-x-1 items-end ${className}`}>
    {[0, 1, 2, 3].map((i) => (
      <div
        key={i}
        className={`${barSizeClasses[size]} ${variantClasses[variant]} rounded-sm animate-pulse`}
        style={{ animationDelay: `${i * 0.1}s` }}
      />
    ))}
  </div>
);

// Pulse Loader Component
const PulseLoader: React.FC<{
  size: keyof typeof sizeClasses;
  variant: keyof typeof variantClasses;
  className: string;
}> = ({ size, variant, className }) => (
  <div
    className={`${sizeClasses[size]} ${variantClasses[variant]} rounded-full animate-pulse ${className}`}
  />
);

export const Loader: React.FC<LoaderProps> = ({
  size = "md",
  variant = "primary",
  type = "spinner",
  text,
  inline = false,
  className = "",
  centered = false,
}) => {
  const containerClasses = `
    ${inline ? "inline-flex" : "flex"}
    ${centered ? "items-center justify-center" : "items-center"}
    ${text ? "flex-col space-y-2" : ""}
  `.trim();

  const textClasses = `
    ${textSizeClasses[size]}
    text-gray-500
  `.trim();

  const renderLoader = () => {
    switch (type) {
      case "dots":
        return <DotsLoader size={size} variant={variant} className={className} />;
      case "bars":
        return <BarsLoader size={size} variant={variant} className={className} />;
      case "pulse":
        return <PulseLoader size={size} variant={variant} className={className} />;
      case "spinner":
      default:
        return <SpinnerLoader size={size} variant={variant} className={className} />;
    }
  };

  return (
    <div className={containerClasses}>
      {renderLoader()}
      {text && <span className={textClasses}>{text}</span>}
    </div>
  );
};

export default Loader;
