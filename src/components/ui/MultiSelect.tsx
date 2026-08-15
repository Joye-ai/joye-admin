import { useState, useRef, useEffect } from "react";

interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  className?: string;
  allowSelectAll?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
}

export const MultiSelect = ({
  options,
  value,
  onChange,
  placeholder = "Select options...",
  label,
  error,
  className = "",
  allowSelectAll = true,
  searchable = false,
  searchPlaceholder = "Search...",
  emptyMessage = "No options found",
}: MultiSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen && searchable && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const handleToggle = () => {
    setIsOpen((open) => {
      if (open) setSearchTerm("");
      return !open;
    });
  };

  const handleOptionToggle = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  const handleSelectAll = () => {
    if (value.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map((option) => option.value));
    }
  };

  const filteredOptions = options.filter((option) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return option.label.toLowerCase().includes(term) || option.value.toLowerCase().includes(term);
  });

  const getDisplayText = () => {
    if (value.length === 0) return placeholder;
    if (value.length === 1) {
      const option = options.find((opt) => opt.value === value[0]);
      return option?.label || value[0];
    }
    return `${value.length} selected`;
  };

  return (
    <div className={`relative ${className}`}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={handleToggle}
          className={`
            relative w-full px-3 py-2 text-left bg-white border rounded-md shadow-sm cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            ${error ? "border-red-300" : "border-gray-300"}
            ${isOpen ? "ring-2 ring-blue-500 border-blue-500" : ""}
          `}
        >
          <span className="block truncate text-gray-900">{getDisplayText()}</span>
          <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </span>
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
            {searchable && (
              <div className="p-2 border-b border-gray-200">
                <input
                  ref={inputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder={searchPlaceholder}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  aria-label={`Search ${label?.toLowerCase() || "options"}`}
                />
              </div>
            )}
            <div className="py-1 max-h-48 overflow-auto">
              {allowSelectAll && (
                <>
                  <label className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={value.length === options.length && options.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm text-gray-900 font-medium">Select All</span>
                  </label>
                  <div className="border-t border-gray-200"></div>
                </>
              )}

              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">{emptyMessage}</div>
              ) : (
                filteredOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={value.includes(option.value)}
                      onChange={() => handleOptionToggle(option.value)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm text-gray-900">{option.label}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};
