import { useMemo } from "react";
import { Profile, profileUtils } from "@/lib/pprof";

interface TopFunctionsProps {
  profile: Profile;
  limit?: number;
  detailed?: boolean;
}

export default function TopFunctions({ profile, limit, detailed = false }: TopFunctionsProps) {
  const topFunctions = useMemo(() => {
    if (!profile.metadata?.topFunctions) return [];
    
    // Sort by flat percentage in descending order
    const sorted = [...profile.metadata.topFunctions].sort((a, b) => {
      const aPercent = parseFloat(a.flatPercent);
      const bPercent = parseFloat(b.flatPercent);
      return bPercent - aPercent;
    });
    
    // Apply limit if provided
    return limit ? sorted.slice(0, limit) : sorted;
  }, [profile.metadata?.topFunctions, limit]);
  
  if (!topFunctions.length) {
    return (
      <div className="text-center p-4 text-neutral-500">
        <p className="text-sm">No function data available</p>
      </div>
    );
  }
  
  if (detailed) {
    return (
      <table className="min-w-full divide-y divide-neutral-200">
        <thead className="bg-neutral-50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Function Name
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
              {profile.profileType === 'cpu' ? 'CPU Time' : 'Memory'}
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
              % of Total
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Cumulative
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
              % Cumulative
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Package
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-neutral-200 text-sm">
          {topFunctions.map((fn, index) => {
            const fnNameParts = fn.functionName.split('.');
            const packageName = fnNameParts.length > 1 
              ? fnNameParts.slice(0, fnNameParts.length - 1).join('.')
              : '-';
            
            return (
              <tr key={index} className="hover:bg-neutral-50 cursor-pointer">
                <td className="px-4 py-2 font-mono">{fn.functionName}</td>
                <td className="px-4 py-2 font-medium">{fn.flat}</td>
                <td className="px-4 py-2">{fn.flatPercent}</td>
                <td className="px-4 py-2">{fn.cum}</td>
                <td className="px-4 py-2">{fn.cumPercent}</td>
                <td className="px-4 py-2 text-neutral-600">{packageName}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }
  
  // Simple view for the sidebar
  return (
    <div className="space-y-4">
      {topFunctions.map((fn, index) => (
        <div key={index} className="group">
          <div className="flex justify-between items-center mb-1">
            <div className="text-sm font-mono truncate max-w-[80%]" title={fn.functionName}>
              {fn.functionName}
            </div>
            <div className="text-sm font-medium">{fn.flat}</div>
          </div>
          <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-viz-blue rounded-full" 
              style={{ width: fn.flatPercent }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  );
}
