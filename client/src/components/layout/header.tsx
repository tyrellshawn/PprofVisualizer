import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Icon from "@/components/ui/icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Header() {
  const [location, navigate] = useLocation();
  
  return (
    <header className="bg-white border-b border-neutral-200 px-4 py-2 flex justify-between items-center h-14">
      <div className="flex items-center space-x-2">
        <span 
          className="text-primary font-semibold text-xl cursor-pointer"
          onClick={() => navigate('/')}
        >
          PProfViz
        </span>
        <span className="text-xs bg-neutral-200 px-2 py-0.5 rounded-full">beta</span>
      </div>
      <div className="flex items-center space-x-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => window.open('https://github.com/go-delve/delve/blob/master/Documentation/cpu_profiling.md', '_blank')}
              >
                <Icon name="mdi-help-circle-outline" className="text-xl text-neutral-600 hover:text-primary transition-colors" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Help & Documentation</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => window.open('https://github.com/golang/go/blob/master/src/runtime/pprof/pprof.go', '_blank')}
              >
                <Icon name="mdi-github" className="text-xl text-neutral-600 hover:text-primary transition-colors" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>GitHub Repository</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <DropdownMenu>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                  >
                    <Icon name="mdi-cog-outline" className="text-xl text-neutral-600 hover:text-primary transition-colors" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Settings</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Icon name="mdi-palette-outline" className="mr-2" />
              <span>Theme</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Icon name="mdi-tools" className="mr-2" />
              <span>Preferences</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Icon name="mdi-information-outline" className="mr-2" />
              <span>About</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
