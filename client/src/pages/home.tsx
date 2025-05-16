import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import ImportProfileModal from "@/components/profile/import-profile-modal";
import ConnectModal from "@/components/profile/connect-modal";
import CliModal from "@/components/profile/cli-modal";
import Icon from "@/components/ui/icon";
import { profileApi, profileUtils } from "@/lib/pprof";

export default function Home() {
  const [, navigate] = useLocation();
  const [importOpen, setImportOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [cliOpen, setCliOpen] = useState(false);
  
  // Query recent profiles
  const { data: recentProfiles, isLoading: loadingRecent } = useQuery({
    queryKey: ["/api/profiles/recent"],
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Query saved profiles
  const { data: savedProfiles, isLoading: loadingSaved } = useQuery({
    queryKey: ["/api/profiles/saved"]
  });

  // Handle profile click
  const handleProfileClick = (id: number) => {
    navigate(`/profile/${id}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-100">
      <Header />
      
      <main className="flex-1 container mx-auto py-8 px-4">
        <div className="grid grid-cols-1 gap-8">
          {/* Welcome Card */}
          <Card className="bg-white shadow-sm">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-neutral-800 mb-2">
                    Welcome to PProfViz
                  </h1>
                  <p className="text-neutral-600 mb-4">
                    An open source visualization tool for Go pprof profiles. Import, analyze, and optimize your Go applications.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setImportOpen(true)} className="bg-primary text-white hover:bg-primary/90 transition-colors">
                    <Icon name="mdi-upload" className="mr-2" />
                    Import Profile
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setConnectOpen(true)}
                    className="border-neutral-300 hover:bg-neutral-100 transition-colors"
                  >
                    <Icon name="mdi-connection" className="mr-2" />
                    Connect to pprof
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profiles List */}
          <Card className="bg-white shadow-sm">
            <CardContent className="pt-6">
              <Tabs defaultValue="recent">
                <div className="flex justify-between items-center mb-4">
                  <TabsList>
                    <TabsTrigger value="recent">Recent Profiles</TabsTrigger>
                    <TabsTrigger value="saved">Saved Profiles</TabsTrigger>
                  </TabsList>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCliOpen(true)}
                    className="border-neutral-300 hover:bg-neutral-100 transition-colors"
                  >
                    <Icon name="mdi-terminal" className="mr-2" />
                    CLI Tool
                  </Button>
                </div>

                <TabsContent value="recent">
                  {loadingRecent ? (
                    <div className="flex justify-center p-6">
                      <Icon name="mdi-loading" spin className="text-2xl text-neutral-400" />
                    </div>
                  ) : recentProfiles?.length ? (
                    <div className="space-y-2">
                      {recentProfiles.map((profile) => (
                        <div
                          key={profile.id}
                          onClick={() => handleProfileClick(profile.id)}
                          className="border border-neutral-200 rounded p-3 hover:bg-neutral-50 cursor-pointer transition-colors"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium text-neutral-800">
                                {profile.originalFilename}
                              </div>
                              <div className="flex items-center mt-1 text-sm text-neutral-500">
                                <span className={`px-2 py-0.5 rounded text-xs mr-2 ${profileUtils.getProfileTypeColor(profile.profileType)}`}>
                                  {profileUtils.getProfileTypeName(profile.profileType)}
                                </span>
                                <span>Size: {profileUtils.formatBytes(profile.size)}</span>
                              </div>
                              {profile.description && (
                                <div className="mt-1 text-sm text-neutral-600">{profile.description}</div>
                              )}
                            </div>
                            <div className="text-sm text-neutral-500">
                              {profileUtils.getRelativeTime(profile.uploadedAt)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-6 border border-dashed border-neutral-300 rounded">
                      <Icon name="mdi-chart-line" className="text-3xl text-neutral-400 mb-2" />
                      <p className="text-neutral-600">No recent profiles found.</p>
                      <p className="text-sm text-neutral-500 mt-1">
                        Import a profile or connect to a pprof endpoint to get started.
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="saved">
                  {loadingSaved ? (
                    <div className="flex justify-center p-6">
                      <Icon name="mdi-loading" spin className="text-2xl text-neutral-400" />
                    </div>
                  ) : savedProfiles?.length ? (
                    <div className="space-y-2">
                      {savedProfiles.map((profile) => (
                        <div
                          key={profile.id}
                          onClick={() => handleProfileClick(profile.id)}
                          className="border border-neutral-200 rounded p-3 hover:bg-neutral-50 cursor-pointer transition-colors"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium text-neutral-800">
                                {profile.originalFilename}
                              </div>
                              <div className="flex items-center mt-1 text-sm text-neutral-500">
                                <span className={`px-2 py-0.5 rounded text-xs mr-2 ${profileUtils.getProfileTypeColor(profile.profileType)}`}>
                                  {profileUtils.getProfileTypeName(profile.profileType)}
                                </span>
                                <span>Size: {profileUtils.formatBytes(profile.size)}</span>
                              </div>
                              {profile.description && (
                                <div className="mt-1 text-sm text-neutral-600">{profile.description}</div>
                              )}
                            </div>
                            <div className="text-sm text-neutral-500">
                              {new Date(profile.uploadedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-6 border border-dashed border-neutral-300 rounded">
                      <Icon name="mdi-content-save" className="text-3xl text-neutral-400 mb-2" />
                      <p className="text-neutral-600">No saved profiles found.</p>
                      <p className="text-sm text-neutral-500 mt-1">
                        Save profiles by clicking the "Save" button when viewing a profile.
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Getting Started Card */}
          <Card className="bg-white shadow-sm">
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold text-neutral-800 mb-4">Getting Started</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-neutral-200 rounded p-4">
                  <div className="flex items-center text-primary mb-2">
                    <Icon name="mdi-upload" className="text-xl mr-2" />
                    <h3 className="font-medium">Import Profile</h3>
                  </div>
                  <p className="text-sm text-neutral-600">
                    Upload pprof files from your local machine to visualize and analyze them.
                  </p>
                </div>
                <div className="border border-neutral-200 rounded p-4">
                  <div className="flex items-center text-primary mb-2">
                    <Icon name="mdi-connection" className="text-xl mr-2" />
                    <h3 className="font-medium">Connect to pprof</h3>
                  </div>
                  <p className="text-sm text-neutral-600">
                    Connect directly to a running Go application's pprof HTTP endpoint.
                  </p>
                </div>
                <div className="border border-neutral-200 rounded p-4">
                  <div className="flex items-center text-primary mb-2">
                    <Icon name="mdi-terminal" className="text-xl mr-2" />
                    <h3 className="font-medium">Use CLI Tool</h3>
                  </div>
                  <p className="text-sm text-neutral-600">
                    Execute pprof commands and import the results directly into PProfViz.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
      
      {/* Modals */}
      <ImportProfileModal open={importOpen} onOpenChange={setImportOpen} />
      <ConnectModal open={connectOpen} onOpenChange={setConnectOpen} />
      <CliModal open={cliOpen} onOpenChange={setCliOpen} />
    </div>
  );
}
