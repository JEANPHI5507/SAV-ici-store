import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Panne, Client, Produit, Intervention } from '../db/db';
import { Calendar, Users, Package, AlertTriangle, TruckIcon, PenTool as Tool, BarChart3, ArrowRight, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import StatusBadge from '../components/StatusBadge';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Dashboard: React.FC = () => {
  const clients = useLiveQuery(() => db.clients.toArray());
  const produits = useLiveQuery(() => db.produits.toArray());
  const pannes = useLiveQuery(() => db.pannes.toArray());
  const interventions = useLiveQuery(() => db.interventions.toArray());
  
  const [pannesRecentes, setPannesRecentes] = useState<(Panne & { clientNom?: string; produitRef?: string })[]>([]);
  const [pannesEnCours, setPannesEnCours] = useState<(Panne & { clientNom?: string; produitRef?: string })[]>([]);
  const [interventionsProchaines, setInterventionsProchaines] = useState<(Intervention & { clientNom?: string; produitRef?: string })[]>([]);
  const [composantStats, setComposantStats] = useState<{
    moteurs: number;
    telecommandes: number;
    capteurs: number;
    toiles: number;
    autres: number;
    total: number;
  }>({
    moteurs: 0,
    telecommandes: 0,
    capteurs: 0,
    toiles: 0,
    autres: 0,
    total: 0
  });
  
  useEffect(() => {
    const enrichirPannes = async () => {
      if (!pannes || !clients || !produits) return;
      
      const enrichies = await Promise.all(pannes.map(async (panne) => {
        const client = clients.find(c => c.id === panne.clientId);
        const produit = produits.find(p => p.id === panne.produitId);
        
        return {
          ...panne,
          clientNom: client ? `${client.nom} ${client.prenom}` : 'Client inconnu',
          produitRef: produit ? `${produit.marque} ${produit.modele}` : 'Produit inconnu'
        };
      }));
      
      // Pannes récentes (déclarées dans les 30 derniers jours)
      const trenteDerniersJours = new Date();
      trenteDerniersJours.setDate(trenteDerniersJours.getDate() - 30);
      
      const recentes = enrichies
        .filter(p => new Date(p.dateDéclaration) >= trenteDerniersJours)
        .sort((a, b) => new Date(b.dateDéclaration).getTime() - new Date(a.dateDéclaration).getTime())
        .slice(0, 5);
      
      // Pannes en cours (non résolues)
      const enCours = enrichies
        .filter(p => p.statut !== 'resolu' && p.statut !== 'annule')
        .sort((a, b) => new Date(a.dateDéclaration).getTime() - new Date(b.dateDéclaration).getTime())
        .slice(0, 5);
      
      setPannesRecentes(recentes);
      setPannesEnCours(enCours);
    };
    
    enrichirPannes();
  }, [pannes, clients, produits]);
  
  useEffect(() => {
    const enrichirInterventions = async () => {
      if (!interventions || !clients || !produits) return;
      
      const enrichies = await Promise.all(interventions.map(async (intervention) => {
        const client = clients.find(c => c.id === intervention.clientId);
        const produit = produits.find(p => p.id === intervention.produitId);
        
        return {
          ...intervention,
          clientNom: client ? `${client.nom} ${client.prenom}` : 'Client inconnu',
          produitRef: produit ? `${produit.marque} ${produit.modele}` : 'Produit inconnu'
        };
      }));
      
      // Interventions planifiées ou en cours
      const prochaines = enrichies
        .filter(i => i.statut === 'planifiee' || i.statut === 'en_cours')
        .sort((a, b) => new Date(a.dateIntervention).getTime() - new Date(b.dateIntervention).getTime())
        .slice(0, 5);
      
      setInterventionsProchaines(prochaines);
    };
    
    enrichirInterventions();
  }, [interventions, clients, produits]);

  // Calculer les statistiques des composants expédiés ce mois-ci
  useEffect(() => {
    if (!pannes) return;

    // Obtenir le premier jour du mois courant
    const now = new Date();
    const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Filtrer les pannes expédiées ce mois-ci
    const pannesMoisCourant = pannes.filter(panne => {
      return panne.dateExpedition && new Date(panne.dateExpedition) >= debutMois && 
             (panne.statut === 'expedie' || panne.statut === 'en_reparation' || panne.statut === 'resolu');
    });
    
    // Compter les différents types de composants
    const stats = {
      moteurs: 0,
      telecommandes: 0,
      capteurs: 0,
      toiles: 0,
      autres: 0,
      total: pannesMoisCourant.length
    };
    
    pannesMoisCourant.forEach(panne => {
      switch(panne.composantConcerne) {
        case 'piece':
          stats.moteurs++;
          break;
        case 'telecommande':
          stats.telecommandes++;
          break;
        case 'capteur_vent':
          stats.capteurs++;
          break;
        case 'toile':
          stats.toiles++;
          break;
        default:
          stats.autres++;
          break;
      }
    });
    
    setComposantStats(stats);
  }, [pannes]);
  
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('fr-FR');
  };

  // Obtenir le nom du mois courant
  const getMoisCourant = () => {
    const mois = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return mois[new Date().getMonth()];
  };
  
  return (
    <div className="py-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Tableau de bord</h1>
      
      {/* Actions rapides */}
      <div className="mb-8 flex flex-wrap gap-4">
        <Link to="/clients">
          <Button className="flex items-center">
            <Plus className="h-5 w-5 mr-2" />
            Nouveau client
          </Button>
        </Link>
        <Link to="/produits">
          <Button className="flex items-center" variant="outline">
            <Package className="h-5 w-5 mr-2" />
            Nouveau produit
          </Button>
        </Link>
        <Link to="/pannes">
          <Button className="flex items-center" variant="outline">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Nouvelle panne
          </Button>
        </Link>
        <Link to="/interventions">
          <Button className="flex items-center" variant="outline">
            <Tool className="h-5 w-5 mr-2" />
            Nouvelle intervention
          </Button>
        </Link>
      </div>
      
      {/* Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card className="bg-white overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Clients</dt>
                  <dd className="text-3xl font-semibold text-gray-900">{clients?.length || 0}</dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Produits</dt>
                  <dd className="text-3xl font-semibold text-gray-900">{produits?.length || 0}</dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pannes</dt>
                  <dd className="text-3xl font-semibold text-gray-900">{pannes?.length || 0}</dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                <TruckIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Expédiés</dt>
                  <dd className="text-3xl font-semibold text-gray-900">
                    {pannes?.filter(p => p.statut === 'expedie' || p.statut === 'en_reparation').length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-orange-500 rounded-md p-3">
                <Tool className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Interventions</dt>
                  <dd className="text-3xl font-semibold text-gray-900">{interventions?.length || 0}</dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistiques des composants expédiés ce mois-ci */}
      <Card className="bg-white shadow rounded-lg mb-8">
        <CardHeader className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex items-center">
            <BarChart3 className="h-5 w-5 text-gray-500 mr-2" />
            <CardTitle className="text-lg leading-6 font-medium text-gray-900">
              Composants expédiés en {getMoisCourant()}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-800">Moteurs</p>
              <p className="text-3xl font-bold text-blue-600">{composantStats.moteurs}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-purple-800">Télécommandes</p>
              <p className="text-3xl font-bold text-purple-600">{composantStats.telecommandes}</p>
            </div>
            <div className="bg-teal-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-teal-800">Capteurs vent</p>
              <p className="text-3xl font-bold text-teal-600">{composantStats.capteurs}</p>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-amber-800">Toiles</p>
              <p className="text-3xl font-bold text-amber-600">{composantStats.toiles}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-800">Autres</p>
              <p className="text-3xl font-bold text-gray-600">{composantStats.autres}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">Total des composants expédiés ce mois-ci</p>
              <p className="text-xl font-bold text-gray-900">{composantStats.total}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Pannes récentes, en cours et interventions planifiées */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pannes récentes */}
        <Card className="bg-white shadow">
          <CardHeader className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
            <CardTitle className="text-lg leading-6 font-medium text-gray-900">Pannes récentes</CardTitle>
            <Link to="/pannes" className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
              Voir tout <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-gray-200">
              {pannesRecentes.length > 0 ? (
                pannesRecentes.map((panne) => (
                  <li key={panne.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-blue-600 truncate">{panne.clientNom}</p>
                      <div className="ml-2 flex-shrink-0 flex">
                        <StatusBadge status={panne.statut} type="statut" />
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          {panne.produitRef}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <Calendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                        <p>{formatDate(panne.dateDéclaration)}</p>
                      </div>
                    </div>
                  </li>
                ))
              ) : (
                <li className="px-4 py-4 sm:px-6 text-center text-gray-500">
                  Aucune panne récente
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
        
        {/* Pannes en cours */}
        <Card className="bg-white shadow">
          <CardHeader className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
            <CardTitle className="text-lg leading-6 font-medium text-gray-900">Pannes en cours</CardTitle>
            <Link to="/pannes" className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
              Voir tout <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-gray-200">
              {pannesEnCours.length > 0 ? (
                pannesEnCours.map((panne) => (
                  <li key={panne.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-blue-600 truncate">{panne.clientNom}</p>
                      <div className="ml-2 flex-shrink-0 flex">
                        <StatusBadge status={panne.statut} type="statut" />
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          {panne.produitRef}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <Calendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                        <p>{formatDate(panne.dateDéclaration)}</p>
                      </div>
                    </div>
                    {panne.numeroSuivi && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          N° Suivi: <span className="font-medium">{panne.numeroSuivi}</span>
                        </p>
                      </div>
                    )}
                  </li>
                ))
              ) : (
                <li className="px-4 py-4 sm:px-6 text-center text-gray-500">
                  Aucune panne en cours
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
        
        {/* Interventions planifiées */}
        <Card className="bg-white shadow">
          <CardHeader className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
            <CardTitle className="text-lg leading-6 font-medium text-gray-900">Interventions à venir</CardTitle>
            <Link to="/interventions" className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
              Voir tout <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-gray-200">
              {interventionsProchaines.length > 0 ? (
                interventionsProchaines.map((intervention) => (
                  <li key={intervention.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-blue-600 truncate">{intervention.clientNom}</p>
                      <div className="ml-2 flex-shrink-0 flex">
                        <StatusBadge status={intervention.statut} type="statut" />
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          {intervention.produitRef}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <Calendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                        <p>{formatDate(intervention.dateIntervention)}</p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Technicien: <span className="font-medium">{intervention.technicien}</span>
                      </p>
                    </div>
                  </li>
                ))
              ) : (
                <li className="px-4 py-4 sm:px-6 text-center text-gray-500">
                  Aucune intervention planifiée
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;