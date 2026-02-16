import React from 'react';
import { useSiteContext } from '../../context/SiteContext';
import { PenTool, Square, Circle, Type, Minus, Ruler } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

export const SketchMode: React.FC = () => {
  const { sketchData } = useSiteContext();

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="border-b bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            Site Plan Sketch
          </h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline">
              Auto-Generate
            </Button>
            <Button size="sm" variant="outline">
              Clear
            </Button>
          </div>
        </div>
      </div>

      <div className="border-b bg-white px-4 py-2">
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-xs">Equipment:</Badge>
          <Button size="sm" variant="ghost" className="h-7 text-xs">
            🏢 Cabinet
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs">
            📡 Antenna
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs">
            📻 RRH
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs">
            ⚡ Power
          </Button>
        </div>
        <div className="flex items-center gap-1 mt-2">
          <Badge variant="outline" className="text-xs">Drawing:</Badge>
          <Button size="sm" variant="ghost" className="h-7">
            <Minus className="h-3.5 w-3.5 mr-1" />
            Cable
          </Button>
          <Button size="sm" variant="ghost" className="h-7">
            <Square className="h-3.5 w-3.5 mr-1" />
            Building
          </Button>
          <Button size="sm" variant="ghost" className="h-7">
            <Type className="h-3.5 w-3.5 mr-1" />
            Label
          </Button>
          <Button size="sm" variant="ghost" className="h-7">
            <Ruler className="h-3.5 w-3.5 mr-1" />
            Dimension
          </Button>
        </div>
      </div>

      <div className="flex-1 bg-gray-100 p-4">
        <div className="w-full h-full bg-white rounded-lg border-2 border-gray-300 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <PenTool className="h-16 w-16 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Sketch canvas</p>
            <p className="text-xs mt-1">Click equipment icons to place them on the site plan</p>
          </div>
        </div>
      </div>

      <div className="border-t bg-white px-4 py-2">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={sketchData.gridEnabled} 
                onChange={() => {}} 
                className="rounded" 
              />
              Grid
            </label>
            <label className="flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={sketchData.snapEnabled} 
                onChange={() => {}} 
                className="rounded" 
              />
              Snap
            </label>
          </div>
          <div className="flex items-center gap-2">
            <span>Zoom:</span>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0">-</Button>
            <span>{Math.round(sketchData.zoom * 100)}%</span>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0">+</Button>
          </div>
        </div>
      </div>
    </div>
  );
};