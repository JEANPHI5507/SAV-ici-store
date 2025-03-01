import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Produit, Client, calculerDateFinGarantie } from '../db/db';
import { Plus, Edit, Trash2, X, Shield, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import SearchBar from '@/components/SearchBar';
import EmptyState from '@/components/EmptyState';
import ConfirmDialog from '@/components/ConfirmDialog';

const Produits: React.FC = () => {
  const [recherche, setRecherche] = useState('');
  const [produitEnEdition, setProduitEnEdition] = useState<Produit | null>(null);
  const [nouveauProduit, setNouveauProduit] = useState(false);
  const [formData, setFormData] = useState<Omit<Produit, 'id'>>({
    reference: '',
    modele: '',
    marque: '',
    dateAchat: undefined,
    clientId: 0,
    notes: '',
    garantiePieces: undefined,
    garantieTelecommande: undefined,
    garantieCapteurVent: undefined,
    garantieToile: undefined,
    garantieCouture: undefined
  });
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const produits = useLiveQuery(
    () => {
      if (recherche) {
        const rechercheMin = recherche.toLowerCase();
        return db.produits
          .filter(produit => 
            produit.reference.toLowerCase().includes(rechercheMin) || 
            produit.modele.toLowerCase().includes(rechercheMin) || 
            produit.marque.toLowerCase().includes(rechercheMin)
          )
          .toArray();
      }
      return db.produits.toArray();
    },
    [recherche]
  );

  const clients = useLiveQuery(() => db.clients.toArray());

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'clientId') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) }));
    } else if (name === 'dateAchat') {
      const dateAchat = value ? new Date(value) : undefined;
      const garantie = calculerDateFinGarantie(dateAchat);
      
      setFormData(prev => ({ 
        ...prev, 
        dateAchat,
        garantiePieces: garantie,
        garantieTelecommande: garantie,
        garantieCapteurVent: garantie,
        garantieToile: garantie,
        garantieCouture: garantie
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const ouvrirFormulaire = (produit?: Produit) => {
    if (produit) {
      setProduitEnEdition(produit);
      setFormData({
        reference: produit.reference,
        modele: produit.modele,
        marque: produit.marque,
        dateAchat: produit.dateAchat,
        clientId: produit.clientId,
        notes: produit.notes || '',
        garantiePieces: produit.garantiePieces,
        garantieTelecommande: produit.garantieTelecommande,
        garantieCapteurVent: produit.garantieCapteurVent,
        garantieToile: produit.garantieToile,
        garantieCouture: produit.garantieCouture
      });
      setNouveauProduit(false);
    } else {
      setProduitEnEdition(null);
      setFormData({
        reference: '',
        modele: '',
        marque: '',
        dateAchat: undefined,
        clientId: clients && clients.length > 0 ? clients[0].id! : 0,
        notes: '',
        garantiePieces: undefined,
        garantieTelecommande: undefined,
        garantieCapteurVent: undefined,
        garantieToile: undefined,
        garantieCouture: undefined
      });
      setNouveauProduit(true);
    }
  };

  const fermerFormulaire = () => {
    setProduitEnEdition(null);
    setNouveauProduit(false);
  };

  const sauvegarderProduit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (nouveauProduit) {
        await db.produits.add(formData);
      } else if (produitEnEdition) {
        await db.produits.update(produitEnEdition.id!, formData);
      }
      
      fermerFormulaire();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du produit:', error);
      alert('Une erreur est survenue lors de la sauvegarde du produit.');
    }
  };

  const confirmerSuppression = (id: number) => {
    setConfirmDelete(id);
  };

  const annulerSuppression = () => {
    setConfirmDelete(null);
  };

  const supprimerProduit = async () => {
    if (!confirmDelete) return;
    
    try {
      // Vérifier si le produit a des pannes
      const pannes = await db.pannes.where('produitId').equals(confirmDelete).count();
      
      if (pannes > 0) {
        alert(`Impossible de supprimer ce produit car il a ${pannes} panne(s) associée(s).`);
        setConfirmDelete(null);
        return;
      }
      
      await db.produits.delete(confirmDelete);
      setConfirmDelete(null);
    } catch (error) {
      console.error('Erreur lors de la suppression du produit:', error);
      alert('Une erreur est survenue lors de la suppression du produit.');
      setConfirmDelete(null);
    }
  };

  const getNomClient = (clientId: number): string => {
    if (!clients) return 'Client inconnu';
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.nom} ${client.prenom}` : 'Client inconnu';
  };

  const formatDate = (date?: Date): string => {
    if (!date) return 'Non définie';
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const estSousGarantie = (date?: Date): boolean => {
    if (!date) return false;
    return new Date() <= new Date(date);
  };

  return (
    <div className="py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Gestion des produits</h1>
        <button
          onClick={() => ouvrirFormulaire()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nouveau produit
        </button>
      </div>

      {/* Barre de recherche */}
      <div className="mb-6">
        <SearchBar 
          value={recherche} 
          onChange={setRecherche} 
          placeholder="Rechercher un produit par référence, modèle, marque..."
        />
      </div>

      {/* Liste des produits */}
      {produits && produits.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {produits.map((produit) => (
            <Card key={produit.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 mr-3">
                      <Package className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{produit.marque} {produit.modele}</h3>
                      <p className="text-sm text-gray-500">Réf: {produit.reference}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => ouvrirFormulaire(produit)}
                      className="inline-flex items-center p-1.5 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => confirmerSuppression(produit.id!)}
                      className="inline-flex items-center p-1.5 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <p className="text-sm text-gray-500">Client: {getNomClient(produit.clientId)}</p>
                  <p className="text-sm text-gray-500">Date d'achat: {formatDate(produit.dateAchat)}</p>
                  
                  {/* Informations de garantie */}
                  <div className="mt-2">
                    <h4 className="text-sm font-medium text-gray-700 flex items-center">
                      <Shield className="h-4 w-4 mr-1 text-blue-500" />
                      Garantie (5 ans)
                    </h4>
                    <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div className={`flex items-center ${estSousGarantie(produit.garantiePieces) ? 'text-green-600' : 'text-red-600'}`}>
                        <span className="font-medium">Pièces:</span>
                        <span className="ml-1">{formatDate(produit.garantiePieces)}</span>
                      </div>
                      <div className={`flex items-center ${estSousGarantie(produit.garantieTelecommande) ? 'text-green-600' : 'text-red-600'}`}>
                        <span className="font-medium">Télécommande:</span>
                        <span className="ml-1">{formatDate(produit.garantieTelecommande)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {produit.notes && <p className="text-sm text-gray-500 mt-2 truncate">{produit.notes}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Aucun produit"
          description={recherche ? "Aucun produit ne correspond à votre recherche." : "Commencez par ajouter un produit."}
          icon={<Package className="h-12 w-12 text-gray-400" />}
          actionLabel="Ajouter un produit"
          onAction={() => ouvrirFormulaire()}
        />
      )}

      {/* Modal de formulaire */}
      {(nouveauProduit || produitEnEdition) && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex justify-between items-center pb-3 border-b">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {nouveauProduit ? 'Ajouter un produit' : 'Modifier le produit'}
                </h3>
                <button
                  onClick={fermerFormulaire}
                  className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={sauvegarderProduit} className="mt-4">
                <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="reference" className="block text-sm font-medium text-gray-700">Référence</label>
                    <input
                      type="text"
                      name="reference"
                      id="reference"
                      required
                      value={formData.reference}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label htmlFor="modele" className="block text-sm font-medium text-gray-700">Modèle</label>
                    <input
                      type="text"
                      name="modele"
                      id="modele"
                      required
                      value={formData.modele}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label htmlFor="marque" className="block text-sm font-medium text-gray-700">Marque</label>
                    <input
                      type="text"
                      name="marque"
                      id="marque"
                      required
                      value={formData.marque}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label htmlFor="dateAchat" className="block text-sm font-medium text-gray-700">Date d'achat</label>
                    <input
                      type="date"
                      name="dateAchat"
                      id="dateAchat"
                      value={formData.dateAchat ? new Date(formData.dateAchat).toISOString().split('T')[0] : ''}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                    <p className="mt-1 text-xs text-gray-500">La garantie de 5 ans sera automatiquement calculée</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="clientId" className="block text-sm font-medium text-gray-700">Client</label>
                    <select
                      name="clientId"
                      id="clientId"
                      required
                      value={formData.clientId}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    >
                      {clients && clients.map(client => (
                        <option key={client.id} value={client.id}>
                          {client.nom} {client.prenom}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes</label>
                    <textarea
                      name="notes"
                      id="notes"
                      rows={3}
                      value={formData.notes || ''}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm"
                  >
                    Sauvegarder
                  </button>
                  <button
                    type="button"
                    onClick={fermerFormulaire}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Dialogue de confirmation de suppression */}
      <ConfirmDialog
        isOpen={confirmDelete !== null}
        title="Supprimer le produit"
        message="Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        isDangerous={true}
        onConfirm={supprimerProduit}
        onCancel={annulerSuppression}
      />
    </div>
  );
};

export default Produits;