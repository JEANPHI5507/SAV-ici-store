import React, { useState } from 'react';
import { db } from '../db/db';
import PdfImporter from '../components/PdfImporter';
import ResetDataButton from '../components/ResetDataButton';
import { FileDown, FileUp, Check, AlertCircle } from 'lucide-react';

const ImportExport: React.FC = () => {
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<boolean>(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      // Récupérer toutes les données
      const clients = await db.clients.toArray();
      const produits = await db.produits.toArray();
      const pannes = await db.pannes.toArray();
      const interventions = await db.interventions.toArray();

      // Créer un objet avec toutes les données
      const exportData = {
        clients,
        produits,
        pannes,
        interventions,
        exportDate: new Date().toISOString()
      };

      // Convertir en JSON
      const jsonData = JSON.stringify(exportData, null, 2);

      // Créer un blob et un lien de téléchargement
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sav-stores-bannes-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportSuccess(true);
      setExportError(null);

      // Réinitialiser le message de succès après 3 secondes
      setTimeout(() => {
        setExportSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Erreur lors de l\'exportation des données:', error);
      setExportError('Une erreur est survenue lors de l\'exportation des données.');
      setExportSuccess(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    try {
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          if (!event.target || typeof event.target.result !== 'string') {
            throw new Error('Erreur de lecture du fichier');
          }

          const importData = JSON.parse(event.target.result);

          // Vérifier la structure des données
          if (!importData.clients || !importData.produits || !importData.pannes) {
            throw new Error('Format de fichier invalide');
          }

          // Confirmer l'importation
          if (!window.confirm('Cette action remplacera toutes les données existantes. Voulez-vous continuer?')) {
            return;
          }

          // Supprimer les données existantes
          await db.interventions.clear();
          await db.pannes.clear();
          await db.produits.clear();
          await db.clients.clear();

          // Convertir les dates en objets Date
          const processDate = (item: any) => {
            Object.keys(item).forEach(key => {
              if (key.toLowerCase().includes('date') && typeof item[key] === 'string') {
                item[key] = new Date(item[key]);
              }
            });
            return item;
          };

          // Importer les clients
          for (const client of importData.clients) {
            await db.clients.add(processDate(client));
          }

          // Importer les produits
          for (const produit of importData.produits) {
            await db.produits.add(processDate(produit));
          }

          // Importer les pannes
          for (const panne of importData.pannes) {
            await db.pannes.add(processDate(panne));
          }

          // Importer les interventions si elles existent
          if (importData.interventions) {
            for (const intervention of importData.interventions) {
              await db.interventions.add(processDate(intervention));
            }
          }

          setImportSuccess(true);
          setImportError(null);

          // Réinitialiser le message de succès après 3 secondes
          setTimeout(() => {
            setImportSuccess(false);
          }, 3000);
        } catch (error) {
          console.error('Erreur lors de l\'importation des données:', error);
          setImportError('Une erreur est survenue lors de l\'importation des données.');
          setImportSuccess(false);
        }
      };

      reader.readAsText(file);
    } catch (error) {
      console.error('Erreur lors de la lecture du fichier:', error);
      setImportError('Une erreur est survenue lors de la lecture du fichier.');
      setImportSuccess(false);
    }
  };

  const handlePdfImportComplete = () => {
    setImportSuccess(true);
    
    // Réinitialiser le message de succès après 3 secondes
    setTimeout(() => {
      setImportSuccess(false);
    }, 3000);
  };

  return (
    <div className="py-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Importation et Exportation</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section d'importation PDF */}
        <PdfImporter onImportComplete={handlePdfImportComplete} />
        
        {/* Section d'exportation */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Exporter les données</h2>
          <p className="text-gray-600 mb-4">
            Exportez toutes les données de l'application (clients, produits, pannes) dans un fichier JSON que vous pourrez sauvegarder ou importer ultérieurement.
          </p>
          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FileDown className="h-5 w-5 mr-2" />
            Exporter les données
          </button>
          
          {exportSuccess && (
            <div className="mt-4 bg-green-50 border-l-4 border-green-400 p-4">
              <div className="flex items-center">
                <Check className="h-5 w-5 text-green-400 mr-2" />
                <p className="text-sm text-green-700">Exportation réussie !</p>
              </div>
            </div>
          )}
          
          {exportError && (
            <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-sm text-red-700">{exportError}</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Section d'importation JSON */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Importer des données</h2>
          <p className="text-gray-600 mb-4">
            Importez des données précédemment exportées. Attention, cette action remplacera toutes les données existantes.
          </p>
          <label className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer">
            <FileUp className="h-5 w-5 mr-2" />
            Importer des données
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="sr-only"
            />
          </label>
          
          {importSuccess && (
            <div className="mt-4 bg-green-50 border-l-4 border-green-400 p-4">
              <div className="flex items-center">
                <Check className="h-5 w-5 text-green-400 mr-2" />
                <p className="text-sm text-green-700">Importation réussie !</p>
              </div>
            </div>
          )}
          
          {importError && (
            <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-sm text-red-700">{importError}</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Section de réinitialisation des données */}
        <div className="bg-white p-6 rounded-lg shadow-md md:col-span-2">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Réinitialisation des données</h2>
          <p className="text-gray-600 mb-4">
            Attention : cette action supprimera définitivement toutes les données de l'application. Cette opération est irréversible.
            Assurez-vous d'exporter vos données avant de procéder à une réinitialisation.
          </p>
          <ResetDataButton />
        </div>
      </div>
    </div>
  );
};

export default ImportExport;