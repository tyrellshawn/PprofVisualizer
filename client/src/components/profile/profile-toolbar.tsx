import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { Profile, profileUtils } from "@/lib/pprof";

interface ProfileToolbarProps {
  profile: Profile;
  onSave: () => void;
  onCompare?: () => void;
  onExport?: () => void;
}

export default function ProfileToolbar({ profile, onSave, onCompare, onExport }: ProfileToolbarProps) {
  // Format collection timestamp
  const formattedTimestamp = new Date(profile.uploadedAt).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return (
    <div className="bg-white border-b border-neutral-200 p-3 flex items-center justify-between">
      <div className="flex items-center">
        <h1 className="font-medium text-lg mr-2">{profile.originalFilename}</h1>
        <span className={`px-2 py-0.5 text-xs rounded ${profileUtils.getProfileTypeColor(profile.profileType)}`}>
          {profileUtils.getProfileTypeName(profile.profileType)}
        </span>
        <span className="text-neutral-500 text-sm ml-4">
          Collected: <span>{formattedTimestamp}</span>
        </span>
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          onClick={onCompare}
          disabled={!onCompare}
          className="px-3 py-1 text-sm border border-neutral-300 rounded hover:bg-neutral-100 transition-colors flex items-center"
        >
          <Icon name="mdi-compare" className="mr-1.5" />
          Compare
        </Button>
        <Button
          variant="outline"
          onClick={onExport}
          disabled={!onExport}
          className="px-3 py-1 text-sm border border-neutral-300 rounded hover:bg-neutral-100 transition-colors flex items-center"
        >
          <Icon name="mdi-export-variant" className="mr-1.5" />
          Export
        </Button>
        <Button
          onClick={onSave}
          variant={profile.isSaved ? "secondary" : "default"}
          className={profile.isSaved 
            ? "px-3 py-1 text-sm text-neutral-700 bg-neutral-100 rounded hover:bg-neutral-200 transition-colors flex items-center"
            : "px-3 py-1 text-sm text-white bg-primary rounded hover:bg-primary/90 transition-colors flex items-center"
          }
        >
          <Icon name={profile.isSaved ? "mdi-check" : "mdi-content-save"} className="mr-1.5" />
          {profile.isSaved ? "Saved" : "Save"}
        </Button>
      </div>
    </div>
  );
}
