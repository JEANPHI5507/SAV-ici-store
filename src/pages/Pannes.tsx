import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Panne, Client, Produit, estSousGarantie } from '../db/db';
import { Plus, Search, Edit, Trash2, X, Filter, Shield } from 'lucide-react';

const Pannes: React.FC = () => {
  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState<string>('');
  const [filtreGarantie, setFiltreGarantie] = useState<string>('');
  const [filtreComposant, setFiltreComposant] = useState<string>('');
  const [panneEnEdition, setPanneEnEdition] = useState<Panne | null>(null);
  const [nouvellePanne, setNouvellePanne] = useState(false);
  const [formData, setFormData] = useState<Omit<Panne, 'id'>>({
    dateDéclaration: new Date(),
    description: '',
    statut: 'en_attente',
    produitId: 0,
    clientId: 0,
    numeroSuivi: '',
    dateExpedition: undefined,
    dateRetour: undefined,
    coutReparation: 0,
    sousGarantie: true,
    composantConcerne: 'piece',
    notes: ''
  });
  const [filtresOuverts, setFiltresOuverts] = useState(false);
  const [produitSelectionne, setProduitSelectionne] = useState<Produit | null>(null);

  const clients = useLiveQuery(() => db.clients.toArray());
  const produits = useLiveQuery(() => db.produits.toArray());

  const pannes = useLiveQuery(
    () => {
      let collection = db.pannes.toCollection();
      
      // Appliquer les filtres
      if (filtreStatut) {
        collection = collection.filter(p => p.statut === filtreStatut);
      }
      
      if (filtreGarantie !== '') {
        const sousGarantie = filtreGarantie === 'true';
        collection = collection.filter(p => p.sousGarantie === sousGarantie);
      }
      
      if (filtreComposant) {
        collection = collection.filter(p => p.composantConcerne === filtreComposant);
      }
      
      return collection.toArray();
    },
    [filtreStatut, filtreGarantie, filtreComposant]
  );

  const pannesFiltrees = React.useMemo(() => {
    if (!pannes) return [];
    
    if (recherche) {
      const rechercheMin = recherche.toLowerCase();
      return pannes.filter(panne => 
        panne.description.toLowerCase().includes(rechercheMin) || 
        panne.numeroSuivi?.toLowerCase().includes(rechercheMin)
      );
    }
    
    return pannes;
  }, [pannes, recherche]);

  // Mettre à jour le produit sélectionné lorsque le produitId change
  useEffect(() => {
    if (produits && formData.produitId) {
      const produit = produits.find(p => p.id === formData.produitId);
      setProduitSelectionne(produit || null);
    } else {
      setProduitSelectionne(null);
    }
  }, [formData.produitId, produits]);

  // Vérifier si le composant est sous garantie et mettre à jour le champ sousGarantie
  useEffect(() => {
    if (produitSelectionne && formData.composantConcerne) {
      let sousGarantie = false;
      
      switch (formData.composantConcerne) {
        case 'piece':
          sousGarantie = estSousGarantie(produitSelectionne, 'piece');
          break;
        case 'telecommande':
          sousGarantie = estSousGarantie(produitSelectionne, 'telecommande');
          break;
        case 'capteur_vent':
          sousGarantie = estSousGarantie(produitSelectionne, 'capteur_vent');
          break;
        case 'toile':
          sousGarantie = estSousGarantie(produitSelectionne, 'toile');
          break;
        case 'couture':
          sousGarantie = estSousGarantie(produitSelectionne, 'couture');
          break;
        default:
          sousGarantie = false;
      }
      
      setFormData(prev => ({ ...prev, sousGarantie }));
    }
  }, [produitSelectionne, formData.composantConcerne]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'clientId' || name === 'produitId') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) }));
    } else if (name === 'coutReparation') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else if (name === 'dateDéclaration' || name === 'dateExpedition' || name === 'dateRetour') {
      setFormData(prev => ({ ...prev, [name]: value ? new Date(value) : undefined }));
    } else if (name === 'statut') {
      setFormData(prev => ({ ...prev, [name]: value as 'en_attente' | 'diagnostic' | 'piece_commandee' | 'en_reparation' | 'expedie' | 'resolu' | 'annule' }));
    } else if (name === 'sousGarantie') {
      setFormData(prev => ({ ...prev, [name]: value === 'true' }));
    } else if (name === 'composantConcerne') {
      setFormData(prev => ({ ...prev, [name]: value as 'piece' | 'telecommande' | 'capteur_vent' | 'toile' | 'couture' | 'autre' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const ouvrirFormulaire = (panne?: Panne) => {
    if (panne) {
      setPanneEnEdition(panne);
      setFormData({
        dateDéclaration: panne.dateDéclaration,
        description: panne.description,
        statut: panne.statut,
        produitId: panne.produitId,
        clientId: panne.clientId,
        numeroSuivi: panne.numeroSuivi || '',
        dateExpedition: panne.dateExpedition,
        dateRetour: panne.dateRetour,
        coutReparation: panne.coutReparation || 0,
        sousGarantie: panne.sousGarantie,
        composantConcerne: panne.composantConcerne || 'piece',
        notes: panne.notes || ''
      });
      setNouvellePanne(false);
    } else {
      setPanneEnEdition(null);
      
      // Valeurs par défaut pour une nouvelle panne
      const defaultClientId = clients && clients.length > 0 ? clients[0].id! : 0;
      const defaultProduitId = produits && produits.length > 0 ? 
        produits.find(p => p.clientId === defaultClientId)?.id || produits[0].id! : 0;
      
      setFormData({
        dateDéclaration: new Date(),
        description: '',
        statut: 'en_attente',
        produitId: defaultProduitId,
        clientId: defaultClientId,
        numeroSuivi: '',
        dateExpedition: undefined,
        dateRetour: undefined,
        coutReparation: 0,
        sousGarantie: true,
        composantConcerne: 'piece',
        notes: ''
      });
      setNouvellePanne(true);
    }
  };

  const fermerFormulaire = () => {
    setPanneEnEdition(null);
    setNouvellePanne(false);
  };

  const sauvegarderPanne = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (nouvellePanne) {
        await db.pannes.add(formData);
      } else if (panneEnEdition) {
        await db.pannes.update(panneEnEdition.id!, formData);
      }
      
      fermerFormulaire();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de la panne:", error);
      alert("Une erreur est survenue lors de la sauvegarde de la panne.");
    }
  };

  const supprimerPanne = async (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette panne ? Cette action est irréversible.')) {
      try {
        await db.pannes.delete(id);
      } catch (error) {
        console.error("Erreur lors de la suppression de la panne:", error);
        alert("Une erreur est survenue lors de la suppression de la panne.");
      }
    }
  };

  const getNomClient = (clientId: number): string => {
    if (!clients) return 'Client inconnu';
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.nom} ${client.prenom}` : 'Client inconnu';
  };

  const getProduitInfo = (produitId: number): string => {
    if (!produits) return 'Produit inconnu';
    const produit = produits.find(p => p.id === produitId);
    return produit ? `${produit.marque} ${produit.modele} (${produit.reference})` : 'Produit inconnu';
  };

  const formatDate = (date?: Date): string => {
    if (!date) return 'Non définie';
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const getStatutLabel = (statut: string): string => {
    switch (statut) {
      case 'en_attente': return 'En attente';
      case 'diagnostic': return 'Diagnostic';
      case 'piece_commandee': return 'Pièce commandée';
      case 'en_reparation': return 'En réparation';
      case 'expedie': return 'Expédié';
      case 'resolu': return 'Résolu';
      case 'annule': return 'Annulé';
      default: return statut;
    }
  };

  const getComposantLabel = (composant?: string): string => {
    if (!composant) return 'Non spécifié';
    switch (composant) {
      case 'piece': return 'Pièce';
      case 'telecommande': return 'Télécommande';
      case 'capteur_vent': return 'Capteur vent';
      case 'toile': return 'Toile';
      case 'couture': return 'Couture';
      case 'autre': return 'Autre';
      default: return composant;
    }
  };

  const getStatutColor = (statut: string): string => {
    switch (statut) {
      case 'en_attente': return 'bg-yellow-100 text-yellow-800';
      case 'diagnostic': return 'bg-blue-100 text-blue-800';
      case 'piece_commandee': return 'bg-purple-100 text-purple-800';
      case 'en_reparation': return 'bg-orange-100 text-orange-800';
      case 'expedie': return 'bg-indigo-100 text-indigo-800';
      case 'resolu': return 'bg-green-100 text-green-800';
      case 'annule': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getComposantColor = (composant?: string): string => {
    if (!composant) return 'bg-gray-100 text-gray-800';
    switch (composant) {
      case 'piece': return 'bg-blue-100 text-blue-800';
      case 'telecommande': return 'bg-purple-100 text-purple-800';
      case 'capteur_vent': return 'bg-teal-100 text-teal-800';
      case 'toile': return 'bg-amber-100 text-amber-800';
      case 'couture': return 'bg-pink-100 text-pink-800';
      case 'autre': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleFiltres = () => {
    setFiltresOuverts(!filtresOuverts);
  };

  const resetFiltres = () => {
    setFiltreStatut('');
    setFiltreGarantie('');
    setFiltreComposant('');
  };

  // Mise à jour des produits en fonction du client sélectionné
  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const clientId = parseInt(e.target.value);
    setFormData(prev => ({ ...prev, clientId }));
    
    // Si des produits existent pour ce client, sélectionner le premier
    if (produits) {
      const produitsClient = produits.filter(p => p.clientId === clientId);
      if (produitsClient.length > 0) {
        setFormData(prev => ({ ...prev, produitId: produitsClient[0].id! }));
      }
    }
  };

  return (
    <div className="py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Gestion des pannes</h1>
        <div className="flex space-x-2">
          <button
            onClick={toggleFiltres}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Filter className="h-5 w-5 mr-2" />
            Filtres
          </button>
          <button
            onClick={() => ouvrirFormulaire()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nouvelle panne
          </button>
        </div>
      </div>

      {/* Filtres */}
      {filtresOuverts && (
        <div className="mb-6 bg-white p-4 rounded-md shadow">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="filtreStatut" className="block text-sm font-medium text-gray-700">Statut</label>
              <select
                id="filtreStatut"
                value={filtreStatut}
                onChange={(e) => setFiltreStatut(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="">Tous les statuts</option>
                <option value="en_attente">En attente</option>
                <option value="diagnostic">Diagnostic</option>
                <option value="piece_commandee">Pièce commandée</option>
                <option value="en_reparation">En réparation</option>
                <option value="expedie">Expédié</option>
                <option value="resolu">Résolu</option>
                <option value="annule">Annulé</option>
              </select>
            </div>
            <div>
              <label htmlFor="filtreGarantie" className="block text-sm font-medium text-gray-700">Garantie</label>
              <select
                id="filtreGarantie"
                value={filtreGarantie}
                onChange={(e) => setFiltreGarantie(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="">Tous</option>
                <option value="true">Sous garantie</option>
                <option value="false">Hors garantie</option>
              </select>
            </div>
            <div>
              <label htmlFor="filtreComposant" className="block text-sm font-medium text-gray-700">Composant</label>
              <select
                id="filtreComposant"
                value={filtreComposant}
                onChange={(e) => setFiltreComposant(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="">Tous les composants</option>
                <option value="piece">Pièce</option>
                <option value="telecommande">Télécommande</option>
                <option value="capteur_vent">Capteur vent</option>
                <option value="toile">Toile</option>
                <option value="couture">Couture</option>
                <option value="autre">Autre</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={resetFiltres}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Réinitialiser les filtres
            </button>
          </div>
        </div>
      )}

      {/* Barre de recherche */}
      <div className="mb-6">
        <div className="relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 pr-3"
            placeholder="Rechercher une panne..."
          />
        </div>
      </div>

      {/* Liste des pannes */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {pannesFiltrees && pannesFiltrees.length > 0 ? (
            pannesFiltrees.map((panne) => (
              <li key={panne.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-blue-600 truncate">
                        {getNomClient(panne.clientId)}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex">
                        <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatutColor(panne.statut)}`}>
                          {getStatutLabel(panne.statut)}
                        </p>
                        <p className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${panne.sousGarantie ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {panne.sousGarantie ? 'Sous garantie' : 'Hors garantie'}
                        </p>
                        {panne.composantConcerne && (
                          <p className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getComposantColor(panne.composantConcerne)}`}>
                            {getComposantLabel(panne.composantConcerne)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm text-gray-900">{panne.description}</p>
                      <p className="text-sm text-gray-500">Produit: {getProduitInfo(panne.produitId)}</p>
                      <p className="text-sm text-gray-500">Date de déclaration: {formatDate(panne.dateDéclaration)}</p>
                      {panne.numeroSuivi && (
                        <p className="text-sm text-gray-500">N° de suivi: <span className="font-medium">{panne.numeroSuivi}</span></p>
                      )}
                      {panne.dateExpedition && (
                        <p className="text-sm text-gray-500">Date d'expédition: {formatDate(panne.dateExpedition)}</p>
                      )}
                      {panne.dateRetour && (
                        <p className="text-sm text-gray-500">Date de retour: {formatDate(panne.dateRetour)}</p>
                      )}
                      {panne.coutReparation > 0 && (
                        <p className="text-sm text-gray-500">
                          Coût de réparation: {panne.coutReparation}€
                        </p>
                      )}
                      {panne.notes && <p className="text-sm text-gray-500 mt-1">Notes: {panne.notes}</p>}
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0 flex space-x-2">
                    <button
                      onClick={() => ouvrirFormulaire(panne)}
                      className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => supprimerPanne(panne.id!)}
                      className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))
          ) : (
            <li className="px-4 py-4 sm:px-6 text-center text-gray-500">
              {recherche || filtreStatut || filtreGarantie || filtreComposant ? 'Aucune panne ne correspond à vos critères.' : 'Aucune panne enregistrée.'}
            </li>
          )}
        </ul>
      </div>

      {/* Modal de formulaire */}
      {(nouvellePanne || panneEnEdition) && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex justify-between items-center pb-3 border-b">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {nouvellePanne ? 'Ajouter une panne' : 'Modifier la panne'}
                </h3>
                <button
                  onClick={fermerFormulaire}
                  className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={sauvegarderPanne} className="mt-4">
                <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="clientId" className="block text-sm font-medium text-gray-700">Client</label>
                    <select
                      name="clientId"
                      id="clientId"
                      required
                      value={formData.clientId}
                      onChange={handleClientChange}
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
                    <label htmlFor="produitId" className="block text-sm font-medium text-gray-700">Produit</label>
                    <select
                      name="produitId"
                      id="produitId"
                      required
                      value={formData.produitId}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    >
                      {produits && produits
                        .filter(produit => produit.clientId === formData.clientId)
                        .map(produit => (
                          <option key={produit.id} value={produit.id}>
                            {produit.marque} {produit.modele} ({produit.reference})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="dateDéclaration" className="block text-sm font-medium text-gray-700">Date de déclaration</label>
                    <input
                      type="date"
                      name="dateDéclaration"
                      id="dateDéclaration"
                      required
                      value={new Date(formData.dateDéclaration).toISOString().split('T')[0]}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label htmlFor="statut" className="block text-sm font-medium text-gray-700">Statut</label>
                    <select
                      name="statut"
                      id="statut"
                      required
                      value={formData.statut}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    >
                      <option value="en_attente">En attente</option>
                      <option value="diagnostic">Diagnostic</option>
                      <option value="piece_commandee">Pièce commandée</option>
                      <option value="en_reparation">En réparation</option>
                      <option value="expedie">Expédié</option>
                      <option value="resolu">Résolu</option>
                      <option value="annule">Annulé</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      name="description"
                      id="description"
                      rows={3}
                      required
                      value={formData.description}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label htmlFor="composantConcerne" className="block text-sm font-medium text-gray-700">Composant concerné</label>
                    <select
                      name="composantConcerne"
                      id="composantConcerne"
                      required
                      value={formData.composantConcerne || 'piece'}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    >
                      <option value="piece">Pièce</option>
                      <option value="telecommande">Télécommande</option>
                      <option value="capteur_vent">Capteur vent</option>
                      <option value="toile">Toile</option>
                      <option value="couture">Couture</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="sousGarantie" className="block text-sm font-medium text-gray-700">Sous garantie</label>
                    <select
                      name="sousGarantie"
                      id="sousGarantie"
                      required
                      value={formData.sousGarantie.toString()}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    >
                      <option value="true">Oui</option>
                      <option value="false">Non</option>
                    </select>
                    {produitSelectionne && formData.composantConcerne && (
                      <div className="mt-1 flex items-center">
                        <Shield className="h-4 w-4 mr-1 text-blue-500" />
                        <span className="text-xs text-gray-500">
                          Garantie {getComposantLabel(formData.composantConcerne)}: {formatDate(produitSelectionne[`garantie${formData.composantConcerne.charAt(0).toUpperCase() + formData.composantConcerne.slice(1)}` as keyof Produit] as Date | undefined)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label htmlFor="coutReparation" className="block text-sm font-medium text-gray-700">Coût de réparation (€)</label>
                    <input
                      type="number"
                      name="coutReparation"
                      id="coutReparation"
                      min="0"
                      step="0.01"
                      value={formData.coutReparation}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label htmlFor="numeroSuivi" className="block text-sm font-medium text-gray-700">Numéro de suivi</label>
                    <input
                      type="text"
                      name="numeroSuivi"
                      id="numeroSuivi"
                      value={formData.numeroSuivi || ''}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label htmlFor="dateExpedition" className="block text-sm font-medium text-gray-700">Date d'expédition</label>
                    <input
                      type="date"
                      name="dateExpedition"
                      id="dateExpedition"
                      value={formData.dateExpedition ? new Date(formData.dateExpedition).toISOString().split('T')[0] : ''}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label htmlFor="dateRetour" className="block text-sm font-medium text-gray-700">Date de retour</label>
                    <input
                      type="date"
                      name="dateRetour"
                      id="dateRetour"
                      value={formData.dateRetour ? new Date(formData.dateRetour).toISOString().split('T')[0] : ''}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
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
    </div>
  );
};

export default Pannes;