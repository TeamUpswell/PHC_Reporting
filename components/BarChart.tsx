import React, { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import "../styles/charts.css";

interface DataPoint {
  label: string;
  value: number;
}

interface BarChartProps {
  data: DataPoint[];
  height?: string;
  title?: string;
  color?: string;
}

const BarChart: React.FC<BarChartProps> = ({
  data,
  height = "300px",
  title,
  color = "blue",
}) => {
  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center bg-gray-100 rounded"
      >
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map((item) => item.value));

  const getColorClass = () => {
    switch (color) {
      case "green":
        return "bg-green-500";
      case "red":
        return "bg-red-500";
      case "yellow":
        return "bg-yellow-500";
      case "purple":
        return "bg-purple-500";
      default:
        return "bg-blue-500";
    }
  };

  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-medium mb-4">{title}</h3>}
      <div className="chart-container" style={{ height }}>
        <div className="flex h-full items-end">
          {data.map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center flex-1 h-full"
            >
              <div className="relative w-full h-full flex items-end justify-center px-1">
                <div
                  className={`w-full ${getColorClass()} rounded-t`}
                  style={{ height: `${(item.value / maxValue) * 100}%` }}
                />
              </div>
              <div className="text-xs mt-2 font-medium text-gray-600 truncate max-w-full px-1">
                {item.label}
              </div>
              <div className="text-xs font-bold">{item.value}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="legend-container">
        {data.map((item) => (
          <div key={item.label} className="legend-item">
            <span className="text-xs font-medium">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BarChart;
