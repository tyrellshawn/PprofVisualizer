import { useEffect, useRef } from "react";
import { Profile, profileUtils } from "@/lib/pprof";
import * as d3 from "d3";

interface DistributionChartProps {
  profile: Profile;
}

export default function DistributionChart({ profile }: DistributionChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Clear previous content
    const container = containerRef.current;
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    
    // Generate distribution data based on profile
    const distributionData = generateDistributionData(profile);
    
    // Set up dimensions
    const margin = { top: 10, right: 30, bottom: 30, left: 60 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = container.clientHeight - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select(container)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Set up scales
    const x = d3.scaleTime()
      .domain(d3.extent(distributionData, d => d.timestamp) as [Date, Date])
      .range([0, width]);
    
    const y = d3.scaleLinear()
      .domain([0, d3.max(distributionData, d => d.value) as number * 1.1])
      .nice()
      .range([height, 0]);
    
    // Add grid lines
    svg.append("g")
      .attr("class", "grid-lines")
      .selectAll("line")
      .data(y.ticks(4))
      .enter()
      .append("line")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", d => y(d))
      .attr("y2", d => y(d))
      .attr("stroke", "rgba(0,0,0,0.1)")
      .attr("stroke-dasharray", "3,3");
    
    // Add X axis
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d => {
        const date = d as Date;
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }))
      .call(g => g.select(".domain").attr("stroke", "#ccc"))
      .call(g => g.selectAll(".tick line").attr("stroke", "#ccc"))
      .call(g => g.selectAll(".tick text").attr("fill", "#666").attr("font-size", "10px"));
    
    // Add Y axis
    svg.append("g")
      .call(d3.axisLeft(y).ticks(4).tickFormat(d => {
        if (profile.profileType === 'cpu') {
          return profileUtils.formatTime(d as number);
        } else {
          return profileUtils.formatBytes(d as number);
        }
      }))
      .call(g => g.select(".domain").attr("stroke", "#ccc"))
      .call(g => g.selectAll(".tick line").attr("stroke", "#ccc"))
      .call(g => g.selectAll(".tick text").attr("fill", "#666").attr("font-size", "10px"));
    
    // Create gradient
    const gradient = svg.append("defs")
      .append("linearGradient")
      .attr("id", "area-gradient")
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", 0)
      .attr("y1", y(0))
      .attr("x2", 0)
      .attr("y2", y(d3.max(distributionData, d => d.value) as number));
    
    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "var(--primary)")
      .attr("stop-opacity", 0.1);
    
    gradient.append("stop")
      .attr("offset", "70%")
      .attr("stop-color", "var(--primary)")
      .attr("stop-opacity", 0.3);
    
    // Add area
    const area = d3.area<{ timestamp: Date; value: number }>()
      .x(d => x(d.timestamp))
      .y0(height)
      .y1(d => y(d.value))
      .curve(d3.curveBasis);
    
    svg.append("path")
      .datum(distributionData)
      .attr("fill", "url(#area-gradient)")
      .attr("d", area);
    
    // Add line
    const line = d3.line<{ timestamp: Date; value: number }>()
      .x(d => x(d.timestamp))
      .y(d => y(d.value))
      .curve(d3.curveBasis);
    
    svg.append("path")
      .datum(distributionData)
      .attr("fill", "none")
      .attr("stroke", "var(--primary)")
      .attr("stroke-width", 2)
      .attr("d", line);
    
    // Add annotations for spikes
    const maxPoint = distributionData.reduce((max, point) => 
      point.value > max.value ? point : max, distributionData[0]);
    
    svg.append("circle")
      .attr("cx", x(maxPoint.timestamp))
      .attr("cy", y(maxPoint.value))
      .attr("r", 5)
      .attr("fill", "#D13438")
      .attr("stroke", "white")
      .attr("stroke-width", 2);
    
    svg.append("line")
      .attr("x1", x(maxPoint.timestamp))
      .attr("y1", y(maxPoint.value) + 10)
      .attr("x2", x(maxPoint.timestamp))
      .attr("y2", height)
      .attr("stroke", "#D13438")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3");
    
    // Add tooltip
    const tooltip = d3.select(container)
      .append("div")
      .attr("class", "absolute bg-white p-2 rounded shadow-sm border border-neutral-200 text-sm pointer-events-none opacity-0 transition-opacity z-50")
      .style("left", "0px")
      .style("top", "0px");
    
    // Create an invisible overlay for tooltip interactions
    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "none")
      .attr("pointer-events", "all")
      .on("mousemove", function(event) {
        const [xPos] = d3.pointer(event);
        const xDate = x.invert(xPos);
        
        // Find the closest data point
        const bisect = d3.bisector((d: {timestamp: Date}) => d.timestamp).left;
        const index = bisect(distributionData, xDate);
        const d0 = distributionData[index - 1];
        const d1 = distributionData[index];
        
        // Select the closer data point
        const d = d0 && d1 ? 
          (xDate.getTime() - d0.timestamp.getTime() > d1.timestamp.getTime() - xDate.getTime() ? d1 : d0) : 
          (d0 || d1);
        
        if (d) {
          // Show tooltip
          tooltip
            .html(`
              <div class="font-medium">${d.timestamp.toLocaleTimeString()}</div>
              <div>${profile.profileType === 'cpu' ? 'CPU Time' : 'Memory'}: ${profile.profileType === 'cpu' 
                ? profileUtils.formatTime(d.value)
                : profileUtils.formatBytes(d.value)}</div>
            `)
            .style("opacity", 1)
            .style("left", `${x(d.timestamp) + margin.left + 10}px`)
            .style("top", `${y(d.value) + margin.top - 28}px`);
          
          // Highlight point
          svg.selectAll(".highlight-point").remove();
          svg.append("circle")
            .attr("class", "highlight-point")
            .attr("cx", x(d.timestamp))
            .attr("cy", y(d.value))
            .attr("r", 5)
            .attr("fill", "var(--primary)")
            .attr("stroke", "white")
            .attr("stroke-width", 2);
          
          // Add vertical line
          svg.selectAll(".highlight-line").remove();
          svg.append("line")
            .attr("class", "highlight-line")
            .attr("x1", x(d.timestamp))
            .attr("y1", y(d.value))
            .attr("x2", x(d.timestamp))
            .attr("y2", height)
            .attr("stroke", "var(--primary)")
            .attr("stroke-width", 1)
            .attr("stroke-dasharray", "3,3");
        }
      })
      .on("mouseleave", function() {
        // Hide tooltip and highlights
        tooltip.style("opacity", 0);
        svg.selectAll(".highlight-point").remove();
        svg.selectAll(".highlight-line").remove();
      });
    
  }, [profile, containerRef.current?.clientWidth, containerRef.current?.clientHeight]);
  
  return (
    <div ref={containerRef} className="w-full h-full relative"></div>
  );
}

// Helper function to generate distribution data based on the profile
function generateDistributionData(profile: Profile) {
  // Create a distribution - in a real implementation, this would come from
  // actual profile data over time
  const now = new Date();
  const baseValue = profile.profileType === 'cpu'
    ? profile.metadata?.totalTime || 5
    : profile.size;
  
  // Generate 30 points at 1-minute intervals
  return Array.from({ length: 30 }, (_, i) => {
    const timeOffset = 30 - i; // minutes ago
    const timestamp = new Date(now.getTime() - timeOffset * 60 * 1000);
    
    // Create a somewhat realistic pattern
    let factor = 1;
    
    // Add a spike around the middle
    if (i >= 10 && i <= 13) {
      factor = 1.5 + (i - 10) * 0.2; // Growing spike
    } else if (i >= 14 && i <= 17) {
      factor = 2.1 - (i - 14) * 0.2; // Decreasing spike
    } else {
      // Regular "noise"
      factor = 0.8 + Math.sin(i * 0.5) * 0.2 + Math.random() * 0.2;
    }
    
    const value = baseValue * factor;
    
    return {
      timestamp,
      value
    };
  });
}
