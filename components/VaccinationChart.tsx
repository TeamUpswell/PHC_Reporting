import React, { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

interface ChartDataPoint {
  month: string;
  doses: number;
}

interface VaccinationChartProps {
  data: ChartDataPoint[];
  height?: string;
}

// Add this interface to define what chartInstance will reference
interface ChartInstance {
  destroy: () => void;
}

const VaccinationChart: React.FC<VaccinationChartProps> = ({
  data,
  height = "300px",
}) => {
  // Update the type to tell TypeScript that chartInstance will reference a ChartInstance
  const chartInstance = useRef<ChartInstance | null>(null);
  const chartRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!data || data.length === 0 || !chartRef.current) {
      return;
    }

    // Clean up any existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");

    if (ctx) {
      // Create new chart
      chartInstance.current = new Chart(ctx, {
        type: "bar",
        data: {
          labels: data.map((item) => item.month),
          datasets: [
            {
              label: "Vaccine Doses",
              data: data.map((item) => item.doses),
              backgroundColor: "rgba(59, 130, 246, 0.6)", // Blue
              borderColor: "rgb(37, 99, 235)",
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "top",
            },
            title: {
              display: false,
            },
            tooltip: {
              callbacks: {
                title: function (tooltipItems) {
                  if (!tooltipItems.length) return "";
                  const i = tooltipItems[0].dataIndex;
                  const dataPoint = data[i];
                  return dataPoint?.fullLabel || tooltipItems[0].label;
                },
                label: function (tooltipItem) {
                  return tooltipItem.formattedValue + " doses";
                },
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: "Number of Doses",
              },
              ticks: {
                precision: 0, // Only show whole numbers
              },
            },
            x: {
              title: {
                display: true,
                text: "Month",
              },
            },
          },
        },
      });
    }

    return () => {
      // Cleanup logic
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
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

  return (
    <div style={{ height, position: "relative" }}>
      <canvas ref={chartRef} />
    </div>
  );
};

export default VaccinationChart;
