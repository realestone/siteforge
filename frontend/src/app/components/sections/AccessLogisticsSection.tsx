import React from 'react';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { useSiteContext } from '../../context/SiteContext';

export const AccessLogisticsSection: React.FC = () => {
  const { tssrData, updateTSSRField } = useSiteContext();
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="siteCategory">Site Category</Label>
        <Select
          value={tssrData.siteCategory}
          onValueChange={(value: typeof tssrData.siteCategory) => updateTSSRField('siteCategory', value)}
        >
          <SelectTrigger id="siteCategory" className="bg-blue-50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Rooftop">Rooftop</SelectItem>
            <SelectItem value="Tower">Tower</SelectItem>
            <SelectItem value="Indoor">Indoor</SelectItem>
            <SelectItem value="Barn">Barn</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="landlordName">Landlord Name</Label>
        <Input
          id="landlordName"
          value={tssrData.landlordName}
          onChange={(e) => updateTSSRField('landlordName', e.target.value)}
          placeholder="Enter landlord name"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="accessInstructions">Access Instructions</Label>
        <Textarea
          id="accessInstructions"
          value={tssrData.accessInstructions}
          onChange={(e) => updateTSSRField('accessInstructions', e.target.value)}
          placeholder="Enter access instructions..."
          rows={3}
        />
      </div>
      
      <div className="flex items-center justify-between rounded-lg border p-3">
        <Label htmlFor="craneNeeded" className="cursor-pointer">Crane Needed?</Label>
        <Switch
          id="craneNeeded"
          checked={tssrData.craneNeeded}
          onCheckedChange={(checked) => updateTSSRField('craneNeeded', checked)}
        />
      </div>
    </div>
  );
};
