import React, { useState } from 'react';
import { db, resetDatabase } from '../db/db';
import { Trash2, AlertTriangle, Loader } from 'lucide-react';

interface ResetDataButtonProps {
  onReset?: () => void;
}

const ResetDataButton: React.FC<ResetDataButtonProps> = ({ onReset }) => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleResetClick = () => {
    setShowConfirmation(true);
    setConfirmText('');
    setError(null);
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    setConfirmText('');
    setError(null);
  };

  const handleConfirmReset = async () => {
    if (confirmText !== 'EFFACER') {
      setError('Veuillez saisir "EFFACER" pour confirmer');
      return;
    }

    try {
      setIsResetting(true);
      await resetDatabase();
      
      if (onReset) {
        onReset();
      }
      
      // La page sera rechargée par resetDatabase()
    } catch (error) {
      console.error('Erreur lors de la réinitialisation de la base de données:', error);
      setError('Une erreur est survenue lors de la réinitialisation de la base de données.');
      setIsResetting(false);
    }
  };

  return (
    <>
      <button
        onClick={handleResetClick}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
      >
        <Trash2 className="h-5 w-5 mr-2" />
        Réinitialiser toutes les données
      </button>

      {showConfirmation && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Réinitialiser toutes les données
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Cette action va supprimer définitivement toutes les données de l'application : clients, produits, pannes et interventions. Cette action est irréversible.
                    </p>
                    <div className="mt-4">
                      <label htmlFor="confirmText" className="block text-sm font-medium text-gray-700">
                        Tapez "EFFACER" pour confirmer
                      </label>
                      <input
                        type="text"
                        id="confirmText"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        className="mt-1 focus:ring-red-500 focus:border-red-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        placeholder="EFFACER"
                      />
                    </div>
                    {error && (
                      <p className="mt-2 text-sm text-red-600">{error}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                disabled={isResetting}
                onClick={handleConfirmReset}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-red-300 disabled:cursor-not-allowed"
              >
                {isResetting ? (
                  <>
                    <Loader className="h-5 w-5 mr-2 animate-spin" />
                    Réinitialisation...
                  </>
                ) : (
                  'Réinitialiser'
                )}
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={handleCancel}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ResetDataButton;