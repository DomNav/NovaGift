import { useState } from "react";
import { useRewards } from "@/store/rewards";
import { usd } from "@/utils/rewards";

export default function AuraPointsChip() {
  const { sendCount, totalUsdCents } = useRewards();
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className="flex items-center gap-2 bg-purple-100 dark:bg-purple-900/30 backdrop-blur-sm border border-purple-300 dark:border-purple-700 rounded-full px-3 py-1.5 transition-all duration-200 hover:bg-purple-200 dark:hover:bg-purple-800/40"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className="text-xs text-purple-700 dark:text-purple-300 font-medium transition-all duration-200">
        {isHovered ? "AuraPoints" : "AP"}
      </span>
      <div className="flex items-center gap-1 text-xs font-mono text-purple-800 dark:text-purple-200">
        <span>{sendCount}</span>
        <span className="text-purple-600 dark:text-purple-400">•</span>
        <span>{usd(totalUsdCents, 0)}</span>
      </div>
    </div>
  );
}
