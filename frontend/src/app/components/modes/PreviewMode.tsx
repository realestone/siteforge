import React from 'react';
import { useSiteContext } from '../../context/SiteContext';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { FileText, Camera, Map } from 'lucide-react';

export const PreviewMode: React.FC = () => {
  const { tssrData, photos } = useSiteContext();

  const getPhotoCount = (section: string) => {
    return photos.filter(p => p.section === section).length;
  };

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="border-b bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-600" />
          <h2 className="text-sm font-semibold text-gray-900">
            TSSR Preview
          </h2>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4 text-sm">
          {/* Document Header */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-bold text-base mb-2">
              Technical Site Survey Report (TSSR)
            </h3>
            <div className="text-xs text-gray-600 space-y-1">
              <p>Site ID: {tssrData.siteId}</p>
              <p>Site Name: {tssrData.siteName}</p>
              <p>Operator: {tssrData.operator}</p>
              <p>Configuration: {tssrData.config} ({tssrData.sectors} sectors)</p>
            </div>
          </div>

          {/* Drawings Section */}
          <div className="bg-white rounded-lg border p-4">
            <h4 className="font-semibold mb-3">5. DRAWINGS</h4>

            {/* Site Overview */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">5.1 Site Overview & Access</p>
                <Badge variant={getPhotoCount('site-overview') > 0 ? "default" : "secondary"}>
                  {getPhotoCount('site-overview') > 0 ? `${getPhotoCount('site-overview')} photos` : 'No photos'}
                </Badge>
              </div>
              {getPhotoCount('site-overview') > 0 ? (
                <div className="bg-gray-100 rounded-md p-4 flex items-center justify-center">
                  <Camera className="h-12 w-12 text-gray-400" />
                </div>
              ) : (
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-md p-4 flex items-center justify-center text-xs text-gray-400">
                  Photo placeholder
                </div>
              )}
            </div>

            {/* Antenna Directions */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">5.2 Antenna Directions</p>
              </div>
              {tssrData.sectorData.map((sector, idx) => (
                <div key={sector.id} className="mb-3">
                  <p className="text-xs text-gray-600 mb-1">
                    Sector {sector.id} — {sector.azimuth}° azimuth
                  </p>
                  {photos.filter(p => p.section === 'antenna-direction' && p.sectorId === sector.id).length > 0 ? (
                    <div className="bg-gray-100 rounded-md p-3 flex items-center justify-center">
                      <Camera className="h-10 w-10 text-gray-400" />
                    </div>
                  ) : (
                    <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-md p-3 flex items-center justify-center text-xs text-amber-600">
                      Missing required photo
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Site Plan */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">5.3 Site Plan</p>
                <Badge variant="default">Auto-generated</Badge>
              </div>
              <div className="bg-gray-100 rounded-md p-4 flex items-center justify-center">
                <Map className="h-12 w-12 text-gray-400" />
              </div>
            </div>

            {/* Equipment Room */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">5.4 Equipment Room</p>
                <Badge variant={getPhotoCount('equipment-room') > 0 ? "default" : "secondary"}>
                  {getPhotoCount('equipment-room') > 0 ? `${getPhotoCount('equipment-room')} photos` : 'No photos'}
                </Badge>
              </div>
              {getPhotoCount('equipment-room') > 0 ? (
                <div className="bg-gray-100 rounded-md p-4 flex items-center justify-center">
                  <Camera className="h-12 w-12 text-gray-400" />
                </div>
              ) : (
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-md p-4 flex items-center justify-center text-xs text-gray-400">
                  Photo placeholder
                </div>
              )}
            </div>

            {/* Cable Route */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">5.5 Cable Route</p>
                <Badge variant={getPhotoCount('cable-route') > 0 ? "default" : "secondary"}>
                  {getPhotoCount('cable-route') > 0 ? `${getPhotoCount('cable-route')} photos` : 'No photos'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Appendix */}
          <div className="bg-white rounded-lg border p-4">
            <h4 className="font-semibold mb-3">APPENDIX</h4>
            <p className="text-xs text-gray-600 mb-2">A1. Connection Diagram</p>
            <div className="bg-gray-100 rounded-md p-3 flex items-center justify-center">
              <FileText className="h-10 w-10 text-gray-400" />
              <span className="ml-2 text-xs text-gray-600">Auto-generated RRH-Antenna wiring</span>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
