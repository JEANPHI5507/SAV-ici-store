import React from 'react';
import { Filter } from 'lucide-react';

interface FilterButtonProps {
  onClick: () => void;
  isActive?: boolean;
  className?: string;
}

const FilterButton: React.FC<FilterButtonProps> = ({ 
  onClick, 
  isActive = false,
  className = "" 
}) => {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-4 py-2 border ${isActive ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700 bg-white'} text-sm font-medium rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${className}`}
    >
      <Filter className={`h-5 w-5 mr-2 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />
      Filtres {isActive && <span className="ml-1 text-xs bg-blue-500 text-white rounded-full px-1.5">•</span>}
    </button>
  );
};

export default FilterButton;