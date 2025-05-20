import * as d3 from 'd3';
import { Profile, PprofFunction, ProfileMetadata } from './pprof';

// D3 types for TypeScript
type D3Selection = d3.Selection<d3.BaseType, unknown, HTMLElement, any>;

// Interface for timeline data
export interface TimelinePoint {
  timestamp: Date;
  value: number;
}

// Interface for flame graph rectangle
export interface FlameRect {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  value: number;
  depth: number;
  color: string;
  children?: FlameRect[];
}

// Utilities for D3 visualization
export const d3Utils = {
  // Create a timeline chart for CPU data
  createTimelineChart(container: HTMLElement, data: TimelinePoint[]): void {
    // Clear previous chart
    d3.select(container).selectAll('*').remove();
    
    // Set up dimensions
    const margin = { top: 20, right: 30, bottom: 30, left: 60 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = container.clientHeight - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select(container)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Set scales
    const x = d3.scaleTime()
      .domain(d3.extent(data, d => d.timestamp) as [Date, Date])
      .range([0, width]);
    
    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value) as number])
      .nice()
      .range([height, 0]);
    
    // Add X axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x));
    
    // Add Y axis
    svg.append('g')
      .call(d3.axisLeft(y));
    
    // Add line
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', 'var(--primary)')
      .attr('stroke-width', 2)
      .attr('d', d3.line<TimelinePoint>()
        .x(d => x(d.timestamp))
        .y(d => y(d.value))
      );
    
    // Add dots
    svg.selectAll('circle')
      .data(data)
      .enter()
      .append('circle')
      .attr('cx', d => x(d.timestamp))
      .attr('cy', d => y(d.value))
      .attr('r', 4)
      .attr('fill', 'var(--primary)');
    
    // Add grid lines
    svg.append('g')
      .attr('class', 'grid-lines')
      .selectAll('line')
      .data(y.ticks())
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', d => y(d))
      .attr('y2', d => y(d))
      .attr('stroke', 'rgba(0,0,0,0.1)')
      .attr('stroke-dasharray', '3,3');
  },
  
  // Create a horizontal bar chart for top functions
  createTopFunctionsChart(container: HTMLElement, functions: PprofFunction[], maxCount: number = 10): void {
    // Clear previous chart
    d3.select(container).selectAll('*').remove();
    
    // Keep only the top N functions
    const topFunctions = functions.slice(0, maxCount);
    
    // Set up dimensions
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = topFunctions.length * 30;
    
    // Parse percentages
    const percentages = topFunctions.map(fn => parseFloat(fn.flatPercent));
    
    // Create SVG
    const svg = d3.select(container)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Set scales
    const x = d3.scaleLinear()
      .domain([0, d3.max(percentages) || 100])
      .range([0, width]);
    
    const y = d3.scaleBand()
      .domain(topFunctions.map(fn => fn.functionName))
      .range([0, height])
      .padding(0.1);
    
    // Add bars
    svg.selectAll('.bar')
      .data(topFunctions)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', 0)
      .attr('y', d => y(d.functionName) as number)
      .attr('width', d => x(parseFloat(d.flatPercent)))
      .attr('height', y.bandwidth())
      .attr('fill', 'var(--primary)');
    
    // Add function names
    svg.selectAll('.label')
      .data(topFunctions)
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('x', 5)
      .attr('y', d => (y(d.functionName) as number) + y.bandwidth() / 2)
      .attr('dy', '.35em')
      .text(d => {
        // Truncate function name if too long
        const maxLength = 30;
        return d.functionName.length > maxLength
          ? d.functionName.substring(0, maxLength) + '...'
          : d.functionName;
      })
      .attr('fill', 'white')
      .style('font-size', '10px');
    
    // Add percentages
    svg.selectAll('.percentage')
      .data(topFunctions)
      .enter()
      .append('text')
      .attr('class', 'percentage')
      .attr('x', d => x(parseFloat(d.flatPercent)) + 5)
      .attr('y', d => (y(d.functionName) as number) + y.bandwidth() / 2)
      .attr('dy', '.35em')
      .text(d => d.flat)
      .attr('fill', 'var(--text-color)')
      .style('font-size', '10px');
  },
  
  // Create a flame graph visualization
  createFlameGraph(container: HTMLElement, data: FlameRect[]): void {
    // Clear previous chart
    d3.select(container).selectAll('*').remove();
    
    if (!data || data.length === 0) {
      d3.select(container)
        .append('div')
        .style('height', '100%')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('justify-content', 'center')
        .text('No flame graph data available');
      return;
    }
    
    // Set up dimensions
    const margin = { top: 20, right: 20, bottom: 30, left: 20 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = container.clientHeight - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select(container)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Create tooltip
    const tooltip = d3.select(container)
      .append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('background-color', 'white')
      .style('border', '1px solid #ddd')
      .style('border-radius', '4px')
      .style('padding', '5px')
      .style('pointer-events', 'none')
      .style('opacity', 0);
    
    // Add flame graph rects
    svg.selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .attr('width', d => d.width)
      .attr('height', d => d.height)
      .attr('fill', d => d.color)
      .attr('stroke', 'white')
      .attr('stroke-width', 0.5)
      .on('mouseover', function(event, d) {
        d3.select(this).attr('stroke-width', 2);
        tooltip.transition()
          .duration(200)
          .style('opacity', .9);
        tooltip.html(`
          <div style="font-weight: bold;">${d.name}</div>
          <div>Value: ${d.value}</div>
          <div>Percent: ${(d.width / width * 100).toFixed(2)}%</div>
        `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this).attr('stroke-width', 0.5);
        tooltip.transition()
          .duration(500)
          .style('opacity', 0);
      });
    
    // Add function names (only for wider boxes)
    svg.selectAll('text')
      .data(data.filter(d => d.width > 50)) // Only show text for wider boxes
      .enter()
      .append('text')
      .attr('x', d => d.x + 5)
      .attr('y', d => d.y + d.height / 2)
      .attr('dy', '.35em')
      .text(d => {
        // Truncate function name if too long for the box
        const maxLength = Math.floor(d.width / 6);
        return d.name.length > maxLength
          ? d.name.substring(0, maxLength) + '...'
          : d.name;
      })
      .attr('fill', 'white')
      .style('font-size', '10px')
      .style('pointer-events', 'none');
  },
  
  // Create a pie chart for memory distribution
  createMemoryPieChart(container: HTMLElement, data: { name: string; value: number; color: string }[]): void {
    // Clear previous chart
    d3.select(container).selectAll('*').remove();
    
    // Set up dimensions
    const margin = { top: 20, right: 20, bottom: 30, left: 20 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = container.clientHeight - margin.top - margin.bottom;
    const radius = Math.min(width, height) / 2;
    
    // Create SVG
    const svg = d3.select(container)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${width/2 + margin.left},${height/2 + margin.top})`);
    
    // Create pie generator
    const pie = d3.pie<{ name: string; value: number; color: string }>()
      .value(d => d.value);
    
    // Create arc generator
    const arc = d3.arc<d3.PieArcDatum<{ name: string; value: number; color: string }>>()
      .innerRadius(0)
      .outerRadius(radius);
    
    // Create pie chart
    const path = svg.selectAll('path')
      .data(pie(data))
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', d => d.data.color)
      .attr('stroke', 'white')
      .style('stroke-width', '2px');
    
    // Add labels
    const label = svg.selectAll('text')
      .data(pie(data))
      .enter()
      .append('text')
      .attr('transform', d => `translate(${arc.centroid(d)})`)
      .attr('dy', '.35em')
      .text(d => {
        // Only show label if segment is large enough
        return d.endAngle - d.startAngle > 0.2 ? d.data.name : '';
      })
      .style('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('fill', 'white');
  }
};

// Generate sample flame graph data from pprof metadata
export function generateFlameGraphFromMetadata(metadata: ProfileMetadata): FlameRect[] {
  if (!metadata.topFunctions || metadata.topFunctions.length === 0) {
    return [];
  }
  
  const baseHeight = 30;
  let result: FlameRect[] = [];
  
  // Start with the "root" node that covers the full width
  result.push({
    id: 'root',
    name: 'root',
    x: 0,
    y: 0,
    width: 1000,
    height: baseHeight,
    value: 100,
    depth: 0,
    color: getRandomColor()
  });
  
  // Group functions by path components
  const functions = metadata.topFunctions;
  const pathMap = new Map<string, PprofFunction[]>();
  
  for (const fn of functions) {
    const parts = fn.functionName.split('.');
    const path = parts.length > 1 ? parts[0] : 'other';
    
    if (!pathMap.has(path)) {
      pathMap.set(path, []);
    }
    
    pathMap.get(path)!.push(fn);
  }
  
  // Add rectangles for each path group
  let currentX = 0;
  pathMap.forEach((fns, path) => {
    // Sum percentages in this group
    const totalPercent = fns.reduce((sum, fn) => 
      sum + parseFloat(fn.flatPercent), 0);
    
    // Calculate width based on percentage
    const width = 1000 * (totalPercent / 100);
    
    const rect: FlameRect = {
      id: path,
      name: path,
      x: currentX,
      y: baseHeight,
      width: width,
      height: baseHeight,
      value: totalPercent,
      depth: 1,
      color: getRandomColor()
    };
    
    result.push(rect);
    currentX += width;
    
    // Add individual functions in this group
    let fnX = rect.x;
    for (const fn of fns) {
      const fnPercent = parseFloat(fn.flatPercent);
      const fnWidth = 1000 * (fnPercent / 100);
      
      result.push({
        id: fn.functionName,
        name: fn.functionName,
        x: fnX,
        y: baseHeight * 2,
        width: fnWidth,
        height: baseHeight,
        value: fnPercent,
        depth: 2,
        color: getRandomColor()
      });
      
      fnX += fnWidth;
    }
  });
  
  return result;
}

// Helper function to generate random colors
function getRandomColor(): string {
  const colors = [
    '#0078D4', // blue
    '#107C10', // green
    '#FFB900', // yellow
    '#D13438', // red
    '#8764B8', // purple
    '#00B294', // teal
  ];
  
  return colors[Math.floor(Math.random() * colors.length)];
}
