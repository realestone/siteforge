import React from "react";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { FileDown } from "lucide-react";
import { Badge } from "./ui/badge";

export const RightPanel: React.FC = () => {
  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="border-b bg-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-900">BOQ Live View</h2>
          <Badge variant="secondary" className="text-xs">
            0 active items
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            Show All
          </Button>
          <Button size="sm" variant="ghost" className="gap-2">
            <FileDown className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          <div className="text-center text-gray-400 py-16">
            <p className="text-sm">No BOQ items yet</p>
            <p className="text-xs mt-1">
              Items will appear here once populated from the backend
            </p>
          </div>
        </div>
      </ScrollArea>

      <div className="border-t bg-white px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">TOTALS</span>
          <div className="flex items-center gap-6 text-gray-400">
            <span>--</span>
          </div>
        </div>
      </div>
    </div>
  );
};
