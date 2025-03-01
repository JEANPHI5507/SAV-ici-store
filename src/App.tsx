import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Produits from './pages/Produits';
import Pannes from './pages/Pannes';
import Interventions from './pages/Interventions';
import ImportExport from './pages/ImportExport';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { ajouterDonneesTest, resetDatabase } from './db/dbAdapter';

function App() {
  const [dbError, setDbError] = useState<boolean>(false);

  useEffect(() => {
    // Initialiser la base de données avec des données de test
    const initDb = async () => {
      try {
        await ajouterDonneesTest();
      } catch (error) {
        console.error("Erreur lors de l'initialisation de la base de données:", error);
        setDbError(true);
      }
    };

    initDb();
  }, []);

  const handleResetDb = async () => {
    await resetDatabase();
  };

  if (dbError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Erreur de base de données</h1>
          <p className="text-gray-700 mb-6">
            Une erreur est survenue avec la base de données. Cela peut être dû à un changement de structure.
            Veuillez réinitialiser la base de données pour continuer.
          </p>
          <button
            onClick={handleResetDb}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Réinitialiser la base de données
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="clients" element={<Clients />} />
            <Route path="produits" element={<Produits />} />
            <Route path="pannes" element={<Pannes />} />
            <Route path="interventions" element={<Interventions />} />
            <Route path="import-export" element={<ImportExport />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;