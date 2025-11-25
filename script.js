// URL de la feuille Google Sheets publiée en ligne
const PUBLISHED_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRYvfS6YKbBtOMa2907HUQ_739hVHZV8iHoJlkOlPL7tSlx74zJLTTTlTSsaCIwt8bjE5l4-02Ap2-A/pubhtml';
const CSV_URL = PUBLISHED_URL.replace('pubhtml', 'pub?output=csv');


let agents = [];
let selectedList = [];
let pdfConfig = {
  date: '10 juin 2025',
  site: 'MONTAGNAC-MONTPEZAT',
  client: 'CLUB BELAMBRA - LE VERDON'
};

// ============================================
// PARSER CSV
// ============================================

function parseCSV(csv) {
  // je filtre les lignes vides de mes données récupérées en sautant des lignes :
  const lines = csv.split('\n').filter(line => line.trim());

  /* 
  je change les lignes de mon tab avec map, j'initialise un tab vide dans lequel je vais remplir
  mes données dans la var current
  */
  return lines.map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;
    

    for (let char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  });
}

// ============================================
// NOTIFICATION MODALE
// ============================================

function showNotification(message, type = 'success') {
  const modal = document.getElementById('notification-modal');
  const content = document.getElementById('notification-content');
  const closeBtn = document.getElementById('close-notification');
  
  if (!modal || !content) {
    console.warn('⚠️ Éléments de notification introuvables');
    return;
  }
  
  const configs = {
    success: {
      icon: `
        <svg class="w-16 h-16 mx-auto mb-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      `,
      color: 'text-green-600'
    },
    error: {
      icon: `
        <svg class="w-16 h-16 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      `,
      color: 'text-red-600'
    },
    loading: {
      icon: `
        <svg class="animate-spin w-16 h-16 mx-auto mb-4 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      `,
      color: 'text-blue-600'
    }
  };
  
  const config = configs[type] || configs.success;
  
  content.innerHTML = `
    ${config.icon}
    <p class="text-xl font-semibold ${config.color} mb-2">${message}</p>
  `;
  
  if (closeBtn) {
    closeBtn.style.display = type === 'loading' ? 'none' : 'block';
  }
  
  modal.classList.remove('hidden');
  modal.style.opacity = '0';
  setTimeout(() => {
    modal.style.opacity = '1';
  }, 10);
  
  if (type !== 'loading') {
    setTimeout(() => {
      hideNotification();
    }, 2500);
  }
}

function hideNotification() {
  const modal = document.getElementById('notification-modal');
  if (modal) {
    modal.style.opacity = '0';
    setTimeout(() => {
      modal.classList.add('hidden');
    }, 300);
  }
}

// ============================================
// CHARGER LES DONNÉES
// ============================================

async function loadDataFromGoogleSheets() {
  try {
    showNotification('Chargement en cours...', 'loading');
    
    console.log('📥 Chargement des données...');
    
    const response = await fetch(CSV_URL);
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}`);
    }
    
    const csv = await response.text();
    const rows = parseCSV(csv);
    
    if (rows.length === 0) {
      throw new Error('Le Google Sheet est vide');
    }
    
    const headersRaw = rows[0];
    const headers = headersRaw.map(h => 
      h.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    );
    
    const nomIndex = headers.findIndex(h => h.includes('nom') || h.includes('name'));
    const prenomIndex = headers.findIndex(h => h.includes('prenom') || h.includes('firstname'));
    const telIndex = headers.findIndex(h => h.includes('tel') || h.includes('phone'));
    
    if (nomIndex === -1 || prenomIndex === -1 || telIndex === -1) {
      throw new Error('Colonnes NOM, Prénom ou Téléphone introuvables');
    }
    
    const dataRows = rows.slice(1);
    
    agents = dataRows
      .filter(row => row[nomIndex] && row[prenomIndex])
      .map(row => ({
        nom: row[nomIndex]?.trim() || '',
        prenom: row[prenomIndex]?.trim() || '',
        telephone: row[telIndex]?.trim() || ''
      }));
    
    console.log(`✅ ${agents.length} agents chargés !`);
    
    
    showNotification(`${agents.length} agents chargés !`, 'success');

    displayAgents();
    
  } catch (error) {
    console.error('❌ ERREUR:', error);
    showNotification('Erreur de chargement', 'error');
    
    setTimeout(() => {
      alert(`Erreur: ${error.message}`);
    }, 2100);
  }
}


function initEventListeners() {
  console.log('🎯 Initialisation des événements...');
  
  // Bouton Actualiser (refresh-btn)
  const refreshBtn = document.getElementById('refresh-btn');
  
  if (refreshBtn) {
    console.log('✅ Bouton Actualiser connecté !');
    refreshBtn.addEventListener('click', () => {
      console.log('🔄 Actualisation...');
      loadDataFromGoogleSheets();
    });
  } else {
    console.error('❌ Bouton #refresh-btn introuvable !');
  }
  
  // Bouton de fermeture de la modale
  const closeBtn = document.getElementById('close-notification');
  
  if (closeBtn) {
    console.log('✅ Bouton fermeture modale connecté !');
    closeBtn.addEventListener('click', () => {
      console.log('❌ Clic sur fermeture modale');
      hideNotification();
    });
  } else {
    console.warn('⚠️ Bouton #close-notification introuvable');
  }
  
  // Fermer en cliquant sur l'overlay
  const modal = document.getElementById('notification-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        console.log('📍 Clic sur overlay');
        hideNotification();
      }
    });
  }
  
  // Fermer avec Échap
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('notification-modal');
      if (modal && !modal.classList.contains('hidden')) {
        console.log('⌨️ Fermeture via Échap');
        hideNotification();
      }
    }
  });
}

function displayAgents() {
  const agentsContainer = document.getElementById('available-agents')
  if (!agentsContainer) {
    console.error('❌ Élément #available-agents introuvable !');
    return;
  }
  agentsContainer.innerHTML = '';

  if(agents.length === 0) {
    agentsContainer.innerHTML = '<p class="text-gray-500">Aucun agent disponible</p>';
    return;
  }

  for (const agent of agents) {
    const agentCard = createAgentCard(agent);
    agentsContainer.append(agentCard);
  }
}

function createAgentCard(agent) {
 
  const button = document.createElement('button');
  button.className = `w-full rounded-lg border-2 border-slate-300 mb-4`;
  
  
  const firstLetterInitial = agent.prenom[0].toUpperCase();
  const secondLetterInitial = agent.nom[0].toUpperCase();
  const initials = firstLetterInitial + secondLetterInitial;
  
 
  button.innerHTML = `
    <div class="flex justify-between items-center p-2.5">
      <div class="flex gap-4 items-center">
        <div class="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center">
          <p class="text-white font-semibold">${initials}</p>
        </div>
        <div style="text-align: left;">
          <p class="text-slate-600 font-medium text-left">${agent.nom} ${agent.prenom}</p>
          <p class="text-slate-400 text-left">${agent.telephone}</p>
        </div>
      </div>
      
      <div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-plus"
        >
          <path d="M5 12h14" />
          <path d="M12 5v14" />
        </svg>
      </div>
    </div>
  `;
  
  return button;
}



// INITIALISATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ Application démarrée !');
  
  setTimeout(() => {
    initEventListeners();
    loadDataFromGoogleSheets();
  }, 100);
  
});
