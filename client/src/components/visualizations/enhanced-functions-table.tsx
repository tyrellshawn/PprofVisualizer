import React, { useState, useCallback } from 'react';
import { Button, Card, Collapse, Icon, Tag, Tooltip } from '@blueprintjs/core';
import { Cell, Column, Table2, TruncatedFormat } from '@blueprintjs/table';
import { Profile, PprofFunction } from '../../lib/pprof';

interface EnhancedFunctionsTableProps {
  profile: Profile;
  maxRows?: number;
}

// Helper to classify the significance of a metric
const classifyMetric = (percent: string): 'high' | 'medium' | 'low' => {
  const value = parseFloat(percent.replace('%', ''));
  if (value >= 20) return 'high';
  if (value >= 5) return 'medium';
  return 'low';
};

// Helper to get the label for a profile type
const getProfileTypeLabel = (profileType: string): string => {
  switch (profileType) {
    case 'cpu': return 'CPU Time';
    case 'heap': return 'Memory';
    case 'block': return 'Block Time';
    case 'mutex': return 'Lock Time';
    case 'goroutine': return 'Goroutine';
    case 'threadcreate': return 'Thread Creation';
    default: return 'Value';
  }
};

const EnhancedFunctionsTable: React.FC<EnhancedFunctionsTableProps> = ({ profile, maxRows = 50 }) => {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [sortColumn, setSortColumn] = useState<string>('flat');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  
  // Get functions list from profile
  const functions = profile.metadata.topFunctions || [];
  
  // Get labels based on profile type
  const flatLabel = getProfileTypeLabel(profile.profileType);
  const cumLabel = `Total ${flatLabel}`;
  
  // Handle row expansion toggling
  const toggleRowExpansion = (rowIndex: number) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(rowIndex)) {
      newExpandedRows.delete(rowIndex);
    } else {
      newExpandedRows.add(rowIndex);
    }
    setExpandedRows(newExpandedRows);
  };
  
  // Sort the functions based on current sort column and direction
  const sortedFunctions = [...functions].sort((a, b) => {
    let aValue, bValue;
    
    if (sortColumn === 'name') {
      aValue = a.functionName;
      bValue = b.functionName;
      return sortAsc ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    } else {
      // For numerical columns, parse the percentage value
      const aMatch = a[sortColumn === 'flat' ? 'flatPercent' : 'cumPercent'].match(/([0-9.]+)%/);
      const bMatch = b[sortColumn === 'flat' ? 'flatPercent' : 'cumPercent'].match(/([0-9.]+)%/);
      
      aValue = aMatch ? parseFloat(aMatch[1]) : 0;
      bValue = bMatch ? parseFloat(bMatch[1]) : 0;
      
      return sortAsc ? aValue - bValue : bValue - aValue;
    }
  });
  
  // Limit the number of displayed functions
  const displayedFunctions = sortedFunctions.slice(0, maxRows);

  // Function name cell renderer
  const renderNameCell = (rowIndex: number) => {
    const func = displayedFunctions[rowIndex];
    return (
      <Cell>
        <div className="flex items-center">
          <Button
            minimal
            small
            icon={expandedRows.has(rowIndex) ? "chevron-down" : "chevron-right"}
            onClick={() => toggleRowExpansion(rowIndex)}
          />
          <TruncatedFormat>{func.functionName}</TruncatedFormat>
        </div>
      </Cell>
    );
  };

  // Self value (flat) cell renderer
  const renderFlatCell = (rowIndex: number) => {
    const func = displayedFunctions[rowIndex];
    const metricClass = classifyMetric(func.flatPercent);
    return (
      <Cell>
        <div className={`metric-${metricClass}`}>
          {func.flat}
          <span className="ml-2 text-gray-500 text-xs">
            ({func.flatPercent})
          </span>
        </div>
      </Cell>
    );
  };

  // Total value (cumulative) cell renderer
  const renderCumulativeCell = (rowIndex: number) => {
    const func = displayedFunctions[rowIndex];
    const metricClass = classifyMetric(func.cumPercent);
    return (
      <Cell>
        <div className={`metric-${metricClass}`}>
          {func.cum}
          <span className="ml-2 text-gray-500 text-xs">
            ({func.cumPercent})
          </span>
        </div>
      </Cell>
    );
  };

  // Handle column header click for sorting
  const handleHeaderClick = useCallback((column: string) => {
    if (sortColumn === column) {
      setSortAsc(!sortAsc);
    } else {
      setSortColumn(column);
      setSortAsc(false);
    }
  }, [sortColumn, sortAsc]);

  // Render function details in expanded row
  const renderExpandedRow = (rowIndex: number) => {
    if (!expandedRows.has(rowIndex)) return null;
    
    const func = displayedFunctions[rowIndex];
    return (
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded mt-1 mb-3">
        <h4 className="text-sm font-semibold mb-2">Function Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="mb-2">
              <span className="text-xs text-gray-500">Self {flatLabel}:</span>
              <div className="font-medium">{func.flat} ({func.flatPercent})</div>
            </div>
            <div>
              <span className="text-xs text-gray-500">{cumLabel}:</span>
              <div className="font-medium">{func.cum} ({func.cumPercent})</div>
            </div>
          </div>
          <div>
            <Button
              icon="diagram-tree"
              intent="primary"
              small
              className="mb-2"
              onClick={() => console.log('View stacktrace')}
            >
              View Stacktrace
            </Button>
            <div>
              <span className="text-xs text-gray-500">Call Path:</span>
              <div className="font-mono text-xs mt-1 bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto">
                {func.functionName.split('.').join(' → ')}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // If there are no functions to display
  if (displayedFunctions.length === 0) {
    return (
      <Card className="bp5-elevation-1 mt-4">
        <div className="text-center py-6">
          <Icon icon="warning-sign" size={20} intent="warning" />
          <p className="mt-2">No function data available</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="visualization-container">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Top Functions
          <Tag intent="primary" className="ml-2">{profile.profileType}</Tag>
        </h3>
        <div className="flex gap-2">
          <Tooltip content="Sort by self time/memory">
            <Button
              small
              icon={sortColumn === 'flat' ? (sortAsc ? "arrow-up" : "arrow-down") : undefined}
              active={sortColumn === 'flat'}
              onClick={() => handleHeaderClick('flat')}
            >
              Self
            </Button>
          </Tooltip>
          <Tooltip content="Sort by total time/memory">
            <Button
              small
              icon={sortColumn === 'cum' ? (sortAsc ? "arrow-up" : "arrow-down") : undefined}
              active={sortColumn === 'cum'}
              onClick={() => handleHeaderClick('cum')}
            >
              Total
            </Button>
          </Tooltip>
          <Tooltip content="Sort by function name">
            <Button
              small
              icon={sortColumn === 'name' ? (sortAsc ? "arrow-up" : "arrow-down") : undefined}
              active={sortColumn === 'name'}
              onClick={() => handleHeaderClick('name')}
            >
              Name
            </Button>
          </Tooltip>
        </div>
      </div>

      <Table2
        numRows={displayedFunctions.length}
        columnWidths={[400, 150, 150]}
        cellRendererDependencies={[expandedRows, sortColumn, sortAsc]}
        rowHeights={displayedFunctions.map((_, index) => expandedRows.has(index) ? 150 : 40)}
      >
        <Column
          name="Function Name"
          cellRenderer={renderNameCell}
        />
        <Column
          name={`Self ${flatLabel}`}
          cellRenderer={renderFlatCell}
        />
        <Column
          name={cumLabel}
          cellRenderer={renderCumulativeCell}
        />
      </Table2>

      {/* Expanded rows */}
      {Array.from(expandedRows).map(rowIndex => (
        <Collapse key={rowIndex} isOpen={true}>
          {renderExpandedRow(rowIndex)}
        </Collapse>
      ))}

      {/* Show a message if we're limiting the display */}
      {functions.length > maxRows && (
        <div className="text-xs text-gray-500 mt-2 text-right">
          Showing top {maxRows} of {functions.length} functions
        </div>
      )}
    </div>
  );
};

export default EnhancedFunctionsTable;