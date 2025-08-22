import { useState } from "react";
import { useRewards } from "@/store/rewards";
import { usd } from "@/utils/rewards";

export default function KaleometerChip() {
  const { sendCount, totalUsdCents } = useRewards();
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 backdrop-blur-sm border border-green-300 dark:border-green-700 rounded-full px-3 py-1.5 transition-all duration-200 hover:bg-green-200 dark:hover:bg-green-800/40"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className="text-xs text-green-700 dark:text-green-300 font-medium transition-all duration-200">
        {isHovered ? "Kaleometer" : "KM"}
      </span>
      <div className="flex items-center gap-1 text-xs font-mono text-green-800 dark:text-green-200">
        <span>{sendCount}</span>
        <span className="text-green-600 dark:text-green-400">•</span>
        <span>{usd(totalUsdCents, 0)}</span>
      </div>
    </div>
  );
}
