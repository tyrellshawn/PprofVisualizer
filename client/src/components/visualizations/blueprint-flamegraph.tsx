import React, { useEffect, useRef, useState } from 'react';
import { Button, Card, Icon, Intent, Spinner, Tag, Tooltip } from '@blueprintjs/core';
import * as d3 from 'd3';
import { Profile } from '../../lib/pprof';
import { d3Utils, FlameRect } from '../../lib/d3-utils';

interface BlueprintFlamegraphProps {
  profile: Profile;
  height?: number;
  selectedNodeId?: string;
  onNodeSelect?: (nodeId: string) => void;
}

const BlueprintFlamegraph: React.FC<BlueprintFlamegraphProps> = ({ 
  profile, 
  height = 400,
  selectedNodeId,
  onNodeSelect
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flameData, setFlameData] = useState<FlameRect[]>([]);
  const [zoomState, setZoomState] = useState({ scale: 1, translate: [0, 0] });
  const [tooltipData, setTooltipData] = useState<{ x: number; y: number; data: FlameRect } | null>(null);

  // Generate flamegraph data from profile
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Simulate data generation from profile
      // In a real implementation, this would parse the actual profile data
      const mockData: FlameRect = {
        id: 'root',
        name: 'all',
        x: 0,
        y: 0,
        width: 1000,
        height: 20,
        value: 100,
        depth: 0,
        color: '#2965CC',
        children: [
          {
            id: 'func1',
            name: 'main.processRequest',
            x: 0,
            y: 20,
            width: 500,
            height: 20,
            value: 50,
            depth: 1,
            color: '#3975DC',
            children: [
              {
                id: 'func3',
                name: 'main.processRequest.parseJSON',
                x: 0,
                y: 40,
                width: 300,
                height: 20,
                value: 30,
                depth: 2,
                color: '#4985EC',
              },
              {
                id: 'func4',
                name: 'main.processRequest.validate',
                x: 300,
                y: 40,
                width: 200,
                height: 20,
                value: 20,
                depth: 2,
                color: '#5995FC',
              }
            ]
          },
          {
            id: 'func2',
            name: 'encoding/json.Marshal',
            x: 500,
            y: 20,
            width: 300,
            height: 20,
            value: 30,
            depth: 1,
            color: '#3975DC',
          },
          {
            id: 'func5',
            name: 'net/http.(*conn).serve',
            x: 800,
            y: 20,
            width: 200,
            height: 20,
            value: 20,
            depth: 1,
            color: '#3975DC',
          }
        ]
      };
      
      // For actual implementation, use a function like:
      // const flameData = generateFlameGraphFromMetadata(profile.metadata);
      setFlameData([mockData]);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to generate flamegraph data:', err);
      setError('Failed to generate flamegraph visualization');
      setIsLoading(false);
    }
  }, [profile.id]);

  // Create and update the flamegraph visualization
  useEffect(() => {
    if (isLoading || !containerRef.current || flameData.length === 0) return;

    // Clear previous visualization
    d3.select(containerRef.current).selectAll('*').remove();

    const container = containerRef.current;
    const width = container.clientWidth;
    
    // Create SVG container
    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('class', 'flame-graph');
    
    // Create a group for all flame nodes
    const flameGroup = svg.append('g')
      .attr('transform', `translate(${zoomState.translate[0]}, 0) scale(${zoomState.scale})`);
    
    // Helper for node selection
    const selectNode = (nodeId: string) => {
      // Highlight the selected node
      svg.selectAll('rect').classed('selected', false);
      svg.select(`rect[data-id="${nodeId}"]`).classed('selected', true);
      
      // Call the onNodeSelect callback if provided
      if (onNodeSelect) {
        onNodeSelect(nodeId);
      }
    };
    
    // Draw each flame node recursively
    const drawFlameNode = (node: FlameRect, parent: d3.Selection<SVGGElement, unknown, null, undefined>) => {
      // Scale node dimensions to fit container width
      const scaledX = (node.x / 1000) * width;
      const scaledWidth = (node.width / 1000) * width;
      
      // Draw the current node
      const rect = parent.append('rect')
        .attr('data-id', node.id)
        .attr('x', scaledX)
        .attr('y', node.y)
        .attr('width', scaledWidth)
        .attr('height', node.height)
        .attr('fill', node.color)
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .classed('flame-node', true)
        .classed('selected', node.id === selectedNodeId);
      
      // Add text label if node is wide enough
      if (scaledWidth > 30) {
        parent.append('text')
          .attr('x', scaledX + 3)
          .attr('y', node.y + 14)
          .attr('fill', '#fff')
          .attr('font-size', '10px')
          .text(node.name.length > scaledWidth/6 ? 
                node.name.substring(0, Math.floor(scaledWidth/6)) + '...' : 
                node.name);
      }
      
      // Add tooltip behavior
      rect.on('mouseover', (event) => {
        const { clientX, clientY } = event;
        setTooltipData({
          x: clientX,
          y: clientY,
          data: node
        });
      })
      .on('mousemove', (event) => {
        const { clientX, clientY } = event;
        if (tooltipData) {
          setTooltipData({
            ...tooltipData,
            x: clientX,
            y: clientY
          });
        }
      })
      .on('mouseout', () => {
        setTooltipData(null);
      })
      .on('click', () => {
        selectNode(node.id);
      });
      
      // Draw children recursively
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
          drawFlameNode(child, parent);
        });
      }
    };
    
    // Draw all top-level flame nodes
    flameData.forEach(node => {
      drawFlameNode(node, flameGroup);
    });
    
    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 10])
      .on('zoom', (event) => {
        flameGroup.attr('transform', event.transform);
        setZoomState({
          scale: event.transform.k,
          translate: [event.transform.x, event.transform.y]
        });
      });
    
    // Apply zoom behavior to SVG
    svg.call(zoom);
    
    // Select node if selectedNodeId is provided
    if (selectedNodeId) {
      selectNode(selectedNodeId);
    }
    
    // Clean up
    return () => {
      svg.on('.zoom', null);
    };
  }, [flameData, isLoading, height, zoomState, selectedNodeId, onNodeSelect]);

  // Reset zoom to original state
  const handleReset = () => {
    setZoomState({ scale: 1, translate: [0, 0] });
    d3.select(containerRef.current)
      .select('svg')
      .transition()
      .duration(750)
      .call(
        d3.zoom<SVGSVGElement, unknown>().transform as any, 
        d3.zoomIdentity
      );
  };

  if (isLoading) {
    return (
      <Card className="visualization-container" elevation={1}>
        <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
          <Spinner size={50} />
          <div className="ml-4">Generating flamegraph...</div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="visualization-container" elevation={1}>
        <div className="text-center py-8">
          <Icon icon="error" size={40} intent="danger" />
          <div className="mt-4 text-red-500">{error}</div>
          <Button className="mt-4" intent="primary" icon="refresh" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="visualization-container" elevation={1}>
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className="text-lg font-semibold">
            Flamegraph
            <Tag intent="primary" className="ml-2">{profile.profileType}</Tag>
          </h3>
          <div className="text-xs text-gray-500">
            Hover over blocks to see function details. Click to select.
          </div>
        </div>
        <div>
          <ButtonGroup>
            <Button small icon="zoom-in" onClick={() => {
              setZoomState(prev => ({ ...prev, scale: prev.scale * 1.2 }));
            }} />
            <Button small icon="zoom-out" onClick={() => {
              setZoomState(prev => ({ ...prev, scale: Math.max(0.5, prev.scale / 1.2) }));
            }} />
            <Button small icon="refresh" onClick={handleReset} />
          </ButtonGroup>
        </div>
      </div>
      
      <div 
        ref={containerRef} 
        className="flame-graph-container" 
        style={{ height: `${height}px`, position: 'relative' }}
      />
      
      {tooltipData && (
        <div
          className="flamegraph-tooltip absolute bg-gray-800 text-white p-2 rounded shadow-lg z-10 text-xs"
          style={{
            left: `${tooltipData.x + 10}px`,
            top: `${tooltipData.y + 10}px`,
            maxWidth: '300px'
          }}
        >
          <div className="font-bold">{tooltipData.data.name}</div>
          <div className="mt-1">
            Value: {tooltipData.data.value}% of total
          </div>
        </div>
      )}
    </Card>
  );
};

// Helper component for button grouping
const ButtonGroup: React.FC<{children: React.ReactNode}> = ({ children }) => (
  <div className="bp5-button-group">
    {children}
  </div>
);

export default BlueprintFlamegraph;