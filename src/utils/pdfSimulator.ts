export interface ExtractedInformation {
  nom_client?: string;
  prenom_client?: string;
  adresse_client?: string;
  email_client?: string;
  telephone_client?: string;
  reference_produit?: string;
  modele_produit?: string;
  marque_produit?: string;
  date_achat?: Date;
  couleur_armature?: string;
  couleur_toile?: string;
  moteur?: string;
  capteur_vent?: boolean;
}

/**
 * Simule l'extraction d'informations d'un fichier PDF
 * Cette fonction est utilisée pour démontrer l'interface utilisateur
 * sans avoir besoin de traiter réellement un PDF
 */
export async function simulateExtractPdfInformation(file: File): Promise<ExtractedInformation> {
  // Simuler un délai de traitement
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Simuler l'extraction des informations du PDF
  const extractedInfo: ExtractedInformation = {
    nom_client: 'NARD',
    prenom_client: 'Philippe',
    adresse_client: '123 Avenue des Fleurs, 75001 Paris',
    telephone_client: '0783057022',
    email_client: 'pnrd01c@gmail.com',
    reference_produit: 'STORBOX 300',
    modele_produit: 'Store banne Coffre Intégral sur mesure',
    marque_produit: 'STORBOX',
    date_achat: new Date(2023, 5, 15), // 15 juin 2023
    couleur_armature: 'Blanc RAL 9016',
    couleur_toile: 'Toile Dickson Carbone ORC U171',
    moteur: 'Moteur Somfy Sunea 50 CSI iO 50/12 (avec manivelle)',
    capteur_vent: false // Pas de capteur de vent mentionné
  };

  return extractedInfo;
}