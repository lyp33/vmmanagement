"use client"

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { FolderPlus } from 'lucide-react';

interface Project {
  id: string;
  name: string;
}

interface AssignProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  assignedProjectIds: string[];
  onAssignComplete: () => void;
}

export function AssignProjectDialog({
  open,
  onOpenChange,
  userId,
  userName,
  assignedProjectIds,
  onAssignComplete
}: AssignProjectDialogProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (open) {
      fetchProjects();
    }
  }, [open]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/projects-simple');
      if (!response.ok) throw new Error('Failed to fetch projects');
      
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedProjectId) return;

    setAssigning(true);

    try {
      const response = await fetch(`/api/projects-simple/${selectedProjectId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign project');
      }

      onAssignComplete();
      onOpenChange(false);
      setSelectedProjectId('');
    } catch (error) {
      console.error('Assign error:', error);
      alert(error instanceof Error ? error.message : 'Failed to assign project');
    } finally {
      setAssigning(false);
    }
  };

  const availableProjects = projects.filter(
    project => !assignedProjectIds.includes(project.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Project</DialogTitle>
          <DialogDescription>
            Assign a project to user: {userName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Loading projects...</p>
            </div>
          ) : availableProjects.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No available projects to assign
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="project">Select Project</Label>
              <Select
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
                disabled={assigning}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a project" />
                </SelectTrigger>
                <SelectContent>
                  {availableProjects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={assigning}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedProjectId || assigning || loading}
          >
            {assigning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Assigning...
              </>
            ) : (
              <>
                <FolderPlus className="w-4 h-4 mr-2" />
                Assign Project
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
