import React from 'react';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useSiteContext } from '../../context/SiteContext';

export const PowerGroundingSection: React.FC = () => {
  const { tssrData, updateTSSRField } = useSiteContext();
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cabinetType">Cabinet Type</Label>
        <Select
          value={tssrData.cabinetType}
          onValueChange={(value: 'Indoor' | 'Outdoor') => updateTSSRField('cabinetType', value)}
        >
          <SelectTrigger id="cabinetType" className="bg-blue-50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Indoor">Indoor</SelectItem>
            <SelectItem value="Outdoor">Outdoor</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="acdb">ACDB</Label>
        <div className="relative">
          <Input
            id="acdb"
            value={tssrData.acdb}
            readOnly
            className="bg-gray-100 pr-8"
            title="Auto-calculated from cabinet type"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
            auto
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="rectifier">Rectifier</Label>
        <div className="relative">
          <Input
            id="rectifier"
            value={tssrData.rectifier}
            readOnly
            className="bg-gray-100 pr-8"
            title="Auto-calculated from cabinet type"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
            auto
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="earthing">Earthing System</Label>
        <div className="relative">
          <Input
            id="earthing"
            value={tssrData.earthing}
            readOnly
            className="bg-gray-100 pr-8"
            title="Auto-calculated from cabinet type"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
            auto
          </div>
        </div>
      </div>
    </div>
  );
};