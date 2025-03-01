import BetterSqlite3 from 'better-sqlite3';
import { join } from 'path';
import fs from 'fs';

// Définition des types pour nos tables
export interface Client {
  id?: number;
  nom: string;
  prenom: string;
  adresse: string;
  telephone: string;
  email: string;
  numeroCommande?: string;
  dateCreation: Date;
  facturePdf?: Blob;
  nomFichierFacture?: string;
}

export interface Produit {
  id?: number;
  reference: string;
  modele: string;
  marque: string;
  dateAchat?: Date;
  clientId: number;
  notes?: string;
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
  typeSAV: 'interne' | 'leroy_merlin';
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
  typeSAV: 'interne' | 'leroy_merlin';
  magasinLeroyMerlin?: string;
}

// Chemin vers le dossier de données
const DATA_DIR = join(process.cwd(), 'data');
// Chemin vers le fichier de base de données
const DB_PATH = join(DATA_DIR, 'sav-stores-bannes.db');

// Créer le dossier de données s'il n'existe pas
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Créer la connexion à la base de données
const db = new BetterSqlite3(DB_PATH);

// Initialiser la base de données
function initDatabase() {
  // Activer les clés étrangères
  db.pragma('foreign_keys = ON');

  // Créer la table clients
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      adresse TEXT NOT NULL,
      telephone TEXT NOT NULL,
      email TEXT NOT NULL,
      numeroCommande TEXT,
      dateCreation TEXT NOT NULL,
      facturePdf BLOB,
      nomFichierFacture TEXT
    )
  `);

  // Créer la table produits
  db.exec(`
    CREATE TABLE IF NOT EXISTS produits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference TEXT NOT NULL,
      modele TEXT NOT NULL,
      marque TEXT NOT NULL,
      dateAchat TEXT,
      clientId INTEGER NOT NULL,
      notes TEXT,
      garantiePieces TEXT,
      garantieTelecommande TEXT,
      garantieCapteurVent TEXT,
      garantieToile TEXT,
      garantieCouture TEXT,
      FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
    )
  `);

  // Créer la table pannes
  db.exec(`
    CREATE TABLE IF NOT EXISTS pannes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dateDéclaration TEXT NOT NULL,
      description TEXT NOT NULL,
      statut TEXT NOT NULL,
      produitId INTEGER NOT NULL,
      clientId INTEGER NOT NULL,
      numeroSuivi TEXT,
      dateExpedition TEXT,
      dateRetour TEXT,
      coutReparation REAL,
      sousGarantie INTEGER NOT NULL,
      composantConcerne TEXT,
      notes TEXT,
      typeSAV TEXT NOT NULL,
      magasinLeroyMerlin TEXT,
      FOREIGN KEY (produitId) REFERENCES produits(id) ON DELETE CASCADE,
      FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
    )
  `);

  // Créer la table interventions
  db.exec(`
    CREATE TABLE IF NOT EXISTS interventions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dateIntervention TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      statut TEXT NOT NULL,
      technicien TEXT NOT NULL,
      produitId INTEGER NOT NULL,
      clientId INTEGER NOT NULL,
      coutPieces REAL,
      coutMainOeuvre REAL,
      notes TEXT,
      typeSAV TEXT NOT NULL,
      magasinLeroyMerlin TEXT,
      FOREIGN KEY (produitId) REFERENCES produits(id) ON DELETE CASCADE,
      FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
    )
  `);

  console.log('Base de données initialisée avec succès');
}

// Initialiser la base de données
initDatabase();

// Fonctions pour les clients
export const clientsDb = {
  getAll: () => {
    const stmt = db.prepare('SELECT * FROM clients');
    return stmt.all().map(formatClientFromDb);
  },
  
  getById: (id: number) => {
    const stmt = db.prepare('SELECT * FROM clients WHERE id = ?');
    const client = stmt.get(id);
    return client ? formatClientFromDb(client) : null;
  },
  
  getByEmail: (email: string) => {
    const stmt = db.prepare('SELECT * FROM clients WHERE email = ?');
    const client = stmt.get(email);
    return client ? formatClientFromDb(client) : null;
  },
  
  getByTelephone: (telephone: string) => {
    const stmt = db.prepare('SELECT * FROM clients WHERE telephone = ?');
    const client = stmt.get(telephone);
    return client ? formatClientFromDb(client) : null;
  },
  
  add: (client: Omit<Client, 'id'>) => {
    const stmt = db.prepare(`
      INSERT INTO clients (nom, prenom, adresse, telephone, email, numeroCommande, dateCreation, facturePdf, nomFichierFacture)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      client.nom,
      client.prenom,
      client.adresse,
      client.telephone,
      client.email,
      client.numeroCommande || null,
      client.dateCreation.toISOString(),
      client.facturePdf ? Buffer.from(await client.facturePdf.arrayBuffer()) : null,
      client.nomFichierFacture || null
    );
    
    return result.lastInsertRowid as number;
  },
  
  update: (id: number, client: Partial<Client>) => {
    const currentClient = clientsDb.getById(id);
    if (!currentClient) return false;
    
    const updatedClient = { ...currentClient, ...client };
    
    const stmt = db.prepare(`
      UPDATE clients
      SET nom = ?, prenom = ?, adresse = ?, telephone = ?, email = ?, numeroCommande = ?, facturePdf = ?, nomFichierFacture = ?
      WHERE id = ?
    `);
    
    stmt.run(
      updatedClient.nom,
      updatedClient.prenom,
      updatedClient.adresse,
      updatedClient.telephone,
      updatedClient.email,
      updatedClient.numeroCommande || null,
      updatedClient.facturePdf ? Buffer.from(await updatedClient.facturePdf.arrayBuffer()) : null,
      updatedClient.nomFichierFacture || null,
      id
    );
    
    return true;
  },
  
  delete: (id: number) => {
    const stmt = db.prepare('DELETE FROM clients WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },
  
  count: () => {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM clients');
    const result = stmt.get();
    return result ? result.count : 0;
  }
};

// Fonctions pour les produits
export const produitsDb = {
  getAll: () => {
    const stmt = db.prepare('SELECT * FROM produits');
    return stmt.all().map(formatProduitFromDb);
  },
  
  getById: (id: number) => {
    const stmt = db.prepare('SELECT * FROM produits WHERE id = ?');
    const produit = stmt.get(id);
    return produit ? formatProduitFromDb(produit) : null;
  },
  
  getByClientId: (clientId: number) => {
    const stmt = db.prepare('SELECT * FROM produits WHERE clientId = ?');
    return stmt.all(clientId).map(formatProduitFromDb);
  },
  
  add: (produit: Omit<Produit, 'id'>) => {
    const stmt = db.prepare(`
      INSERT INTO produits (reference, modele, marque, dateAchat, clientId, notes, garantiePieces, garantieTelecommande, garantieCapteurVent, garantieToile, garantieCouture)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      produit.reference,
      produit.modele,
      produit.marque,
      produit.dateAchat ? produit.dateAchat.toISOString() : null,
      produit.clientId,
      produit.notes || null,
      produit.garantiePieces ? produit.garantiePieces.toISOString() : null,
      produit.garantieTelecommande ? produit.garantieTelecommande.toISOString() : null,
      produit.garantieCapteurVent ? produit.garantieCapteurVent.toISOString() : null,
      produit.garantieToile ? produit.garantieToile.toISOString() : null,
      produit.garantieCouture ? produit.garantieCouture.toISOString() : null
    );
    
    return result.lastInsertRowid as number;
  },
  
  update: (id: number, produit: Partial<Produit>) => {
    const currentProduit = produitsDb.getById(id);
    if (!currentProduit) return false;
    
    const updatedProduit = { ...currentProduit, ...produit };
    
    const stmt = db.prepare(`
      UPDATE produits
      SET reference = ?, modele = ?, marque = ?, dateAchat = ?, clientId = ?, notes = ?, 
          garantiePieces = ?, garantieTelecommande = ?, garantieCapteurVent = ?, garantieToile = ?, garantieCouture = ?
      WHERE id = ?
    `);
    
    stmt.run(
      updatedProduit.reference,
      updatedProduit.modele,
      updatedProduit.marque,
      updatedProduit.dateAchat ? updatedProduit.dateAchat.toISOString() : null,
      updatedProduit.clientId,
      updatedProduit.notes || null,
      updatedProduit.garantiePieces ? updatedProduit.garantiePieces.toISOString() : null,
      updatedProduit.garantieTelecommande ? updatedProduit.garantieTelecommande.toISOString() : null,
      updatedProduit.garantieCapteurVent ? updatedProduit.garantieCapteurVent.toISOString() : null,
      updatedProduit.garantieToile ? updatedProduit.garantieToile.toISOString() : null,
      updatedProduit.garantieCouture ? updatedProduit.garantieCouture.toISOString() : null,
      id
    );
    
    return true;
  },
  
  delete: (id: number) => {
    const stmt = db.prepare('DELETE FROM produits WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },
  
  count: () => {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM produits');
    const result = stmt.get();
    return result ? result.count : 0;
  }
};

// Fonctions pour les pannes
export const pannesDb = {
  getAll: () => {
    const stmt = db.prepare('SELECT * FROM pannes');
    return stmt.all().map(formatPanneFromDb);
  },
  
  getById: (id: number) => {
    const stmt = db.prepare('SELECT * FROM pannes WHERE id = ?');
    const panne = stmt.get(id);
    return panne ? formatPanneFromDb(panne) : null;
  },
  
  getByClientId: (clientId: number) => {
    const stmt = db.prepare('SELECT * FROM pannes WHERE clientId = ?');
    return stmt.all(clientId).map(formatPanneFromDb);
  },
  
  getByProduitId: (produitId: number) => {
    const stmt = db.prepare('SELECT * FROM pannes WHERE produitId = ?');
    return stmt.all(produitId).map(formatPanneFromDb);
  },
  
  add: (panne: Omit<Panne, 'id'>) => {
    const stmt = db.prepare(`
      INSERT INTO pannes (dateDéclaration, description, statut, produitId, clientId, numeroSuivi, dateExpedition, dateRetour, coutReparation, sousGarantie, composantConcerne, notes, typeSAV, magasinLeroyMerlin)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      panne.dateDéclaration.toISOString(),
      panne.description,
      panne.statut,
      panne.produitId,
      panne.clientId,
      panne.numeroSuivi || null,
      panne.dateExpedition ? panne.dateExpedition.toISOString() : null,
      panne.dateRetour ? panne.dateRetour.toISOString() : null,
      panne.coutReparation || null,
      panne.sousGarantie ? 1 : 0,
      panne.composantConcerne || null,
      panne.notes || null,
      panne.typeSAV,
      panne.magasinLeroyMerlin || null
    );
    
    return result.lastInsertRowid as number;
  },
  
  update: (id: number, panne: Partial<Panne>) => {
    const currentPanne = pannesDb.getById(id);
    if (!currentPanne) return false;
    
    const updatedPanne = { ...currentPanne, ...panne };
    
    const stmt = db.prepare(`
      UPDATE pannes
      SET dateDéclaration = ?, description = ?, statut = ?, produitId = ?, clientId = ?, numeroSuivi = ?, 
          dateExpedition = ?, dateRetour = ?, coutReparation = ?, sousGarantie = ?, composantConcerne = ?, 
          notes = ?, typeSAV = ?, magasinLeroyMerlin = ?
      WHERE id = ?
    `);
    
    stmt.run(
      updatedPanne.dateDéclaration.toISOString(),
      updatedPanne.description,
      updatedPanne.statut,
      updatedPanne.produitId,
      updatedPanne.clientId,
      updatedPanne.numeroSuivi || null,
      updatedPanne.dateExpedition ? updatedPanne.dateExpedition.toISOString() : null,
      updatedPanne.dateRetour ? updatedPanne.dateRetour.toISOString() : null,
      updatedPanne.coutReparation || null,
      updatedPanne.sousGarantie ? 1 : 0,
      updatedPanne.composantConcerne || null,
      updatedPanne.notes || null,
      updatedPanne.typeSAV,
      updatedPanne.magasinLeroyMerlin || null,
      id
    );
    
    return true;
  },
  
  delete: (id: number) => {
    const stmt = db.prepare('DELETE FROM pannes WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },
  
  count: () => {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM pannes');
    const result = stmt.get();
    return result ? result.count : 0;
  }
};

// Fonctions pour les interventions
export const interventionsDb = {
  getAll: () => {
    const stmt = db.prepare('SELECT * FROM interventions');
    return stmt.all().map(formatInterventionFromDb);
  },
  
  getById: (id: number) => {
    const stmt = db.prepare('SELECT * FROM interventions WHERE id = ?');
    const intervention = stmt.get(id);
    return intervention ? formatInterventionFromDb(intervention) : null;
  },
  
  getByClientId: (clientId: number) => {
    const stmt = db.prepare('SELECT * FROM interventions WHERE clientId = ?');
    return stmt.all(clientId).map(formatInterventionFromDb);
  },
  
  getByProduitId: (produitId: number) => {
    const stmt = db.prepare('SELECT * FROM interventions WHERE produitId = ?');
    return stmt.all(produitId).map(formatInterventionFromDb);
  },
  
  add: (intervention: Omit<Intervention, 'id'>) => {
    const stmt = db.prepare(`
      INSERT INTO interventions (dateIntervention, type, description, statut, technicien, produitId, clientId, coutPieces, coutMainOeuvre, notes, typeSAV, magasinLeroyMerlin)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      intervention.dateIntervention.toISOString(),
      intervention.type,
      intervention.description,
      intervention.statut,
      intervention.technicien,
      intervention.produitId,
      intervention.clientId,
      intervention.coutPieces || null,
      intervention.coutMainOeuvre || null,
      intervention.notes || null,
      intervention.typeSAV,
      intervention.magasinLeroyMerlin || null
    );
    
    return result.lastInsertRowid as number;
  },
  
  update: (id: number, intervention: Partial<Intervention>) => {
    const currentIntervention = interventionsDb.getById(id);
    if (!currentIntervention) return false;
    
    const updatedIntervention = { ...currentIntervention, ...intervention };
    
    const stmt = db.prepare(`
      UPDATE interventions
      SET dateIntervention = ?, type = ?, description = ?, statut = ?, technicien = ?, produitId = ?, 
          clientId = ?, coutPieces = ?, coutMainOeuvre = ?, notes = ?, typeSAV = ?, magasinLeroyMerlin = ?
      WHERE id = ?
    `);
    
    stmt.run(
      updatedIntervention.dateIntervention.toISOString(),
      updatedIntervention.type,
      updatedIntervention.description,
      updatedIntervention.statut,
      updatedIntervention.technicien,
      updatedIntervention.produitId,
      updatedIntervention.clientId,
      updatedIntervention.coutPieces || null,
      updatedIntervention.coutMainOeuvre || null,
      updatedIntervention.notes || null,
      updatedIntervention.typeSAV,
      updatedIntervention.magasinLeroyMerlin || null,
      id
    );
    
    return true;
  },
  
  delete: (id: number) => {
    const stmt = db.prepare('DELETE FROM interventions WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },
  
  count: () => {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM interventions');
    const result = stmt.get();
    return result ? result.count : 0;
  }
};

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

// Fonction pour réinitialiser la base de données
export async function resetDatabase() {
  try {
    // Supprimer toutes les tables
    db.exec('DROP TABLE IF EXISTS interventions');
    db.exec('DROP TABLE IF EXISTS pannes');
    db.exec('DROP TABLE IF EXISTS produits');
    db.exec('DROP TABLE IF EXISTS clients');
    
    // Recréer les tables
    initDatabase();
    
    // Ajouter des données de test
    await ajouterDonneesTest();
    
    console.log('Base de données réinitialisée avec succès');
    
    // Recharger la page pour recréer la base de données
    window.location.reload();
  } catch (error) {
    console.error('Erreur lors de la réinitialisation de la base de données:', error);
    throw error;
  }
}

// Fonction pour ajouter des données de test
export async function ajouterDonneesTest() {
  try {
    // Vérifier si des données existent déjà
    const clientCount = clientsDb.count();
    
    if (clientCount > 0) {
      console.log('Des données existent déjà dans la base de données');
      return;
    }

    // Ajouter des clients de test
    const client1Id = clientsDb.add({
      nom: 'Dupont',
      prenom: 'Jean',
      adresse: '123 Rue du Soleil, 75001 Paris',
      telephone: '0123456789',
      email: 'jean.dupont@example.com',
      numeroCommande: 'CMD-2023-001',
      dateCreation: new Date()
    });

    const client2Id = clientsDb.add({
      nom: 'Martin',
      prenom: 'Sophie',
      adresse: '456 Avenue des Fleurs, 69002 Lyon',
      telephone: '0987654321',
      email: 'sophie.martin@example.com',
      numeroCommande: 'CMD-2023-002',
      dateCreation: new Date()
    });

    const client3Id = clientsDb.add({
      nom: 'Leroy Merlin',
      prenom: 'Nantes',
      adresse: 'Zone Commerciale Atlantis, 44800 Saint-Herblain',
      telephone: '0240123456',
      email: 'sav.nantes@leroymerlin.fr',
      numeroCommande: 'LM-2023-001',
      dateCreation: new Date()
    });

    const client4Id = clientsDb.add({
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
    const produit1Id = produitsDb.add({
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

    const produit2Id = produitsDb.add({
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

    const produit3Id = produitsDb.add({
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

    const produit4Id = produitsDb.add({
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
    pannesDb.add({
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

    pannesDb.add({
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

    pannesDb.add({
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
    pannesDb.add({
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

    pannesDb.add({
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
    interventionsDb.add({
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

    interventionsDb.add({
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

    interventionsDb.add({
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
    interventionsDb.add({
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

    interventionsDb.add({
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
  } catch (error) {
    console.error('Erreur lors de l\'ajout des données de test:', error);
    throw error;
  }
}

// Fonctions utilitaires pour formater les données depuis la base de données
function formatClientFromDb(client: any): Client {
  return {
    id: client.id,
    nom: client.nom,
    prenom: client.prenom,
    adresse: client.adresse,
    telephone: client.telephone,
    email: client.email,
    numeroCommande: client.numeroCommande,
    dateCreation: new Date(client.dateCreation),
    facturePdf: client.facturePdf ? new Blob([client.facturePdf], { type: 'application/pdf' }) : undefined,
    nomFichierFacture: client.nomFichierFacture
  };
}

function formatProduitFromDb(produit: any): Produit {
  return {
    id: produit.id,
    reference: produit.reference,
    modele: produit.modele,
    marque: produit.marque,
    dateAchat: produit.dateAchat ? new Date(produit.dateAchat) : undefined,
    clientId: produit.clientId,
    notes: produit.notes,
    garantiePieces: produit.garantiePieces ? new Date(produit.garantiePieces) : undefined,
    garantieTelecommande: produit.garantieTelecommande ? new Date(produit.garantieTelecommande) : undefined,
    garantieCapteurVent: produit.garantieCapteurVent ? new Date(produit.garantieCapteurVent) : undefined,
    garantieToile: produit.garantieToile ? new Date(produit.garantieToile) : undefined,
    garantieCouture: produit.garantieCouture ? new Date(produit.garantieCouture) : undefined
  };
}

function formatPanneFromDb(panne: any): Panne {
  return {
    id: panne.id,
    dateDéclaration: new Date(panne.dateDéclaration),
    description: panne.description,
    statut: panne.statut as 'en_attente' | 'diagnostic' | 'piece_commandee' | 'en_reparation' | 'expedie' | 'resolu' | 'annule',
    produitId: panne.produitId,
    clientId: panne.clientId,
    numeroSuivi: panne.numeroSuivi,
    dateExpedition: panne.dateExpedition ? new Date(panne.dateExpedition) : undefined,
    dateRetour: panne.dateRetour ? new Date(panne.dateRetour) : undefined,
    coutReparation: panne.coutReparation,
    sousGarantie: Boolean(panne.sousGarantie),
    composantConcerne: panne.composantConcerne as 'piece' | 'telecommande' | 'capteur_vent' | 'toile' | 'couture' | 'autre',
    notes: panne.notes,
    typeSAV: panne.typeSAV as 'interne' | 'leroy_merlin',
    magasinLeroyMerlin: panne.magasinLeroyMerlin
  };
}

function formatInterventionFromDb(intervention: any): Intervention {
  return {
    id: intervention.id,
    dateIntervention: new Date(intervention.dateIntervention),
    type: intervention.type as 'installation' | 'reparation' | 'maintenance' | 'autre',
    description: intervention.description,
    statut: intervention.statut as 'planifiee' | 'en_cours' | 'terminee' | 'annulee',
    technicien: intervention.technicien,
    produitId: intervention.produitId,
    clientId: intervention.clientId,
    coutPieces: intervention.coutPieces,
    coutMainOeuvre: intervention.coutMainOeuvre,
    notes: intervention.notes,
    typeSAV: intervention.typeSAV as 'interne' | 'leroy_merlin',
    magasinLeroyMerlin: intervention.magasinLeroyMerlin
  };
}

// Exporter les fonctions et objets
export default {
  clientsDb,
  produitsDb,
  pannesDb,
  interventionsDb,
  calculerDateFinGarantie,
  estSousGarantie,
  magasinsLeroyMerlin,
  resetDatabase,
  ajouterDonneesTest
};