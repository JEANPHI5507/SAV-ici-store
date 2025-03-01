import React from 'react';
import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: string;
  type?: 'statut' | 'type' | 'typeSAV' | 'composant' | 'garantie';
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'statut', className = '' }) => {
  const getStatutLabel = (statut: string): string => {
    switch (statut) {
      case 'en_attente': return 'En attente';
      case 'diagnostic': return 'Diagnostic';
      case 'piece_commandee': return 'Pièce commandée';
      case 'en_reparation': return 'En réparation';
      case 'expedie': return 'Expédié';
      case 'resolu': return 'Résolu';
      case 'annule': return 'Annulé';
      case 'planifiee': return 'Planifiée';
      case 'en_cours': return 'En cours';
      case 'terminee': return 'Terminée';
      default: return statut;
    }
  };

  const getTypeLabel = (typeVal: string): string => {
    switch (typeVal) {
      case 'installation': return 'Installation';
      case 'reparation': return 'Réparation';
      case 'maintenance': return 'Maintenance';
      case 'autre': return 'Autre';
      default: return typeVal;
    }
  };

  const getTypeSAVLabel = (typeSAV: string): string => {
    switch (typeSAV) {
      case 'interne': return 'SAV Interne';
      case 'leroy_merlin': return 'SAV Leroy Merlin';
      default: return typeSAV;
    }
  };

  const getComposantLabel = (composant: string): string => {
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

  const getGarantieLabel = (garantie: string): string => {
    return garantie === 'true' ? 'Sous garantie' : 'Hors garantie';
  };

  const getVariant = (): string => {
    if (type === 'statut') {
      switch (status) {
        case 'en_attente': return 'warning';
        case 'diagnostic': return 'info';
        case 'piece_commandee': return 'purple';
        case 'en_reparation': return 'orange';
        case 'expedie': return 'indigo';
        case 'resolu': return 'success';
        case 'annule': return 'destructive';
        case 'planifiee': return 'warning';
        case 'en_cours': return 'info';
        case 'terminee': return 'success';
        default: return 'secondary';
      }
    } else if (type === 'type') {
      switch (status) {
        case 'installation': return 'purple';
        case 'reparation': return 'orange';
        case 'maintenance': return 'teal';
        case 'autre': return 'secondary';
        default: return 'secondary';
      }
    } else if (type === 'typeSAV') {
      switch (status) {
        case 'interne': return 'info';
        case 'leroy_merlin': return 'success';
        default: return 'secondary';
      }
    } else if (type === 'composant') {
      switch (status) {
        case 'piece': return 'info';
        case 'telecommande': return 'purple';
        case 'capteur_vent': return 'teal';
        case 'toile': return 'orange';
        case 'couture': return 'pink';
        case 'autre': return 'secondary';
        default: return 'secondary';
      }
    } else if (type === 'garantie') {
      return status === 'true' ? 'success' : 'destructive';
    }
    
    return 'secondary';
  };

  const getLabel = (): string => {
    switch (type) {
      case 'statut': return getStatutLabel(status);
      case 'type': return getTypeLabel(status);
      case 'typeSAV': return getTypeSAVLabel(status);
      case 'composant': return getComposantLabel(status);
      case 'garantie': return getGarantieLabel(status);
      default: return status;
    }
  };

  return (
    <Badge variant={getVariant() as any} className={className}>
      {getLabel()}
    </Badge>
  );
};

export default StatusBadge;