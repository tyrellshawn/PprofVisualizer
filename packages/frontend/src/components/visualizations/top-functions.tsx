import { useMemo, useState } from "react";
import { Profile, profileUtils, PprofFunction } from "@pprofviz/shared";
import FunctionStacktrace from "./function-stacktrace";

interface TopFunctionsProps {
  profile: Profile;
  limit?: number;
  detailed?: boolean;
}

export default function TopFunctions({ profile, limit, detailed = false }: TopFunctionsProps) {
  const [selectedFunction, setSelectedFunction] = useState<PprofFunction | null>(null);
  const [expandedFunctionId, setExpandedFunctionId] = useState<string | null>(null);
  
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
  
  const handleFunctionClick = (fn: PprofFunction) => {
    // For modal view
    setSelectedFunction(fn);
  };
  
  const toggleAccordion = (fn: PprofFunction) => {
    // Generate a unique identifier for the function
    const functionId = profileUtils.generateFunctionId(fn.functionName);
    
    if (expandedFunctionId === functionId) {
      setExpandedFunctionId(null); // Close if already open
    } else {
      setExpandedFunctionId(functionId); // Open this one
    }
  };
  
  const closeStacktraceView = () => {
    setSelectedFunction(null);
  };
  
  if (!topFunctions.length) {
    return (
      <div className="text-center p-4 text-neutral-500">
        <p className="text-sm">No function data available</p>
      </div>
    );
  }
  
  if (detailed) {
    // Sample call stack data for demonstration
    const sampleCallStacks: Record<string, string[]> = {
      'main.processRequest': [
        'net/http.(*Server).Serve', 
        'net/http.(*conn).serve',
        'net/http.serverHandler.ServeHTTP',
        'net/http.(*ServeMux).ServeHTTP',
        'net/http.HandlerFunc.ServeHTTP',
        'main.processRequest'
      ],
      'encoding/json.Marshal': [
        'main.processRequest',
        'encoding/json.Marshal',
        'encoding/json.marshalValue',
        'encoding/json.marshalStruct'
      ],
      'net/http.(*conn).serve': [
        'net/http.(*Server).Serve',
        'net/http.(*conn).serve'
      ],
      'runtime.mallocgc': [
        'runtime.newobject',
        'runtime.mallocgc'
      ]
    };
    
    return (
      <>
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
              
              // Generate a unique ID for this function
              const functionId = profileUtils.generateFunctionId(fn.functionName);
              const isExpanded = expandedFunctionId === functionId;
              
              // Look up stack trace for this function from the sample data
              const stack = sampleCallStacks[fn.functionName] || [];
              
              return (
                <>
                  <tr 
                    key={`row-${index}`}
                    className="hover:bg-neutral-50 cursor-pointer"
                    onClick={() => toggleAccordion(fn)}
                  >
                    <td className="px-4 py-2 font-mono flex items-center">
                      <span className="mr-2">
                        {isExpanded ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 15l-6-6-6 6"/>
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 9l6 6 6-6"/>
                          </svg>
                        )}
                      </span>
                      {fn.functionName}
                    </td>
                    <td className="px-4 py-2 font-medium">{fn.flat}</td>
                    <td className="px-4 py-2">{fn.flatPercent}</td>
                    <td className="px-4 py-2">{fn.cum}</td>
                    <td className="px-4 py-2">{fn.cumPercent}</td>
                    <td className="px-4 py-2 text-neutral-600">{packageName}</td>
                  </tr>
                  
                  {/* Accordion content */}
                  {isExpanded && (
                    <tr key={`details-${index}`}>
                      <td colSpan={6} className="bg-neutral-50 p-0">
                        <div className="p-4 border-t border-b border-neutral-200">
                          <div className="mb-4">
                            <h4 className="font-medium text-neutral-800 mb-2">Function Details</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className="text-neutral-500">Self Time:</div>
                                <div className="font-medium">{fn.flat} ({fn.flatPercent})</div>
                              </div>
                              <div>
                                <div className="text-neutral-500">Cumulative Time:</div>
                                <div className="font-medium">{fn.cum} ({fn.cumPercent})</div>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-neutral-800 mb-2">Call Stack</h4>
                            {stack.length > 0 ? (
                              <div className="bg-white border border-neutral-200 rounded overflow-hidden">
                                {stack.map((frame, frameIndex) => (
                                  <div 
                                    key={frameIndex} 
                                    className={`p-2 text-sm font-mono ${frameIndex % 2 === 0 ? 'bg-neutral-50' : 'bg-white'} ${frame === fn.functionName ? 'text-blue-600 font-semibold' : ''}`}
                                  >
                                    {frameIndex + 1}. {frame}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-neutral-500 text-sm">
                                Call stack information not available
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-4 flex justify-end">
                            <button 
                              className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFunctionClick(fn);
                              }}
                            >
                              View Full Details
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
        
        {selectedFunction && (
          <FunctionStacktrace 
            functionData={selectedFunction} 
            onClose={closeStacktraceView} 
          />
        )}
      </>
    );
  }
  
  // Simple view for the sidebar
  return (
    <div className="space-y-4">
      {topFunctions.map((fn, index) => (
        <div 
          key={index} 
          className="group cursor-pointer hover:bg-neutral-50 p-2 -mx-2 rounded"
          onClick={() => handleFunctionClick(fn)}
        >
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
      
      {selectedFunction && (
        <FunctionStacktrace 
          functionData={selectedFunction} 
          onClose={closeStacktraceView} 
        />
      )}
    </div>
  );
}