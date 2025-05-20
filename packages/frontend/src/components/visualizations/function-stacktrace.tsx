import { useState } from 'react';
import { PprofFunction, StackFrame } from '@pprofviz/shared';

interface FunctionStacktraceProps {
  functionData: PprofFunction;
  onClose: () => void;
}

const mockStackFrames: StackFrame[] = [
  { function: "main.processRequest", file: "main.go", line: 145 },
  { function: "net/http.HandlerFunc.ServeHTTP", file: "server.go", line: 2042 },
  { function: "net/http.(*ServeMux).ServeHTTP", file: "server.go", line: 2417 },
  { function: "net/http.serverHandler.ServeHTTP", file: "server.go", line: 2843 },
  { function: "net/http.(*conn).serve", file: "server.go", line: 1925 }
];

export default function FunctionStacktrace({ functionData, onClose }: FunctionStacktraceProps) {
  const [stackFrames] = useState<StackFrame[]>(
    // For now using mock data; in a real implementation this would come from the backend
    mockStackFrames
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-neutral-50">
          <h2 className="text-lg font-medium">Function Stacktrace</h2>
          <button 
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-5 border-b">
          <div className="mb-2">
            <span className="text-neutral-500 text-sm">Function:</span>
            <h3 className="font-mono text-base">{functionData.functionName}</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-neutral-500 text-sm">Self Time:</span>
              <div className="font-medium">{functionData.flat} ({functionData.flatPercent})</div>
            </div>
            <div>
              <span className="text-neutral-500 text-sm">Total Time:</span>
              <div className="font-medium">{functionData.cum} ({functionData.cumPercent})</div>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
          <div className="divide-y">
            {stackFrames.map((frame, index) => (
              <div key={index} className="p-3 hover:bg-neutral-50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-mono text-base">{frame.function}</div>
                    <div className="text-neutral-500 text-sm flex items-center mt-1">
                      <span className="mr-3">{frame.file}:{frame.line}</span>
                      {frame.address && <span className="opacity-70">({frame.address})</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-3 bg-neutral-50 border-t text-right">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 rounded-md text-neutral-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}