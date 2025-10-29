// js/common-ui.js

// Détecte la page courante (index.html, profile.html, etc.)
function currentPage() {
  const last = window.location.pathname.split("/").pop() || "index.html";
  return last.toLowerCase();
}

// Marque le lien actif dans la nav
function setActiveNav() {
  const page = currentPage();
  document.querySelectorAll(".nav-links a").forEach(a => {
    const href = (a.getAttribute("href") || "").toLowerCase();
    if (href.endsWith(page)) a.classList.add("active");
    else a.classList.remove("active");
  });
}

function renderHeader(profile) {
  const header = document.getElementById("site-header");
  if (!header) return;

  const username = profile?.username || "Inconnu";

  header.innerHTML = `
    <header class="topnav">
      <div class="brand">
        <img src="./img/iron_crest_color.png" class="logo-mark" alt="Iron Oath logo" />
        <span class="name">Iron Oath</span>
        <span class="tagline small">Le Serment au-delà de l’Acier</span>
      </div>

      <nav class="nav-links">
        <a href="./index.html">Accueil</a>
        <a href="./profile.html">Profil</a>
        <a href="./officer.html" class="nav-officer">Officier</a>
        <a href="./admin.html" class="nav-admin">Admin</a>
        <a href="./logs.html" class="nav-logs">Logs</a>
      </nav>

      <div class="session">
        <span class="who">${username}</span>
        <button id="logout-btn" class="btn">Déconnexion</button>
      </div>
    </header>
  `;

  // Marque le lien actif selon la page
  setActiveNav();
}

function applyRoleNav(role) {
  const elOfficer = Array.from(document.querySelectorAll(".nav-officer"));
  const elAdmin   = Array.from(document.querySelectorAll(".nav-admin"));
  const elLogs    = Array.from(document.querySelectorAll(".nav-logs"));

  const showOfficer = role === "officer" || role === "admin";
  const showAdmin   = role === "admin";

  elOfficer.forEach(el => el.style.display = showOfficer ? "" : "none");
  elLogs.forEach(el    => el.style.display = showOfficer ? "" : "none");
  elAdmin.forEach(el   => el.style.display = showAdmin   ? "" : "none");
}
