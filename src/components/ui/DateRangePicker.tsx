import { useState, useRef, useEffect } from "react";

interface DateRange {
  start: string;
  end: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
  label?: string;
  error?: string;
  className?: string;
}

export const DateRangePicker = ({
  value,
  onChange,
  label,
  error,
  className = "",
}: DateRangePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleDateChange = (field: "start" | "end", date: string) => {
    onChange({
      ...value,
      [field]: date,
    });
  };

  const handleClear = () => {
    onChange({ start: "", end: "" });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDisplayText = () => {
    if (!value.start && !value.end) return "Select date range";
    if (value.start && value.end) {
      return `${formatDate(value.start)} - ${formatDate(value.end)}`;
    }
    if (value.start) return `From ${formatDate(value.start)}`;
    if (value.end) return `Until ${formatDate(value.end)}`;
    return "Select date range";
  };

  const isRangeSelected = value.start && value.end;

  return (
    <div className={`relative ${className}`}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <div ref={dropdownRef} className="relative">
        <div
          className={`
            relative w-full px-3 py-2 text-left bg-white border rounded-md shadow-sm cursor-pointer
            focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500
            ${error ? "border-red-300" : "border-gray-300"}
            ${isOpen ? "ring-2 ring-blue-500 border-blue-500" : ""}
            ${isRangeSelected ? "bg-blue-50 border-blue-300" : ""}
          `}
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleToggle}
              className={`flex-1 text-left ${isRangeSelected ? "text-blue-900 font-medium" : "text-gray-500"}`}
            >
              <span className="block truncate">{getDisplayText()}</span>
            </button>
            <div className="flex items-center space-x-2 ml-2">
              {isRangeSelected && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={handleToggle}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg
                  className={`w-4 h-5 transition-transform duration-200 ${
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
              </button>
            </div>
          </div>
        </div>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={value.start}
                    onChange={(e) => handleDateChange("start", e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={value.end}
                    onChange={(e) => handleDateChange("end", e.target.value)}
                    min={value.start}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Clear
                </button>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};
