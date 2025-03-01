import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, Package, AlertTriangle, Menu, X, FileText, PenTool as Tool, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Layout: React.FC = () => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const location = useLocation();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar pour écrans larges */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col flex-grow pt-5 bg-blue-800 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <h1 className="text-xl font-bold text-white">SAV ICI-Store.com <span className="text-xs font-normal opacity-70">by JeanPhi</span></h1>
          </div>
          <div className="mt-5 flex-1 flex flex-col">
            <nav className="flex-1 px-2 space-y-1">
              <Link 
                to="/" 
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md text-white ${isActive('/') ? 'bg-blue-700' : 'hover:bg-blue-700'}`}
              >
                <Home className="mr-3 h-6 w-6" />
                Tableau de bord
              </Link>
              <Link 
                to="/clients" 
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md text-white ${isActive('/clients') ? 'bg-blue-700' : 'hover:bg-blue-700'}`}
              >
                <Users className="mr-3 h-6 w-6" />
                Clients
              </Link>
              <Link 
                to="/produits" 
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md text-white ${isActive('/produits') ? 'bg-blue-700' : 'hover:bg-blue-700'}`}
              >
                <Package className="mr-3 h-6 w-6" />
                Produits
              </Link>
              <Link 
                to="/pannes" 
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md text-white ${isActive('/pannes') ? 'bg-blue-700' : 'hover:bg-blue-700'}`}
              >
                <AlertTriangle className="mr-3 h-6 w-6" />
                Pannes
              </Link>
              <Link 
                to="/interventions" 
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md text-white ${isActive('/interventions') ? 'bg-blue-700' : 'hover:bg-blue-700'}`}
              >
                <Tool className="mr-3 h-6 w-6" />
                Interventions
              </Link>
              <Link 
                to="/import-export" 
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md text-white ${isActive('/import-export') ? 'bg-blue-700' : 'hover:bg-blue-700'}`}
              >
                <FileText className="mr-3 h-6 w-6" />
                Import/Export
              </Link>
              <button 
                onClick={handleLogout}
                className="w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md text-white hover:bg-blue-700"
              >
                <LogOut className="mr-3 h-6 w-6" />
                Déconnexion
              </button>
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-blue-700 p-4">
            <div className="flex items-center">
              <div className="ml-3">
                <p className="text-sm font-medium text-white">SAV Manager</p>
                <p className="text-xs text-blue-200">v0.3.0</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Menu mobile */}
      <div className="md:hidden fixed top-0 w-full bg-blue-800 z-10">
        <div className="flex items-center justify-between h-16 px-4">
          <h1 className="text-xl font-bold text-white">SAV ICI-Store.com <span className="text-xs font-normal opacity-70">by JeanPhi</span></h1>
          <button
            onClick={toggleMenu}
            className="text-white focus:outline-none"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {menuOpen && (
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-blue-800">
            <Link 
              to="/" 
              className={`block px-3 py-2 rounded-md text-base font-medium text-white ${isActive('/') ? 'bg-blue-700' : 'hover:bg-blue-700'}`}
              onClick={() => setMenuOpen(false)}
            >
              <div className="flex items-center">
                <Home className="mr-3 h-6 w-6" />
                Tableau de bord
              </div>
            </Link>
            <Link 
              to="/clients" 
              className={`block px-3 py-2 rounded-md text-base font-medium text-white ${isActive('/clients') ? 'bg-blue-700' : 'hover:bg-blue-700'}`}
              onClick={() => setMenuOpen(false)}
            >
              <div className="flex items-center">
                <Users className="mr-3 h-6 w-6" />
                Clients
              </div>
            </Link>
            <Link 
              to="/produits" 
              className={`block px-3 py-2 rounded-md text-base font-medium text-white ${isActive('/produits') ? 'bg-blue-700' : 'hover:bg-blue-700'}`}
              onClick={() => setMenuOpen(false)}
            >
              <div className="flex items-center">
                <Package className="mr-3 h-6 w-6" />
                Produits
              </div>
            </Link>
            <Link 
              to="/pannes" 
              className={`block px-3 py-2 rounded-md text-base font-medium text-white ${isActive('/pannes') ? 'bg-blue-700' : 'hover:bg-blue-700'}`}
              onClick={() => setMenuOpen(false)}
            >
              <div className="flex items-center">
                <AlertTriangle className="mr-3 h-6 w-6" />
                Pannes
              </div>
            </Link>
            <Link 
              to="/interventions" 
              className={`block px-3 py-2 rounded-md text-base font-medium text-white ${isActive('/interventions') ? 'bg-blue-700' : 'hover:bg-blue-700'}`}
              onClick={() => setMenuOpen(false)}
            >
              <div className="flex items-center">
                <Tool className="mr-3 h-6 w-6" />
                Interventions
              </div>
            </Link>
            <Link 
              to="/import-export" 
              className={`block px-3 py-2 rounded-md text-base font-medium text-white ${isActive('/import-export') ? 'bg-blue-700' : 'hover:bg-blue-700'}`}
              onClick={() => setMenuOpen(false)}
            >
              <div className="flex items-center">
                <FileText className="mr-3 h-6 w-6" />
                Import/Export
              </div>
            </Link>
            <button 
              onClick={() => {
                handleLogout();
                setMenuOpen(false);
              }}
              className="w-full block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-blue-700"
            >
              <div className="flex items-center">
                <LogOut className="mr-3 h-6 w-6" />
                Déconnexion
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Contenu principal */}
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1 pb-8 pt-2 md:pt-0">
          <div className="mt-16 md:mt-0 mx-auto px-4 sm:px-6 md:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;