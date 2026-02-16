import React from 'react';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { useSiteContext } from '../../context/SiteContext';

export const RadioConfigSection: React.FC = () => {
  const { tssrData, updateTSSRField, updateSectorData } = useSiteContext();
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sectors">Sectors</Label>
          <Select
            value={tssrData.sectors.toString()}
            onValueChange={(value) => updateTSSRField('sectors', parseInt(value))}
          >
            <SelectTrigger id="sectors" className="bg-blue-50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
              <SelectItem value="4">4</SelectItem>
              <SelectItem value="6">6</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="size">Size</Label>
          <Select
            value={tssrData.size}
            onValueChange={(value: 'Small' | 'Medium' | 'Large') => updateTSSRField('size', value)}
          >
            <SelectTrigger id="size" className="bg-blue-50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Small">Small</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Large">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="config">Config</Label>
        <div className="relative">
          <Input
            id="config"
            value={tssrData.config}
            readOnly
            className="bg-gray-100 font-mono font-semibold pr-8"
            title="Auto-calculated from sector count"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
            auto
          </div>
        </div>
      </div>
      
      <div className="space-y-3 mt-6">
        <Label className="text-sm font-semibold">Sector Configuration</Label>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2 font-medium">Sector</th>
                <th className="text-left py-2 px-2 font-medium">Azimuth</th>
                <th className="text-left py-2 px-2 font-medium">M.Tilt</th>
                <th className="text-left py-2 px-2 font-medium">E.Tilt</th>
                <th className="text-left py-2 px-2 font-medium">Antenna</th>
                <th className="text-left py-2 px-2 font-medium">Cable (m)</th>
              </tr>
            </thead>
            <tbody>
              {tssrData.sectorData.map((sector, index) => (
                <tr key={sector.id} className="border-b">
                  <td className="py-2 px-2 font-medium">{sector.id}</td>
                  <td className="py-2 px-2">
                    <Input
                      type="number"
                      value={sector.azimuth}
                      onChange={(e) => updateSectorData(index, 'azimuth', parseInt(e.target.value) || 0)}
                      className="w-20 h-8 text-sm bg-blue-50"
                      min={0}
                      max={360}
                    />
                  </td>
                  <td className="py-2 px-2">
                    <Input
                      type="number"
                      value={sector.mTilt}
                      onChange={(e) => updateSectorData(index, 'mTilt', parseInt(e.target.value) || 0)}
                      className="w-16 h-8 text-sm bg-blue-50"
                      min={0}
                      max={15}
                    />
                  </td>
                  <td className="py-2 px-2">
                    <Input
                      type="number"
                      value={sector.eTilt}
                      onChange={(e) => updateSectorData(index, 'eTilt', parseInt(e.target.value) || 0)}
                      className="w-16 h-8 text-sm bg-blue-50"
                      min={0}
                      max={15}
                    />
                  </td>
                  <td className="py-2 px-2">
                    <Input
                      value={sector.antenna}
                      onChange={(e) => updateSectorData(index, 'antenna', e.target.value)}
                      className="w-28 h-8 text-sm bg-blue-50"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <Input
                      type="number"
                      value={sector.cableRoute || 0}
                      onChange={(e) => updateSectorData(index, 'cableRoute', parseInt(e.target.value) || 0)}
                      className="w-20 h-8 text-sm bg-blue-50"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="mt-4 rounded-lg bg-gray-50 border p-4">
        <div className="text-xs font-semibold text-gray-700 mb-2">Auto-Generated Equipment Summary</div>
        <div className="text-sm text-gray-600 space-y-1">
          <div>2× ABIO • 1× ASIB • 1× AMIA</div>
          <div>{tssrData.sectors}× LB RRH • {tssrData.sectors}× HB RRH • {tssrData.sectors}× MAA</div>
          <div>{tssrData.sectors}× ATOA • {tssrData.sectors * 4}× SFP+ • {tssrData.sectors * 4}× SFP28</div>
          <div>GPS Kit: {tssrData.size === 'Large' ? 'Yes' : 'No'}</div>
        </div>
      </div>
    </div>
  );
};