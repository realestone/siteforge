import React from 'react';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { useSiteContext } from '../../context/SiteContext';

export const SiteIdentitySection: React.FC = () => {
  const { tssrData, updateTSSRField } = useSiteContext();
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="siteId">Site ID</Label>
          <Input
            id="siteId"
            value={tssrData.siteId}
            onChange={(e) => updateTSSRField('siteId', e.target.value)}
            className="bg-blue-50"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="siteName">Site Name</Label>
          <Input
            id="siteName"
            value={tssrData.siteName}
            onChange={(e) => updateTSSRField('siteName', e.target.value)}
            className="bg-blue-50"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="operator">Operator</Label>
        <Input
          id="operator"
          value={tssrData.operator}
          onChange={(e) => updateTSSRField('operator', e.target.value)}
          className="bg-blue-50"
        />
      </div>
    </div>
  );
};
