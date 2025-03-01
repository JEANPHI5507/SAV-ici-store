import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Client, Produit, calculerDateFinGarantie } from '../db/db';
import { Plus, Edit, Trash2, X, Mail, Phone, MapPin, Package, FileUp, Loader } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import SearchBar from '@/components/SearchBar';
import EmptyState from '@/components/EmptyState';
import ConfirmDialog from '@/components/ConfirmDialog';
import { extractPdfInformation } from '../utils/pdfExtractor';

const Clients: React.FC = () => {
  const [recherche, setRecherche] = useState('');
  const [clientEnEdition, setClientEnEdition] = useState<Client | null>(null);
  const [nouveauClient, setNouveauClient] = useState(false);
  const [formData, setFormData] = useState<Omit<Client, 'id' | 'dateCreation'>>({
    nom: '',
    prenom: '',
    adresse: '',
    telephone: '',
    email: '',
    numeroCommande: ''
  });
  const [confirmDelete, setConfirmDelete] = useState<{isOpen: boolean, clientId?: number}>({
    isOpen: false
  });
  const [ajouterProduit, setAjouterProduit] = useState(false);
  const [produits, setProduits] = useState<Array<Omit<Produit, 'id' | 'clientId'>>>([]);
  const [produitEnEdition, setProduitEnEdition] = useState<number | null>(null);
  const [produitFormData, setProduitFormData] = useState<Omit<Produit, 'id' | 'clientId'>>({
    reference: '',
    modele: '',
    marque: '',
    dateAchat: new Date(),
    notes: '',
    garantiePieces: undefined,
    garantieTelecommande: undefined,
    garantieCapteurVent: undefined,
    garantieToile: undefined,
    garantieCouture: undefined
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clients = useLiveQuery(
    () => {
      if (recherche) {
        const rechercheMin = recherche.toLowerCase();
        return db.clients
          .filter(client => 
            client.nom.toLowerCase().includes(rechercheMin) || 
            client.prenom.toLowerCase().includes(rechercheMin) || 
            client.email.toLowerCase().includes(rechercheMin) || 
            client.telephone.includes(recherche) ||
            (client.numeroCommande && client.numeroCommande.toLowerCase().includes(rechercheMin))
          )
          .toArray();
      }
      return db.clients.toArray();
    },
    [recherche]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProduitInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'dateAchat') {
      const dateAchat = value ? new Date(value) : undefined;
      const garantie = calculerDateFinGarantie(dateAchat);
      
      setProduitFormData(prev => ({ 
        ...prev, 
        dateAchat,
        garantiePieces: garantie,
        garantieTelecommande: garantie,
        garantieCapteurVent: garantie,
        garantieToile: garantie,
        garantieCouture: garantie
      }));
    } else {
      setProduitFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const ouvrirFormulaire = (client?: Client) => {
    if (client) {
      setClientEnEdition(client);
      setFormData({
        nom: client.nom,
        prenom: client.prenom,
        adresse: client.adresse,
        telephone: client.telephone,
        email: client.email,
        numeroCommande: client.numeroCommande || ''
      });
      setNouveauClient(false);
      setAjouterProduit(false);
      setProduits([]);
    } else {
      setClientEnEdition(null);
      setFormData({
        nom: '',
        prenom: '',
        adresse: '',
        telephone: '',
        email: '',
        numeroCommande: ''
      });
      setNouveauClient(true);
      setProduits([]);
      // Réinitialiser le formulaire de produit
      resetProduitForm();
    }
  };

  const resetProduitForm = () => {
    setProduitFormData({
      reference: '',
      modele: '',
      marque: '',
      dateAchat: new Date(),
      notes: '',
      garantiePieces: undefined,
      garantieTelecommande: undefined,
      garantieCapteurVent: undefined,
      garantieToile: undefined,
      garantieCouture: undefined
    });
    setProduitEnEdition(null);
  };

  const fermerFormulaire = () => {
    setClientEnEdition(null);
    setNouveauClient(false);
    setAjouterProduit(false);
    setProduits([]);
    resetProduitForm();
  };

  const sauvegarderClient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let clientId: number;
      
      if (nouveauClient) {
        clientId = await db.clients.add({
          ...formData,
          dateCreation: new Date()
        });
      } else if (clientEnEdition) {
        clientId = clientEnEdition.id!;
        await db.clients.update(clientId, formData);
      } else {
        return; // Ne devrait pas arriver
      }
      
      // Si des produits ont été ajoutés, les enregistrer
      if (produits.length > 0) {
        for (const produit of produits) {
          await db.produits.add({
            ...produit,
            clientId
          });
        }
      }
      
      fermerFormulaire();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du client:', error);
      alert('Une erreur est survenue lors de la sauvegarde du client.');
    }
  };

  const confirmerSuppression = (id: number) => {
    setConfirmDelete({
      isOpen: true,
      clientId: id
    });
  };

  const supprimerClient = async () => {
    if (!confirmDelete.clientId) return;
    
    try {
      // Vérifier si le client a des produits ou des pannes
      const produits = await db.produits.where('clientId').equals(confirmDelete.clientId).count();
      const pannes = await db.pannes.where('clientId').equals(confirmDelete.clientId).count();
      
      if (produits > 0 || pannes > 0) {
        alert(`Impossible de supprimer ce client car il a ${produits} produit(s) et ${pannes} panne(s) associé(s).`);
        setConfirmDelete({isOpen: false});
        return;
      }
      
      await db.clients.delete(confirmDelete.clientId);
      setConfirmDelete({isOpen: false});
    } catch (error) {
      console.error('Erreur lors de la suppression du client:', error);
      alert('Une erreur est survenue lors de la suppression du client.');
      setConfirmDelete({isOpen: false});
    }
  };

  const toggleAjouterProduit = () => {
    setAjouterProduit(!ajouterProduit);
    if (!ajouterProduit) {
      resetProduitForm();
    }
  };

  const ajouterNouveauProduit = () => {
    // Vérifier que les champs obligatoires sont remplis
    if (!produitFormData.reference || !produitFormData.modele || !produitFormData.marque) {
      alert('Veuillez remplir tous les champs obligatoires du produit.');
      return;
    }

    if (produitEnEdition !== null) {
      // Mise à jour d'un produit existant
      const nouveauxProduits = [...produits];
      nouveauxProduits[produitEnEdition] = { ...produitFormData };
      setProduits(nouveauxProduits);
    } else {
      // Ajout d'un nouveau produit
      setProduits([...produits, { ...produitFormData }]);
    }
    
    // Réinitialiser le formulaire pour un nouveau produit
    resetProduitForm();
  };

  const modifierProduit = (index: number) => {
    setProduitEnEdition(index);
    setProduitFormData({ ...produits[index] });
  };

  const supprimerProduit = (index: number) => {
    const nouveauxProduits = [...produits];
    nouveauxProduits.splice(index, 1);
    setProduits(nouveauxProduits);
    
    // Si on était en train d'éditer ce produit, réinitialiser le formulaire
    if (produitEnEdition === index) {
      resetProduitForm();
    } else if (produitEnEdition !== null && produitEnEdition > index) {
      // Ajuster l'index d'édition si on supprime un produit avant celui en édition
      setProduitEnEdition(produitEnEdition - 1);
    }
  };

  const formatDate = (date?: Date): string => {
    if (!date) return 'Non définie';
    return new Date(date).toLocaleDateString('fr-FR');
  };

  // Gestion du glisser-déposer de PDF
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        await processPdfFile(file);
      } else {
        alert('Veuillez déposer un fichier PDF.');
      }
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf') {
        await processPdfFile(file);
      } else {
        alert('Veuillez sélectionner un fichier PDF.');
      }
    }
  };

  const handleClickUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const processPdfFile = async (file: File) => {
    try {
      setIsExtracting(true);
      
      // Extraire les informations du PDF
      const extractedInfo = await extractPdfInformation(file);
      
      // Mettre à jour le formulaire client avec les informations extraites
      setFormData(prev => ({
        ...prev,
        nom: extractedInfo.nom_client || prev.nom,
        prenom: extractedInfo.prenom_client || prev.prenom,
        adresse: extractedInfo.adresse_client || prev.adresse,
        telephone: extractedInfo.telephone_client || prev.telephone,
        email: extractedInfo.email_client || prev.email,
        numeroCommande: extractedInfo.reference_produit || prev.numeroCommande
      }));
      
      // Si des informations sur le produit sont disponibles, les ajouter
      if (extractedInfo.reference_produit || extractedInfo.modele_produit) {
        const dateAchat = extractedInfo.date_achat || new Date();
        const garantie = calculerDateFinGarantie(dateAchat);
        
        const nouveauProduit: Omit<Produit, 'id' | 'clientId'> = {
          reference: extractedInfo.reference_produit || 'REF-' + Date.now(),
          modele: extractedInfo.modele_produit || 'Modèle inconnu',
          marque: extractedInfo.marque_produit || 'Marque inconnue',
          dateAchat: dateAchat,
          notes: `Importé depuis facture PDF le ${new Date().toLocaleDateString()}\n` +
                 `Couleur armature: ${extractedInfo.couleur_armature || 'Non spécifiée'}\n` +
                 `Couleur toile: ${extractedInfo.couleur_toile || 'Non spécifiée'}\n` +
                 `Moteur: ${extractedInfo.moteur || 'Non spécifié'}\n` +
                 `Capteur vent: ${extractedInfo.capteur_vent ? 'Oui' : 'Non'}`,
          garantiePieces: garantie,
          garantieTelecommande: garantie,
          garantieCapteurVent: garantie,
          garantieToile: garantie,
          garantieCouture: garantie
        };
        
        // Ajouter le produit à la liste
        setProduits([...produits, nouveauProduit]);
        
        // Activer la section d'ajout de produits
        setAjouterProduit(true);
      }
    } catch (error) {
      console.error('Erreur lors de l\'extraction des informations du PDF:', error);
      alert('Une erreur est survenue lors de l\'extraction des informations du PDF.');
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Gestion des clients</h1>
        <Button onClick={() => ouvrirFormulaire()} className="flex items-center">
          <Plus className="h-5 w-5 mr-2" />
          Nouveau client
        </Button>
      </div>

      {/* Barre de recherche */}
      <div className="mb-6">
        <SearchBar 
          value={recherche} 
          onChange={setRecherche} 
          placeholder="Rechercher un client par nom, email, téléphone..."
        />
      </div>

      {/* Liste des clients */}
      {clients && clients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <Card key={client.id} className="overflow-hidden hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{client.nom} {client.prenom}</h3>
                    {client.email && (
                      <p className="text-sm text-gray-500 mt-1 flex items-center">
                        <Mail className="h-4 w-4 mr-1 text-gray-400" />
                        {client.email}
                      </p>
                    )}
                    {client.telephone && (
                      <p className="text-sm text-gray-500 flex items-center">
                        <Phone className="h-4 w-4 mr-1 text-gray-400" />
                        {client.telephone}
                      </p>
                    )}
                    {client.adresse && (
                      <p className="text-sm text-gray-500 flex items-center">
                        <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                        {client.adresse}
                      </p>
                    )}
                    {client.numeroCommande && (
                      <p className="text-sm text-gray-500 mt-2">
                        N° Commande: <span className="font-medium">{client.numeroCommande}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => ouvrirFormulaire(client)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => confirmerSuppression(client.id!)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Aucun client trouvé"
          description={recherche ? "Aucun client ne correspond à votre recherche." : "Commencez par ajouter un client."}
          actionLabel="Ajouter un client"
          onAction={() => ouvrirFormulaire()}
        />
      )}

      {/* Modal de formulaire */}
      {(nouveauClient || clientEnEdition) && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex justify-between items-center pb-3 border-b">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {nouveauClient ? 'Ajouter un client' : 'Modifier le client'}
                </h3>
                <button
                  onClick={fermerFormulaire}
                  className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              {/* Zone de glisser-déposer pour PDF */}
              {nouveauClient && (
                <div 
                  className={`mt-4 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={handleClickUpload}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden" 
                    accept=".pdf" 
                    onChange={handleFileInputChange}
                  />
                  
                  {isExtracting ? (
                    <div className="flex flex-col items-center justify-center">
                      <Loader className="h-8 w-8 text-blue-500 animate-spin mb-2" />
                      <p className="text-sm text-gray-600">Extraction des informations en cours...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <FileUp className="h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm font-medium text-gray-700">Glissez une facture PDF ici</p>
                      <p className="text-xs text-gray-500 mt-1">ou cliquez pour sélectionner un fichier</p>
                    </div>
                  )}
                </div>
              )}
              
              <form onSubmit={sauvegarderClient} className="mt-4">
                <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="nom" className="block text-sm font-medium text-gray-700">Nom</label>
                    <input
                      type="text"
                      name="nom"
                      id="nom"
                      required
                      value={formData.nom}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label htmlFor="prenom" className="block text-sm font-medium text-gray-700">Prénom</label>
                    <input
                      type="text"
                      name="prenom"
                      id="prenom"
                      required
                      value={formData.prenom}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="adresse" className="block text-sm font-medium text-gray-700">Adresse</label>
                    <input
                      type="text"
                      name="adresse"
                      id="adresse"
                      required
                      value={formData.adresse}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label htmlFor="telephone" className="block text-sm font-medium text-gray-700">Téléphone</label>
                    <input
                      type="tel"
                      name="telephone"
                      id="telephone"
                      required
                      value={formData.telephone}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="numeroCommande" className="block text-sm font-medium text-gray-700">Numéro de commande</label>
                    <input
                      type="text"
                      name="numeroCommande"
                      id="numeroCommande"
                      value={formData.numeroCommande}
                      onChange={handleInputChange}
                      className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                {/* Option pour ajouter des produits */}
                {nouveauClient && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={toggleAjouterProduit}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Package className="h-5 w-5 mr-2 text-gray-500" />
                        {ajouterProduit ? 'Ne pas ajouter de produits' : 'Ajouter des produits'}
                      </button>
                    </div>

                    {ajouterProduit && (
                      <div className="mt-4 border-t border-gray-200 pt-4">
                        <h4 className="text-lg font-medium text-gray-900 mb-4">
                          {produitEnEdition !== null ? 'Modifier le produit' : 'Ajouter un produit'}
                        </h4>
                        <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                          <div>
                            <label htmlFor="reference" className="block text-sm font-medium text-gray-700">Référence</label>
                            <input
                              type="text"
                              name="reference"
                              id="reference"
                              required
                              value={produitFormData.reference}
                              onChange={handleProduitInputChange}
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
                              value={produitFormData.modele}
                              onChange={handleProduitInputChange}
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
                              value={produitFormData.marque}
                              onChange={handleProduitInputChange}
                              className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                          <div>
                            <label htmlFor="dateAchat" className="block text-sm font-medium text-gray-700">Date d'achat</label>
                            <input
                              type="date"
                              name="dateAchat"
                              id="dateAchat"
                              value={produitFormData.dateAchat ? new Date(produitFormData.dateAchat).toISOString().split('T')[0] : ''}
                              onChange={handleProduitInputChange}
                              className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                            />
                            <p className="mt-1 text-xs text-gray-500">La garantie de 5 ans sera automatiquement calculée</p>
                          </div>
                          <div className="sm:col-span-2">
                            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes</label>
                            <textarea
                              name="notes"
                              id="notes"
                              rows={3}
                              value={produitFormData.notes || ''}
                              onChange={handleProduitInputChange}
                              className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                          <div className="sm:col-span-2 flex justify-end">
                            <Button
                              type="button"
                              onClick={ajouterNouveauProduit}
                              className="inline-flex items-center"
                            >
                              {produitEnEdition !== null ? 'Mettre à jour' : 'Ajouter'} le produit
                            </Button>
                          </div>
                        </div>

                        {/* Liste des produits ajoutés */}
                        {produits.length > 0 && (
                          <div className="mt-6">
                            <h5 className="text-md font-medium text-gray-900 mb-2">Produits ({produits.length})</h5>
                            <div className="border rounded-md overflow-hidden">
                              <ul className="divide-y divide-gray-200">
                                {produits.map((produit, index) => (
                                  <li key={index} className="px-4 py-3 flex justify-between items-center hover:bg-gray-50">
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">{produit.marque} {produit.modele}</p>
                                      <p className="text-xs text-gray-500">Réf: {produit.reference} | Achat: {formatDate(produit.dateAchat)}</p>
                                    </div>
                                    <div className="flex space-x-2">
                                      <button
                                        type="button"
                                        onClick={() => modifierProduit(index)}
                                        className="text-blue-600 hover:text-blue-800"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => supprimerProduit(index)}
                                        className="text-red-600 hover:text-red-800"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                  <Button
                    type="submit"
                    className="w-full sm:col-start-2"
                  >
                    Sauvegarder
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={fermerFormulaire}
                    className="mt-3 w-full sm:mt-0 sm:col-start-1"
                  >
                    Annuler
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Dialogue de confirmation de suppression */}
      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        title="Supprimer le client"
        message="Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        isDangerous={true}
        onConfirm={supprimerClient}
        onCancel={() => setConfirmDelete({isOpen: false})}
      />
    </div>
  );
};

export default Clients;