import { useState, useRef, useEffect, useMemo } from "react";

interface Option {
  value: string;
  label: string;
  secondaryLabel?: string;
  disabled?: boolean;
}

interface MultiSelectProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  className?: string;
  disabled?: boolean;
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
  disabled = false,
  allowSelectAll = true,
  searchable = true,
  searchPlaceholder = "Search...",
  emptyMessage = "No options found",
}: MultiSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectableOptions = useMemo(() => options.filter((option) => !option.disabled), [options]);

  const filteredOptions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) => {
      const labelMatch = option.label.toLowerCase().includes(term);
      const secondaryMatch = option.secondaryLabel?.toLowerCase().includes(term);
      return labelMatch || secondaryMatch;
    });
  }, [options, searchTerm]);

  const filteredSelectableOptions = useMemo(
    () => filteredOptions.filter((option) => !option.disabled),
    [filteredOptions],
  );

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
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const handleToggle = () => {
    if (disabled) return;
    const next = !isOpen;
    setIsOpen(next);
    if (!next) {
      setSearchTerm("");
    }
  };

  const handleOptionToggle = (optionValue: string) => {
    const option = options.find((opt) => opt.value === optionValue);
    if (option?.disabled) return;

    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  const handleSelectAllFiltered = () => {
    const filteredValues = filteredSelectableOptions.map((option) => option.value);
    const allFilteredSelected =
      filteredValues.length > 0 && filteredValues.every((v) => value.includes(v));

    if (allFilteredSelected) {
      onChange(value.filter((v) => !filteredValues.includes(v)));
    } else {
      onChange([...new Set([...value, ...filteredValues])]);
    }
  };

  const getDisplayText = () => {
    if (value.length === 0) return placeholder;
    if (selectableOptions.length > 0 && value.length === selectableOptions.length) {
      return "All tenants selected";
    }
    if (value.length === 1) {
      const option = options.find((opt) => opt.value === value[0]);
      if (!option) return value[0];
      return option.secondaryLabel ? `${option.label} · ${option.secondaryLabel}` : option.label;
    }
    return `${value.length} tenants selected`;
  };

  const allFilteredSelected =
    filteredSelectableOptions.length > 0 &&
    filteredSelectableOptions.every((option) => value.includes(option.value));

  return (
    <div className={`relative ${className}`}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className={`
            relative w-full px-3 py-2 text-left bg-white border rounded-md shadow-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            ${error ? "border-red-300" : "border-gray-300"}
            ${isOpen ? "ring-2 ring-blue-500 border-blue-500" : ""}
            ${disabled ? "bg-gray-50 cursor-not-allowed text-gray-400" : "cursor-pointer"}
          `}
        >
          <span className="block truncate text-gray-900 text-left">{getDisplayText()}</span>
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

        {isOpen && !disabled && (
          <div className="absolute z-50 w-full min-w-[20rem] mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
            {searchable && (
              <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-2">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}

            <div className="max-h-60 overflow-auto py-1">
              {allowSelectAll && (
                <>
                  <label className="flex items-start px-3 py-2 hover:bg-gray-100 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={handleSelectAllFiltered}
                      className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm text-gray-900 font-medium text-left">
                      {searchTerm.trim() ? "Select all filtered" : "Select All"}
                    </span>
                  </label>
                  <div className="border-t border-gray-200"></div>
                </>
              )}

              {filteredOptions.length === 0 ? (
                <div className="px-3 py-3 text-sm text-gray-500 text-left">{emptyMessage}</div>
              ) : (
                filteredOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-start px-3 py-2 ${
                      option.disabled
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-gray-100 cursor-pointer"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={value.includes(option.value)}
                      disabled={option.disabled}
                      onChange={() => handleOptionToggle(option.value)}
                      className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-3 min-w-0 flex-1 text-left">
                      <span className="block text-sm text-gray-900 truncate">{option.label}</span>
                      {option.secondaryLabel && (
                        <span className="block text-xs text-gray-500 truncate mt-0.5">
                          {option.secondaryLabel}
                        </span>
                      )}
                    </span>
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
