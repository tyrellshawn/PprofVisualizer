import { useEffect, useRef } from "react";
import { Profile, profileUtils } from "@/lib/pprof";
import * as d3 from "d3";

interface TimelineChartProps {
  profile: Profile;
}

export default function TimelineChart({ profile }: TimelineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Clear previous content
    const container = containerRef.current;
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    
    // Generate sample timeline data based on profile
    // In a real implementation, this would come from repeated profile collections
    const timelineData = generateTimelineData(profile);
    
    // Set up dimensions
    const margin = { top: 30, right: 40, bottom: 40, left: 60 };
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
      .domain(d3.extent(timelineData, d => d.timestamp) as [Date, Date])
      .range([0, width]);
    
    const y = d3.scaleLinear()
      .domain([0, d3.max(timelineData, d => d.value) as number * 1.1]) // Add 10% padding
      .nice()
      .range([height, 0]);
    
    // Add grid lines
    svg.append("g")
      .attr("class", "grid-lines")
      .selectAll("line")
      .data(y.ticks(5))
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
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => {
        if (profile.profileType === 'cpu') {
          return profileUtils.formatTime(d as number);
        } else {
          return profileUtils.formatBytes(d as number);
        }
      }))
      .call(g => g.select(".domain").attr("stroke", "#ccc"))
      .call(g => g.selectAll(".tick line").attr("stroke", "#ccc"))
      .call(g => g.selectAll(".tick text").attr("fill", "#666").attr("font-size", "10px"));
    
    // Add line
    const line = d3.line<{ timestamp: Date; value: number }>()
      .x(d => x(d.timestamp))
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX);
    
    svg.append("path")
      .datum(timelineData)
      .attr("fill", "none")
      .attr("stroke", "var(--primary)")
      .attr("stroke-width", 2)
      .attr("d", line);
    
    // Add area
    const area = d3.area<{ timestamp: Date; value: number }>()
      .x(d => x(d.timestamp))
      .y0(height)
      .y1(d => y(d.value))
      .curve(d3.curveMonotoneX);
    
    svg.append("path")
      .datum(timelineData)
      .attr("fill", "var(--primary)")
      .attr("fill-opacity", 0.1)
      .attr("d", area);
    
    // Add dots
    svg.selectAll("circle")
      .data(timelineData)
      .enter()
      .append("circle")
      .attr("cx", d => x(d.timestamp))
      .attr("cy", d => y(d.value))
      .attr("r", 4)
      .attr("fill", "var(--primary)")
      .attr("stroke", "white")
      .attr("stroke-width", 1.5);
    
    // Add tooltip
    const tooltip = d3.select(container)
      .append("div")
      .attr("class", "absolute bg-white p-2 rounded shadow-sm border border-neutral-200 text-sm pointer-events-none opacity-0 transition-opacity z-50")
      .style("left", "0px")
      .style("top", "0px");
    
    // Add invisible hover areas for better tooltip interaction
    svg.selectAll("rect")
      .data(timelineData)
      .enter()
      .append("rect")
      .attr("x", (d, i) => {
        if (i === 0) return 0;
        const prev = timelineData[i - 1].timestamp;
        const curr = d.timestamp;
        const xPos = x(prev) + (x(curr) - x(prev)) / 2;
        return xPos;
      })
      .attr("width", (d, i) => {
        if (i === 0) {
          const next = timelineData[i + 1].timestamp;
          const curr = d.timestamp;
          return (x(next) - x(curr)) / 2;
        }
        else if (i === timelineData.length - 1) {
          const prev = timelineData[i - 1].timestamp;
          const curr = d.timestamp;
          return (x(curr) - x(prev)) / 2;
        }
        else {
          const prev = timelineData[i - 1].timestamp;
          const next = timelineData[i + 1].timestamp;
          return (x(next) - x(prev)) / 2;
        }
      })
      .attr("y", 0)
      .attr("height", height)
      .attr("fill", "transparent")
      .on("mouseover", (event, d) => {
        // Highlight the corresponding circle
        svg.selectAll("circle")
          .filter((pd) => pd.timestamp === d.timestamp)
          .attr("r", 6)
          .attr("stroke-width", 2);
        
        // Show tooltip
        tooltip
          .html(`
            <div class="font-medium">${d.timestamp.toLocaleTimeString()}</div>
            <div>${profile.profileType === 'cpu' ? 'CPU Time' : 'Memory'}: ${profile.profileType === 'cpu' 
              ? profileUtils.formatTime(d.value)
              : profileUtils.formatBytes(d.value)}</div>
          `)
          .style("opacity", 1)
          .style("left", `${event.offsetX + 10}px`)
          .style("top", `${event.offsetY - 28}px`);
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", `${event.offsetX + 10}px`)
          .style("top", `${event.offsetY - 28}px`);
      })
      .on("mouseout", (event, d) => {
        // Reset circle size
        svg.selectAll("circle")
          .filter((pd) => pd.timestamp === d.timestamp)
          .attr("r", 4)
          .attr("stroke-width", 1.5);
        
        // Hide tooltip
        tooltip.style("opacity", 0);
      });
    
    // Add title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .attr("fill", "#333")
      .attr("font-size", "12px")
      .text(`${profileUtils.getProfileTypeName(profile.profileType)} Timeline`);
    
  }, [profile, containerRef.current?.clientWidth, containerRef.current?.clientHeight]);
  
  return (
    <div ref={containerRef} className="w-full h-full relative"></div>
  );
}

// Helper function to generate timeline data based on the profile
function generateTimelineData(profile: Profile) {
  // Create a fake timeline - in a real implementation, this would come from
  // multiple profile collections over time
  const now = new Date();
  const baseValue = profile.profileType === 'cpu'
    ? profile.metadata?.totalTime || 5
    : profile.size;
  
  return Array.from({ length: 10 }, (_, i) => {
    const timeOffset = 10 - i; // minutes ago
    const timestamp = new Date(now.getTime() - timeOffset * 60 * 1000);
    // Add some random variation
    const variance = (Math.random() * 0.3 + 0.85); // 0.85 to 1.15
    const value = baseValue * variance;
    
    return {
      timestamp,
      value
    };
  }).reverse();
}
