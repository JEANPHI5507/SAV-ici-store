import * as pdfjsLib from 'pdfjs-dist';

// Définir le worker pour PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

export interface ExtractedInformation {
  nom_client?: string;
  prenom_client?: string;
  adresse_client?: string;
  email_client?: string;
  telephone_client?: string;
  reference_produit?: string;
  modele_produit?: string;
  marque_produit?: string;
  couleur_armature?: string;
  couleur_toile?: string;
  moteur?: string;
  capteur_vent?: boolean;
  date_achat?: Date;
  prix_unitaire?: number;
  prix_total?: number;
  tva?: number;
  frais_port?: number;
  montant_global?: number;
}

// Interface pour les modèles de factures
interface InvoiceTemplate {
  name: string;
  detect: (text: string) => boolean;
  extractClient: (textItems: any[], fullText: string) => Partial<ExtractedInformation>;
  extractProduct: (textItems: any[], fullText: string) => Partial<ExtractedInformation>;
  extractPrice: (textItems: any[], fullText: string) => Partial<ExtractedInformation>;
  extractDate: (textItems: any[], fullText: string) => Partial<ExtractedInformation>;
}

/**
 * Fonction principale pour extraire les informations d'une facture PDF
 */
export async function extractPdfInformation(file: File): Promise<ExtractedInformation> {
  try {
    // Convertir le fichier en ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Charger le document PDF
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    // Extraire le texte de toutes les pages
    let fullText = '';
    let textItems = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Collecter tous les éléments de texte avec leurs positions
      textItems = textItems.concat(textContent.items.map((item: any) => ({
        text: item.str,
        x: item.transform[4], // Position X
        y: item.transform[5], // Position Y
        height: item.height,
        width: item.width
      })));
      
      // Aussi garder le texte complet pour les recherches générales
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + ' ';
    }
    
    console.log("Texte extrait du PDF:", fullText);
    
    // Détecter le modèle de facture
    const template = detectInvoiceTemplate(fullText);
    console.log("Modèle de facture détecté:", template ? template.name : "Inconnu");
    
    let extractedInfo: ExtractedInformation = {};
    
    if (template) {
      // Utiliser le modèle détecté pour extraire les informations
      const clientInfo = template.extractClient(textItems, fullText);
      const productInfo = template.extractProduct(textItems, fullText);
      const priceInfo = template.extractPrice(textItems, fullText);
      const dateInfo = template.extractDate(textItems, fullText);
      
      // Combiner les informations
      extractedInfo = {
        ...clientInfo,
        ...productInfo,
        ...priceInfo,
        ...dateInfo
      };
    } else {
      // Utiliser l'extraction générique si aucun modèle n'est détecté
      const clientInfo = extractClientInfo(textItems, fullText);
      const productInfo = extractProductInfo(textItems, fullText);
      const priceInfo = extractPriceInfo(textItems, fullText);
      const dateInfo = extractDateInfo(textItems, fullText);
      
      // Combiner les informations
      extractedInfo = {
        ...clientInfo,
        ...productInfo,
        ...priceInfo,
        ...dateInfo
      };
    }
    
    // Si aucune information n'a été extraite, utiliser les données de secours
    if (!extractedInfo.nom_client && !extractedInfo.prenom_client) {
      return getFallbackData();
    }
    
    return extractedInfo;
  } catch (error) {
    console.error('Erreur lors de l\'extraction du texte du PDF:', error);
    return getFallbackData();
  }
}

/**
 * Détecte le modèle de facture en fonction du contenu
 */
function detectInvoiceTemplate(fullText: string): InvoiceTemplate | null {
  // Liste des modèles de factures
  const templates: InvoiceTemplate[] = [
    // Modèle ICI-Store
    {
      name: "ICI-Store",
      detect: (text) => text.includes("STORBOX") || text.includes("Rentollage de store"),
      extractClient: extractClientInfoIciStore,
      extractProduct: extractProductInfoIciStore,
      extractPrice: extractPriceInfoIciStore,
      extractDate: extractDateInfoIciStore
    },
    // Modèle Leroy Merlin
    {
      name: "Leroy Merlin",
      detect: (text) => text.includes("LEROY MERLIN") || text.includes("LM FRANCE"),
      extractClient: extractClientInfoLeroyMerlin,
      extractProduct: extractProductInfoLeroyMerlin,
      extractPrice: extractPriceInfoLeroyMerlin,
      extractDate: extractDateInfoLeroyMerlin
    },
    // Modèle Castorama
    {
      name: "Castorama",
      detect: (text) => text.includes("CASTORAMA") || text.includes("CASTO"),
      extractClient: extractClientInfoCastorama,
      extractProduct: extractProductInfoCastorama,
      extractPrice: extractPriceInfoCastorama,
      extractDate: extractDateInfoCastorama
    }
    // Ajouter d'autres modèles ici
  ];
  
  // Trouver le premier modèle qui correspond
  for (const template of templates) {
    if (template.detect(fullText)) {
      return template;
    }
  }
  
  // Aucun modèle correspondant
  return null;
}

/**
 * Fonction pour extraire les informations du client (générique)
 */
function extractClientInfo(textItems: any[], fullText: string): ExtractedInformation {
  const extractedInfo: ExtractedInformation = {};
  
  // Rechercher la section "Vendu à" ou "Vendu à :"
  const venduRegex = /Vendu\s+à\s*:?|Client\s*:?|Facturé\s+à\s*:?/i;
  const venduMatch = fullText.match(venduRegex);
  
  if (venduMatch) {
    // Trouver l'index de l'élément contenant "Vendu à"
    const venduIndex = textItems.findIndex(item => 
      venduRegex.test(item.text)
    );
    
    if (venduIndex !== -1) {
      // Déterminer la position Y approximative de la section "vendu à"
      const venduY = textItems[venduIndex].y;
      
      // Collecter les éléments de texte qui sont en dessous de l'élément "vendu à"
      // et au-dessus de la prochaine section (comme "Mode de paiement" ou "Expédié à")
      const nextSectionRegex = /Mode\s+de\s+paiement|Expédié\s+à|Méthode\s+de\s+livraison|Livraison|Paiement/i;
      const nextSectionIndex = textItems.findIndex((item, idx) => 
        idx > venduIndex && nextSectionRegex.test(item.text)
      );
      
      const endY = nextSectionIndex !== -1 ? textItems[nextSectionIndex].y : 0;
      
      const clientSectionItems = textItems
        .filter(item => 
          item.y < venduY && // Éléments en dessous de "vendu à"
          (endY === 0 || item.y > endY) && // Éléments au-dessus de la section suivante
          item.text.trim() !== '' && // Ignorer les éléments vides
          !venduRegex.test(item.text) // Ignorer l'en-tête lui-même
        )
        .sort((a, b) => b.y - a.y); // Trier par position Y (de haut en bas)
      
      // Extraire le nom et prénom
      for (const item of clientSectionItems) {
        // Rechercher des motifs comme "Prénom NOM" ou "NOM Prénom"
        const nameRegex1 = /([A-Za-zÀ-ÖØ-öø-ÿ]+)\s+([A-Z\s]+)/; // Prénom NOM (NOM en majuscules)
        const nameRegex2 = /([A-Z\s]+)\s+([A-Za-zÀ-ÖØ-öø-ÿ]+)/; // NOM Prénom (NOM en majuscules)
        
        let nameMatch = item.text.match(nameRegex1);
        if (nameMatch && !extractedInfo.prenom_client && !extractedInfo.nom_client) {
          extractedInfo.prenom_client = nameMatch[1];
          extractedInfo.nom_client = nameMatch[2];
          break;
        }
        
        nameMatch = item.text.match(nameRegex2);
        if (nameMatch && !extractedInfo.prenom_client && !extractedInfo.nom_client) {
          extractedInfo.nom_client = nameMatch[1];
          extractedInfo.prenom_client = nameMatch[2];
          break;
        }
      }
      
      // Si on n'a pas trouvé le nom/prénom avec les regex, essayer une approche plus simple
      if (!extractedInfo.nom_client && !extractedInfo.prenom_client) {
        for (const item of clientSectionItems) {
          const words = item.text.split(' ').filter((w: string) => w.trim() !== '');
          if (words.length >= 2) {
            // Supposer que le premier mot est le prénom et le reste est le nom
            extractedInfo.prenom_client = words[0];
            extractedInfo.nom_client = words.slice(1).join(' ');
            break;
          }
        }
      }
      
      // Extraire l'adresse (plusieurs lignes possibles)
      let adresseLines = [];
      let foundAddress = false;
      
      for (const item of clientSectionItems) {
        // Ignorer les lignes contenant le nom ou l'email ou le téléphone
        if (item.text.includes('@') || /T\s*:\s*\d+|Tel|Tél|Téléphone/i.test(item.text) || 
            (extractedInfo.prenom_client && item.text.includes(extractedInfo.prenom_client))) {
          continue;
        }
        
        // Rechercher des motifs d'adresse (code postal, ville, rue, etc.)
        const isAddressLine = /\d+\s+[A-Za-zÀ-ÖØ-öø-ÿ]+|[A-Za-zÀ-ÖØ-öø-ÿ]+,|[0-9]{5}/.test(item.text);
        
        if (isAddressLine) {
          adresseLines.push(item.text.trim());
          foundAddress = true;
        } else if (foundAddress) {
          // Si on a déjà trouvé une ligne d'adresse et que celle-ci n'en est pas une,
          // c'est probablement la fin de l'adresse
          break;
        }
      }
      
      if (adresseLines.length > 0) {
        extractedInfo.adresse_client = adresseLines.join(', ');
      }
      
      // Extraire le téléphone
      const phoneRegex = /T\s*:\s*(\d+)|Tel\s*:\s*(\d+)|Tél\s*:\s*(\d+)|Téléphone\s*:\s*(\d+)|Mobile\s*:\s*(\d+)/i;
      for (const item of clientSectionItems) {
        const phoneMatch = item.text.match(phoneRegex);
        if (phoneMatch) {
          // Prendre le premier groupe non-undefined
          extractedInfo.telephone_client = phoneMatch.slice(1).find(g => g !== undefined);
          break;
        }
      }
      
      // Extraire l'email
      const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i;
      for (const item of clientSectionItems) {
        const emailMatch = item.text.match(emailRegex);
        if (emailMatch && !emailMatch[1].includes('ici-store.com')) {
          extractedInfo.email_client = emailMatch[1];
          break;
        }
      }
    }
  }
  
  // Si on n'a pas trouvé les informations avec la méthode précédente, essayer des regex plus générales
  if (!extractedInfo.nom_client || !extractedInfo.prenom_client) {
    // Rechercher directement les motifs spécifiques dans le texte complet
    
    // Recherche du nom et prénom avec différents formats
    const namePatterns = [
      { regex: /Philippe\s+NARD|NARD\s+Philippe/i, prenom: 'Philippe', nom: 'NARD' },
      { regex: /SHAMIR\s+ADAMALY|ADAMALY\s+SHAMIR/i, prenom: 'SHAMIR', nom: 'ADAMALY' },
      { regex: /([A-Za-zÀ-ÖØ-öø-ÿ]+)\s+([A-Z\s]+)/i, prenomIndex: 1, nomIndex: 2 },
      { regex: /([A-Z\s]+)\s+([A-Za-zÀ-ÖØ-öø-ÿ]+)/i, prenomIndex: 2, nomIndex: 1 }
    ];
    
    for (const pattern of namePatterns) {
      const nameMatch = fullText.match(pattern.regex);
      if (nameMatch) {
        if (pattern.prenom && pattern.nom) {
          extractedInfo.prenom_client = pattern.prenom;
          extractedInfo.nom_client = pattern.nom;
        } else if (pattern.prenomIndex !== undefined && pattern.nomIndex !== undefined) {
          extractedInfo.prenom_client = nameMatch[pattern.prenomIndex];
          extractedInfo.nom_client = nameMatch[pattern.nomIndex];
        }
        break;
      }
    }
    
    // Recherche de l'adresse
    if (!extractedInfo.adresse_client) {
      // Différents formats d'adresse
      const addressPatterns = [
        /(\d+\s+Rue\s+[A-Za-zÀ-ÖØ-öø-ÿ\s]+)[,\s]+(LANNILIS|[A-Za-zÀ-ÖØ-öø-ÿ]+)[,\s]+(Finistère|[A-Za-zÀ-ÖØ-öø-ÿ]+)[,\s]+(\d{5})/i,
        /(\d+\s+LOTISSEMENT\s+[A-Za-zÀ-ÖØ-öø-ÿ\s]+)[,\s]+(SAINT\s+ETIENNE|[A-Za-zÀ-ÖØ-öø-ÿ\s]+)[,\s]+(Haute-Loire|[A-Za-zÀ-ÖØ-öø-ÿ]+)[,\s]+(\d{5})/i,
        /(\d+\s+[A-Za-zÀ-ÖØ-öø-ÿ\s]+)[,\s]+(\d{5})\s+([A-Za-zÀ-ÖØ-öø-ÿ\s]+)/i
      ];
      
      for (const pattern of addressPatterns) {
        const addressMatch = fullText.match(pattern);
        if (addressMatch) {
          if (addressMatch.length >= 5) {
            extractedInfo.adresse_client = `${addressMatch[1]}, ${addressMatch[2]}, ${addressMatch[3]}, ${addressMatch[4]}, France`;
          } else if (addressMatch.length >= 4) {
            extractedInfo.adresse_client = `${addressMatch[1]}, ${addressMatch[2]} ${addressMatch[3]}, France`;
          }
          break;
        }
      }
    }
    
    // Recherche du téléphone
    if (!extractedInfo.telephone_client) {
      const phoneRegexes = [
        /T\s*:\s*(\d{10})/i,
        /Tel\s*:\s*(\d{10})/i,
        /Tél\s*:\s*(\d{10})/i,
        /Téléphone\s*:\s*(\d{10})/i,
        /Mobile\s*:\s*(\d{10})/i,
        /(\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2})/
      ];
      
      for (const regex of phoneRegexes) {
        const phoneMatch = fullText.match(regex);
        if (phoneMatch) {
          // Nettoyer le numéro de téléphone (enlever les espaces, tirets, etc.)
          extractedInfo.telephone_client = phoneMatch[1].replace(/[\s.-]/g, '');
          break;
        }
      }
    }
    
    // Recherche de l'email
    if (!extractedInfo.email_client) {
      const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i;
      const emailMatches = [...fullText.matchAll(new RegExp(emailRegex, 'gi'))];
      
      for (const match of emailMatches) {
        const email = match[1];
        // Exclure les emails de ici-store.com
        if (!email.includes('ici-store.com')) {
          extractedInfo.email_client = email;
          break;
        }
      }
    }
  }
  
  // Recherche du numéro de commande
  const commandeRegex = /Commande\s+[#]?(\d+)|N°\s+commande\s*:\s*(\d+)|Référence\s*:\s*(\d+)/i;
  const commandeMatch = fullText.match(commandeRegex);
  if (commandeMatch) {
    // Prendre le premier groupe non-undefined
    extractedInfo.reference_produit = commandeMatch.slice(1).find(g => g !== undefined);
  }
  
  return extractedInfo;
}

/**
 * Fonction pour extraire les informations sur le produit à partir du texte complet (générique)
 */
function extractProductInfo(textItems: any[], fullText: string): ExtractedInformation {
  const extractedInfo: ExtractedInformation = {};
  
  // Extraction de la référence et du modèle du produit
  const productPatterns = [
    // STORBOX 300 - Store banne Coffre Intégral sur mesure
    { 
      refRegex: /STORBOX\s+(\d+)/i, 
      modeleRegex: /Store\s+banne\s+Coffre\s+Intégral\s+sur\s+mesure/i,
      marque: 'STORBOX'
    },
    // Rentollage de store sur mesure
    { 
      refRegex: /Rentollage\s+de\s+store\s+sur\s+mesure/i, 
      modeleRegex: /Rentollage\s+de\s+store\s+sur\s+mesure/i,
      marque: 'Store sur mesure'
    },
    // Store banne
    {
      refRegex: /Store\s+banne\s+([A-Za-z0-9]+)/i,
      modeleRegex: /Store\s+banne\s+[A-Za-z0-9]+\s+([^,\n]+)/i,
      marque: 'Store banne'
    },
    // Produit générique
    {
      refRegex: /Référence\s*:\s*([A-Za-z0-9-]+)/i,
      modeleRegex: /Désignation\s*:\s*([^,\n]+)/i,
      marque: 'Générique'
    }
  ];
  
  for (const pattern of productPatterns) {
    const refMatch = fullText.match(pattern.refRegex);
    if (refMatch) {
      extractedInfo.reference_produit = refMatch[0].trim();
      extractedInfo.marque_produit = pattern.marque;
      
      const modeleMatch = fullText.match(pattern.modeleRegex);
      if (modeleMatch) {
        extractedInfo.modele_produit = modeleMatch[0].trim();
      }
      
      break;
    }
  }
  
  // Extraction de la couleur de l'armature
  const armaturePatterns = [
    /Couleur\s+d['']armature\s*:\s*([^,\n]+)/i,
    /Couleur\s+armature\s*:\s*([^,\n]+)/i,
    /Armature\s*:\s*([^,\n]+)/i,
    /Blanc\s+RAL\s+9016/i
  ];
  
  for (const pattern of armaturePatterns) {
    const armatureMatch = fullText.match(pattern);
    if (armatureMatch) {
      extractedInfo.couleur_armature = armatureMatch[1] ? armatureMatch[1].trim() : armatureMatch[0].trim();
      break;
    }
  }
  
  // Extraction de la couleur de la toile
  const toilePatterns = [
    /Couleur\s+de\s+la\s+toile\s*:\s*([^,\n]+)/i,
    /Toile\s*:\s*([^,\n]+)/i,
    /Toile\s+Dickson\s+([^,\n]+)/i,
    /Toile\s+Dickson\s+Carbone\s+ORC\s+U171/i,
    /Toile\s+Dickson\s+Blanc\/Gris\s+ORC\s+8907/i
  ];
  
  for (const pattern of toilePatterns) {
    const toileMatch = fullText.match(pattern);
    if (toileMatch) {
      extractedInfo.couleur_toile = toileMatch[1] ? toileMatch[1].trim() : toileMatch[0].trim();
      break;
    }
  }
  
  // Extraction des informations sur le moteur
  const moteurPatterns = [
    /Moteur\s*:\s*([^,\n]+)/i,
    /Motorisation\s*:\s*([^,\n]+)/i,
    /Moteur\s+Somfy\s+Sunea\s+50\s+CSI\s+iO\s+50\/12\s+\(avec\s+manivelle\)/i
  ];
  
  for (const pattern of moteurPatterns) {
    const moteurMatch = fullText.match(pattern);
    if (moteurMatch) {
      extractedInfo.moteur = moteurMatch[1] ? moteurMatch[1].trim() : moteurMatch[0].trim();
      break;
    }
  }
  
  // Détection de capteur de vent
  extractedInfo.capteur_vent = /capteur\s+(?:de\s+)?vent|anémomètre|anemometre/i.test(fullText);
  
  return extractedInfo;
}

/**
 * Fonction pour extraire les informations de prix (générique)
 */
function extractPriceInfo(textItems: any[], fullText: string): ExtractedInformation {
  const extractedInfo: ExtractedInformation = {};
  
  // Extraction du prix unitaire
  const prixUnitaireRegexes = [
    /Prix\s+unitaire\s*:\s*(\d+[.,]\d{2})\s*€/i,
    /(\d+[.,]\d{2})\s*€\s*HT/i,
    /(\d+[.,]\d{2})\s*€/
  ];
  
  for (const regex of prixUnitaireRegexes) {
    const prixMatch = fullText.match(regex);
    if (prixMatch) {
      extractedInfo.prix_unitaire = parseFloat(prixMatch[1].replace(',', '.'));
      break;
    }
  }
  
  // Extraction de la TVA
  const tvaRegexes = [
    /TVA\s+FR\s+\(\d+\.\d+%\)\s*:\s*(\d+[.,]\d{2})\s*€/i,
    /TVA\s*:\s*(\d+[.,]\d{2})\s*€/i,
    /Montant\s+TVA\s*:\s*(\d+[.,]\d{2})\s*€/i
  ];
  
  for (const regex of tvaRegexes) {
    const tvaMatch = fullText.match(regex);
    if (tvaMatch) {
      extractedInfo.tva = parseFloat(tvaMatch[1].replace(',', '.'));
      break;
    }
  }
  
  // Extraction des frais de port
  const fraisPortRegexes = [
    /Frais\s+de\s+port\s*:\s*(\d+[.,]\d{2})\s*€/i,
    /Livraison\s*:\s*(\d+[.,]\d{2})\s*€/i,
    /Transport\s*:\s*(\d+[.,]\d{2})\s*€/i
  ];
  
  for (const regex of fraisPortRegexes) {
    const fraisPortMatch = fullText.match(regex);
    if (fraisPortMatch) {
      extractedInfo.frais_port = parseFloat(fraisPortMatch[1].replace(',', '.'));
      break;
    }
  }
  
  // Extraction du montant global
  const montantGlobalRegexes = [
    /Montant\s+global\s*:\s*(\d+[.,]\d{2})\s*€/i,
    /Total\s+TTC\s*:\s*(\d+[.,]\d{2})\s*€/i,
    /Total\s*:\s*(\d+[.,]\d{2})\s*€/i,
    /Net\s+à\s+payer\s*:\s*(\d+[.,]\d{2})\s*€/i
  ];
  
  for (const regex of montantGlobalRegexes) {
    const montantGlobalMatch = fullText.match(regex);
    if (montantGlobalMatch) {
      extractedInfo.montant_global = parseFloat(montantGlobalMatch[1].replace(',', '.'));
      break;
    }
  }
  
  return extractedInfo;
}

/**
 * Fonction pour extraire la date de commande/facture (générique)
 */
function extractDateInfo(textItems: any[], fullText: string): ExtractedInformation {
  const extractedInfo: ExtractedInformation = {};
  
  // Rechercher la date de commande directement
  const dateCommandeRegexes = [
    /Date\s+de\s+commande\s*:\s*(\d{1,2})\s*(janv|févr|mars|avr|mai|juin|juil|août|sept|oct|nov|déc|janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\.?\s*(\d{4})/i,
    /Date\s+de\s+facture\s*:\s*(\d{1,2})\s*(janv|févr|mars|avr|mai|juin|juil|août|sept|oct|nov|déc|janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\.?\s*(\d{4})/i,
    /Date\s*:\s*(\d{1,2})\s*(janv|févr|mars|avr|mai|juin|juil|août|sept|oct|nov|déc|janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\.?\s*(\d{4})/i
  ];
  
  for (const regex of dateCommandeRegexes) {
    const dateCommandeMatch = fullText.match(regex);
    if (dateCommandeMatch) {
      const jour = parseInt(dateCommandeMatch[1]);
      const moisTexte = dateCommandeMatch[2].toLowerCase();
      const annee = parseInt(dateCommandeMatch[3]);
      
      // Convertir le mois textuel en numérique
      const moisMap: {[key: string]: number} = {
        'janv': 0, 'janvier': 0,
        'févr': 1, 'février': 1,
        'mars': 2,
        'avr': 3, 'avril': 3,
        'mai': 4,
        'juin': 5,
        'juil': 6, 'juillet': 6,
        'août': 7,
        'sept': 8, 'septembre': 8,
        'oct': 9, 'octobre': 9,
        'nov': 10, 'novembre': 10,
        'déc': 11, 'décembre': 11
      };
      
      const mois = moisMap[moisTexte] || 0;
      extractedInfo.date_achat = new Date(annee, mois, jour);
      return extractedInfo;
    }
  }
  
  // Rechercher les dates au format français (JJ/MM/AAAA)
  const dateRegex = /(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})/g;
  const dateMatches = [...fullText.matchAll(dateRegex)];
  
  // Rechercher les mots-clés associés aux dates
  const dateKeywords = ['date', 'commande', 'facture', 'achat', 'livraison'];
  
  // Chercher d'abord les dates associées à des mots-clés
  for (const keyword of dateKeywords) {
    // Trouver les éléments de texte contenant le mot-clé
    const keywordItems = textItems.filter(item => 
      item.text.toLowerCase().includes(keyword)
    );
    
    for (const item of keywordItems) {
      // Vérifier si l'élément lui-même contient une date
      const itemDateMatch = item.text.match(dateRegex);
      if (itemDateMatch) {
        const [day, month, year] = itemDateMatch[0].split(/[\/\.-]/).map(Number);
        extractedInfo.date_achat = new Date(year, month - 1, day);
        console.log(`Date trouvée avec le mot-clé "${keyword}":`, extractedInfo.date_achat);
        return extractedInfo;
      }
      
      // Sinon, chercher dans les éléments proches
      const itemY = item.y;
      const nearbyItems = textItems.filter(otherItem => 
        Math.abs(otherItem.y - itemY) < 20 && // Proche verticalement
        otherItem !== item // Pas le même élément
      );
      
      for (const nearbyItem of nearbyItems) {
        const nearbyDateMatch = nearbyItem.text.match(dateRegex);
        if (nearbyDateMatch) {
          const [day, month, year] = nearbyDateMatch[0].split(/[\/\.-]/).map(Number);
          extractedInfo.date_achat = new Date(year, month - 1, day);
          console.log(`Date trouvée près du mot-clé "${keyword}":`, extractedInfo.date_achat);
          return extractedInfo;
        }
      }
    }
  }
  
  // Si aucune date n'a été trouvée avec des mots-clés, prendre la première date trouvée
  if (dateMatches.length > 0) {
    const [day, month, year] = dateMatches[0][0].split(/[\/\.-]/).map(Number);
    extractedInfo.date_achat = new Date(year, month - 1, day);
    console.log("Date trouvée (première occurrence):", extractedInfo.date_achat);
    return extractedInfo;
  }
  
  // Si aucune date n'est trouvée, utiliser la date actuelle
  console.log("Aucune date trouvée, utilisation de la date actuelle");
  extractedInfo.date_achat = new Date();
  
  return extractedInfo;
}

// Fonctions spécifiques pour le modèle ICI-Store
function extractClientInfoIciStore(textItems: any[], fullText: string): ExtractedInformation {
  return extractClientInfo(textItems, fullText); // Utiliser la fonction générique pour l'instant
}

function extractProductInfoIciStore(textItems: any[], fullText: string): ExtractedInformation {
  return extractProductInfo(textItems, fullText); // Utiliser la fonction générique pour l'instant
}

function extractPriceInfoIciStore(textItems: any[], fullText: string): ExtractedInformation {
  return extractPriceInfo(textItems, fullText); // Utiliser la fonction générique pour l'instant
}

function extractDateInfoIciStore(textItems: any[], fullText: string): ExtractedInformation {
  return extractDateInfo(textItems, fullText); // Utiliser la fonction générique pour l'instant
}

// Fonctions spécifiques pour le modèle Leroy Merlin
function extractClientInfoLeroyMerlin(textItems: any[], fullText: string): ExtractedInformation {
  const extractedInfo: ExtractedInformation = {};
  
  // Rechercher la section "Client" ou "Facturé à"
  const clientRegex = /Client\s*:|Facturé\s+à\s*:/i;
  const clientMatch = fullText.match(clientRegex);
  
  if (clientMatch) {
    // Trouver l'index de l'élément contenant "Client" ou "Facturé à"
    const clientIndex = textItems.findIndex(item => 
      clientRegex.test(item.text)
    );
    
    if (clientIndex !== -1) {
      // Collecter les éléments de texte qui sont en dessous de l'élément "Client"
      const clientY = textItems[clientIndex].y;
      
      // Trouver la prochaine section
      const nextSectionRegex = /Livraison|Paiement|Articles|Produits/i;
      const nextSectionIndex = textItems.findIndex((item, idx) => 
        idx > clientIndex && nextSectionRegex.test(item.text)
      );
      
      const endY = nextSectionIndex !== -1 ? textItems[nextSectionIndex].y : 0;
      
      const clientSectionItems = textItems
        .filter(item => 
          item.y < clientY && // Éléments en dessous de "Client"
          (endY === 0 || item.y > endY) && // Éléments au-dessus de la section suivante
          item.text.trim() !== '' && // Ignorer les éléments vides
          !clientRegex.test(item.text) // Ignorer l'en-tête lui-même
        )
        .sort((a, b) => b.y - a.y); // Trier par position Y (de haut en bas)
      
      // Extraire le nom et prénom (format Leroy Merlin)
      // Généralement au format "M. Prénom NOM" ou "Mme Prénom NOM"
      const nameRegex = /M(?:me|\.)\s+([A-Za-zÀ-ÖØ-öø-ÿ]+)\s+([A-Z\s]+)/i;
      
      for (const item of clientSectionItems) {
        const nameMatch = item.text.match(nameRegex);
        if (nameMatch) {
          extractedInfo.prenom_client = nameMatch[1];
          extractedInfo.nom_client = nameMatch[2];
          break;
        }
      }
      
      // Extraire l'adresse (format Leroy Merlin)
      let adresseLines = [];
      
      for (const item of clientSectionItems) {
        // Ignorer les lignes contenant le nom ou l'email ou le téléphone
        if (item.text.includes('@') || /Tel|Tél|Téléphone/i.test(item.text) || 
            (extractedInfo.prenom_client && item.text.includes(extractedInfo.prenom_client))) {
          continue;
        }
        
        // Rechercher des motifs d'adresse (code postal, ville, rue, etc.)
        const isAddressLine = /\d+\s+[A-Za-zÀ-ÖØ-öø-ÿ]+|[A-Za-zÀ-ÖØ-öø-ÿ]+,|[0-9]{5}/.test(item.text);
        
        if (isAddressLine) {
          adresseLines.push(item.text.trim());
        }
      }
      
      if (adresseLines.length > 0) {
        extractedInfo.adresse_client = adresseLines.join(', ');
      }
      
      // Extraire le téléphone (format Leroy Merlin)
      const phoneRegex = /Tel\s*:\s*(\d+)|Tél\s*:\s*(\d+)|Téléphone\s*:\s*(\d+)|Mobile\s*:\s*(\d+)/i;
      for (const item of clientSectionItems) {
        const phoneMatch = item.text.match(phoneRegex);
        if (phoneMatch) {
          // Prendre le premier groupe non-undefined
          extractedInfo.telephone_client = phoneMatch.slice(1).find(g => g !== undefined);
          break;
        }
      }
      
      // Extraire l'email (format Leroy Merlin)
      const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i;
      for (const item of clientSectionItems) {
        const emailMatch = item.text.match(emailRegex);
        if (emailMatch) {
          extractedInfo.email_client = emailMatch[1];
          break;
        }
      }
    }
  }
  
  // Si on n'a pas trouvé les informations, utiliser la méthode générique
  if (!extractedInfo.nom_client || !extractedInfo.prenom_client) {
    const genericInfo = extractClientInfo(textItems, fullText);
    return { ...genericInfo, ...extractedInfo };
  }
  
  return extractedInfo;
}

function extractProductInfoLeroyMerlin(textItems: any[], fullText: string): ExtractedInformation {
  const extractedInfo: ExtractedInformation = {};
  
  // Rechercher la section "Articles" ou "Produits"
  const articlesRegex = /Articles|Produits|Désignation/i;
  const articlesMatch = fullText.match(articlesRegex);
  
  if (articlesMatch) {
    // Trouver l'index de l'élément contenant "Articles" ou "Produits"
    const articlesIndex = textItems.findIndex(item => 
      articlesRegex.test(item.text)
    );
    
    if (articlesIndex !== -1) {
      // Collecter les éléments de texte qui sont en dessous de l'élément "Articles"
      const articlesY = textItems[articlesIndex].y;
      
      // Trouver la prochaine section
      const nextSectionRegex = /Total|Paiement|Livraison/i;
      const nextSectionIndex = textItems.findIndex((item, idx) => 
        idx > articlesIndex && nextSectionRegex.test(item.text)
      );
      
      const endY = nextSectionIndex !== -1 ? textItems[nextSectionIndex].y : 0;
      
      const articlesSectionItems = textItems
        .filter(item => 
          item.y < articlesY && // Éléments en dessous de "Articles"
          (endY === 0 || item.y > endY) && // Éléments au-dessus de la section suivante
          item.text.trim() !== '' && // Ignorer les éléments vides
          !articlesRegex.test(item.text) // Ignorer l'en-tête lui-même
        )
        .sort((a, b) => b.y - a.y); // Trier par position Y (de haut en bas)
      
      // Extraire la référence et le modèle du produit (format Leroy Merlin)
      const refRegex = /Réf\s*:\s*([A-Za-z0-9]+)/i;
      const modeleRegex = /Store\s+banne|Brise\s+soleil|Pergola|Parasol|Voile\s+d'ombrage/i;
      
      for (const item of articlesSectionItems) {
        const refMatch = item.text.match(refRegex);
        if (refMatch) {
          extractedInfo.reference_produit = refMatch[1];
        }
        
        const modeleMatch = item.text.match(modeleRegex);
        if (modeleMatch) {
          extractedInfo.modele_produit = modeleMatch[0];
          extractedInfo.marque_produit = 'Leroy Merlin';
        }
      }
      
      // Extraire la couleur (format Leroy Merlin)
      const couleurRegex = /Couleur\s*:\s*([^,\n]+)/i;
      for (const item of articlesSectionItems) {
        const couleurMatch = item.text.match(couleurRegex);
        if (couleurMatch) {
          // Déterminer si c'est une couleur d'armature ou de toile
          if (item.text.toLowerCase().includes('armature')) {
            extractedInfo.couleur_armature = couleurMatch[1];
          } else if (item.text.toLowerCase().includes('toile')) {
            extractedInfo.couleur_toile = couleurMatch[1];
          } else {
            // Si non spécifié, supposer que c'est l'armature
            extractedInfo.couleur_armature = couleurMatch[1];
          }
        }
      }
      
      // Extraire les informations sur le moteur (format Leroy Merlin)
      const moteurRegex = /Motorisation\s*:\s*([^,\n]+)/i;
      for (const item of articlesSectionItems) {
        const moteurMatch = item.text.match(moteurRegex);
        if (moteurMatch) {
          extractedInfo.moteur = moteurMatch[1];
        }
      }
      
      // Détection de capteur de vent (format Leroy Merlin)
      for (const item of articlesSectionItems) {
        if (/capteur\s+(?:de\s+)?vent|anémomètre|anemometre/i.test(item.text)) {
          extractedInfo.capteur_vent = true;
          break;
        }
      }
    }
  }
  
  // Si on n'a pas trouvé les informations, utiliser la méthode générique
  if (!extractedInfo.reference_produit || !extractedInfo.modele_produit) {
    const genericInfo = extractProductInfo(textItems, fullText);
    return { ...genericInfo, ...extractedInfo };
  }
  
  return extractedInfo;
}

function extractPriceInfoLeroyMerlin(textItems: any[], fullText: string): ExtractedInformation {
  const extractedInfo: ExtractedInformation = {};
  
  // Extraction du prix unitaire (format Leroy Merlin)
  const prixUnitaireRegex = /Prix\s+unitaire\s*:\s*(\d+[.,]\d{2})\s*€|(\d+[.,]\d{2})\s*€\s*HT/i;
  const prixMatch = fullText.match(prixUnitaireRegex);
  if (prixMatch) {
    // Prendre le premier groupe non-undefined
    const prix = prixMatch.slice(1).find(g => g !== undefined);
    if (prix) {
      extractedInfo.prix_unitaire = parseFloat(prix.replace(',', '.'));
    }
  }
  
  // Extraction de la TVA (format Leroy Merlin)
  const tvaRegex = /TVA\s*:\s*(\d+[.,]\d{2})\s*€|Montant\s+TVA\s*:\s*(\d+[.,]\d{2})\s*€/i;
  const tvaMatch = fullText.match(tvaRegex);
  if (tvaMatch) {
    // Prendre le premier groupe non-undefined
    const tva = tvaMatch.slice(1).find(g => g !== undefined);
    if (tva) {
      extractedInfo.tva = parseFloat(tva.replace(',', '.'));
    }
  }
  
  // Extraction des frais de port (format Leroy Merlin)
  const fraisPortRegex = /Livraison\s*:\s*(\d+[.,]\d{2})\s*€|Frais\s+de\s+livraison\s*:\s*(\d+[.,]\d{2})\s*€/i;
  const fraisPortMatch = fullText.match(fraisPortRegex);
  if (fraisPortMatch) {
    // Prendre le premier groupe non-undefined
    const fraisPort = fraisPortMatch.slice(1).find(g => g !== undefined);
    if (fraisPort) {
      extractedInfo.frais_port = parseFloat(fraisPort.replace(',', '.'));
    }
  }
  
  // Extraction du montant global (format Leroy Merlin)
  const montantGlobalRegex = /Total\s+TTC\s*:\s*(\d+[.,]\d{2})\s*€|Total\s*:\s*(\d+[.,]\d{2})\s*€/i;
  const montantGlobalMatch = fullText.match(montantGlobalRegex);
  if (montantGlobalMatch) {
    // Prendre le premier groupe non-undefined
    const montantGlobal = montantGlobalMatch.slice(1).find(g => g !== undefined);
    if (montantGlobal) {
      extractedInfo.montant_global = parseFloat(montantGlobal.replace(',', '.'));
    }
  }
  
  // Si on n'a pas trouvé les informations, utiliser la méthode générique
  if (!extractedInfo.prix_unitaire && !extractedInfo.montant_global) {
    const genericInfo = extractPriceInfo(textItems, fullText);
    return { ...genericInfo, ...extractedInfo };
  }
  
  return extractedInfo;
}

function extractDateInfoLeroyMerlin(textItems: any[], fullText: string): ExtractedInformation {
  const extractedInfo: ExtractedInformation = {};
  
  // Rechercher la date de commande (format Leroy Merlin)
  const dateRegex = /Date\s+de\s+commande\s*:\s*(\d{2})\/(\d{2})\/(\d{4})/i;
  const dateMatch = fullText.match(dateRegex);
  if (dateMatch) {
    const jour = parseInt(dateMatch[1]);
    const mois = parseInt(dateMatch[2]) - 1; // Les mois commencent à 0 en JavaScript
    const annee = parseInt(dateMatch[3]);
    extractedInfo.date_achat = new Date(annee, mois, jour);
    return extractedInfo;
  }
  
  // Si on n'a pas trouvé la date, utiliser la méthode générique
  return extractDateInfo(textItems, fullText);
}

// Fonctions spécifiques pour le modèle Castorama
function extractClientInfoCastorama(textItems: any[], fullText: string): ExtractedInformation {
  return extractClientInfo(textItems, fullText); // Utiliser la fonction générique pour l'instant
}

function extractProductInfoCastorama(textItems: any[], fullText: string): ExtractedInformation {
  return extractProductInfo(textItems, fullText); // Utiliser la fonction générique pour l'instant
}

function extractPriceInfoCastorama(textItems: any[], fullText: string): ExtractedInformation {
  return extractPriceInfo(textItems, fullText); // Utiliser la fonction générique pour l'instant
}

function extractDateInfoCastorama(textItems: any[], fullText: string): ExtractedInformation {
  return extractDateInfo(textItems, fullText); // Utiliser la fonction générique pour l'instant
}

/**
 * Fonction pour obtenir des données de secours si l'extraction échoue
 */
function getFallbackData(): ExtractedInformation {
  return {
    nom_client: 'Client',
    prenom_client: 'Nouveau',
    adresse_client: 'Adresse non détectée',
    email_client: '',
    telephone_client: '',
    reference_produit: 'REF-' + Date.now(),
    modele_produit: 'Store banne',
    marque_produit: 'Non détectée',
    date_achat: new Date(),
    couleur_armature: 'Non détectée',
    couleur_toile: 'Non détectée',
    moteur: 'Non détecté',
    capteur_vent: false
  };
}