import { useState, ChangeEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import Icon from "@/components/ui/icon";
import { queryClient } from "@/lib/queryClient";
import { profileApi, ProfileType } from "@/lib/pprof";

interface ImportProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ImportProfileModal({ open, onOpenChange }: ImportProfileModalProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [file, setFile] = useState<File | null>(null);
  const [profileType, setProfileType] = useState<ProfileType>("cpu");
  const [description, setDescription] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  
  // Upload profile mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file selected");
      return await profileApi.uploadProfile(file, description, profileType, isSaved);
    },
    onSuccess: (profile) => {
      // Show success toast
      toast({
        title: "Profile uploaded successfully",
        description: `${profile.originalFilename} has been imported`,
        variant: "default",
      });
      
      // Reset form
      setFile(null);
      setDescription("");
      setProfileType("cpu");
      setIsSaved(false);
      
      // Close modal
      onOpenChange(false);
      
      // Invalidate queries to refresh profile lists
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/recent"] });
      if (isSaved) {
        queryClient.invalidateQueries({ queryKey: ["/api/profiles/saved"] });
      }
      
      // Navigate to the new profile
      navigate(`/profile/${profile.id}`);
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload profile",
        variant: "destructive",
      });
    },
  });
  
  // Handle file selection
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    uploadMutation.mutate();
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Profile</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">Profile File</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="file"
                type="file"
                accept=".pprof,.pb.gz,.prof"
                onChange={handleFileChange}
                className="flex-1"
              />
            </div>
            <p className="text-xs text-neutral-500">
              Supported file types: .pprof, .pb.gz, .prof
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="profileType">Profile Type</Label>
            <Select
              value={profileType}
              onValueChange={(value) => setProfileType(value as ProfileType)}
            >
              <SelectTrigger id="profileType" className="w-full">
                <SelectValue placeholder="Select profile type" />
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
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Add notes about this profile"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isSaved"
              checked={isSaved}
              onCheckedChange={(checked) => setIsSaved(!!checked)}
            />
            <Label htmlFor="isSaved" className="cursor-pointer">
              Save this profile
            </Label>
          </div>
          
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!file || uploadMutation.isPending}
              className="bg-primary text-white hover:bg-primary/90"
            >
              {uploadMutation.isPending ? (
                <>
                  <Icon name="mdi-loading" className="mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>Import</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
