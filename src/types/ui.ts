/**
 * UI related types
 */

import { ReactNode } from "react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  closable?: boolean;
  footer?: ReactNode;
}

export interface ToastProps {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export interface ErrorState {
  hasError: boolean;
  message?: string;
  code?: string;
  details?: any;
}

export interface FormFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
}

export interface SelectProps extends FormFieldProps {
  options: Array<{
    value: string | number;
    label: string;
    disabled?: boolean;
  }>;
  multiple?: boolean;
  searchable?: boolean;
  clearable?: boolean;
}

export interface DatePickerProps extends FormFieldProps {
  format?: string;
  minDate?: Date;
  maxDate?: Date;
  showTime?: boolean;
}

export interface FileUploadProps extends FormFieldProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  onUpload?: (files: File[]) => void;
  onProgress?: (progress: number) => void;
}

export interface TableProps<T = any> {
  data: T[];
  columns: Array<{
    key: keyof T;
    title: string;
    sortable?: boolean;
    render?: (value: any, record: T) => ReactNode;
    width?: string | number;
    align?: "left" | "center" | "right";
  }>;
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  selection?: {
    selectedRowKeys: string[];
    onChange: (selectedRowKeys: string[], selectedRows: T[]) => void;
  };
  onRow?: (record: T) => {
    onClick?: () => void;
    onDoubleClick?: () => void;
  };
}

export interface PaginationProps {
  current: number;
  pageSize: number;
  total: number;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  showTotal?: (total: number, range: [number, number]) => string;
  onChange: (page: number, pageSize: number) => void;
}

export interface SearchProps {
  placeholder?: string;
  value?: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  loading?: boolean;
  filters?: Array<{
    key: string;
    label: string;
    type: "text" | "select" | "date" | "number";
    options?: Array<{ value: string; label: string }>;
  }>;
}

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: number;
  position?: "left" | "right";
}

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
}

export interface LayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
}

export interface ThemeContextType {
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
}

export interface NotificationContextType {
  notifications: ToastProps[];
  addNotification: (notification: Omit<ToastProps, "id">) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}
