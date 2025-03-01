import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Intervention, Client, Produit, magasinsLeroyMerlin } from '../db/db';
import { Plus, Search, Edit, Trash2, X, Filter } from 'lucide-react';

const Interventions: React.FC = () => {
  const [recherche, setRecherche] = useState('');
  const [filtreStatut, setFiltreStatut] = useState<string>('');
  const [filtreType, setFiltreType] = useState<string>('');
  const [filtreTypeSAV, setFiltreTypeSAV] = useState<string>('');
  const [filtreMagasin, setFiltreMagasin] = useState<string>('');
  const [interventionEnEdition, setInterventionEnEdition] = useState<Intervention | null>(null);
  const [nouvelleIntervention, setNouvelleIntervention] = useState(false);
  const [formData, setFormData] = useState<Omit<Intervention, 'id'>>({
    dateIntervention: new Date(),
    type: 'installation',
    description: '',
    statut: 'planifiee',
    technicien: '',
    produitId: 0,
    clientId: 0,
    coutPieces: 0,
    coutMainOeuvre: 0,
    notes: '',
    typeSAV: 'interne',
    magasinLeroyMerlin: undefined
  });
  const [filtresOuverts, setFiltresOuverts] = useState(false);

  const clients = useLiveQuery(() => db.clients.toArray());
  const produits = useLiveQuery(() => db.produits.toArray());

  const interventions = useLiveQuery(
    () => {
      let collection = db.interventions.toCollection();
      
      // Appliquer les filtres
      if (filtreStatut) {
        collection = collection.filter(i => i.statut === filtreStatut);
      }
      
      if (filtreType) {
        collection = collection.filter(i => i.type === filtreType);
      }
      
      if (filtreTypeSAV) {
        collection = collection.filter(i => i.typeSAV === filtreTypeSAV);
      }
      
      if (filtreMagasin && filtreTypeSAV === 'leroy_merlin') {
        collection = collection.filter(i => i.magasinLeroyMerlin === filtreMagasin);
      }
      
      return collection.toArray();
    },
    [filtreStatut, filtreType, filtreTypeSAV, filtreMagasin]
  );

  const interventionsFiltrees = React.useMemo(() => {
    if (!interventions) return [];
    
    if (recherche) {
      const rechercheMin = recherche.toLowerCase();
      return interventions.filter(intervention => 
        intervention.description.toLowerCase().includes(rechercheMin) || 
        intervention.technicien.toLowerCase().includes(rechercheMin) ||
        (intervention.magasinLeroyMerlin && intervention.magasinLeroyMerlin.toLowerCase().includes(rechercheMin))
      );
    }
    
    return interventions;
  }, [interventions, recherche]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'clientId' || name === 'produitId') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) }));
    } else if (name === 'coutPieces' || name === 'coutMainOeuvre') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else if (name === 'dateIntervention') {
      setFormData(prev => ({ ...prev, [name]: new Date(value) }));
    } else if (name === 'type') {
      setFormData(prev => ({ ...prev, [name]: value as 'installation' | 'reparation' | 'maintenance' | 'autre' }));
    } else if (name === 'statut') {
      setFormData(prev => ({ ...prev, [name]: value as 'planifiee' | 'en_cours' | 'terminee' | 'annulee' }));
    } else if (name === 'typeSAV') {
      const typeSAV = value as 'interne' | 'leroy_merlin';
      // Si on passe de Leroy Merlin à interne, on efface le magasin
      const magasinLeroyMerlin = typeSAV === 'interne' ? undefined : formData.magasinLeroyMerlin;
      setFormData(prev => ({ ...prev, typeSAV, magasinLeroyMerlin }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const ouvrirFormulaire = (intervention?: Intervention) => {
    if (intervention) {
      setInterventionEnEdition(intervention);
      setFormData({
        dateIntervention: intervention.dateIntervention,
        type: intervention.type,
        description: intervention.description,
        statut: intervention.statut,
        technicien: intervention.technicien,
        produitId: intervention.produitId,
        clientId: intervention.clientId,
        coutPieces: intervention.coutPieces || 0,
        coutMainOeuvre: intervention.coutMainOeuvre || 0,
        notes: intervention.notes || '',
        typeSAV: intervention.typeSAV || 'interne',
        magasinLeroyMerlin: intervention.magasinLeroyMerlin
      });
      setNouvelleIntervention(false);
    } else {
      setInterventionEnEdition(null);
      
      // Valeurs par défaut pour une nouvelle intervention
      const defaultClientId = clients && clients.length > 0 ? clients[0].id! : 0;
      const defaultProduitId = produits && produits.length > 0 ? 
        produits.find(p => p.clientId === defaultClientId)?.id || produits[0].id! : 0;
      
      setFormData({
        dateIntervention: new Date(),
        type: 'installation',
        description: '',
        statut: 'planifiee',
        technicien: '',
        produitId: defaultProduitId,
        clientId: defaultClientId,
        coutPieces: 0,
        coutMainOeuvre: 0,
        notes: '',
        typeSAV: 'interne',
        magasinLeroyMerlin: undefined
      });
      setNouvelleIntervention(true);
    }
  };

  const fermerFormulaire = () => {
    setInterventionEnEdition(null);
    setNouvelleIntervention(false);
  };

  const sauvegarderIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (nouvelleIntervention) {
        await db.interventions.add(formData);
      } else if (interventionEnEdition) {
        await db.interventions.update(interventionEnEdition.id!, formData);
      }
      
      fermerFormulaire();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de l'intervention:", error);
      alert("Une erreur est survenue lors de la sauvegarde de l'intervention.");
    }
  };

  const supprimerIntervention = async (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette intervention ? Cette action est irréversible.')) {
      try {
        await db.interventions.delete(id);
      } catch (error) {
        console.error("Erreur lors de la suppression de l'intervention:", error);
        alert("Une erreur est survenue lors de la suppression de l'intervention.");
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

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const getStatutLabel = (statut: string): string => {
    switch (statut) {
      case 'planifiee': return 'Planifiée';
      case 'en_cours': return 'En cours';
      case 'terminee': return 'Terminée';
      case 'annulee': return 'Annulée';
      default: return statut;
    }
  };

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'installation': return 'Installation';
      case 'reparation': return 'Réparation';
      case 'maintenance': return 'Maintenance';
      case 'autre': return 'Autre';
      default: return type;
    }
  };

  const getTypeSAVLabel = (typeSAV?: string): string => {
    switch (typeSAV) {
      case 'interne': return 'SAV Interne';
      case 'leroy_merlin': return 'SAV Leroy Merlin';
      default: return 'SAV Interne';
    }
  };

  const getStatutColor = (statut: string): string => {
    switch (statut) {
      case 'planifiee': return 'bg-yellow-100 text-yellow-800';
      case 'en_cours': return 'bg-blue-100 text-blue-800';
      case 'terminee': return 'bg-green-100 text-green-800';
      case 'annulee': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'installation': return 'bg-purple-100 text-purple-800';
      case 'reparation': return 'bg-orange-100 text-orange-800';
      case 'maintenance': return 'bg-teal-100 text-teal-800';
      case 'autre': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeSAVColor = (typeSAV?: string): string => {
    switch (typeSAV) {
      case 'interne': return 'bg-blue-100 text-blue-800';
      case 'leroy_merlin': return 'bg-green-100 text-green-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const toggleFiltres = () => {
    setFiltresOuverts(!filtresOuverts);
  };

  const resetFiltres = () => {
    setFiltreStatut('');
    setFiltreType('');
    setFiltreTypeSAV('');
    setFiltreMagasin('');
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

  // Filtrer les produits pour n'afficher que ceux du client sélectionné
  const produitsFiltres = React.useMemo(() => {
    if (!produits) return [];
    return produits.filter(p => p.clientId === formData.clientId);
  }, [produits, formData.clientId]);

  return (
    <div className="py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Gestion des interventions</h1>
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
            Nouvelle intervention
          </button>
        </div>
      </div>

      {/* Filtres */}
      {filtresOuverts && (
        <div className="mb-6 bg-white p-4 rounded-md shadow">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="filtreStatut" className="block text-sm font-medium text-gray-700">Statut</label>
              <select
                id="filtreStatut"
                value={filtreStatut}
                onChange={(e) => setFiltreStatut(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="">Tous les statuts</option>
                <option value="planifiee">Planifiée</option>
                <option value="en_cours">En cours</option>
                <option value="terminee">Terminée</option>
                <option value="annulee">Annulée</option>
              </select>
            </div>
            <div>
              <label htmlFor="filtreType" className="block text-sm font-medium text-gray-700">Type</label>
              <select
                id="filtreType"
                value={filtreType}
                onChange={(e) => setFiltreType(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="">Tous les types</option>
                <option value="installation">Installation</option>
                <option value="reparation">Réparation</option>
                <option value="maintenance">Maintenance</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div>
              <label htmlFor="filtreTypeSAV" className="block text-sm font-medium text-gray-700">Type de SAV</label>
              <select
                id="filtreTypeSAV"
                value={filtreTypeSAV}
                onChange={(e) => setFiltreTypeSAV(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="">Tous les types de SAV</option>
                <option value="interne">SAV Interne</option>
                <option value="leroy_merlin">SAV Leroy Merlin</option>
              </select>
            </div>
            {filtreTypeSAV === 'leroy_merlin' && (
              <div>
                <label htmlFor="filtreMagasin" className="block text-sm font-medium text-gray-700">Magasin Leroy Merlin</label>
                <select
                  id="filtreMagasin"
                  value={filtreMagasin}
                  onChange={(e) => setFiltreMagasin(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="">Tous les magasins</option>
                  {magasinsLeroyMerlin.map((magasin) => (
                    <option key={magasin} value={magasin}>{magasin}</option>
                  ))}
                </select>
              </div>
            )}
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
            placeholder="Rechercher une intervention..."
          />
        </div>
      </div>

      {/* Liste des interventions */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {interventionsFiltrees && interventionsFiltrees.length > 0 ? (
            interventionsFiltrees.map((intervention) => (
              <li key={intervention.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-blue-600 truncate">
                        {getNomClient(intervention.clientId)}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex flex-wrap gap-1">
                        <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatutColor(intervention.statut)}`}>
                          {getStatutLabel(intervention.statut)}
                        </p>
                        <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeColor(intervention.type)}`}>
                          {getTypeLabel(intervention.type)}
                        </p>
                        <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeSAVColor(intervention.typeSAV)}`}>
                          {getTypeSAVLabel(intervention.typeSAV)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm text-gray-900">{intervention.description}</p>
                      <p className="text-sm text-gray-500">Produit: {getProduitInfo(intervention.produitId)}</p>
                      <p className="text-sm text-gray-500">Technicien: {intervention.technicien}</p>
                      <p className="text-sm text-gray-500">Date: {formatDate(intervention.dateIntervention)}</p>
                      {intervention.typeSAV === 'leroy_merlin' && intervention.magasinLeroyMerlin && (
                        <p className="text-sm text-gray-500">Magasin: {intervention.magasinLeroyMerlin}</p>
                      )}
                      {(intervention.coutPieces || intervention.coutMainOeuvre) && (
                        <p className="text-sm text-gray-500">
                          Coût: {intervention.coutPieces || 0}€ (pièces) + {intervention.coutMainOeuvre || 0}€ (main d'œuvre) = {(intervention.coutPieces || 0) + (intervention.coutMainOeuvre || 0)}€
                        </p>
                      )}
                      {intervention.notes && <p className="text-sm text-gray-500 mt-1">Notes: {intervention.notes}</p>}
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0 flex space-x-2">
                    <button
                      onClick={() => ouvrirFormulaire(intervention)}
                      className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => supprimerIntervention(intervention.id!)}
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
              {recherche || filtreStatut || filtreType || filtreTypeSAV || filtreMagasin ? 'Aucune intervention ne correspond à vos critères.' : 'Aucune intervention enregistrée.'}
            </li>
          )}
        </ul>
      </div>

      {/* Modal de formulaire */}
      {(nouvelleIntervention || interventionEnEdition) && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex justify-between items-center pb-3 border-b">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {nouvelleIntervention ? 'Ajouter une intervention' : 'Modifier l\'intervention'}
                </h3>
                <button
                  onClick={fermerFormulaire}
                  className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={sauvegarderIntervention} className="mt-4">
                <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="typeSAV" className="block text-sm font-medium text-gray-700">Type de SAV</label>
                    <select
                      name="typeSAV"
                      id="typeSAV"
                      required
                      value={formData.typeSAV}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    >
                      <option value="interne">SAV Interne</option>
                      <option value="leroy_merlin">SAV Leroy Merlin</option>
                    </select>
                  </div>
                  
                  {formData.typeSAV === 'leroy_merlin' && (
                    <div className="sm:col-span-2">
                      <label htmlFor="magasinLeroyMerlin" className="block text-sm font-medium text-gray-700">Magasin Leroy Merlin</label>
                      <select
                        name="magasinLeroyMerlin"
                        id="magasinLeroyMerlin"
                        required
                        value={formData.magasinLeroyMerlin || ''}
                        onChange={handleInputChange}
                        className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      >
                        <option value="" disabled>Sélectionnez un magasin</option>
                        {magasinsLeroyMerlin.map((magasin) => (
                          <option key={magasin} value={magasin}>{magasin}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  
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
                      {produitsFiltres.length > 0 ? (
                        produitsFiltres.map(produit => (
                          <option key={produit.id} value={produit.id}>
                            {produit.marque} {produit.modele} ({produit.reference})
                          </option>
                        ))
                      ) : (
                        <option value="">Aucun produit disponible pour ce client</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="dateIntervention" className="block text-sm font-medium text-gray-700">Date d'intervention</label>
                    <input
                      type="date"
                      name="dateIntervention"
                      id="dateIntervention"
                      required
                      value={new Date(formData.dateIntervention).toISOString().split('T')[0]}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label htmlFor="technicien" className="block text-sm font-medium text-gray-700">Technicien</label>
                    <input
                      type="text"
                      name="technicien"
                      id="technicien"
                      required
                      value={formData.technicien}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700">Type</label>
                    <select
                      name="type"
                      id="type"
                      required
                      value={formData.type}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    >
                      <option value="installation">Installation</option>
                      <option value="reparation">Réparation</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="autre">Autre</option>
                    </select>
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
                      <option value="planifiee">Planifiée</option>
                      <option value="en_cours">En cours</option>
                      <option value="terminee">Terminée</option>
                      <option value="annulee">Annulée</option>
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
                    <label htmlFor="coutPieces" className="block text-sm font-medium text-gray-700">Coût des pièces (€)</label>
                    <input
                      type="number"
                      name="coutPieces"
                      id="coutPieces"
                      min="0"
                      step="0.01"
                      value={formData.coutPieces}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label htmlFor="coutMainOeuvre" className="block text-sm font-medium text-gray-700">Coût main d'œuvre (€)</label>
                    <input
                      type="number"
                      name="coutMainOeuvre"
                      id="coutMainOeuvre"
                      min="0"
                      step="0.01"
                      value={formData.coutMainOeuvre}
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

export default Interventions;