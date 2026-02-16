import React, { useState } from 'react';
import { Button } from './ui/button';
import { Plus, Download, CheckCircle2, AlertTriangle, Circle } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import type { Site } from '../types/site';

interface HomeScreenProps {
  onSiteSelect: (siteId: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSiteSelect }) => {
  const [sites] = useState<Site[]>([]);

  const getStatusBadge = (status: Site['status'], warningCount?: number) => {
    switch (status) {
      case 'Complete':
        return (
          <Badge className="gap-1 bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle2 className="h-3 w-3" />
            Complete
          </Badge>
        );
      case 'Warning':
        return (
          <Badge className="gap-1 bg-amber-100 text-amber-800 hover:bg-amber-100">
            <AlertTriangle className="h-3 w-3" />
            {warningCount} warns
          </Badge>
        );
      case 'Draft':
        return (
          <Badge variant="secondary" className="gap-1">
            <Circle className="h-3 w-3" />
            Draft
          </Badge>
        );
      case 'New':
        return (
          <Badge variant="outline" className="gap-1">
            <Circle className="h-3 w-3" />
            New
          </Badge>
        );
    }
  };

  const completedCount = sites.filter(s => s.status === 'Complete').length;
  const inProgressCount = sites.filter(s => s.status === 'Draft' || s.status === 'Warning').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-teal-600 text-white font-bold text-xl">
              &#9670;
            </div>
            <h1 className="text-2xl font-semibold">SiteForge</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Import
            </Button>
            <Button className="gap-2 bg-teal-600 hover:bg-teal-700" onClick={() => onSiteSelect('new')}>
              <Plus className="h-4 w-4" />
              New Site
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-1">Projects</h2>
          <p className="text-sm text-gray-600">Telecom site documentation</p>
        </div>

        <Card className="mb-6 p-6">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-2xl font-bold text-gray-900">{sites.length}</div>
              <div className="text-sm text-gray-600">Total Sites</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{completedCount}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600">{inProgressCount}</div>
              <div className="text-sm text-gray-600">In Progress</div>
            </div>
          </div>
        </Card>

        {sites.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <Plus className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">No sites yet</h3>
            <p className="text-sm text-gray-500 mb-6">
              Create your first site to start generating TSSR and BOQ documents.
            </p>
            <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => onSiteSelect('new')}>
              <Plus className="h-4 w-4 mr-2" />
              Create New Site
            </Button>
          </Card>
        ) : (
          <div className="space-y-2">
            {sites.map((site) => (
              <Card
                key={site.id}
                className="p-4 hover:bg-gray-50 hover:shadow-md cursor-pointer transition-all border-l-4 border-l-transparent hover:border-l-teal-600"
                onClick={() => onSiteSelect(site.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="font-mono font-semibold text-gray-900 w-24">
                      {site.id}
                    </div>
                    <div className="font-medium text-gray-900 w-48">
                      {site.name}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span className="font-mono font-semibold text-teal-700">
                        {site.config}
                      </span>
                      <span className="text-gray-400">&bull;</span>
                      <span>{site.sectors} sectors</span>
                      <span className="text-gray-400">&bull;</span>
                      <span>{site.size}</span>
                      <span className="text-gray-400">&bull;</span>
                      <span>{site.category}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-xs text-gray-500">
                      {new Date(site.lastModified).toLocaleDateString('nb-NO')}
                    </div>
                    {getStatusBadge(site.status, site.warningCount)}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
