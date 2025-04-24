import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faBuildingUser, faSyringe, faExclamationTriangle,
  faClipboardCheck, IconDefinition
} from "@fortawesome/free-solid-svg-icons";

// Define the allowed color values as a type
type CardColor = "blue" | "red" | "green" | "yellow" | "purple";

interface TrendInfo {
  direction: "up" | "down";
  percentage: string;
}

interface DashboardCardProps {
  title: string;
  value: number;
  icon: string;
  color?: CardColor; // Use the type here
  trend?: TrendInfo;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  icon,
  color = "blue",
  trend,
}) => {
  // Map for color classes
  const colorMap: Record<CardColor, string> = {
    blue: "bg-blue-100 text-blue-800",
    red: "bg-red-100 text-red-800",
    green: "bg-green-100 text-green-800",
    yellow: "bg-yellow-100 text-yellow-800",
    purple: "bg-purple-100 text-purple-800",
  };

  // Use type assertion to tell TypeScript that color is a valid key
  const bgColor = colorMap[color as CardColor] || colorMap.blue;

  // Render the appropriate icon
  const renderIcon = () => {
    switch (icon) {
      case "building":
        return faBuildingUser;
      case "syringe":
        return faSyringe;
      case "exclamation-triangle":
        return faExclamationTriangle;
      case "clipboard-check":
        return faClipboardCheck;
      default:
        return faBuildingUser;
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium text-gray-600">{title}</h3>
          <div className="mt-2 text-3xl font-bold">{value.toLocaleString()}</div>
          {trend && (
            <div className="mt-1 flex items-center">
              <span
                className={`text-sm font-medium ${
                  trend.direction === "up" ? "text-green-600" : "text-red-600"
                }`}
              >
                {trend.direction === "up" ? "↑" : "↓"} {trend.percentage}
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${bgColor}`}>
          <FontAwesomeIcon icon={renderIcon()} className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};

export default DashboardCard;
