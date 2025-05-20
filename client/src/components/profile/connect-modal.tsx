import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { profileApi, connectionApi, ProfileType } from "@/lib/pprof";
import Icon from "@/components/ui/icon";

interface ConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ConnectModal({ open, onOpenChange }: ConnectModalProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [url, setUrl] = useState("http://localhost:6060/debug/pprof/");
  const [profileType, setProfileType] = useState<ProfileType>("cpu");
  const [name, setName] = useState("");
  const [saveConnection, setSaveConnection] = useState(false);
  
  // Query for connections
  const { data: connections } = useQuery({
    queryKey: ["/api/connections"],
    enabled: open,
  });
  
  // Fetch profile mutation
  const fetchMutation = useMutation({
    mutationFn: async () => {
      // Create and save the connection if requested
      if (saveConnection && name) {
        try {
          await connectionApi.createConnection({
            name,
            url
          });
          
          // Invalidate connections query
          queryClient.invalidateQueries({ queryKey: ["/api/connections"] });
        } catch (error) {
          console.error("Error saving connection:", error);
          // Continue with profile fetch even if connection save fails
        }
      }
      
      // Construct the URL with the profile type if not already included
      let fetchUrl = url;
      if (!url.endsWith('/')) {
        fetchUrl += '/';
      }
      
      if (!fetchUrl.endsWith(profileType)) {
        fetchUrl += profileType;
      }
      
      // Fetch the profile
      return await profileApi.fetchFromUrl(fetchUrl, profileType);
    },
    onSuccess: (profile) => {
      toast({
        title: "Profile fetched successfully",
        description: `Connected to ${url} and fetched ${profileType} profile`,
        variant: "default",
      });
      
      // Close modal
      onOpenChange(false);
      
      // Reset form
      setUrl("http://localhost:6060/debug/pprof/");
      setProfileType("cpu");
      setName("");
      setSaveConnection(false);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/recent"] });
      
      // Navigate to the new profile
      navigate(`/profile/${profile.id}`);
    },
    onError: (error) => {
      toast({
        title: "Failed to fetch profile",
        description: error instanceof Error ? error.message : "Could not connect to pprof HTTP endpoint",
        variant: "destructive",
      });
    },
  });
  
  // Use selected connection
  const handleConnectionSelect = (connectionId: string) => {
    const connectionId_number = parseInt(connectionId);
    const connection = connections?.find(c => c.id === connectionId_number);
    
    if (connection) {
      setUrl(connection.url);
      setName(connection.name);
      setSaveConnection(false); // No need to save an existing connection
    }
  };
  
  // Handle connect button click
  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMutation.mutate();
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect to pprof</DialogTitle>
          <DialogDescription>
            Connect to a running Go application with pprof HTTP endpoints enabled
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleConnect} className="space-y-4">
          {/* Connection selector */}
          {connections?.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="connectionSelect">Saved Connections</Label>
              <Select onValueChange={handleConnectionSelect}>
                <SelectTrigger id="connectionSelect">
                  <SelectValue placeholder="Select a saved connection" />
                </SelectTrigger>
                <SelectContent>
                  {connections.map((connection) => (
                    <SelectItem key={connection.id} value={connection.id.toString()}>
                      {connection.name} ({connection.url})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* URL input */}
          <div className="space-y-2">
            <Label htmlFor="url">pprof URL</Label>
            <Input
              id="url"
              type="text"
              placeholder="http://localhost:6060/debug/pprof/"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
            <p className="text-xs text-neutral-500">
              The base URL for pprof HTTP endpoints (e.g., http://localhost:6060/debug/pprof/)
            </p>
          </div>
          
          {/* Profile type selector */}
          <div className="space-y-2">
            <Label htmlFor="profileType">Profile Type</Label>
            <Select
              value={profileType}
              onValueChange={(value) => setProfileType(value as ProfileType)}
            >
              <SelectTrigger id="profileType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cpu">CPU Profile</SelectItem>
                <SelectItem value="heap">Heap Profile</SelectItem>
                <SelectItem value="block">Block Profile</SelectItem>
                <SelectItem value="mutex">Mutex Profile</SelectItem>
                <SelectItem value="goroutine">Goroutine Profile</SelectItem>
                <SelectItem value="threadcreate">Thread Creation Profile</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Save connection option */}
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="saveConnection"
                className="mr-2 h-4 w-4 rounded border-neutral-300"
                checked={saveConnection}
                onChange={(e) => setSaveConnection(e.target.checked)}
              />
              <Label htmlFor="saveConnection">Save this connection</Label>
            </div>
            
            {saveConnection && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="connectionName">Connection Name</Label>
                <Input
                  id="connectionName"
                  type="text"
                  placeholder="My Application"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={saveConnection}
                />
              </div>
            )}
          </div>
          
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={fetchMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={fetchMutation.isPending || !url}
              className="bg-primary text-white hover:bg-primary/90"
            >
              {fetchMutation.isPending ? (
                <>
                  <Icon name="mdi-loading" spin className="mr-2" />
                  Connecting...
                </>
              ) : (
                <>
                  <Icon name="mdi-connection" className="mr-2" />
                  Connect
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
