import React, { useEffect, useRef, useState } from 'react';
import { Button, Card, Icon, Intent, NonIdealState, ProgressBar, Spinner, Tab, Tabs } from '@blueprintjs/core';
import { Cell, Column, Table2 } from '@blueprintjs/table';
import * as d3 from 'd3';
import { Profile } from '../../lib/pprof';
import { d3Utils } from '../../lib/d3-utils';

interface MemoryAnalysisProps {
  profile: Profile;
  height?: number;
}

// Represents a memory item for visualization
interface MemoryItem {
  name: string;
  size: number;
  percentage: number;
  allocations: number;
  category: string;
  color: string;
}

const MemoryAnalysis: React.FC<MemoryAnalysisProps> = ({
  profile,
  height = 500
}) => {
  const pieChartRef = useRef<HTMLDivElement>(null);
  const allocationsRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memoryData, setMemoryData] = useState<MemoryItem[]>([]);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [tooltipData, setTooltipData] = useState<{ x: number; y: number; data: MemoryItem } | null>(null);

  // Only render for heap profile types
  const isHeapProfile = profile.profileType === 'heap';

  // Generate memory data from profile
  useEffect(() => {
    if (!isHeapProfile) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Generate sample memory data
      // In a real implementation, this would parse the actual heap profile data
      const sampleMemoryData: MemoryItem[] = [
        {
          name: 'strings.Builder',
          size: 25.4,
          percentage: 28.2,
          allocations: 18453,
          category: 'string',
          color: '#2965CC'
        },
        {
          name: 'bytes.Buffer',
          size: 18.7,
          percentage: 20.8,
          allocations: 15672,
          category: 'buffer',
          color: '#29A634'
        },
        {
          name: 'map[string]interface{}',
          size: 14.2,
          percentage: 15.8,
          allocations: 8921,
          category: 'map',
          color: '#D13913'
        },
        {
          name: 'encoding/json.Decoder',
          size: 8.9,
          percentage: 9.9,
          allocations: 3245,
          category: 'decoder',
          color: '#8F398F'
        },
        {
          name: '[]byte',
          size: 7.3,
          percentage: 8.1,
          allocations: 12378,
          category: 'slice',
          color: '#D9822B'
        },
        {
          name: 'net/http.Request',
          size: 5.8,
          percentage: 6.4,
          allocations: 2654,
          category: 'http',
          color: '#752F75'
        },
        {
          name: 'Other',
          size: 9.7,
          percentage: 10.8,
          allocations: 21563,
          category: 'other',
          color: '#738091'
        }
      ];
      
      setMemoryData(sampleMemoryData);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to generate memory data:', err);
      setError('Failed to analyze memory profile');
      setIsLoading(false);
    }
  }, [profile.id, isHeapProfile]);

  // Create pie chart visualization
  useEffect(() => {
    if (isLoading || !pieChartRef.current || memoryData.length === 0 || selectedTab !== 'overview') return;

    // Clear previous visualization
    d3.select(pieChartRef.current).selectAll('*').remove();

    const container = pieChartRef.current;
    const width = container.clientWidth;
    const chartHeight = 300;
    
    // Create SVG container
    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', chartHeight)
      .append('g')
      .attr('transform', `translate(${width / 2}, ${chartHeight / 2})`);
    
    // Define pie layout
    const pie = d3.pie<MemoryItem>()
      .value(d => d.percentage)
      .sort(null);
    
    // Define arc generator
    const radius = Math.min(width, chartHeight) / 2 - 40;
    const arc = d3.arc<d3.PieArcDatum<MemoryItem>>()
      .innerRadius(radius * 0.5)
      .outerRadius(radius);
    
    // Create pie chart segments
    const segments = svg.selectAll('.arc')
      .data(pie(memoryData))
      .enter()
      .append('g')
      .attr('class', 'arc');
    
    // Draw arcs
    segments.append('path')
      .attr('d', arc)
      .attr('fill', d => d.data.color)
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        const [x, y] = d3.pointer(event);
        setTooltipData({
          x: event.pageX,
          y: event.pageY,
          data: d.data
        });
        
        d3.select(event.target)
          .transition()
          .duration(200)
          .attr('opacity', 0.8);
      })
      .on('mouseout', (event) => {
        setTooltipData(null);
        
        d3.select(event.target)
          .transition()
          .duration(200)
          .attr('opacity', 1);
      });
    
    // Add center text
    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.5em')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .text('Memory');
    
    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1em')
      .attr('font-size', '14px')
      .text('Allocation');
  }, [memoryData, isLoading, selectedTab]);

  // Create allocations bar chart
  useEffect(() => {
    if (isLoading || !allocationsRef.current || memoryData.length === 0 || selectedTab !== 'allocations') return;

    // Clear previous visualization
    d3.select(allocationsRef.current).selectAll('*').remove();

    const container = allocationsRef.current;
    const width = container.clientWidth;
    const chartHeight = 300;
    
    // Create SVG container
    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', chartHeight);
    
    // Define margins
    const margin = { top: 20, right: 30, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = chartHeight - margin.top - margin.bottom;
    
    // Create scales
    const x = d3.scaleBand()
      .domain(memoryData.map(d => d.name))
      .range([0, innerWidth])
      .padding(0.2);
    
    const y = d3.scaleLinear()
      .domain([0, d3.max(memoryData, d => d.allocations) || 0])
      .nice()
      .range([innerHeight, 0]);
    
    // Create group for chart elements
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // Draw bars
    g.selectAll('.bar')
      .data(memoryData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.name) || 0)
      .attr('y', d => y(d.allocations))
      .attr('width', x.bandwidth())
      .attr('height', d => innerHeight - y(d.allocations))
      .attr('fill', d => d.color)
      .attr('rx', 3)
      .on('mouseover', (event, d) => {
        setTooltipData({
          x: event.pageX,
          y: event.pageY,
          data: d
        });
        
        d3.select(event.target)
          .transition()
          .duration(200)
          .attr('opacity', 0.8);
      })
      .on('mouseout', (event) => {
        setTooltipData(null);
        
        d3.select(event.target)
          .transition()
          .duration(200)
          .attr('opacity', 1);
      });
    
    // Draw axes
    g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .attr('text-anchor', 'end')
      .attr('dx', '-.8em')
      .attr('dy', '.15em');
    
    g.append('g')
      .call(d3.axisLeft(y).ticks(5));
    
    // Add labels
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + margin.bottom - 10)
      .attr('font-size', '12px')
      .text('Object Type');
    
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left + 20)
      .attr('x', -innerHeight / 2)
      .attr('font-size', '12px')
      .text('Number of Allocations');
  }, [memoryData, isLoading, selectedTab]);

  // Render the memory metrics table
  const renderMemoryTable = () => {
    const renderNameCell = (rowIndex: number) => (
      <Cell>
        <div className="flex items-center">
          <div 
            className="w-3 h-3 rounded-full mr-2" 
            style={{ backgroundColor: memoryData[rowIndex].color }}
          ></div>
          {memoryData[rowIndex].name}
        </div>
      </Cell>
    );
    
    const renderSizeCell = (rowIndex: number) => (
      <Cell>
        {memoryData[rowIndex].size.toFixed(1)} MB
      </Cell>
    );
    
    const renderPercentageCell = (rowIndex: number) => (
      <Cell>
        <div className="flex items-center">
          <ProgressBar 
            value={memoryData[rowIndex].percentage / 100} 
            intent={getIntent(memoryData[rowIndex].percentage)}
            stripes={false}
            className="flex-grow mr-2"
          />
          <span>{memoryData[rowIndex].percentage.toFixed(1)}%</span>
        </div>
      </Cell>
    );
    
    const renderAllocationsCell = (rowIndex: number) => (
      <Cell>
        {memoryData[rowIndex].allocations.toLocaleString()}
      </Cell>
    );
    
    return (
      <Table2
        numRows={memoryData.length}
        columnWidths={[200, 100, 200, 150]}
        cellRendererDependencies={[memoryData]}
        className="memory-table"
      >
        <Column name="Object Type" cellRenderer={renderNameCell} />
        <Column name="Size" cellRenderer={renderSizeCell} />
        <Column name="Percentage" cellRenderer={renderPercentageCell} />
        <Column name="Allocations" cellRenderer={renderAllocationsCell} />
      </Table2>
    );
  };

  // Helper to determine intent based on percentage value
  const getIntent = (percentage: number): Intent => {
    if (percentage > 25) return Intent.DANGER;
    if (percentage > 10) return Intent.WARNING;
    return Intent.SUCCESS;
  };

  if (!isHeapProfile) {
    return (
      <Card className="visualization-container" elevation={1}>
        <NonIdealState
          icon="database"
          title="Not a Heap Profile"
          description="This visualization is only available for heap profiling data."
        />
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="visualization-container" elevation={1}>
        <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
          <Spinner size={50} />
          <div className="ml-4">Analyzing memory profile...</div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="visualization-container" elevation={1}>
        <NonIdealState
          icon="error"
          title="Memory Analysis Error"
          description={error}
          action={<Button intent="primary" icon="refresh" onClick={() => window.location.reload()}>Retry</Button>}
        />
      </Card>
    );
  }

  return (
    <Card className="visualization-container" elevation={1}>
      <h3 className="text-lg font-semibold mb-4">
        Memory Allocation Analysis
      </h3>

      <Tabs
        id="memoryAnalysisTabs"
        selectedTabId={selectedTab}
        onChange={(newTabId) => setSelectedTab(newTabId as string)}
        className="mb-4"
      >
        <Tab
          id="overview"
          title="Overview"
          panel={
            <div>
              <div className="text-sm text-gray-500 mb-2">
                Relative memory usage by object type
              </div>
              <div ref={pieChartRef} className="w-full" style={{ minHeight: '300px' }} />
              
              <div className="mt-6">
                <h4 className="text-base font-medium mb-3">Memory Distribution</h4>
                {renderMemoryTable()}
              </div>
            </div>
          }
        />
        <Tab
          id="allocations"
          title="Allocations"
          panel={
            <div>
              <div className="text-sm text-gray-500 mb-2">
                Number of allocations by object type
              </div>
              <div ref={allocationsRef} className="w-full" style={{ minHeight: '300px' }} />
              
              <div className="mt-4">
                <h4 className="text-base font-medium mb-2">Allocation Metrics</h4>
                <p className="text-sm">
                  Total allocations: <strong>{memoryData.reduce((sum, item) => sum + item.allocations, 0).toLocaleString()}</strong>
                </p>
                <p className="text-sm">
                  Total memory: <strong>{memoryData.reduce((sum, item) => sum + item.size, 0).toFixed(1)} MB</strong>
                </p>
              </div>
            </div>
          }
        />
        <Tab
          id="recommendations"
          title="Recommendations"
          panel={
            <div className="p-2">
              <h4 className="text-base font-medium mb-3">Memory Optimization Recommendations</h4>
              
              <div className="bg-blue-50 p-3 rounded mb-3 border-l-4 border-blue-500">
                <h5 className="font-semibold mb-1">High String Allocations</h5>
                <p className="text-sm mb-2">
                  The profile shows excessive string allocations from <code>strings.Builder</code>.
                </p>
                <div className="text-sm">
                  <strong>Recommendation:</strong> Use string builders with pre-allocated capacity and reuse them when possible.
                </div>
              </div>
              
              <div className="bg-amber-50 p-3 rounded mb-3 border-l-4 border-amber-500">
                <h5 className="font-semibold mb-1">Buffer Allocations</h5>
                <p className="text-sm mb-2">
                  Many <code>bytes.Buffer</code> allocations could be optimized.
                </p>
                <div className="text-sm">
                  <strong>Recommendation:</strong> Use buffer pools for frequent buffer operations to reduce allocations.
                </div>
              </div>
              
              <div className="bg-green-50 p-3 rounded border-l-4 border-green-500">
                <h5 className="font-semibold mb-1">Map Usage</h5>
                <p className="text-sm mb-2">
                  Significant memory is used by maps with string keys.
                </p>
                <div className="text-sm">
                  <strong>Recommendation:</strong> Initialize maps with expected capacity to avoid rehashing, and consider using more specific types than <code>interface{}</code> for values.
                </div>
              </div>
            </div>
          }
        />
      </Tabs>

      {tooltipData && (
        <div
          className="memory-tooltip absolute bg-gray-800 text-white p-2 rounded shadow-lg z-10 text-xs"
          style={{
            left: `${tooltipData.x + 10}px`,
            top: `${tooltipData.y - 60}px`,
            maxWidth: '300px'
          }}
        >
          <div className="font-bold">{tooltipData.data.name}</div>
          <div className="mt-1">
            Size: {tooltipData.data.size.toFixed(1)} MB ({tooltipData.data.percentage.toFixed(1)}%)
          </div>
          <div>
            Allocations: {tooltipData.data.allocations.toLocaleString()}
          </div>
          <div>
            Category: {tooltipData.data.category}
          </div>
        </div>
      )}
    </Card>
  );
};

export default MemoryAnalysis;