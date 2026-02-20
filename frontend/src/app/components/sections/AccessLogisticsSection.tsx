import React from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";
import { useSiteContext } from "../../context/SiteContext";

export const AccessLogisticsSection: React.FC = () => {
  const { tssrData, updateTSSRField } = useSiteContext();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="siteCategory">Site Category</Label>
          <Select
            value={tssrData.siteCategory || ""}
            onValueChange={(value: typeof tssrData.siteCategory) =>
              updateTSSRField("siteCategory", value)
            }
          >
            <SelectTrigger id="siteCategory" className="bg-blue-50">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Rooftop">Rooftop</SelectItem>
              <SelectItem value="Greenfield">Greenfield / Siteshare</SelectItem>
              <SelectItem value="Barn">Barn</SelectItem>
              <SelectItem value="Indoor">Indoor / Tunnel</SelectItem>
              <SelectItem value="Tower">Tower</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="landlordName">Landlord / Site Owner</Label>
          <Input
            id="landlordName"
            value={tssrData.landlordName}
            onChange={(e) => updateTSSRField("landlordName", e.target.value)}
            placeholder="Enter landlord name"
            className="bg-blue-50"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="veiviserComments">Veiviser Comments</Label>
        <Textarea
          id="veiviserComments"
          value={tssrData.veiviserComments}
          onChange={(e) => updateTSSRField("veiviserComments", e.target.value)}
          placeholder="Access directions, key codes, contact info..."
          rows={3}
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <Label htmlFor="iloqRequired" className="cursor-pointer">
            iLOQ Required?
          </Label>
          <p className="text-xs text-gray-500 mt-0.5">
            Digital lock access system
          </p>
        </div>
        <Switch
          id="iloqRequired"
          checked={tssrData.iloqRequired}
          onCheckedChange={(checked) =>
            updateTSSRField("iloqRequired", checked)
          }
        />
      </div>

      {tssrData.iloqRequired && (
        <div className="space-y-2">
          <Label htmlFor="iloqDetails">iLOQ Details</Label>
          <Input
            id="iloqDetails"
            value={tssrData.iloqDetails}
            onChange={(e) => updateTSSRField("iloqDetails", e.target.value)}
            placeholder="Lock ID, access level, key assignment..."
            className="bg-blue-50"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="accessInstructions">Access Instructions</Label>
        <Textarea
          id="accessInstructions"
          value={tssrData.accessInstructions}
          onChange={(e) =>
            updateTSSRField("accessInstructions", e.target.value)
          }
          placeholder="Detailed access instructions..."
          rows={3}
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <Label htmlFor="craneNeeded" className="cursor-pointer">
          Crane Needed?
        </Label>
        <Switch
          id="craneNeeded"
          checked={tssrData.craneNeeded}
          onCheckedChange={(checked) => updateTSSRField("craneNeeded", checked)}
        />
      </div>
    </div>
  );
};
