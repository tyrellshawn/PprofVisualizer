import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import Footer from "@/components/layout/footer";
import ProfileToolbar from "@/components/profile/profile-toolbar";
import ProfileTabs from "@/components/profile/profile-tabs";
import ProfileSummary from "@/components/profile/profile-summary";
import Flamegraph from "@/components/visualizations/flamegraph";
import TopFunctions from "@/components/visualizations/top-functions";
import TimelineChart from "@/components/visualizations/timeline-chart";
import DistributionChart from "@/components/visualizations/distribution-chart";
import Icon from "@/components/ui/icon";
import { queryClient } from "@/lib/queryClient";
import { profileApi, profileUtils } from "@/lib/pprof";
import { generateFlameGraphFromMetadata } from "@/lib/d3-utils";

export default function ProfileView() {
  const { id } = useParams<{ id: string }>();
  const profileId = parseInt(id);
  
  const [activeView, setActiveView] = useState("overview");
  
  // Query for the profile data
  const { data: profile, isLoading, error } = useQuery({
    queryKey: [`/api/profiles/${profileId}`],
  });
  
  // Query for recent profiles
  const { data: recentProfiles } = useQuery({
    queryKey: ["/api/profiles/recent"],
    refetchInterval: 10000, // Refetch every 10 seconds
  });
  
  // Query for saved profiles
  const { data: savedProfiles } = useQuery({
    queryKey: ["/api/profiles/saved"]
  });
  
  // Handle save profile
  const handleSaveProfile = async () => {
    if (!profile) return;
    
    try {
      await profileApi.updateProfile(profileId, { isSaved: !profile.isSaved });
      
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${profileId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/saved"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/recent"] });
    } catch (error) {
      console.error("Error saving profile:", error);
    }
  };
  
  // Generate flame graph data from profile metadata
  const flameGraphData = profile?.metadata?.topFunctions 
    ? generateFlameGraphFromMetadata(profile.metadata)
    : [];
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <Icon name="mdi-loading" spin className="text-4xl text-primary mb-4" />
            <p className="text-neutral-600">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center max-w-md">
            <Icon name="mdi-alert-circle" className="text-4xl text-error mb-4" />
            <h1 className="text-xl font-bold text-neutral-800 mb-2">
              Error Loading Profile
            </h1>
            <p className="text-neutral-600">
              {error instanceof Error ? error.message : "Profile not found or could not be loaded"}
            </p>
            <Button 
              onClick={() => window.history.back()}
              className="mt-4"
            >
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          recentProfiles={recentProfiles || []} 
          savedProfiles={savedProfiles || []} 
          activeProfileId={profileId}
        />
        
        <main className="flex-1 flex flex-col overflow-hidden">
          <ProfileToolbar 
            profile={profile}
            onSave={handleSaveProfile}
          />
          
          <ProfileTabs activeView={activeView} onChange={setActiveView} />
          
          <div className="overflow-y-auto p-4 flex-1 bg-neutral-100">
            {/* Use conditional rendering instead of TabsContent */}
            {activeView === "overview" && (
              <div>
                <ProfileSummary profile={profile} />
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white rounded-lg shadow-sm p-4 col-span-2">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="font-medium text-neutral-800">
                        {profile.profileType === 'cpu' ? 'CPU Time Distribution' : 'Memory Allocation Distribution'}
                      </h2>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          Last 30 min
                        </Button>
                      </div>
                    </div>
                    <div className="h-64 relative">
                      <DistributionChart profile={profile} />
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-sm p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="font-medium text-neutral-800">
                        Top {profile.profileType === 'cpu' ? 'CPU' : 'Memory'} Consumers
                      </h2>
                    </div>
                    <div>
                      <TopFunctions profile={profile} limit={5} />
                      <div className="mt-4">
                        <Button 
                          variant="link" 
                          className="w-full text-primary"
                          onClick={() => setActiveView("functions")}
                        >
                          View all functions
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="font-medium text-neutral-800">
                      {profileUtils.getProfileTypeName(profile.profileType)} Flamegraph
                    </h2>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Icon name="mdi-magnify-plus-outline" className="mr-1" />
                        Zoom
                      </Button>
                      <Button variant="outline" size="sm">
                        <Icon name="mdi-filter-outline" className="mr-1" />
                        Filter
                      </Button>
                    </div>
                  </div>
                  <div className="h-64 relative overflow-hidden">
                    <Flamegraph data={flameGraphData} />
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="flex justify-between items-center p-4 border-b border-neutral-200">
                    <h2 className="font-medium text-neutral-800">Function Call Details</h2>
                    <div className="flex items-center">
                      <div className="relative mr-2">
                        <input 
                          type="text" 
                          placeholder="Search functions..." 
                          className="w-64 pl-8 pr-2 py-1.5 text-sm border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary" 
                        />
                        <Icon name="mdi-magnify" className="absolute left-2.5 top-2 text-neutral-400" />
                      </div>
                      <Button variant="outline" size="sm">
                        <Icon name="mdi-filter-outline" className="mr-1" />
                        Filter
                      </Button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <TopFunctions profile={profile} detailed />
                  </div>
                </div>
              </div>
            )}
            
            {activeView === "flamegraph" && (
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-medium text-neutral-800">
                    {profileUtils.getProfileTypeName(profile.profileType)} Flamegraph
                  </h2>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Icon name="mdi-magnify-plus-outline" className="mr-1" />
                      Zoom
                    </Button>
                    <Button variant="outline" size="sm">
                      <Icon name="mdi-filter-outline" className="mr-1" />
                      Filter
                    </Button>
                    <Button variant="outline" size="sm">
                      <Icon name="mdi-refresh" className="mr-1" />
                      Reset View
                    </Button>
                  </div>
                </div>
                <div className="h-[calc(100vh-300px)] relative overflow-hidden">
                  <Flamegraph data={flameGraphData} />
                </div>
                <div className="mt-2 text-sm text-neutral-500 flex items-center">
                  <Icon name="mdi-information-outline" className="mr-1" />
                  <span>Click on a function block to zoom in and see more details</span>
                </div>
              </div>
            )}
            
            {activeView === "functions" && (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-neutral-200">
                  <h2 className="font-medium text-neutral-800">Top Functions</h2>
                  <div className="flex items-center">
                    <div className="relative mr-2">
                      <input 
                        type="text" 
                        placeholder="Search functions..." 
                        className="w-64 pl-8 pr-2 py-1.5 text-sm border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary" 
                      />
                      <Icon name="mdi-magnify" className="absolute left-2.5 top-2 text-neutral-400" />
                    </div>
                    <Button variant="outline" size="sm">
                      <Icon name="mdi-filter-outline" className="mr-1" />
                      Filter
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <TopFunctions profile={profile} detailed />
                </div>
              </div>
            )}
            
            {activeView === "callgraph" && (
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-medium text-neutral-800">Call Graph</h2>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Icon name="mdi-magnify-plus-outline" className="mr-1" />
                      Zoom
                    </Button>
                    <Button variant="outline" size="sm">
                      <Icon name="mdi-filter-outline" className="mr-1" />
                      Filter
                    </Button>
                  </div>
                </div>
                <div className="h-[calc(100vh-300px)] flex items-center justify-center border border-dashed border-neutral-300 rounded">
                  <div className="text-center">
                    <Icon name="mdi-graph" className="text-4xl text-neutral-400 mb-2" />
                    <p className="text-neutral-600">Call graph visualization is coming soon.</p>
                    <p className="text-sm text-neutral-500 mt-1">
                      This feature is currently in development.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {activeView === "timeline" && (
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-medium text-neutral-800">Timeline</h2>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      Last 30 min
                    </Button>
                  </div>
                </div>
                <div className="h-[calc(100vh-300px)] relative">
                  <TimelineChart profile={profile} />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
      
      <Footer profile={profile} />
    </div>
  );
}
