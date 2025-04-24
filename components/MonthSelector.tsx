import React, { useState, useEffect } from "react";
import { format, parse, addMonths, subMonths } from "date-fns";

interface MonthSelectorProps {
  value: Date;
  onChange: (date: Date) => void;
}

const MonthSelector: React.FC<MonthSelectorProps> = ({ value, onChange }) => {
  const formatMonth = (date: Date) => format(date, "MMMM yyyy");

  const handlePreviousMonth = () => {
    onChange(subMonths(value, 1));
  };

  const handleNextMonth = () => {
    onChange(addMonths(value, 1));
  };

  // Don't allow selecting future months
  const isCurrentMonth =
    format(value, "yyyy-MM") === format(new Date(), "yyyy-MM");

  return (
    <div className="flex items-center justify-center space-x-4 my-4">
      <button
        onClick={handlePreviousMonth}
        className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        ← Previous
      </button>

      <div className="text-lg font-medium min-w-[160px] text-center">
        {formatMonth(value)}
      </div>

      <button
        onClick={handleNextMonth}
        disabled={isCurrentMonth}
        className={`p-2 rounded ${
          isCurrentMonth
            ? "bg-gray-300 cursor-not-allowed"
            : "bg-blue-500 text-white hover:bg-blue-600"
        }`}
      >
        Next →
      </button>
    </div>
  );
};

export default MonthSelector;
