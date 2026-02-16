import React from 'react';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useSiteContext } from '../../context/SiteContext';

export const BuildingInfoSection: React.FC = () => {
  const { tssrData, updateTSSRField } = useSiteContext();
  
  const showRoofFields = tssrData.siteCategory === 'Rooftop' || tssrData.siteCategory === 'Barn';
  const showTowerFields = tssrData.siteCategory === 'Tower';
  
  return (
    <div className="space-y-4">
      {showRoofFields && (
        <>
          <div className="space-y-2">
            <Label htmlFor="roofType">Roof Type</Label>
            <Select
              value={tssrData.roofType || ''}
              onValueChange={(value) => updateTSSRField('roofType', value)}
            >
              <SelectTrigger id="roofType" className="bg-blue-50">
                <SelectValue placeholder="Select roof type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Flat">Flat</SelectItem>
                <SelectItem value="Pitched">Pitched</SelectItem>
                <SelectItem value="Mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="roofMaterial">Roof Material</Label>
            <Select
              value={tssrData.roofMaterial || ''}
              onValueChange={(value) => updateTSSRField('roofMaterial', value)}
            >
              <SelectTrigger id="roofMaterial" className="bg-blue-50">
                <SelectValue placeholder="Select material" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Concrete">Concrete</SelectItem>
                <SelectItem value="Metal">Metal</SelectItem>
                <SelectItem value="Tiles">Tiles</SelectItem>
                <SelectItem value="Asphalt">Asphalt</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="roofLoad">Roof Load Capacity (kg/m²)</Label>
            <Input
              id="roofLoad"
              type="number"
              value={tssrData.roofLoad || ''}
              onChange={(e) => updateTSSRField('roofLoad', parseInt(e.target.value) || 0)}
              className="bg-blue-50"
            />
          </div>
        </>
      )}
      
      {showTowerFields && (
        <div className="space-y-2">
          <Label htmlFor="towerHeight">Tower Height (m)</Label>
          <Input
            id="towerHeight"
            type="number"
            value={tssrData.towerHeight || ''}
            onChange={(e) => updateTSSRField('towerHeight', parseInt(e.target.value) || 0)}
            className="bg-blue-50"
          />
        </div>
      )}
      
      {!showRoofFields && !showTowerFields && (
        <div className="text-sm text-gray-500 py-4">
          No building-specific information needed for {tssrData.siteCategory} sites.
        </div>
      )}
    </div>
  );
};
