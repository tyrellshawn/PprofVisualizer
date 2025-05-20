import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FlameRect } from "@/lib/d3-utils";
import * as d3 from "d3";

interface FlamegraphProps {
  data: FlameRect[];
}

export default function Flamegraph({ data }: FlamegraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current || !data || data.length === 0) return;
    
    // Clear previous content
    const container = containerRef.current;
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    
    // Set up dimensions
    const margin = { top: 10, right: 10, bottom: 10, left: 10 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = container.clientHeight - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select(container)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Create tooltip
    const tooltip = d3.select(container)
      .append("div")
      .attr("class", "absolute bg-white p-2 rounded shadow-sm border border-neutral-200 text-sm pointer-events-none opacity-0 transition-opacity z-50")
      .style("left", "0px")
      .style("top", "0px");
    
    // Draw flame graph rectangles
    svg.selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", d => d.x * width / 1000) // Scale x to available width
      .attr("y", d => d.y * height / (Math.max(...data.map(d => d.y + d.height)) || 100)) // Scale y
      .attr("width", d => Math.max(1, d.width * width / 1000)) // Ensure minimum width of 1px
      .attr("height", d => d.height * height / (Math.max(...data.map(d => d.y + d.height)) || 100))
      .attr("fill", d => d.color)
      .attr("stroke", "white")
      .attr("stroke-width", 0.5)
      .attr("rx", 2) // Rounded corners
      .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("stroke-width", 2)
          .attr("stroke", "#000");
        
        tooltip.html(`
          <div class="font-medium">${d.name}</div>
          <div>Value: ${d.value.toFixed(2)}</div>
          <div>Percent: ${(d.width / 10).toFixed(2)}%</div>
        `)
        .style("opacity", 1)
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY - 28}px`);
      })
      .on("mousemove", function(event) {
        tooltip
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 28}px`);
      })
      .on("mouseout", function() {
        d3.select(this)
          .attr("stroke-width", 0.5)
          .attr("stroke", "white");
        
        tooltip.style("opacity", 0);
      });
    
    // Add text labels for larger rectangles
    svg.selectAll("text")
      .data(data.filter(d => d.width > 50)) // Only show text for wider boxes
      .enter()
      .append("text")
      .attr("x", d => (d.x * width / 1000) + 5)
      .attr("y", d => (d.y * height / (Math.max(...data.map(d => d.y + d.height)) || 100)) + 
                      (d.height * height / (Math.max(...data.map(d => d.y + d.height)) || 100)) / 2)
      .text(d => {
        // Truncate function name if too long for its box
        const maxLength = Math.floor((d.width * width / 1000) / 6);
        return d.name.length > maxLength
          ? d.name.substring(0, maxLength) + "..."
          : d.name;
      })
      .attr("fill", "white")
      .attr("font-size", "10px")
      .attr("dominant-baseline", "middle")
      .attr("pointer-events", "none");
    
    // Add legend
    const legend = svg.append("g")
      .attr("transform", `translate(${width - 120}, ${height - 80})`);
    
    const legendData = [
      { color: "#0078D4", label: "Runtime" },
      { color: "#107C10", label: "Application" },
      { color: "#D13438", label: "System Calls" }
    ];
    
    legendData.forEach((item, i) => {
      legend.append("rect")
        .attr("x", 0)
        .attr("y", i * 20)
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", item.color)
        .attr("rx", 2);
      
      legend.append("text")
        .attr("x", 20)
        .attr("y", i * 20 + 10)
        .text(item.label)
        .attr("font-size", "10px")
        .attr("fill", "#333")
        .attr("dominant-baseline", "middle");
    });
    
    // Add background for legend
    legend.append("rect")
      .attr("x", -5)
      .attr("y", -5)
      .attr("width", 130)
      .attr("height", legendData.length * 20 + 10)
      .attr("fill", "white")
      .attr("opacity", 0.8)
      .attr("rx", 4)
      .lower(); // Move to back
    
  }, [data, containerRef.current?.clientWidth, containerRef.current?.clientHeight]);
  
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-neutral-50 rounded">
        <div className="text-center text-neutral-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-sm">No flame graph data available</p>
          <p className="text-xs mt-1">Import a profile with function call data to visualize</p>
        </div>
      </div>
    );
  }
  
  return (
    <div ref={containerRef} className="w-full h-full relative"></div>
  );
}
