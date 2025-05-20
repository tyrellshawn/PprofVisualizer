import React, { useEffect, useState } from 'react';
import { Button, Card, Divider, Icon, NonIdealState, Spinner, Tab, Tabs } from '@blueprintjs/core';
import { Profile } from '../lib/pprof';
import EnhancedFunctionsTable from './visualizations/enhanced-functions-table';
import BlueprintFlamegraph from './visualizations/blueprint-flamegraph';
import MemoryAnalysis from './visualizations/memory-analysis';
import BlueprintTimeline from './visualizations/blueprint-timeline';

interface ProfileDashboardProps {
  profileId?: number;
  profiles: Profile[];
  isLoading?: boolean;
  error?: string | null;
}

const ProfileDashboard: React.FC<ProfileDashboardProps> = ({
  profileId,
  profiles,
  isLoading = false,
  error = null
}) => {
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [selectedTab, setSelectedTab] = useState('functions');
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(undefined);

  // Set the selected profile based on profileId
  useEffect(() => {
    if (profileId && profiles) {
      const profile = profiles.find(p => p.id === profileId);
      setSelectedProfile(profile || null);
    } else {
      setSelectedProfile(null);
    }
  }, [profileId, profiles]);

  // Handle profile node selection for cross-visualization highlighting
  const handleNodeSelect = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    // Optionally switch to functions tab to see the highlighted function
    setSelectedTab('functions');
  };

  if (isLoading) {
    return (
      <Card className="p-6 my-4">
        <div className="flex items-center justify-center h-64">
          <Spinner size={50} />
          <div className="ml-4 text-lg">Loading profile data...</div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 my-4">
        <NonIdealState
          icon="error"
          title="Error Loading Profile"
          description={error}
          action={
            <Button intent="primary" icon="refresh" onClick={() => window.location.reload()}>
              Retry
            </Button>
          }
        />
      </Card>
    );
  }

  if (!selectedProfile) {
    return (
      <Card className="p-6 my-4">
        <NonIdealState
          icon="document"
          title="No Profile Selected"
          description="Select a profile from the list to view detailed analysis."
        />
      </Card>
    );
  }

  return (
    <div className="profile-dashboard">
      {/* Profile Header */}
      <Card className="mb-4 p-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h2 className="text-xl font-bold mb-1 flex items-center">
              <Icon icon="document" className="mr-2" />
              {selectedProfile.filename}
              <span className={`ml-2 px-2 py-1 text-xs rounded profile-${selectedProfile.profileType}`}>
                {selectedProfile.profileType}
              </span>
            </h2>
            <p className="text-sm text-gray-500 mb-2">
              {selectedProfile.description || 'No description provided'} • {new Date(selectedProfile.uploadedAt).toLocaleString()}
            </p>
            <div className="flex items-center text-xs space-x-4">
              <div className="flex items-center">
                <Icon icon="time" size={12} className="mr-1" />
                {selectedProfile.metadata.totalTime ? `${selectedProfile.metadata.totalTime.toFixed(2)}s total time` : 'N/A'}
              </div>
              <div className="flex items-center">
                <Icon icon="chart" size={12} className="mr-1" />
                {selectedProfile.metadata.sampleCount ? `${selectedProfile.metadata.sampleCount} samples` : 'N/A'}
              </div>
              <div className="flex items-center">
                <Icon icon="database" size={12} className="mr-1" />
                {(selectedProfile.size / 1024).toFixed(1)} KB
              </div>
            </div>
          </div>
          
          <div className="flex items-center mt-4 md:mt-0">
            <Button
              small
              icon={selectedProfile.isSaved ? "star" : "star-empty"}
              intent={selectedProfile.isSaved ? "warning" : "none"}
              className="mr-2"
            >
              {selectedProfile.isSaved ? "Saved" : "Save"}
            </Button>
            <Button
              small
              icon="download"
              className="mr-2"
            >
              Download
            </Button>
            <Button
              small
              icon="export"
            >
              Share
            </Button>
          </div>
        </div>
      </Card>

      {/* Profile Visualizations */}
      <Card className="p-0 overflow-hidden">
        <Tabs 
          id="profileVisualizationTabs"
          selectedTabId={selectedTab}
          onChange={(newTabId) => setSelectedTab(newTabId as string)}
          className="profile-tabs"
          renderActiveTabPanelOnly={true}
        >
          <Tab 
            id="functions" 
            title={
              <div className="flex items-center">
                <Icon icon="function" className="mr-2" />
                Functions
              </div>
            }
            panel={
              <div className="p-4">
                <EnhancedFunctionsTable 
                  profile={selectedProfile} 
                  maxRows={25} 
                />
              </div>
            }
          />
          <Tab 
            id="flamegraph" 
            title={
              <div className="flex items-center">
                <Icon icon="heat-grid" className="mr-2" />
                Flamegraph
              </div>
            }
            panel={
              <div className="p-4">
                <BlueprintFlamegraph 
                  profile={selectedProfile}
                  height={450}
                  selectedNodeId={selectedNodeId}
                  onNodeSelect={handleNodeSelect}
                />
              </div>
            }
          />
          <Tab 
            id="memory" 
            title={
              <div className="flex items-center">
                <Icon icon="database" className="mr-2" />
                Memory
              </div>
            }
            panel={
              <div className="p-4">
                <MemoryAnalysis 
                  profile={selectedProfile} 
                  height={450}
                />
              </div>
            }
          />
          <Tab 
            id="timeline" 
            title={
              <div className="flex items-center">
                <Icon icon="timeline-line-chart" className="mr-2" />
                Timeline
              </div>
            }
            panel={
              <div className="p-4">
                <BlueprintTimeline 
                  profiles={profiles}
                  height={350}
                  selectedProfileId={selectedProfile.id}
                  onSelectProfile={(id) => {
                    const newSelectedProfile = profiles.find(p => p.id === id);
                    if (newSelectedProfile) {
                      setSelectedProfile(newSelectedProfile);
                    }
                  }}
                />
              </div>
            }
          />
        </Tabs>
      </Card>

      {/* Key Metrics Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <MetricCard 
          title="Top Function"
          value={selectedProfile.metadata.topFunctions?.[0]?.functionName || 'N/A'}
          subtitle={selectedProfile.metadata.topFunctions?.[0]?.flatPercent || ''}
          icon="function"
          color="blue"
        />
        <MetricCard 
          title="CPU Time"
          value={selectedProfile.metadata.totalTime ? `${selectedProfile.metadata.totalTime.toFixed(2)}s` : 'N/A'}
          subtitle="Total execution time"
          icon="time"
          color="green"
        />
        <MetricCard 
          title="Sample Count"
          value={selectedProfile.metadata.sampleCount?.toString() || 'N/A'}
          subtitle="Number of samples taken"
          icon="chart"
          color="orange"
        />
        <MetricCard 
          title="Avg Sample"
          value={selectedProfile.metadata.totalTime && selectedProfile.metadata.sampleCount ? 
            `${(selectedProfile.metadata.totalTime / selectedProfile.metadata.sampleCount * 1000).toFixed(2)}ms` : 
            'N/A'}
          subtitle="Average sample duration"
          icon="calculator"
          color="purple"
        />
      </div>
    </div>
  );
};

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: string;
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, icon, color = 'blue' }) => {
  // Color mapping
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    orange: 'bg-orange-50 text-orange-700',
    purple: 'bg-purple-50 text-purple-700',
    red: 'bg-red-50 text-red-700'
  };

  const iconColorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    purple: 'bg-purple-100 text-purple-600',
    red: 'bg-red-100 text-red-600'
  };

  return (
    <Card className="p-4" elevation={1}>
      <div className="flex items-start">
        {icon && (
          <div className={`rounded-full p-2 mr-3 ${iconColorClasses[color]}`}>
            <Icon icon={icon} />
          </div>
        )}
        <div>
          <div className="text-sm text-gray-500 font-medium">{title}</div>
          <div className="text-lg font-bold truncate" style={{ maxWidth: '200px' }}>{value}</div>
          {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
        </div>
      </div>
    </Card>
  );
};

export default ProfileDashboard;