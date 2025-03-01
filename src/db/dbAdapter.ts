import { db, Client, Produit, Panne, Intervention, calculerDateFinGarantie, estSousGarantie, magasinsLeroyMerlin, resetDatabase, ajouterDonneesTest } from './db';
import { useLiveQuery } from 'dexie-react-hooks';

// Interface commune pour les opérations de base de données
export interface DbOperations {
  clients: {
    toArray: () => Promise<Client[]>;
    get: (id: number) => Promise<Client | undefined>;
    add: (client: Omit<Client, 'id' | 'dateCreation'>) => Promise<number>;
    update: (id: number, client: Partial<Client>) => Promise<void>;
    delete: (id: number) => Promise<void>;
    where: (field: string) => {
      equals: (value: any) => {
        first: () => Promise<Client | undefined>;
        count: () => Promise<number>;
      };
    };
    count: () => Promise<number>;
  };
  produits: {
    toArray: () => Promise<Produit[]>;
    get: (id: number) => Promise<Produit | undefined>;
    add: (produit: Omit<Produit, 'id'>) => Promise<number>;
    update: (id: number, produit: Partial<Produit>) => Promise<void>;
    delete: (id: number) => Promise<void>;
    where: (field: string) => {
      equals: (value: any) => {
        toArray: () => Promise<Produit[]>;
        count: () => Promise<number>;
      };
    };
    count: () => Promise<number>;
  };
  pannes: {
    toArray: () => Promise<Panne[]>;
    get: (id: number) => Promise<Panne | undefined>;
    add: (panne: Omit<Panne, 'id'>) => Promise<number>;
    update: (id: number, panne: Partial<Panne>) => Promise<void>;
    delete: (id: number) => Promise<void>;
    where: (field: string) => {
      equals: (value: any) => {
        toArray: () => Promise<Panne[]>;
        count: () => Promise<number>;
      };
    };
    count: () => Promise<number>;
  };
  interventions: {
    toArray: () => Promise<Intervention[]>;
    get: (id: number) => Promise<Intervention | undefined>;
    add: (intervention: Omit<Intervention, 'id'>) => Promise<number>;
    update: (id: number, intervention: Partial<Intervention>) => Promise<void>;
    delete: (id: number) => Promise<void>;
    where: (field: string) => {
      equals: (value: any) => {
        toArray: () => Promise<Intervention[]>;
        count: () => Promise<number>;
      };
    };
    count: () => Promise<number>;
  };
}

// Adaptateur pour Dexie
const dexieAdapter: DbOperations = {
  clients: {
    toArray: async () => await db.clients.toArray(),
    get: async (id: number) => await db.clients.get(id),
    add: async (client: Omit<Client, 'id' | 'dateCreation'>) => {
      return await db.clients.add({
        ...client,
        dateCreation: new Date()
      } as Client);
    },
    update: async (id: number, client: Partial<Client>) => {
      await db.clients.update(id, client);
    },
    delete: async (id: number) => {
      await db.clients.delete(id);
    },
    where: (field: string) => ({
      equals: (value: any) => ({
        first: async () => await db.clients.where(field).equals(value).first(),
        count: async () => await db.clients.where(field).equals(value).count()
      })
    }),
    count: async () => await db.clients.count()
  },
  produits: {
    toArray: async () => await db.produits.toArray(),
    get: async (id: number) => await db.produits.get(id),
    add: async (produit: Omit<Produit, 'id'>) => {
      return await db.produits.add(produit as Produit);
    },
    update: async (id: number, produit: Partial<Produit>) => {
      await db.produits.update(id, produit);
    },
    delete: async (id: number) => {
      await db.produits.delete(id);
    },
    where: (field: string) => ({
      equals: (value: any) => ({
        toArray: async () => await db.produits.where(field).equals(value).toArray(),
        count: async () => await db.produits.where(field).equals(value).count()
      })
    }),
    count: async () => await db.produits.count()
  },
  pannes: {
    toArray: async () => await db.pannes.toArray(),
    get: async (id: number) => await db.pannes.get(id),
    add: async (panne: Omit<Panne, 'id'>) => {
      return await db.pannes.add(panne as Panne);
    },
    update: async (id: number, panne: Partial<Panne>) => {
      await db.pannes.update(id, panne);
    },
    delete: async (id: number) => {
      await db.pannes.delete(id);
    },
    where: (field: string) => ({
      equals: (value: any) => ({
        toArray: async () => await db.pannes.where(field).equals(value).toArray(),
        count: async () => await db.pannes.where(field).equals(value).count()
      })
    }),
    count: async () => await db.pannes.count()
  },
  interventions: {
    toArray: async () => await db.interventions.toArray(),
    get: async (id: number) => await db.interventions.get(id),
    add: async (intervention: Omit<Intervention, 'id'>) => {
      return await db.interventions.add(intervention as Intervention);
    },
    update: async (id: number, intervention: Partial<Intervention>) => {
      await db.interventions.update(id, intervention);
    },
    delete: async (id: number) => {
      await db.interventions.delete(id);
    },
    where: (field: string) => ({
      equals: (value: any) => ({
        toArray: async () => await db.interventions.where(field).equals(value).toArray(),
        count: async () => await db.interventions.where(field).equals(value).count()
      })
    }),
    count: async () => await db.interventions.count()
  }
};

// Exporter l'adaptateur
export const dbAdapter = dexieAdapter;

// Exporter les fonctions utilitaires
export {
  calculerDateFinGarantie,
  estSousGarantie,
  magasinsLeroyMerlin,
  resetDatabase,
  ajouterDonneesTest,
  useLiveQuery
};

// Exporter les types
export type { Client, Produit, Panne, Intervention };