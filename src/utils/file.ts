/**
 * File utility functions
 */

/**
 * Get file extension
 */
export const getFileExtension = (filename: string): string => {
  return filename.split(".").pop()?.toLowerCase() || "";
};

/**
 * Get file size in bytes
 */
export const getFileSize = (file: File): number => {
  return file.size;
};

/**
 * Check if file is image
 */
export const isImageFile = (file: File): boolean => {
  const imageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  return imageTypes.includes(file.type);
};

/**
 * Check if file is document
 */
export const isDocumentFile = (file: File): boolean => {
  const docTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  return docTypes.includes(file.type);
};
