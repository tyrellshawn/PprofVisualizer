import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";

interface ProfileTabsProps {
  activeView: string;
  onChange: (view: string) => void;
}

export default function ProfileTabs({ activeView, onChange }: ProfileTabsProps) {
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "flamegraph", label: "Flamegraph" },
    { id: "functions", label: "Top Functions" },
    { id: "callgraph", label: "Call Graph" },
    { id: "timeline", label: "Timeline" },
  ];
  
  return (
    <div className="bg-white border-b border-neutral-200 px-4 flex text-sm">
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          variant="ghost"
          onClick={() => onChange(tab.id)}
          className={`px-4 py-3 rounded-none h-auto ${
            activeView === tab.id
              ? "text-primary border-b-2 border-primary font-medium"
              : "text-neutral-600 hover:text-neutral-800"
          }`}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  );
}
