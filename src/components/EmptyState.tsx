import React from 'react';
import { FileQuestion, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = <FileQuestion className="h-12 w-12 text-gray-400" />,
  actionLabel,
  onAction
}) => {
  return (
    <div className="text-center py-12 px-4 bg-white rounded-lg shadow">
      <div className="flex justify-center">
        {icon}
      </div>
      <h3 className="mt-2 text-lg font-medium text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-6">
          <Button
            onClick={onAction}
            className="inline-flex items-center"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;