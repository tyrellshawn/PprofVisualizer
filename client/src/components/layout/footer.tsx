import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { Profile, profileUtils } from "@/lib/pprof";

interface FooterProps {
  profile?: Profile;
}

export default function Footer({ profile }: FooterProps) {
  const [connected, setConnected] = useState(false);
  
  useEffect(() => {
    // Set connected to true if the profile came from a URL
    if (profile?.originalFilename.startsWith("remote_")) {
      setConnected(true);
    }
  }, [profile]);
  
  return (
    <footer className="bg-neutral-700 text-white px-4 py-1 text-xs flex justify-between items-center">
      <div className="flex items-center space-x-4">
        {profile ? (
          <>
            <span>Profile Size: {profileUtils.formatBytes(profile.size)}</span>
            {profile.metadata?.sampleCount && (
              <span>Samples: {profile.metadata.sampleCount}</span>
            )}
            {profile.metadata?.period && (
              <span>Sampling Rate: {Math.floor(1000000 / profile.metadata.period)}Hz</span>
            )}
          </>
        ) : (
          <span>PProfViz - Go Profile Visualization Tool</span>
        )}
      </div>
      <div className="flex items-center space-x-4">
        {profile && (
          <Button variant="link" size="sm" className="text-white/80 hover:text-white transition-colors p-0 h-auto">
            <Icon name="mdi-refresh" className="mr-1" />
            Reload
          </Button>
        )}
        {connected ? (
          <span className="text-white/80">
            <Icon name="mdi-circle" className="text-accent text-xs mr-1" />
            Connected to remote endpoint
          </span>
        ) : (
          <span className="text-white/80">
            <Icon name="mdi-information-outline" className="text-xs mr-1" />
            Local Profile
          </span>
        )}
      </div>
    </footer>
  );
}
