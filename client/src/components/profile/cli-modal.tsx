import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Icon from "@/components/ui/icon";
import { queryClient } from "@/lib/queryClient";
import { profileApi, ProfileType } from "@/lib/pprof";

interface CliModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CliModal({ open, onOpenChange }: CliModalProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [command, setCommand] = useState("go");
  const [args, setArgs] = useState("tool pprof -seconds 10 http://localhost:6060/debug/pprof/cpu");
  const [profileType, setProfileType] = useState<ProfileType>("cpu");
  
  // Run CLI command mutation
  const cliMutation = useMutation({
    mutationFn: async () => {
      // Split args into an array if not already
      const argsArray = typeof args === 'string' ? args.split(/\s+/) : args;
      
      return await profileApi.fetchFromCli(command, argsArray, profileType);
    },
    onSuccess: (profile) => {
      toast({
        title: "CLI command executed successfully",
        description: "Profile data has been collected and processed",
        variant: "default",
      });
      
      // Close modal
      onOpenChange(false);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/recent"] });
      
      // Navigate to the new profile
      navigate(`/profile/${profile.id}`);
    },
    onError: (error) => {
      toast({
        title: "Command execution failed",
        description: error instanceof Error ? error.message : "Failed to execute pprof command",
        variant: "destructive",
      });
    },
  });
  
  // Handle presets
  const applyPreset = (preset: string) => {
    switch (preset) {
      case "local-cpu":
        setCommand("go");
        setArgs("tool pprof -seconds 10 http://localhost:6060/debug/pprof/cpu");
        setProfileType("cpu");
        break;
      case "local-heap":
        setCommand("go");
        setArgs("tool pprof -seconds 10 http://localhost:6060/debug/pprof/heap");
        setProfileType("heap");
        break;
      case "remote-cpu":
        setCommand("go");
        setArgs("tool pprof -seconds 10 http://remote-server:6060/debug/pprof/cpu");
        setProfileType("cpu");
        break;
      case "binary-cpu":
        setCommand("go");
        setArgs("tool pprof ./my_application cpu.pprof");
        setProfileType("cpu");
        break;
    }
  };
  
  // Handle form submission
  const handleRun = (e: React.FormEvent) => {
    e.preventDefault();
    cliMutation.mutate();
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>pprof CLI Tool</DialogTitle>
          <DialogDescription>
            Execute Go pprof command-line tools and import the results
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleRun} className="space-y-4">
          {/* Command presets */}
          <div className="space-y-2">
            <Label>Quick Presets</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset("local-cpu")}
                className="text-xs"
              >
                Local CPU Profile
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset("local-heap")}
                className="text-xs"
              >
                Local Heap Profile
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset("remote-cpu")}
                className="text-xs"
              >
                Remote CPU Profile
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset("binary-cpu")}
                className="text-xs"
              >
                Binary + Profile File
              </Button>
            </div>
          </div>
          
          {/* Command input */}
          <div className="space-y-2">
            <Label htmlFor="command">Command</Label>
            <Input
              id="command"
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              required
              placeholder="go"
            />
            <p className="text-xs text-neutral-500">
              Base command (e.g., go, pprof, go-torch)
            </p>
          </div>
          
          {/* Arguments input */}
          <div className="space-y-2">
            <Label htmlFor="args">Arguments</Label>
            <Textarea
              id="args"
              value={args}
              onChange={(e) => setArgs(e.target.value)}
              required
              className="font-mono text-sm"
              placeholder="tool pprof -seconds 10 http://localhost:6060/debug/pprof/cpu"
              rows={3}
            />
            <p className="text-xs text-neutral-500">
              Command arguments (separated by spaces)
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
            <p className="text-xs text-neutral-500">
              Specify the type of profile being collected
            </p>
          </div>
          
          <div className="pt-2 pb-2 text-sm">
            <div className="p-3 bg-neutral-50 rounded border border-neutral-200">
              <h4 className="font-semibold mb-1 flex items-center">
                <Icon name="mdi-information-outline" className="mr-1" />
                Security Note
              </h4>
              <p className="text-xs text-neutral-600">
                Only allowed commands will be executed: go, pprof, go-torch. All commands run in a controlled environment.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={cliMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={cliMutation.isPending || !command || !args}
              className="bg-primary text-white hover:bg-primary/90"
            >
              {cliMutation.isPending ? (
                <>
                  <Icon name="mdi-loading" spin className="mr-2" />
                  Running...
                </>
              ) : (
                <>
                  <Icon name="mdi-console" className="mr-2" />
                  Run Command
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
