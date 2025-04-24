import React from "react";

interface DataPoint {
  label: string;
  value: number;
}

interface LineChartProps {
  data: DataPoint[];
  height?: string;
  title?: string;
  color?: string;
}

const LineChart: React.FC<LineChartProps> = ({
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

  // In a real implementation, we'd use a library like Chart.js or D3
  // This is a simple placeholder that just shows the data values

  const getColorClass = () => {
    switch (color) {
      case "green":
        return "text-green-500";
      case "red":
        return "text-red-500";
      case "yellow":
        return "text-yellow-500";
      case "purple":
        return "text-purple-500";
      default:
        return "text-blue-500";
    }
  };

  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-medium mb-4">{title}</h3>}
      <div style={{ height }} className="w-full border rounded p-4">
        <div className="text-center">
          <p className="mb-4 text-gray-500">
            LineChart component (placeholder)
          </p>
          <div className="space-y-2">
            {data.map((point) => (
              <div key={point.label} className="flex justify-between">
                <span>{point.label}:</span>
                <span className={`font-bold ${getColorClass()}`}>
                  {point.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LineChart;
