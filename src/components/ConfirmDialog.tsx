import React from 'react';
import { AlertTriangle, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  isOpen: boolean;
  isLoading?: boolean;
  isDangerous?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  message,
  confirmLabel,
  cancelLabel,
  isOpen,
  isLoading = false,
  isDangerous = false,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full">
        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div className="sm:flex sm:items-start">
            <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:mx-0 sm:h-10 sm:w-10 ${isDangerous ? 'bg-red-100' : 'bg-blue-100'}`}>
              <AlertTriangle className={`h-6 w-6 ${isDangerous ? 'text-red-600' : 'text-blue-600'}`} />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {title}
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  {message}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          <Button
            variant={isDangerous ? "destructive" : "default"}
            disabled={isLoading}
            onClick={onConfirm}
            className="w-full sm:ml-3 sm:w-auto"
          >
            {isLoading ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Chargement...
              </>
            ) : (
              confirmLabel
            )}
          </Button>
          <Button
            variant="outline"
            disabled={isLoading}
            onClick={onCancel}
            className="mt-3 w-full sm:mt-0 sm:ml-3 sm:w-auto"
          >
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;