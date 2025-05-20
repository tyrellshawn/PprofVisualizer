import { useState } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import ImportProfileModal from "@/components/profile/import-profile-modal";
import ConnectModal from "@/components/profile/connect-modal";
import CliModal from "@/components/profile/cli-modal";
import Icon from "@/components/ui/icon";
import { Profile, profileUtils } from "@/lib/pprof";

interface SidebarProps {
  recentProfiles: Profile[];
  savedProfiles: Profile[];
  activeProfileId?: number;
}

export default function Sidebar({ recentProfiles, savedProfiles, activeProfileId }: SidebarProps) {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [cliOpen, setCliOpen] = useState(false);
  
  // Filter profiles by search query
  const filteredRecent = recentProfiles.filter(
    (profile) => 
      profile.originalFilename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (profile.description && profile.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  const filteredSaved = savedProfiles.filter(
    (profile) => 
      profile.originalFilename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (profile.description && profile.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  // Handle profile click
  const handleProfileClick = (id: number) => {
    navigate(`/profile/${id}`);
  };
  
  return (
    <aside className="bg-white w-64 border-r border-neutral-200 flex flex-col h-full flex-shrink-0">
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-medium text-sm text-neutral-500">PROFILES</h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setImportOpen(true)}
            className="text-primary hover:bg-primary hover:bg-opacity-10 p-1 rounded"
          >
            <Icon name="mdi-plus" className="text-lg" />
          </Button>
        </div>
        <div className="relative">
          <Input
            type="text"
            placeholder="Search profiles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-2 py-1.5 text-sm border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          />
          <Icon name="mdi-magnify" className="absolute left-2.5 top-2 text-neutral-400" />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchQuery("")}
              className="absolute right-1 top-1 h-6 w-6"
            >
              <Icon name="mdi-close" className="text-neutral-400 text-sm" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        {filteredRecent.length > 0 && (
          <>
            <div className="px-4 py-1.5 text-xs font-medium text-neutral-500">RECENT PROFILES</div>
            
            {filteredRecent.map((profile) => (
              <div
                key={profile.id}
                onClick={() => handleProfileClick(profile.id)}
                className={`px-3 py-2 hover:bg-neutral-100 cursor-pointer border-l-2 ${
                  profile.id === activeProfileId ? "border-primary" : "border-transparent"
                }`}
              >
                <div className={`text-sm font-medium ${
                  profile.id === activeProfileId ? "text-primary" : "text-neutral-700"
                } mb-0.5`}>
                  {profile.originalFilename}
                </div>
                <div className="text-xs text-neutral-500 flex justify-between">
                  <span>{profileUtils.getProfileTypeName(profile.profileType)}</span>
                  <span>{profileUtils.getRelativeTime(profile.uploadedAt)}</span>
                </div>
              </div>
            ))}
          </>
        )}
        
        {filteredSaved.length > 0 && (
          <>
            <div className="px-4 py-1.5 text-xs font-medium text-neutral-500 mt-4">SAVED PROFILES</div>
            
            {filteredSaved.map((profile) => (
              <div
                key={profile.id}
                onClick={() => handleProfileClick(profile.id)}
                className={`px-3 py-2 hover:bg-neutral-100 cursor-pointer border-l-2 ${
                  profile.id === activeProfileId ? "border-primary" : "border-transparent"
                }`}
              >
                <div className={`text-sm font-medium ${
                  profile.id === activeProfileId ? "text-primary" : "text-neutral-700"
                } mb-0.5`}>
                  {profile.originalFilename}
                </div>
                <div className="text-xs text-neutral-500 flex justify-between">
                  <span>{profileUtils.getProfileTypeName(profile.profileType)}</span>
                  <span>{profile.description || "Saved"}</span>
                </div>
              </div>
            ))}
          </>
        )}
        
        {filteredRecent.length === 0 && filteredSaved.length === 0 && (
          <div className="p-4 text-center text-neutral-500 text-sm">
            {searchQuery ? (
              <>
                <Icon name="mdi-file-search-outline" className="text-2xl mb-2" />
                <p>No profiles match your search</p>
              </>
            ) : (
              <>
                <Icon name="mdi-folder-outline" className="text-2xl mb-2" />
                <p>No profiles available</p>
              </>
            )}
          </div>
        )}
      </ScrollArea>

      <div className="p-3 border-t border-neutral-200">
        <Button 
          onClick={() => setImportOpen(true)} 
          className="flex items-center justify-between w-full px-3 py-2 text-sm bg-primary text-white rounded hover:bg-primary/90 transition-colors"
        >
          <span className="flex items-center">
            <Icon name="mdi-plus" className="mr-2" />
            Import Profile
          </span>
        </Button>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConnectOpen(true)}
            className="px-2 py-1.5 text-xs text-neutral-700 border border-neutral-300 rounded bg-white hover:bg-neutral-100 transition-colors"
          >
            <span className="flex items-center justify-center">
              <Icon name="mdi-connection" className="mr-1" />
              Connect
            </span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCliOpen(true)}
            className="px-2 py-1.5 text-xs text-neutral-700 border border-neutral-300 rounded bg-white hover:bg-neutral-100 transition-colors"
          >
            <span className="flex items-center justify-center">
              <Icon name="mdi-terminal" className="mr-1" />
              CLI Tool
            </span>
          </Button>
        </div>
      </div>
      
      {/* Modals */}
      <ImportProfileModal open={importOpen} onOpenChange={setImportOpen} />
      <ConnectModal open={connectOpen} onOpenChange={setConnectOpen} />
      <CliModal open={cliOpen} onOpenChange={setCliOpen} />
    </aside>
  );
}
