import React, { useState } from 'react';
import { extractPdfInformation, ExtractedInformation } from '../utils/pdfExtractor';
import { db, Client, Produit, calculerDateFinGarantie } from '../db/db';
import { FileUp, Check, AlertCircle, X, Loader, Save } from 'lucide-react';

interface PdfImporterProps {
  onImportComplete?: () => void;
}

const PdfImporter: React.FC<PdfImporterProps> = ({ onImportComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [extractedInfo, setExtractedInfo] = useState<ExtractedInformation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [saveInvoice, setSaveInvoice] = useState<boolean>(true);
  const [detectedFormat, setDetectedFormat] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
        setError(null);
      } else {
        setFile(null);
        setError('Veuillez sélectionner un fichier PDF');
      }
    }
  };

  const handleExtract = async () => {
    if (!file) {
      setError('Veuillez sélectionner un fichier PDF');
      return;
    }

    setIsLoading(true);
    setError(null);
    setExtractedInfo(null);
    setSuccess(false);
    setDetectedFormat(null);

    try {
      // Utiliser la fonction d'extraction PDF réelle
      const info = await extractPdfInformation(file);
      
      // Déterminer le format détecté
      if (info.marque_produit === 'STORBOX' || info.reference_produit?.includes('STORBOX')) {
        setDetectedFormat('ICI-Store');
      } else if (info.marque_produit === 'Leroy Merlin') {
        setDetectedFormat('Leroy Merlin');
      } else if (info.marque_produit === 'Castorama') {
        setDetectedFormat('Castorama');
      } else {
        setDetectedFormat('Format générique');
      }
      
      setExtractedInfo(info);
      setShowModal(true);
    } catch (err) {
      console.error("Erreur lors de l'extraction:", err);
      setError('Erreur lors de l\'extraction des informations: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!extractedInfo || !file) return;

    try {
      setIsLoading(true);
      
      // Créer ou mettre à jour le client
      let clientId: number;
      
      if (extractedInfo.nom_client) {
        // Vérifier si le client existe déjà (par email ou téléphone)
        let existingClient = null;
        
        if (extractedInfo.email_client) {
          existingClient = await db.clients.where('email').equals(extractedInfo.email_client).first();
        }
        
        if (!existingClient && extractedInfo.telephone_client) {
          existingClient = await db.clients.where('telephone').equals(extractedInfo.telephone_client).first();
        }
        
        const clientData: Partial<Client> = {
          nom: extractedInfo.nom_client,
          prenom: extractedInfo.prenom_client || '',
          adresse: extractedInfo.adresse_client || '',
          telephone: extractedInfo.telephone_client || '',
          email: extractedInfo.email_client || '',
          numeroCommande: extractedInfo.reference_produit || ''
        };
        
        // Ajouter la facture PDF si l'option est activée
        if (saveInvoice) {
          clientData.facturePdf = file;
          clientData.nomFichierFacture = file.name;
        }
        
        if (existingClient) {
          // Mettre à jour le client existant
          clientId = existingClient.id!;
          await db.clients.update(clientId, {
            ...clientData,
            nom: clientData.nom || existingClient.nom,
            prenom: clientData.prenom || existingClient.prenom,
            adresse: clientData.adresse || existingClient.adresse,
            email: clientData.email || existingClient.email,
            telephone: clientData.telephone || existingClient.telephone,
            numeroCommande: clientData.numeroCommande || existingClient.numeroCommande
          });
        } else {
          // Créer un nouveau client
          clientId = await db.clients.add({
            ...clientData,
            dateCreation: new Date()
          } as Client);
        }
        
        // Créer le produit si les informations sont disponibles
        if (extractedInfo.reference_produit || extractedInfo.modele_produit) {
          const dateAchat = extractedInfo.date_achat || new Date();
          const garantie = calculerDateFinGarantie(dateAchat);
          
          await db.produits.add({
            reference: extractedInfo.reference_produit || 'REF-' + Date.now(),
            modele: extractedInfo.modele_produit || 'Modèle inconnu',
            marque: extractedInfo.marque_produit || 'Marque inconnue',
            dateAchat: dateAchat,
            clientId: clientId,
            notes: `Importé depuis facture PDF le ${new Date().toLocaleDateString()}\n` +
                   `Format détecté: ${detectedFormat || 'Non spécifié'}\n` +
                   `Couleur armature: ${extractedInfo.couleur_armature || 'Non spécifiée'}\n` +
                   `Couleur toile: ${extractedInfo.couleur_toile || 'Non spécifiée'}\n` +
                   `Moteur: ${extractedInfo.moteur || 'Non spécifié'}\n` +
                   `Capteur vent: ${extractedInfo.capteur_vent ? 'Oui' : 'Non'}\n` +
                   `Prix: ${extractedInfo.prix_unitaire || 0}€\n` +
                   `TVA: ${extractedInfo.tva || 0}€\n` +
                   `Montant total: ${extractedInfo.montant_global || 0}€`,
            garantiePieces: garantie,
            garantieTelecommande: garantie,
            garantieCapteurVent: garantie,
            garantieToile: garantie,
            garantieCouture: garantie
          });
        }
        
        setSuccess(true);
        setShowModal(false);
        
        if (onImportComplete) {
          onImportComplete();
        }
      } else {
        setError('Informations client insuffisantes');
      }
    } catch (err) {
      console.error("Erreur lors de la sauvegarde:", err);
      setError('Erreur lors de la sauvegarde: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setExtractedInfo(null);
  };

  const formatCurrency = (amount?: number): string => {
    if (amount === undefined) return 'Non spécifié';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Importer depuis une facture PDF</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sélectionner une facture PDF
        </label>
        <div className="flex items-center">
          <label className="cursor-pointer bg-white border border-gray-300 rounded-md py-2 px-3 flex items-center justify-center text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <FileUp className="h-5 w-5 mr-2 text-gray-400" />
            <span>Choisir un fichier</span>
            <input
              type="file"
              className="sr-only"
              accept=".pdf"
              onChange={handleFileChange}
            />
          </label>
          <span className="ml-3 text-sm text-gray-500">
            {file ? file.name : 'Aucun fichier sélectionné'}
          </span>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={handleExtract}
          disabled={!file || isLoading}
          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
            !file || isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
          }`}
        >
          {isLoading ? (
            <>
              <Loader className="h-5 w-5 mr-2 animate-spin" />
              Extraction en cours...
            </>
          ) : (
            'Extraire les informations'
          )}
        </button>
      </div>
      
      {error && (
        <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}
      
      {success && (
        <div className="mt-4 bg-green-50 border-l-4 border-green-400 p-4">
          <div className="flex items-center">
            <Check className="h-5 w-5 text-green-400 mr-2" />
            <p className="text-sm text-green-700">Importation réussie !</p>
          </div>
        </div>
      )}
      
      {/* Modal pour afficher et confirmer les informations extraites */}
      {showModal && extractedInfo && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex justify-between items-center pb-3 border-b">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Informations extraites
                  {detectedFormat && (
                    <span className="ml-2 text-sm font-normal text-blue-600">
                      Format détecté: {detectedFormat}
                    </span>
                  )}
                </h3>
                <button
                  onClick={closeModal}
                  className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="mt-4 max-h-96 overflow-y-auto">
                <h4 className="text-md font-medium text-gray-800 mb-2">Informations client</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Nom</p>
                    <p className="text-sm text-gray-900">{extractedInfo.nom_client || 'Non détecté'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Prénom</p>
                    <p className="text-sm text-gray-900">{extractedInfo.prenom_client || 'Non détecté'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-gray-500">Adresse</p>
                    <p className="text-sm text-gray-900">{extractedInfo.adresse_client || 'Non détectée'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Téléphone</p>
                    <p className="text-sm text-gray-900">{extractedInfo.telephone_client || 'Non détecté'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <p className="text-sm text-gray-900">{extractedInfo.email_client || 'Non détecté'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">N° Commande</p>
                    <p className="text-sm text-gray-900">{extractedInfo.reference_produit || 'Non détecté'}</p>
                  </div>
                </div>
                
                <h4 className="text-md font-medium text-gray-800 mb-2">Informations produit</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Référence</p>
                    <p className="text-sm text-gray-900">{extractedInfo.reference_produit || 'Non détectée'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Modèle</p>
                    <p className="text-sm text-gray-900">{extractedInfo.modele_produit || 'Non détecté'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Marque</p>
                    <p className="text-sm text-gray-900">{extractedInfo.marque_produit || 'Non détectée'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Couleur armature</p>
                    <p className="text-sm text-gray-900">{extractedInfo.couleur_armature || 'Non détectée'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Couleur toile</p>
                    <p className="text-sm text-gray-900">{extractedInfo.couleur_toile || 'Non détectée'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Moteur</p>
                    <p className="text-sm text-gray-900">{extractedInfo.moteur || 'Non détecté'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Capteur vent</p>
                    <p className="text-sm text-gray-900">{extractedInfo.capteur_vent ? 'Oui' : 'Non'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Date d'achat</p>
                    <p className="text-sm text-gray-900">
                      {extractedInfo.date_achat 
                        ? extractedInfo.date_achat.toLocaleDateString() 
                        : 'Non détectée (date actuelle sera utilisée)'}
                    </p>
                  </div>
                </div>
                
                <h4 className="text-md font-medium text-gray-800 mt-4 mb-2">Informations de prix</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Prix unitaire</p>
                    <p className="text-sm text-gray-900">{formatCurrency(extractedInfo.prix_unitaire)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">TVA</p>
                    <p className="text-sm text-gray-900">{formatCurrency(extractedInfo.tva)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Frais de port</p>
                    <p className="text-sm text-gray-900">{formatCurrency(extractedInfo.frais_port)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Montant global</p>
                    <p className="text-sm text-gray-900">{formatCurrency(extractedInfo.montant_global)}</p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={saveInvoice}
                      onChange={(e) => setSaveInvoice(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Enregistrer la facture PDF avec le client
                    </span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                onClick={handleSave}
                disabled={isLoading}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                {isLoading ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Enregistrer
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PdfImporter;