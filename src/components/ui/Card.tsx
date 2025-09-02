import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
}

export const Card = ({ children, className = "", padding = "md" }: CardProps) => {
  const paddingClasses = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div
      className={`bg-white rounded-lg shadow border border-gray-200 ${paddingClasses[padding]} ${className}`}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export const CardHeader = ({ children, className = "" }: CardHeaderProps) => {
  return <div className={`border-b border-gray-200 pb-4 mb-4 ${className}`}>{children}</div>;
};

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export const CardTitle = ({ children, className = "" }: CardTitleProps) => {
  return <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>{children}</h3>;
};

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export const CardContent = ({ children, className = "" }: CardContentProps) => {
  return <div className={className}>{children}</div>;
};
