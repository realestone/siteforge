import React from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Save, FileCheck, FileDown, ChevronDown, ArrowLeft, Camera, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from './ui/dropdown-menu';
import { useSiteContext } from '../context/SiteContext';
import { useWorkflowContext, availableUsers } from '../context/WorkflowContext';
import { toast } from 'sonner';
import { WorkflowStatus } from '../types/site';

export const TopBar: React.FC = () => {
  const { tssrData, photos, runValidation } = useSiteContext();
  const { currentUser, workflow, canEdit, submitForReview, approveAndForward, setCurrentUser } = useWorkflowContext();

  // Calculate photo completeness
  const requiredSections = [
    'site-overview',
    'equipment-room',
    'cable-route',
    'roof-mounting',
    'power-meter',
  ];

  const antennaPhotos = tssrData.sectorData.reduce((count, sector) => {
    const hasPhoto = photos.some(p => p.section === 'antenna-direction' && p.sectorId === sector.id);
    return count + (hasPhoto ? 1 : 0);
  }, 0);

  const otherRequiredPhotos = requiredSections.reduce((count, section) => {
    const hasPhoto = photos.some(p => p.section === section);
    return count + (hasPhoto ? 1 : 0);
  }, 0);

  const cranePhotoCount = tssrData.craneNeeded
    ? (photos.some(p => p.section === 'crane-area') ? 1 : 0)
    : 1;

  const totalRequired = tssrData.sectors + requiredSections.length + (tssrData.craneNeeded ? 1 : 0);
  const completedRequired = antennaPhotos + otherRequiredPhotos + (tssrData.craneNeeded ? cranePhotoCount : 0);
  const missingPhotos = totalRequired - completedRequired;

  const handleSave = () => {
    toast.success('Draft saved', { description: 'All changes saved successfully' });
  };

  const handleValidate = () => {
    runValidation();
    toast.info('Validation complete', { description: 'Check validation panel for results' });
  };

  const handleExport = (type: 'tssr' | 'boq' | 'both') => {
    if (missingPhotos > 0) {
      toast.error('Cannot export', {
        description: `${missingPhotos} required photo(s) missing. Complete all required sections first.`
      });
      return;
    }
    toast.success(`Exporting ${type.toUpperCase()}`, { description: 'Download will begin shortly' });
  };

  const handleBack = () => {
    if (window.confirm('Return to project list? Unsaved changes will be lost.')) {
      window.location.reload();
    }
  };

  const getStatusColor = (status: WorkflowStatus) => {
    const colors: Record<WorkflowStatus, string> = {
      'draft': 'bg-gray-500',
      'internal-review': 'bg-blue-500',
      'changes-requested': 'bg-orange-500',
      'submitted': 'bg-purple-500',
      'rejected': 'bg-red-500',
      'approved': 'bg-green-500',
      'building': 'bg-teal-500',
      'as-built-complete': 'bg-emerald-700',
    };
    return colors[status] || 'bg-gray-500';
  };

  const getStatusLabel = (status: WorkflowStatus) => {
    const labels: Record<WorkflowStatus, string> = {
      'draft': 'Draft',
      'internal-review': 'Internal Review',
      'changes-requested': 'Changes Requested',
      'submitted': 'Submitted',
      'rejected': 'Rejected',
      'approved': 'Approved',
      'building': 'Building',
      'as-built-complete': 'As-Built Complete',
    };
    return labels[status] || status;
  };

  const getTimeSince = (timestamp: number | undefined) => {
    if (!timestamp) return '';
    const days = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'today';
    if (days === 1) return '1 day';
    return `${days} days`;
  };

  const unresolvedComments = workflow.comments.filter(c => !c.resolved).length;
  const totalPhotos = photos.length;

  return (
    <div className="border-b bg-white px-6 py-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gap-2 -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-teal-600 text-white font-bold">
              &#9670;
            </div>
            <span className="text-lg font-semibold">SiteForge</span>
          </div>

          <div className="border-l pl-4 ml-2">
            <div className="flex flex-col">
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-medium">{tssrData.siteId || 'New Site'}</span>
                {tssrData.siteName && (
                  <>
                    <span className="text-gray-400">&mdash;</span>
                    <span className="text-lg font-medium">{tssrData.siteName}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="font-mono font-semibold">{tssrData.config}</span>
                <span>&bull;</span>
                <span>{tssrData.sectors} Sectors</span>
                <span>&bull;</span>
                <span>{tssrData.size}</span>
                <span>&bull;</span>
                <span>{tssrData.siteCategory}</span>
              </div>
              <div className="flex items-center gap-2 text-xs mt-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500">Status:</span>
                  <Badge className={`${getStatusColor(workflow.status)} text-white border-0 text-[10px] px-2 py-0.5`}>
                    &#9679; {getStatusLabel(workflow.status)}
                  </Badge>
                </div>
                {workflow.assignedTo && (
                  <>
                    <span className="text-gray-400">&bull;</span>
                    <span className="text-gray-600">
                      Assigned to: {workflow.assignedTo.name}
                    </span>
                    {workflow.assignedAt && (
                      <span className="text-gray-500">
                        ({getTimeSince(workflow.assignedAt)})
                      </span>
                    )}
                  </>
                )}
                {totalPhotos > 0 && (
                  <>
                    <span className="text-gray-400">&bull;</span>
                    <div className="flex items-center gap-1.5">
                      <Camera className="h-3.5 w-3.5 text-gray-500" />
                      <span className="text-gray-600">
                        {completedRequired}/{totalRequired} photos
                      </span>
                      {missingPhotos > 0 && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                          {missingPhotos} missing
                        </Badge>
                      )}
                    </div>
                  </>
                )}
                {unresolvedComments > 0 && (
                  <>
                    <span className="text-gray-400">&bull;</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-orange-600 border-orange-300">
                      {unresolvedComments} comment{unresolvedComments !== 1 ? 's' : ''}
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Role switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <User className="h-3.5 w-3.5" />
                {currentUser.name}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Switch Role</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {Object.values(availableUsers).map(user => (
                <DropdownMenuItem key={user.id} onClick={() => setCurrentUser(user)}>
                  {user.name} ({user.role})
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {canEdit && (
            <Button onClick={handleSave} variant="outline" size="sm" className="gap-2">
              <Save className="h-4 w-4" />
              Save Draft
            </Button>
          )}

          {currentUser.role === 'maker' && workflow.status === 'draft' && (
            <Button onClick={submitForReview} variant="default" size="sm" className="gap-2">
              Submit for Review
            </Button>
          )}

          {currentUser.role === 'checker' && workflow.status === 'internal-review' && (
            <Button onClick={approveAndForward} variant="default" size="sm" className="gap-2 bg-green-600 hover:bg-green-700">
              Approve & Forward
            </Button>
          )}

          {currentUser.role === 'spl' && workflow.status === 'submitted' && (
            <Button onClick={approveAndForward} variant="default" size="sm" className="gap-2 bg-green-600 hover:bg-green-700">
              Approve
            </Button>
          )}

          <Button onClick={handleValidate} variant="outline" size="sm" className="gap-2">
            <FileCheck className="h-4 w-4" />
            Validate
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                className="gap-2 bg-teal-600 hover:bg-teal-700"
                disabled={missingPhotos > 0}
              >
                <FileDown className="h-4 w-4" />
                Export
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('tssr')}>
                <FileDown className="mr-2 h-4 w-4" />
                TSSR.docx
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('boq')}>
                <FileDown className="mr-2 h-4 w-4" />
                BOQ.xlsm
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('both')}>
                <FileDown className="mr-2 h-4 w-4" />
                Both Documents
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};
