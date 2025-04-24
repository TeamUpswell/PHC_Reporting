import React, { useEffect, useRef } from "react";

interface ChartDataPoint {
  month: string;
  doses: number;
}

interface VaccinationChartProps {
  data: ChartDataPoint[];
  height?: string;
}

const VaccinationChart: React.FC<VaccinationChartProps> = ({
  data,
  height = "300px",
}) => {
  const chartInstance = useRef(null);

  useEffect(() => {
    // Chart initialization logic would go here
    
    return () => {
      // Cleanup logic
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center bg-gray-100"
      >
        No data available
      </div>
    );
  }

  // Calculate maximum value for scaling
  const maxValue = Math.max(...data.map((item) => item.doses));
  const scale = maxValue > 0 ? maxValue : 1;

  return (
    <div style={{ height }} className="bg-gray-100 p-4">
      <div className="flex h-full">
        {data.map((item) => {
          const percentage = (item.doses / scale) * 100;
          return (
            <div
              key={item.month}
              className="flex flex-col items-center flex-1 h-full"
            >
              <div className="relative w-full h-full flex items-end justify-center">
                <div
                  className="w-3/5 bg-blue-500 rounded-t"
                  style={{ height: `${percentage}%` }}
                >
                  <div className="absolute bottom-0 left-0 right-0 text-white text-xs text-center">
                    {item.doses}
                  </div>
                </div>
              </div>
              <div className="text-xs mt-2 font-medium text-gray-600">
                {item.month}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VaccinationChart;
