// ============================================
// 🔄 STORAGE OPTIMISÉ (MODIFIÉ)
// ============================================
const STORAGE = {
    key: () => document.getElementById('projectName')?.value.trim() || 'default',
    
    save: () => {
        localStorage.setItem(STORAGE.key(), JSON.stringify(pdfAgents));
        updatePageTitle(); // 🆕 AJOUT : Auto-update du titre
    },
    
    load: () => JSON.parse(localStorage.getItem(STORAGE.key()) || '[]')
};

// 🆕 NOUVELLE FONCTION : Mise à jour du titre
function updatePageTitle() {
    const projectName = STORAGE.key();
    const count = pdfAgents.length;
    const base = "Feuille de route vide";
    
    document.title = projectName !== 'default'
        ? (count > 0 ? `📋 ${projectName} (${count})` : `📋 ${projectName}`)
        : (count > 0 ? `${base} (${count})` : base);
}

// ============================================
// CONFIGURATION ET VARIABLES
// ============================================
const PUBLISHED_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTFqM-HP22wbmGXw0JbosndL-J6PSW9MlY40dBF4wH2uCkOJXLpT7rTBfn5ZZXz6Kpn8fMCpKhpaCJz/pubhtml";
const CSV_URL = PUBLISHED_URL.replace("pubhtml", "pub?output=csv");

let agents = [];
let postes = ['AP', 'CT', 'APC', 'CTC'];
let selectedAgent = null;
let selectedList = [];
let pdfAgents = STORAGE.load();
let pdfConfig = {
  date: "10 juin 2025",
  site: "MONTAGNAC-MONTPEZAT",
  client: "CLUB BELAMBRA - LE VERDON",
};
let searchResults = [];
let agentsToShow = 5;
let agentsPerPage = 5;


function parseCSV(csv) {
  const lines = csv.split("\n").filter((line) => line.trim());

  return lines.map((line) => {
    const values = [];
    let current = "";
    let inQuotes = false;

    for (let char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  });
}

async function loadDataFromGoogleSheets() {
  try {
    console.log("📥 Chargement des données...");

    const response = await fetch(CSV_URL);

    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}`);
    }

    const csv = await response.text();
    const rows = parseCSV(csv);

    if (rows.length === 0) {
      throw new Error("Le Google Sheet est vide");
    }

    const headersRaw = rows[0];
    const headers = headersRaw.map((h) =>
      h
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
    );

    const nomIndex = headers.findIndex(
      (h) => h.includes("nom") || h.includes("name")
    );
    const prenomIndex = headers.findIndex(
      (h) => h.includes("prenom") || h.includes("firstname")
    );
    const telIndex = headers.findIndex(
      (h) => h.includes("tel") || h.includes("phone")
    );

    if (nomIndex === -1 || prenomIndex === -1 || telIndex === -1) {
      throw new Error("Colonnes NOM, Prénom ou Téléphone introuvables");
    }

    const dataRows = rows.slice(1);

    agents = dataRows
      .filter((row) => row[nomIndex] && row[prenomIndex])
      .map((row, index) => ({
        id: index + 1,
        nom: row[nomIndex]?.trim() || "",
        prenom: row[prenomIndex]?.trim() || "",
        telephone: row[telIndex]?.trim() || "",
      }));
    searchResults = [...agents];

    displayAgents();
  } catch (error) {
    console.error("❌ ERREUR:", error);
    showNotification("Erreur de chargement", "error");

    setTimeout(() => {
      alert(`Erreur: ${error.message}`);
    }, 2100);
  }
}

function initEventListeners() {
  const refreshBtn = document.getElementById("refresh-btn");

  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      loadDataFromGoogleSheets();
    });
  } else {
    console.error("❌ Bouton #refresh-btn introuvable !");
  }
  document.getElementById("download-pdf").addEventListener("click", () => {
    generatePDF();
  });

  const searchInput = document.getElementById('agentSearch');

   if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchAgents(e.target.value);
    });
  } else {
    console.error("❌ Champ de recherche #agentSearch introuvable !");
  }
  
  searchInput.addEventListener("input", (e) => {
    searchAgents(e.target.value);
  });

  const loadMoreBtn = document.getElementById("load-more-btn");
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
      loadMoreAgents();
    });
  } 

}

function displayAgents() {
  const agentsContainer = document.getElementById("available-agents");
  if (!agentsContainer) {
    console.error("❌ Élément #available-agents introuvable !");
    return;
  }
  agentsContainer.innerHTML = "";

  if (searchResults.length === 0) {
    agentsContainer.innerHTML =
      '<p class="text-gray-500">Aucun agent disponible</p>';
    return;
  }

  const agentsToDisplay = searchResults.slice(0, agentsToShow);

  for (const agent of agentsToDisplay) {
    const agentCard = createAgentCard(agent);
    agentsContainer.append(agentCard);
  }
  updateAgentsCount();

  const loadMoreBtn = document.getElementById("load-more-btn");

  if (loadMoreBtn){
    if (agentsToShow < searchResults.length) {
      loadMoreBtn.style.display = "block"
    } else {
      loadMoreBtn.style.display = "none"
    } 
  }
}

function searchAgents(searchTerm) {
   agentsToShow = 5;
  if (!searchTerm) {
    searchResults = [...agents]
  } else {
    searchResults = agents.filter(agent => {
      const search = searchTerm.toLowerCase();
      const nomMatch = agent.nom.toLowerCase().includes(search);
      const prenomMatch = agent.prenom.toLowerCase().includes(search);
      return nomMatch || prenomMatch;
    })
  }
  displayAgents();
}

function createAgentCard(agent) {
  const button = document.createElement("button");
  button.classList.add("agent-card");

  const firstLetterInitial = agent.prenom[0].toUpperCase();
  const secondLetterInitial = agent.nom[0].toUpperCase();
  const initials = firstLetterInitial + secondLetterInitial;

  button.innerHTML = `
  <div class="w-full rounded-lg border-2 border-slate-200 mb-4 flex justify-between items-center p-2.5">
    <div class="flex gap-4 items-center">
      <div class="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center">
        <p class="text-white font-semibold">${initials}</p>
      </div>
      <div style="text-align: left;">
        <p class="agent-name text-slate-600 font-medium text-left">${agent.prenom} ${agent.nom}</p>
        <p class="agent-phone text-slate-400 text-left">${agent.telephone}</p>
      </div>
    </div>
    <button class="add-pdf-btn bg-green-500 border-2 border-green-400 w-fit p-2 rounded-md
     text-white" style="display: none;" data-agent-id="${agent.id}">
      Ajouter
    </button>
  </div>
`;

  button.addEventListener("click", () => {
    document.querySelectorAll(".add-pdf-btn").forEach((btn) => {
      btn.style.display = "none";
    });

    const thisButton = button.querySelector(".add-pdf-btn");
    if (thisButton) {
      thisButton.style.display = "block";
    }

    selectAgent(agent, button);
  });

  button.querySelector(".add-pdf-btn").addEventListener("click", (e) => {
    e.stopPropagation();

    const success = addToPdfList(agent);

    if (success) {
      const addButton = button.querySelector(".add-pdf-btn");
      addButton.textContent = "✓ Ajouté";
      addButton.style.backgroundColor = "#10b981";
      addButton.style.borderColor = "#10b981";
      addButton.disabled = true;

      const rect = addButton.getBoundingClientRect();
      confetti({
        particleCount: 50,
        angle: 90,
        spread: 45,
        origin: {
          x: (rect.left + rect.width / 2) / window.innerWidth,
          y: (rect.top + rect.height / 2) / window.innerHeight,
        },
      });
      displayPdfList();
    }
  });

  return button;
}

function selectAgent(agent, buttonCard) {
  selectedAgent = agent;
  const allCards = document.querySelectorAll("#available-agents button");

  allCards.forEach((btn) => {
    btn.classList.remove("border-green-500", "bg-green-50");
    btn.classList.add("border-slate-200");

    btn.style.borderColor = "";
    btn.style.backgroundColor = "";
  });

  buttonCard.classList.remove("border-slate-200");
  buttonCard.classList.add("border-green-500", "bg-green-50");

  buttonCard.style.borderColor = "#22c55e";
  buttonCard.style.backgroundColor = "#f0fdf4";

  displayPdfList();
}

// ✅ FONCTION OPTIMISÉE (STORAGE.save() met à jour le titre automatiquement)
function addToPdfList(agent) {
  const isAlreadyAdded = pdfAgents.some((a) => a.id === agent.id);
  if (isAlreadyAdded) return false;
  
  pdfAgents.push({ ...agent, poste: "AP" });
  STORAGE.save(); // ← Sauvegarde + update titre automatique
  return true;
}

function updateAgentsCount() {
  document.getElementById("agentsList-count").textContent = searchResults.length;
}

function loadMoreAgents() {
  agentsToShow += agentsPerPage;
  displayAgents();
}

function displayPdfList() {
  const pdfCount = document.getElementById("pdf-count");
  const pdfListContainer = document.getElementById("pdf-list-container");

  pdfCount.textContent = pdfAgents.length;
  pdfListContainer.innerHTML = "";

  if (pdfAgents.length === 0) {
    pdfListContainer.innerHTML = `<p class="text-gray-500">Aucun agent dans la liste PDF</p>`;
    return; // 🔄 AJOUT : return early pour éviter code inutile
  }

  pdfAgents.forEach((agent) => {
    const agentDiv = document.createElement("div");
    agentDiv.innerHTML = `
    <div style="display: flex; gap: 5px; align-items: center; 
    padding: 10px; border-bottom: 1px solid #ccc;">
      <select class="p-2 border-2 border-slate-300 rounded-lg" data-agent-id="${agent.id}">
        <option value="AP" ${agent.poste === 'AP' ? 'selected' : ''}>AP</option>
        <option value="APC" ${agent.poste === 'APC' ? 'selected' : ''}>APC</option>
        <option value="CT" ${agent.poste === 'CT' ? 'selected' : ''}>CT</option>
        <option value="CTC" ${agent.poste === 'CTC' ? 'selected' : ''}>CTC</option>
      </select>
      <button style="background-color: red; color: white; padding: 8px; border: none; 
      border-radius: 5px;" data-agent-id="${agent.id}">Supprimer</button>
      <span>${agent.prenom} ${agent.nom}</span>
    </div>`;
    
    agentDiv.querySelector("button").addEventListener("click", () => {
      removeFromPdfList(agent.id);
    });

    agentDiv.querySelector("select").addEventListener("change", (e) => {
      agent.poste = e.target.value;
      STORAGE.save(); // ← Sauvegarde + update titre automatique
    });

    pdfListContainer.append(agentDiv);
  });
}

// ✅ FONCTION OPTIMISÉE
function removeFromPdfList(agentId) {
  pdfAgents = pdfAgents.filter((agent) => agent.id !== agentId);
  STORAGE.save(); // ← Sauvegarde + update titre automatique

  const allAddButtons = document.querySelectorAll(".add-pdf-btn");
  allAddButtons.forEach((btn) => {
    if (btn.dataset.agentId == agentId) {
      btn.textContent = "Ajouter";
      btn.style.backgroundColor = "#10b981";
      btn.style.borderColor = "#10b981";
      btn.disabled = false;
    }
  });

  displayPdfList();
}

function generatePDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  const date = document.getElementById('roadmap-date').value;
  const site = document.getElementById('roadmap-site').value;
  const client = document.getElementById('roadmap-client').value;
  
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.text("Feuille de pointage", 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Date: ${date || 'Non renseignée'}`, 20, 40);
  doc.text(`Site: ${site || 'Non renseigné'}`, 20, 48);
  doc.text(`Client: ${client || 'Non renseigné'}`, 20, 56);
  
  const pdfAgentsTries = [...pdfAgents].sort((a, b) => {
    if ((a.poste === 'CT' || a.poste === 'CTC') && b.poste !== 'CT' && b.poste !== 'CTC') return -1;
    if ((b.poste === 'CT' || b.poste === 'CTC') && a.poste !== 'CT' && a.poste !== 'CTC') return 1;
    return a.nom.localeCompare(b.nom);
  });
  
  const tableData = pdfAgentsTries.map(agent => [
    agent.nom,
    agent.prenom,
    agent.telephone,
    agent.poste || '',
    ''
  ]);
    
  doc.autoTable({
    head: [['Nom', 'Prénom', 'Téléphone', 'Poste', 'Signature']],
    body: tableData,
    startY: 65,
  });
  
  doc.save("roadmap-agents.pdf");
}

console.log(window.jspdf);

// ✅ DOMCONTENTLOADED OPTIMISÉ
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    pdfAgents = STORAGE.load();
    
    initEventListeners();
    loadDataFromGoogleSheets();
    
    if (pdfAgents.length > 0) {
      displayPdfList();
    }
    
    updatePageTitle(); // 🆕 AJOUT : Initialisation du titre
    
    const projectInput = document.getElementById('projectName');
    if (projectInput) {
      // 🆕 AJOUT : Mise à jour dynamique pendant frappe
      projectInput.addEventListener('input', () => {
        updatePageTitle();
      });
      
      // Chargement du projet après validation
      projectInput.addEventListener('change', () => {
        pdfAgents = STORAGE.load();
        displayPdfList();
        updatePageTitle(); // 🆕 AJOUT : Update après chargement
        console.log(`✅ Projet "${STORAGE.key()}" chargé (${pdfAgents.length} agents)`);
      });
    }
  }, 100);
});