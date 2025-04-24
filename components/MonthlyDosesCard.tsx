import React from "react";
import { format } from "date-fns";

interface MonthlyDosesCardProps {
  data: Array<{ month: Date; doses: number }>;
  title?: string;
  height?: string;
}

const MonthlyDosesCard: React.FC<MonthlyDosesCardProps> = ({
  data,
  title = "Monthly Doses",
  height = "300px",
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="space-y-2">
        {data && data.length > 0 ? (
          data.map((item, index) => (
            <div key={index} className="flex justify-between">
              <span>{format(item.month, "MMMM yyyy")}</span>
              <span className="font-medium">{item.doses} doses</span>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No data available</p>
        )}
      </div>
    </div>
  );
};

export default MonthlyDosesCard;
