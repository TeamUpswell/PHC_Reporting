import React from "react";

interface TrendInfo {
  direction: "up" | "down";
  percentage: string;
}

interface DashboardCardProps {
  title: string;
  value: number | string;
  icon?: string;
  color?: string;
  trend?: TrendInfo;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  icon,
  color = "blue",
  trend,
}) => {
  // Map color names to Tailwind classes
  const colorMap = {
    blue: "bg-blue-500",
    red: "bg-red-500",
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    purple: "bg-purple-500",
  };

  const bgColor = colorMap[color] || colorMap.blue;

  // Render the appropriate icon
  const renderIcon = () => {
    const iconClass = `fa-${icon}`; // Assumes FontAwesome
    return (
      <div className={`${bgColor} p-3 rounded-full`}>
        <i className={`fas ${iconClass} text-white`}></i>
      </div>
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-gray-500 text-sm font-medium">{title}</h2>
        {icon && renderIcon()}
      </div>

      <div className="flex items-baseline">
        <p className="text-3xl font-bold">{value}</p>

        {trend && (
          <div
            className={`ml-4 text-sm ${
              trend.direction === "up" ? "text-green-500" : "text-red-500"
            }`}
          >
            <span className="flex items-center">
              <i className={`fas fa-arrow-${trend.direction} mr-1`}></i>
              {trend.percentage}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardCard;
