import React, { useRef, useState } from 'react';
import { useSiteContext } from '../../context/SiteContext';
import { Photo, PhotoSection } from '../../types/site';
import { Upload, Image as ImageIcon, Edit2, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { motion, AnimatePresence } from 'motion/react';

interface PhotoSectionBucketConfig {
  id: PhotoSection;
  title: string;
  required: boolean;
  sectorSpecific?: boolean;
}

export const PhotosMode: React.FC = () => {
  const { photos, tssrData, addPhotos, movePhotoToSection, deletePhoto } = useSiteContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [openSections, setOpenSections] = useState<Set<PhotoSection>>(
    new Set(['site-overview', 'antenna-direction', 'equipment-room'])
  );

  const sectionConfigs: PhotoSectionBucketConfig[] = [
    { id: 'site-overview', title: 'Site Overview & Access', required: true },
    { id: 'antenna-direction', title: 'Antenna Directions', required: true, sectorSpecific: true },
    { id: 'equipment-room', title: 'Equipment Room', required: true },
    { id: 'cable-route', title: 'Cable Route', required: true },
    { id: 'roof-mounting', title: 'Roof / Mounting Area', required: true },
    { id: 'power-meter', title: 'Power Meter / Main Breaker', required: true },
    { id: 'grounding', title: 'Grounding', required: false },
    { id: 'crane-area', title: 'Crane / Lift Area', required: tssrData.craneNeeded },
    { id: 'other', title: 'Other / Appendix', required: false },
  ];

  const unsortedPhotos = photos.filter(p => p.section === 'unsorted');

  const getPhotosForSection = (sectionId: PhotoSection, sectorId?: string) => {
    if (sectorId) {
      return photos.filter(p => p.section === sectionId && p.sectorId === sectorId);
    }
    return photos.filter(p => p.section === sectionId && !p.sectorId);
  };

  const handleFileSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      const fileArray = Array.from(files).filter(f =>
        f.type.startsWith('image/') || f.type === 'image/heic'
      );
      if (fileArray.length > 0) {
        addPhotos(fileArray);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const toggleSection = (sectionId: PhotoSection) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const PhotoThumbnail: React.FC<{ photo: Photo; onMove?: (sectionId: PhotoSection, sectorId?: string) => void; onDelete?: () => void }> = ({ photo, onMove, onDelete }) => {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('photoId', photo.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        className="group relative rounded-lg overflow-hidden bg-white border-2 border-gray-200 hover:border-teal-500 transition-all cursor-move"
        style={{ width: 120, height: 120 }}
      >
        <img src={photo.fileUrl} alt={photo.fileName} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
            <button
              className="p-1.5 bg-white rounded-md hover:bg-gray-100"
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Open annotation mode
              }}
            >
              <Edit2 className="h-4 w-4 text-gray-700" />
            </button>
            {onDelete && (
              <button
                className="p-1.5 bg-white rounded-md hover:bg-red-50"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </button>
            )}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-1 bg-gradient-to-t from-black/60 to-transparent">
          <p className="text-[10px] text-white truncate">{photo.fileName}</p>
        </div>
        {photo.section !== 'unsorted' && (
          <div className="absolute top-1 right-1">
            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-teal-600 text-white border-0">
              Placed
            </Badge>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="border-b bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            Photos & Documentation
          </h2>
          <Badge variant="outline" className="text-teal-700 border-teal-300">
            {photos.length} uploaded
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Upload Area */}
          {unsortedPhotos.length === 0 && photos.length === 0 && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver ? 'border-teal-500 bg-teal-50' : 'border-gray-300 bg-white'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700 mb-1">
                Drop site photos here
              </p>
              <p className="text-xs text-gray-500 mb-3">or click to browse</p>
              <p className="text-xs text-gray-400">
                Supports JPG, PNG, HEIC • Up to 50 photos
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.heic"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
            </div>
          )}

          {/* Unsorted Photos */}
          {unsortedPhotos.length > 0 && (
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-900">
                    Unsorted ({unsortedPhotos.length})
                  </h3>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Add More
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.heic"
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <AnimatePresence>
                  {unsortedPhotos.map(photo => (
                    <PhotoThumbnail
                      key={photo.id}
                      photo={photo}
                      onDelete={() => deletePhoto(photo.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Section Buckets */}
          <div className="space-y-2">
            {sectionConfigs.map(section => {
              const isOpen = openSections.has(section.id);
              const sectionPhotos = section.sectorSpecific
                ? []
                : getPhotosForSection(section.id);
              
              let photoCount = sectionPhotos.length;
              if (section.sectorSpecific) {
                photoCount = tssrData.sectorData.reduce((sum, sector) => 
                  sum + getPhotosForSection(section.id, sector.id).length, 0
                );
              }

              return (
                <Collapsible
                  key={section.id}
                  open={isOpen}
                  onOpenChange={() => toggleSection(section.id)}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between rounded-lg border bg-white px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-500" />
                        )}
                        <span className="text-sm font-medium text-gray-900">
                          {section.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          ({photoCount})
                        </span>
                        {section.required && (
                          <Badge variant={photoCount > 0 ? "default" : "destructive"} className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="mt-2 rounded-lg border bg-white p-4">
                      {section.sectorSpecific ? (
                        <div className="space-y-4">
                          {tssrData.sectorData.map(sector => {
                            const sectorPhotos = getPhotosForSection(section.id, sector.id);
                            return (
                              <div key={sector.id} className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-medium text-gray-700">
                                    Sector {sector.id} — {sector.azimuth}°
                                  </p>
                                  {sectorPhotos.length === 0 && (
                                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                                      Missing
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {sectorPhotos.length === 0 && (
                                    <div
                                      className="w-[120px] h-[120px] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-xs text-gray-400 hover:border-teal-400 hover:bg-teal-50 transition-all"
                                      onDrop={(e) => {
                                        e.preventDefault();
                                        const photoId = e.dataTransfer.getData('photoId');
                                        if (photoId) {
                                          movePhotoToSection(photoId, section.id, sector.id);
                                        }
                                      }}
                                      onDragOver={(e) => e.preventDefault()}
                                    >
                                      Drop here
                                    </div>
                                  )}
                                  <AnimatePresence>
                                    {sectorPhotos.map(photo => (
                                      <div
                                        key={photo.id}
                                        draggable
                                        onDragStart={(e) => {
                                          e.dataTransfer.setData('photoId', photo.id);
                                        }}
                                      >
                                        <PhotoThumbnail photo={photo} />
                                      </div>
                                    ))}
                                  </AnimatePresence>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {sectionPhotos.length === 0 && (
                            <div
                              className="w-[120px] h-[120px] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-xs text-gray-400 hover:border-teal-400 hover:bg-teal-50 transition-all"
                              onDrop={(e) => {
                                e.preventDefault();
                                const photoId = e.dataTransfer.getData('photoId');
                                if (photoId) {
                                  movePhotoToSection(photoId, section.id);
                                }
                              }}
                              onDragOver={(e) => e.preventDefault()}
                            >
                              Drop photo here
                            </div>
                          )}
                          <AnimatePresence>
                            {sectionPhotos.map(photo => (
                              <div
                                key={photo.id}
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData('photoId', photo.id);
                                }}
                              >
                                <PhotoThumbnail photo={photo} />
                              </div>
                            ))}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};