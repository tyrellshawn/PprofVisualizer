import React, { useEffect, useRef, useState } from 'react';
import { Button, Card, Checkbox, Colors, Icon, NonIdealState, Spinner } from '@blueprintjs/core';
import * as d3 from 'd3';
import { Profile } from '../../lib/pprof';
import { d3Utils, TimelinePoint } from '../../lib/d3-utils';

interface TimelineVisualizationProps {
  profiles: Profile[];
  height?: number;
  selectedProfileId?: number;
  onSelectProfile?: (profileId: number) => void;
}

// Function to get a color based on profile type
const getProfileTypeColor = (profileType: string): string => {
  switch (profileType) {
    case 'cpu': return Colors.BLUE3;
    case 'heap': return Colors.GREEN3;
    case 'block': return Colors.RED3;
    case 'mutex': return Colors.VIOLET3;
    case 'goroutine': return Colors.ORANGE3;
    case 'threadcreate': return Colors.ROSE3;
    default: return Colors.GRAY3;
  }
};

const BlueprintTimeline: React.FC<TimelineVisualizationProps> = ({
  profiles,
  height = 300,
  selectedProfileId,
  onSelectProfile
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set(['cpu', 'heap', 'block', 'mutex', 'goroutine', 'threadcreate']));
  const [timelineData, setTimelineData] = useState<TimelinePoint[][]>([]);
  const [tooltipData, setTooltipData] = useState<{ 
    x: number; 
    y: number; 
    profile: Profile;
    valueLabel: string;
  } | null>(null);

  // Process profiles into timeline data
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Group profiles by type
      const profilesByType = profiles.reduce((acc, profile) => {
        if (!acc[profile.profileType]) {
          acc[profile.profileType] = [];
        }
        acc[profile.profileType].push(profile);
        return acc;
      }, {} as Record<string, Profile[]>);
      
      // Convert to timeline points
      const timelineDataByType = Object.entries(profilesByType).map(([type, typeProfiles]) => {
        return typeProfiles.map(profile => {
          // Extract a relevant metric based on profile type
          let value = 0;
          if (profile.metadata.totalTime) {
            value = profile.metadata.totalTime;
          } else if (profile.metadata.sampleCount) {
            value = profile.metadata.sampleCount;
          } else {
            // Default to file size if no better metric available
            value = profile.size / 1024; // KB
          }
          
          return {
            timestamp: new Date(profile.uploadedAt),
            value,
            profile
          };
        }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      });
      
      setTimelineData(timelineDataByType);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to process timeline data:', err);
      setError('Failed to generate timeline visualization');
      setIsLoading(false);
    }
  }, [profiles]);

  // Create and update the timeline visualization
  useEffect(() => {
    if (isLoading || !containerRef.current || timelineData.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    
    // Clear previous visualization
    d3.select(container).selectAll('*').remove();
    
    // Filter data by selected types
    const filteredData = timelineData.flatMap((typeData, i) => {
      const profileType = typeData[0]?.profile.profileType || '';
      return selectedTypes.has(profileType) ? typeData : [];
    });
    
    // If no data after filtering, show message
    if (filteredData.length === 0) {
      d3.select(container)
        .append('div')
        .attr('class', 'no-data-message')
        .style('text-align', 'center')
        .style('padding', '60px 20px')
        .style('color', Colors.GRAY1)
        .text('No profiles selected. Choose a profile type to display.');
      return;
    }
    
    // Find min/max dates across all filtered profiles
    const allDates = filteredData.flatMap(point => point.timestamp);
    const minDate = d3.min(allDates) || new Date();
    const maxDate = d3.max(allDates) || new Date();
    
    // Add padding to date range
    const dateRange = maxDate.getTime() - minDate.getTime();
    const paddedMinDate = new Date(minDate.getTime() - dateRange * 0.05);
    const paddedMaxDate = new Date(maxDate.getTime() + dateRange * 0.05);
    
    // Find min/max values across all filtered profiles
    const allValues = filteredData.flatMap(point => point.value);
    const maxValue = d3.max(allValues) || 0;
    
    // Create SVG container
    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('class', 'timeline-chart');
    
    // Create scales
    const xScale = d3.scaleTime()
      .domain([paddedMinDate, paddedMaxDate])
      .range([50, width - 20]);
    
    const yScale = d3.scaleLinear()
      .domain([0, maxValue * 1.1]) // Add 10% padding at the top
      .range([height - 30, 20]);
    
    // Create axes
    const xAxis = d3.axisBottom(xScale)
      .ticks(5)
      .tickFormat(d3.timeFormat('%b %d, %H:%M') as any);
    
    const yAxis = d3.axisLeft(yScale)
      .ticks(5);
    
    // Draw axes
    svg.append('g')
      .attr('transform', `translate(0, ${height - 30})`)
      .call(xAxis);
    
    svg.append('g')
      .attr('transform', 'translate(50, 0)')
      .call(yAxis);
    
    // Create a clip path to prevent points from rendering outside the chart area
    svg.append('defs')
      .append('clipPath')
      .attr('id', 'chart-area')
      .append('rect')
      .attr('x', 50)
      .attr('y', 0)
      .attr('width', width - 70)
      .attr('height', height - 30);
    
    // Draw timeline points
    const chartGroup = svg.append('g')
      .attr('clip-path', 'url(#chart-area)');

    // Draw grid lines
    chartGroup.selectAll('line.y-grid')
      .data(yScale.ticks(5))
      .enter()
      .append('line')
      .attr('class', 'y-grid')
      .attr('x1', 50)
      .attr('x2', width - 20)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', '#e0e0e0')
      .attr('stroke-dasharray', '3,3');
    
    // Helper function to process data by profile type
    const drawProfileTypeData = (data: TimelinePoint[], profileType: string) => {
      if (data.length === 0) return;
      
      const color = getProfileTypeColor(profileType);
      
      // Draw lines connecting points
      if (data.length > 1) {
        const line = d3.line<TimelinePoint>()
          .x(d => xScale(d.timestamp))
          .y(d => yScale(d.value))
          .curve(d3.curveMonotoneX);
        
        chartGroup.append('path')
          .datum(data)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 2)
          .attr('d', line);
      }
      
      // Draw points
      chartGroup.selectAll(`.point-${profileType}`)
        .data(data)
        .enter()
        .append('circle')
        .attr('class', `point-${profileType}`)
        .attr('cx', d => xScale(d.timestamp))
        .attr('cy', d => yScale(d.value))
        .attr('r', d => d.profile.id === selectedProfileId ? 7 : 5)
        .attr('fill', d => d.profile.id === selectedProfileId ? Colors.WHITE : color)
        .attr('stroke', color)
        .attr('stroke-width', d => d.profile.id === selectedProfileId ? 3 : 1)
        .style('cursor', 'pointer')
        .on('mouseover', (event, d) => {
          const target = event.target as SVGCircleElement;
          d3.select(target)
            .transition()
            .duration(100)
            .attr('r', 8);
          
          // Get metric label based on profile type
          let valueLabel = '';
          if (d.profile.profileType === 'cpu' || d.profile.profileType === 'block' || d.profile.profileType === 'mutex') {
            valueLabel = `${d.value.toFixed(2)}s`;
          } else if (d.profile.profileType === 'heap') {
            valueLabel = `${(d.value / 1024).toFixed(2)} MB`;
          } else {
            valueLabel = d.value.toString();
          }
          
          setTooltipData({
            x: event.pageX,
            y: event.pageY,
            profile: d.profile,
            valueLabel
          });
        })
        .on('mouseout', (event) => {
          const target = event.target as SVGCircleElement;
          const d = d3.select(target).datum() as TimelinePoint;
          d3.select(target)
            .transition()
            .duration(100)
            .attr('r', d.profile.id === selectedProfileId ? 7 : 5);
          
          setTooltipData(null);
        })
        .on('click', (_, d) => {
          if (onSelectProfile) {
            onSelectProfile(d.profile.id);
          }
        });
    };
    
    // Draw data for each profile type
    timelineData.forEach(typeData => {
      if (typeData.length === 0) return;
      const profileType = typeData[0].profile.profileType;
      if (selectedTypes.has(profileType)) {
        drawProfileTypeData(typeData, profileType);
      }
    });
    
    // Add legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width - 150}, 10)`)
      .attr('class', 'legend');
    
    const profileTypes = Array.from(new Set(timelineData.flatMap(data => 
      data.length > 0 ? [data[0].profile.profileType] : []
    )));
    
    profileTypes.forEach((type, i) => {
      const legendItem = legend.append('g')
        .attr('transform', `translate(0, ${i * 20})`)
        .style('cursor', 'pointer')
        .on('click', () => {
          const newSelectedTypes = new Set(selectedTypes);
          if (newSelectedTypes.has(type)) {
            newSelectedTypes.delete(type);
          } else {
            newSelectedTypes.add(type);
          }
          setSelectedTypes(newSelectedTypes);
        });
      
      legendItem.append('rect')
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', selectedTypes.has(type) ? getProfileTypeColor(type) : Colors.LIGHT_GRAY3)
        .attr('stroke', getProfileTypeColor(type))
        .attr('stroke-width', 1)
        .attr('rx', 2);
      
      legendItem.append('text')
        .attr('x', 20)
        .attr('y', 12)
        .attr('font-size', '12px')
        .attr('fill', selectedTypes.has(type) ? Colors.DARK_GRAY1 : Colors.GRAY1)
        .text(type);
    });
  }, [timelineData, selectedTypes, isLoading, height, selectedProfileId, onSelectProfile]);

  // Toggle a profile type selection
  const toggleProfileType = (profileType: string) => {
    const newSelectedTypes = new Set(selectedTypes);
    if (newSelectedTypes.has(profileType)) {
      newSelectedTypes.delete(profileType);
    } else {
      newSelectedTypes.add(profileType);
    }
    setSelectedTypes(newSelectedTypes);
  };

  if (isLoading) {
    return (
      <Card className="visualization-container" elevation={1}>
        <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
          <Spinner size={50} />
          <div className="ml-4">Loading timeline data...</div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="visualization-container" elevation={1}>
        <NonIdealState
          icon="error"
          title="Visualization Error"
          description={error}
          action={<Button intent="primary" icon="refresh" onClick={() => window.location.reload()}>Retry</Button>}
        />
      </Card>
    );
  }

  if (profiles.length < 2) {
    return (
      <Card className="visualization-container" elevation={1}>
        <NonIdealState
          icon="timeline-line-chart"
          title="Timeline Not Available"
          description="At least two profiles are needed to display a timeline visualization."
        />
      </Card>
    );
  }

  return (
    <Card className="visualization-container" elevation={1}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          Timeline Visualization
        </h3>
        <div className="flex gap-2 flex-wrap justify-end">
          {Array.from(new Set(profiles.map(p => p.profileType))).map(type => (
            <Checkbox
              key={type}
              label={type}
              checked={selectedTypes.has(type)}
              onChange={() => toggleProfileType(type)}
              inline
              style={{ 
                marginBottom: 0,
                color: getProfileTypeColor(type)
              }}
            />
          ))}
        </div>
      </div>
      
      <div 
        ref={containerRef} 
        className="timeline-container" 
        style={{ height: `${height}px`, position: 'relative' }}
      />
      
      {tooltipData && (
        <div
          className="timeline-tooltip absolute bg-gray-800 text-white p-2 rounded shadow-lg z-10 text-xs"
          style={{
            left: `${tooltipData.x + 10}px`,
            top: `${tooltipData.y - 70}px`,
            maxWidth: '300px'
          }}
        >
          <div className="font-bold">{tooltipData.profile.filename}</div>
          <div className="mt-1">
            Type: {tooltipData.profile.profileType}
          </div>
          <div>
            Value: {tooltipData.valueLabel}
          </div>
          <div>
            Timestamp: {new Date(tooltipData.profile.uploadedAt).toLocaleString()}
          </div>
        </div>
      )}
    </Card>
  );
};

export default BlueprintTimeline;