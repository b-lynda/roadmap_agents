const PUBLISHED_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTFqM-HP22wbmGXw0JbosndL-J6PSW9MlY40dBF4wH2uCkOJXLpT7rTBfn5ZZXz6Kpn8fMCpKhpaCJz/pubhtml";
const CSV_URL = PUBLISHED_URL.replace("pubhtml", "pub?output=csv");

let agents = [];
let selectedAgent = null;
let selectedList = [];
let pdfAgents = [];
let pdfConfig = {
  date: "10 juin 2025",
  site: "MONTAGNAC-MONTPEZAT",
  client: "CLUB BELAMBRA - LE VERDON",
};

function parseCSV(csv) {
  // je filtre les lignes vides de mes données récupérées en sautant des lignes :
  const lines = csv.split("\n").filter((line) => line.trim());

  /* 
  je change les lignes de mon tab avec map, j'initialise un tab vide dans lequel je vais remplir
  mes données dans la var current
  */
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
        id: index + 1, // ✅ Ajoute un ID unique
        nom: row[nomIndex]?.trim() || "",
        prenom: row[prenomIndex]?.trim() || "",
        telephone: row[telIndex]?.trim() || "",
      }));

    console.log(`✅ ${agents.length} agents chargés !`);

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
  console.log("🎯 Initialisation des événements...");

  // Bouton Actualiser (refresh-btn)
  const refreshBtn = document.getElementById("refresh-btn");

  if (refreshBtn) {
    console.log("✅ Bouton Actualiser connecté !");
    refreshBtn.addEventListener("click", () => {
      console.log("🔄 Actualisation...");
      loadDataFromGoogleSheets();
    });
  } else {
    console.error("❌ Bouton #refresh-btn introuvable !");
  }
}

function displayAgents() {
  const agentsContainer = document.getElementById("available-agents");
  if (!agentsContainer) {
    console.error("❌ Élément #available-agents introuvable !");
    return;
  }
  agentsContainer.innerHTML = "";

  if (agents.length === 0) {
    agentsContainer.innerHTML =
      '<p class="text-gray-500">Aucun agent disponible</p>';
    return;
  }

  for (const agent of agents) {
    const agentCard = createAgentCard(agent);
    agentsContainer.append(agentCard);
  }
  updateAgentsCount();
}

function createAgentCard(agent) {
  const button = document.createElement("button");
  button.className = `w-full rounded-lg border-2 border-slate-200 mb-4`;

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
        <p class="text-slate-600 font-medium text-left">${agent.prenom} ${agent.nom}</p>
        <p class="text-slate-400 text-left">${agent.telephone}</p>
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

      // 🎉 CONFETTIS bouton
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

function addToPdfList(agent) {
  const isAlreadyAdded = pdfAgents.some((a) => a.id === agent.id);

  if (!isAlreadyAdded) {
    pdfAgents.push(agent);
    console.log("✅ Agent ajouté:", agent);
    return true; // ← IMPORTANT : retourne true
  } else {
    console.log("⚠️ Agent déjà présent");
    return false; // ← IMPORTANT : retourne false
  }
}

function updateAgentsCount() {
  document.getElementById("agentsList-count").textContent = agents.length;
}

function displayPdfList() {
  const pdfCount = document.getElementById("pdf-count");
  const pdfListContainer = document.getElementById("pdf-list-container");

  pdfCount.textContent = pdfAgents.length;
  pdfListContainer.innerHTML = "";

  if (pdfAgents.length === 0) {
    pdfListContainer.innerHTML = `<p class="text-gray-500">Aucun agent dans la liste PDF</p>`;
  } else {
    pdfAgents.forEach((agent) => {
      const agentDiv = document.createElement("div");
      agentDiv.innerHTML = `
  <span class="text-slate-700">${agent.prenom} ${agent.nom}</span>
  <span class="text-slate-400 text-sm">${agent.telephone}</span>
`;
      pdfListContainer.append(agentDiv);
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Application démarrée !");

  setTimeout(() => {
    initEventListeners();
    loadDataFromGoogleSheets();
  }, 100);
});
