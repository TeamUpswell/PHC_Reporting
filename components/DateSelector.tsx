import React from "react";
import { format, addMonths, subMonths } from "date-fns";

interface DateSelectorProps {
  date: Date;
  onChange: (date: Date) => void;
}

const DateSelector: React.FC<DateSelectorProps> = ({ date, onChange }) => {
  const handlePreviousMonth = () => {
    onChange(subMonths(date, 1));
  };

  const handleNextMonth = () => {
    onChange(addMonths(date, 1));
  };

  return (
    <div className="flex items-center justify-center space-x-4 my-4">
      <button
        onClick={handlePreviousMonth}
        className="p-2 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
        aria-label="Previous month"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
      </button>

      <h2 className="text-xl font-semibold">{format(date, "MMMM yyyy")}</h2>

      <button
        onClick={handleNextMonth}
        className="p-2 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
        aria-label="Next month"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      </button>
    </div>
  );
};

export default DateSelector;
