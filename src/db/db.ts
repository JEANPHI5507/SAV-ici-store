import Dexie, { Table } from 'dexie';

// Définition des types pour nos tables
export interface Client {
  id?: number;
  nom: string;
  prenom: string;
  adresse: string;
  telephone: string;
  email: string;
  numeroCommande?: string; // Ajout du numéro de commande
  dateCreation: Date;
  facturePdf?: Blob; // Ajout du stockage de la facture PDF
  nomFichierFacture?: string; // Nom du fichier de la facture
}

export interface Produit {
  id?: number;
  reference: string;
  modele: string;
  marque: string;
  dateAchat?: Date;
  clientId: number;
  notes?: string;
  // Ajout des informations de garantie
  garantiePieces?: Date;
  garantieTelecommande?: Date;
  garantieCapteurVent?: Date;
  garantieToile?: Date;
  garantieCouture?: Date;
}

export interface Panne {
  id?: number;
  dateDéclaration: Date;
  description: string;
  statut: 'en_attente' | 'diagnostic' | 'piece_commandee' | 'en_reparation' | 'expedie' | 'resolu' | 'annule';
  produitId: number;
  clientId: number;
  numeroSuivi?: string;
  dateExpedition?: Date;
  dateRetour?: Date;
  coutReparation?: number;
  sousGarantie: boolean;
  composantConcerne?: 'piece' | 'telecommande' | 'capteur_vent' | 'toile' | 'couture' | 'autre';
  notes?: string;
  // Ajout du type de SAV
  typeSAV: 'interne' | 'leroy_merlin';
  // Ajout du magasin Leroy Merlin (si applicable)
  magasinLeroyMerlin?: string;
}

export interface Intervention {
  id?: number;
  dateIntervention: Date;
  type: 'installation' | 'reparation' | 'maintenance' | 'autre';
  description: string;
  statut: 'planifiee' | 'en_cours' | 'terminee' | 'annulee';
  technicien: string;
  produitId: number;
  clientId: number;
  coutPieces?: number;
  coutMainOeuvre?: number;
  notes?: string;
  // Ajout du type de SAV
  typeSAV: 'interne' | 'leroy_merlin';
  // Ajout du magasin Leroy Merlin (si applicable)
  magasinLeroyMerlin?: string;
}

// Création de la base de données
class SavDatabase extends Dexie {
  clients!: Table<Client, number>;
  produits!: Table<Produit, number>;
  pannes!: Table<Panne, number>;
  interventions!: Table<Intervention, number>;

  constructor() {
    super('savStoresBannesDB');
    this.version(7).stores({
      clients: '++id, nom, prenom, telephone, email, numeroCommande',
      produits: '++id, reference, modele, marque, clientId, garantiePieces, garantieTelecommande, garantieCapteurVent, garantieToile, garantieCouture',
      pannes: '++id, dateDéclaration, statut, produitId, clientId, sousGarantie, composantConcerne, typeSAV, magasinLeroyMerlin',
      interventions: '++id, dateIntervention, type, statut, technicien, produitId, clientId, typeSAV, magasinLeroyMerlin'
    });
  }
}

export const db = new SavDatabase();

// Fonction pour réinitialiser la base de données
export async function resetDatabase() {
  try {
    await db.delete();
    console.log('Base de données supprimée avec succès');
    
    // Recharger la page pour recréer la base de données
    window.location.reload();
  } catch (error) {
    console.error('Erreur lors de la suppression de la base de données:', error);
    throw error; // Propager l'erreur pour la gérer dans l'interface utilisateur
  }
}

// Fonction pour calculer la date de fin de garantie (5 ans à partir de la date d'achat)
export function calculerDateFinGarantie(dateAchat?: Date): Date | undefined {
  if (!dateAchat) return undefined;
  
  const dateFinGarantie = new Date(dateAchat);
  dateFinGarantie.setFullYear(dateFinGarantie.getFullYear() + 5);
  return dateFinGarantie;
}

// Fonction pour vérifier si un produit est sous garantie pour un composant spécifique
export function estSousGarantie(produit: Produit, composant: 'piece' | 'telecommande' | 'capteur_vent' | 'toile' | 'couture'): boolean {
  if (!produit.dateAchat) return false;
  
  const dateActuelle = new Date();
  const dateFinGarantie = calculerDateFinGarantie(produit.dateAchat);
  
  if (!dateFinGarantie) return false;
  
  return dateActuelle <= dateFinGarantie;
}

// Liste des magasins Leroy Merlin
export const magasinsLeroyMerlin = [
  'Leroy Merlin Angers',
  'Leroy Merlin Antibes',
  'Leroy Merlin Avignon',
  'Leroy Merlin Bordeaux',
  'Leroy Merlin Brest',
  'Leroy Merlin Caen',
  'Leroy Merlin Clermont-Ferrand',
  'Leroy Merlin Dijon',
  'Leroy Merlin Grenoble',
  'Leroy Merlin Lille',
  'Leroy Merlin Lyon',
  'Leroy Merlin Marseille',
  'Leroy Merlin Metz',
  'Leroy Merlin Montpellier',
  'Leroy Merlin Nantes',
  'Leroy Merlin Nice',
  'Leroy Merlin Paris',
  'Leroy Merlin Reims',
  'Leroy Merlin Rennes',
  'Leroy Merlin Rouen',
  'Leroy Merlin Strasbourg',
  'Leroy Merlin Toulon',
  'Leroy Merlin Toulouse',
  'Leroy Merlin Tours'
];

// Fonction pour ajouter des données de test
export async function ajouterDonneesTest() {
  // Vérifier si des données existent déjà
  const clientCount = await db.clients.count();
  
  if (clientCount > 0) {
    console.log('Des données existent déjà dans la base de données');
    return;
  }

  // Ajouter des clients de test
  const client1Id = await db.clients.add({
    nom: 'Dupont',
    prenom: 'Jean',
    adresse: '123 Rue du Soleil, 75001 Paris',
    telephone: '0123456789',
    email: 'jean.dupont@example.com',
    numeroCommande: 'CMD-2023-001',
    dateCreation: new Date()
  });

  const client2Id = await db.clients.add({
    nom: 'Martin',
    prenom: 'Sophie',
    adresse: '456 Avenue des Fleurs, 69002 Lyon',
    telephone: '0987654321',
    email: 'sophie.martin@example.com',
    numeroCommande: 'CMD-2023-002',
    dateCreation: new Date()
  });

  const client3Id = await db.clients.add({
    nom: 'Leroy Merlin',
    prenom: 'Nantes',
    adresse: 'Zone Commerciale Atlantis, 44800 Saint-Herblain',
    telephone: '0240123456',
    email: 'sav.nantes@leroymerlin.fr',
    numeroCommande: 'LM-2023-001',
    dateCreation: new Date()
  });

  const client4Id = await db.clients.add({
    nom: 'Leroy Merlin',
    prenom: 'Paris',
    adresse: '55 Rue de la Convention, 75015 Paris',
    telephone: '0144123456',
    email: 'sav.paris@leroymerlin.fr',
    numeroCommande: 'LM-2023-002',
    dateCreation: new Date()
  });

  // Dates d'achat pour calculer les garanties
  const dateAchat1 = new Date(2023, 3, 15);
  const dateAchat2 = new Date(2023, 5, 22);
  const dateAchat3 = new Date(2023, 2, 10);
  const dateAchat4 = new Date(2023, 4, 5);
  
  // Calculer les dates de fin de garantie (5 ans)
  const garantie1 = calculerDateFinGarantie(dateAchat1);
  const garantie2 = calculerDateFinGarantie(dateAchat2);
  const garantie3 = calculerDateFinGarantie(dateAchat3);
  const garantie4 = calculerDateFinGarantie(dateAchat4);

  // Ajouter des produits de test
  const produit1Id = await db.produits.add({
    reference: 'SB-2023-001',
    modele: 'Sunlight Pro',
    marque: 'SunProtect',
    dateAchat: dateAchat1,
    clientId: client1Id,
    notes: 'Store banne motorisé 4m x 3m',
    garantiePieces: garantie1,
    garantieTelecommande: garantie1,
    garantieCapteurVent: garantie1,
    garantieToile: garantie1,
    garantieCouture: garantie1
  });

  const produit2Id = await db.produits.add({
    reference: 'SB-2023-002',
    modele: 'Ombra Deluxe',
    marque: 'OmbraShade',
    dateAchat: dateAchat2,
    clientId: client2Id,
    notes: 'Store banne manuel 3m x 2.5m',
    garantiePieces: garantie2,
    garantieTelecommande: garantie2,
    garantieCapteurVent: garantie2,
    garantieToile: garantie2,
    garantieCouture: garantie2
  });

  const produit3Id = await db.produits.add({
    reference: 'SB-2023-003',
    modele: 'Sunlight Pro XL',
    marque: 'SunProtect',
    dateAchat: dateAchat3,
    clientId: client3Id,
    notes: 'Store banne motorisé 5m x 3.5m - Vendu par Leroy Merlin Nantes',
    garantiePieces: garantie3,
    garantieTelecommande: garantie3,
    garantieCapteurVent: garantie3,
    garantieToile: garantie3,
    garantieCouture: garantie3
  });

  const produit4Id = await db.produits.add({
    reference: 'SB-2023-004',
    modele: 'Ombra Deluxe XL',
    marque: 'OmbraShade',
    dateAchat: dateAchat4,
    clientId: client4Id,
    notes: 'Store banne motorisé 4.5m x 3m - Vendu par Leroy Merlin Paris',
    garantiePieces: garantie4,
    garantieTelecommande: garantie4,
    garantieCapteurVent: garantie4,
    garantieToile: garantie4,
    garantieCouture: garantie4
  });

  // Ajouter des pannes de test
  await db.pannes.add({
    dateDéclaration: new Date(2023, 6, 10),
    description: 'Moteur ne fonctionne plus',
    statut: 'resolu',
    produitId: produit1Id,
    clientId: client1Id,
    numeroSuivi: 'TR123456789FR',
    dateExpedition: new Date(2023, 6, 15),
    dateRetour: new Date(2023, 7, 5),
    coutReparation: 120,
    sousGarantie: true,
    composantConcerne: 'piece',
    notes: 'Remplacement du moteur sous garantie',
    typeSAV: 'interne'
  });

  await db.pannes.add({
    dateDéclaration: new Date(2023, 8, 5),
    description: 'Télécommande défectueuse',
    statut: 'en_reparation',
    produitId: produit1Id,
    clientId: client1Id,
    numeroSuivi: 'TR987654321FR',
    dateExpedition: new Date(2023, 8, 10),
    sousGarantie: false,
    coutReparation: 45,
    composantConcerne: 'telecommande',
    notes: 'Client informé du coût de la réparation',
    typeSAV: 'interne'
  });

  await db.pannes.add({
    dateDéclaration: new Date(2023, 7, 20),
    description: 'Toile déchirée',
    statut: 'piece_commandee',
    produitId: produit2Id,
    clientId: client2Id,
    sousGarantie: false,
    coutReparation: 180,
    composantConcerne: 'toile',
    notes: 'Commande de nouvelle toile en cours',
    typeSAV: 'interne'
  });

  // Ajouter des pannes pour Leroy Merlin
  await db.pannes.add({
    dateDéclaration: new Date(2023, 5, 15),
    description: 'Capteur vent ne fonctionne pas',
    statut: 'expedie',
    produitId: produit3Id,
    clientId: client3Id,
    numeroSuivi: 'LM123456789FR',
    dateExpedition: new Date(2023, 5, 20),
    sousGarantie: true,
    composantConcerne: 'capteur_vent',
    notes: 'SAV via Leroy Merlin Nantes',
    typeSAV: 'leroy_merlin',
    magasinLeroyMerlin: 'Leroy Merlin Nantes'
  });

  await db.pannes.add({
    dateDéclaration: new Date(2023, 6, 25),
    description: 'Moteur bloqué',
    statut: 'en_reparation',
    produitId: produit4Id,
    clientId: client4Id,
    numeroSuivi: 'LM987654321FR',
    dateExpedition: new Date(2023, 7, 1),
    sousGarantie: true,
    composantConcerne: 'piece',
    notes: 'SAV via Leroy Merlin Paris',
    typeSAV: 'leroy_merlin',
    magasinLeroyMerlin: 'Leroy Merlin Paris'
  });

  // Ajouter des interventions de test
  await db.interventions.add({
    dateIntervention: new Date(2023, 4, 10),
    type: 'installation',
    description: 'Installation initiale du store banne',
    statut: 'terminee',
    technicien: 'Pierre Durand',
    produitId: produit1Id,
    clientId: client1Id,
    coutPieces: 0,
    coutMainOeuvre: 150,
    notes: 'Installation sans problème',
    typeSAV: 'interne'
  });

  await db.interventions.add({
    dateIntervention: new Date(2023, 9, 15),
    type: 'reparation',
    description: 'Réparation du moteur suite à panne',
    statut: 'terminee',
    technicien: 'Marc Leroy',
    produitId: produit1Id,
    clientId: client1Id,
    coutPieces: 120,
    coutMainOeuvre: 80,
    notes: 'Remplacement du moteur effectué',
    typeSAV: 'interne'
  });

  await db.interventions.add({
    dateIntervention: new Date(2023, 10, 5),
    type: 'maintenance',
    description: 'Maintenance annuelle',
    statut: 'planifiee',
    technicien: 'Julie Moreau',
    produitId: produit2Id,
    clientId: client2Id,
    coutPieces: 0,
    coutMainOeuvre: 90,
    notes: 'Vérification générale et nettoyage',
    typeSAV: 'interne'
  });

  // Ajouter des interventions pour Leroy Merlin
  await db.interventions.add({
    dateIntervention: new Date(2023, 5, 25),
    type: 'installation',
    description: 'Installation du store banne pour client Leroy Merlin',
    statut: 'terminee',
    technicien: 'Thomas Bernard',
    produitId: produit3Id,
    clientId: client3Id,
    coutPieces: 0,
    coutMainOeuvre: 180,
    notes: 'Installation pour Leroy Merlin Nantes',
    typeSAV: 'leroy_merlin',
    magasinLeroyMerlin: 'Leroy Merlin Nantes'
  });

  await db.interventions.add({
    dateIntervention: new Date(2023, 8, 10),
    type: 'reparation',
    description: 'Réparation de la toile pour client Leroy Merlin',
    statut: 'planifiee',
    technicien: 'Sophie Dubois',
    produitId: produit4Id,
    clientId: client4Id,
    coutPieces: 150,
    coutMainOeuvre: 100,
    notes: 'Intervention pour Leroy Merlin Paris',
    typeSAV: 'leroy_merlin',
    magasinLeroyMerlin: 'Leroy Merlin Paris'
  });

  console.log('Données de test ajoutées avec succès');
}