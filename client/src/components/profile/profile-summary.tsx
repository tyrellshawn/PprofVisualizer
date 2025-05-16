import { Card, CardContent } from "@/components/ui/card";
import Icon from "@/components/ui/icon";
import { Profile, profileUtils } from "@/lib/pprof";

interface ProfileSummaryProps {
  profile: Profile;
}

export default function ProfileSummary({ profile }: ProfileSummaryProps) {
  // Helper to format the comparison percentage
  const formatComparison = (value: number, inverse = false) => {
    const isDown = inverse ? value > 0 : value < 0;
    const absValue = Math.abs(value);
    
    return (
      <div className={`mt-2 text-sm flex items-center ${isDown ? "text-accent" : "text-error"}`}>
        <Icon name={isDown ? "mdi-arrow-down" : "mdi-arrow-up"} className="mr-1" />
        {absValue.toFixed(1)}% from baseline
      </div>
    );
  };
  
  // Prepare summary metrics
  const summaryMetrics = [];
  
  // CPU metrics
  if (profile.profileType === 'cpu') {
    summaryMetrics.push({
      title: "Total CPU Time",
      value: profile.metadata?.totalTime ? profileUtils.formatTime(profile.metadata.totalTime) : "N/A",
      subtitle: profile.metadata?.sampleCount 
        ? `Across ${profile.metadata.sampleCount} samples`
        : "CPU Profile",
      comparison: -8.3, // Mock data, would come from actual comparison
    });
    
    // Add memory allocation if available
    summaryMetrics.push({
      title: "Memory Allocation",
      value: "1.28 GB", // Mock data, would be extracted from metadata
      subtitle: "Peak usage",
      comparison: 12.5, // Mock data
    });
    
    // Add function calls if available
    summaryMetrics.push({
      title: "Function Calls",
      value: profile.metadata?.topFunctions?.length 
        ? `${profile.metadata.topFunctions.length} analyzed`
        : "N/A",
      subtitle: "Across all threads",
      comparison: -3.1, // Mock data
    });
    
    // Add lock contention if available
    summaryMetrics.push({
      title: "Lock Contention",
      value: "1.23s", // Mock data
      subtitle: "Total blocking time",
      comparison: 21.7, // Mock data
    });
  }
  // Heap metrics
  else if (profile.profileType === 'heap') {
    summaryMetrics.push({
      title: "Total Allocations",
      value: "1.28 GB", // Mock data
      subtitle: "Heap Profile",
      comparison: 12.5, // Mock data
    });
    
    // Add object count if available
    summaryMetrics.push({
      title: "Object Count",
      value: "124,512", // Mock data
      subtitle: "Allocated objects",
      comparison: 8.7, // Mock data
    });
    
    // Add allocation sites if available
    summaryMetrics.push({
      title: "Allocation Sites",
      value: profile.metadata?.topFunctions?.length 
        ? `${profile.metadata.topFunctions.length} analyzed`
        : "N/A",
      subtitle: "Unique locations",
      comparison: 5.2, // Mock data
    });
    
    // Add GC cycles if available
    summaryMetrics.push({
      title: "GC Cycles",
      value: "17", // Mock data
      subtitle: "During profile",
      comparison: -2.9, // Mock data, inverse meaning less is better
      inverse: true,
    });
  }
  // Block profile
  else if (profile.profileType === 'block') {
    summaryMetrics.push({
      title: "Total Block Time",
      value: "4.57s", // Mock data
      subtitle: "Block Profile",
      comparison: 15.2, // Mock data
    });
    
    // Add contended goroutines
    summaryMetrics.push({
      title: "Contended Goroutines",
      value: "47", // Mock data
      subtitle: "Blocked at least once",
      comparison: 11.9, // Mock data
    });
    
    // Add channel operations
    summaryMetrics.push({
      title: "Channel Operations",
      value: "1,254", // Mock data
      subtitle: "Send/recv operations",
      comparison: 3.6, // Mock data
    });
    
    // Add mutex contentions
    summaryMetrics.push({
      title: "Mutex Contentions",
      value: "342", // Mock data
      subtitle: "Lock/unlock pairs",
      comparison: 18.3, // Mock data
    });
  }
  // Default metrics for other profile types
  else {
    summaryMetrics.push({
      title: "Profile Size",
      value: profileUtils.formatBytes(profile.size),
      subtitle: profile.metadata?.sampleCount 
        ? `${profile.metadata.sampleCount} samples`
        : profileUtils.getProfileTypeName(profile.profileType),
      comparison: 0, // No comparison for generic metrics
    });
    
    // Add analyzed functions
    summaryMetrics.push({
      title: "Analyzed Functions",
      value: profile.metadata?.topFunctions?.length.toString() || "N/A",
      subtitle: "From profile data",
      comparison: 0, // No comparison
    });
    
    // Add generic metrics
    summaryMetrics.push({
      title: "Profile Duration",
      value: profile.metadata?.duration 
        ? profileUtils.formatTime(profile.metadata.duration)
        : "N/A",
      subtitle: "Collection time",
      comparison: 0, // No comparison
    });
    
    // Add custom metric based on profile type
    const metricTitle = profile.profileType === 'goroutine' 
      ? "Goroutines"
      : profile.profileType === 'threadcreate'
        ? "Threads Created"
        : "Profile Samples";
    
    summaryMetrics.push({
      title: metricTitle,
      value: profile.metadata?.sampleCount?.toString() || "N/A",
      subtitle: "At collection time",
      comparison: 0, // No comparison
    });
  }
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
      {summaryMetrics.map((metric, index) => (
        <Card key={index} className="bg-white shadow-sm">
          <CardContent className="p-4 flex flex-col">
            <div className="text-xs text-neutral-500 uppercase font-medium mb-1">{metric.title}</div>
            <div className="text-2xl font-semibold text-neutral-800">{metric.value}</div>
            <div className="text-sm text-neutral-600 mt-1">{metric.subtitle}</div>
            {metric.comparison !== 0 && formatComparison(metric.comparison, metric.inverse)}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
