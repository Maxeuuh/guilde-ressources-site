// ================== common-ui.js ==================

function currentPage() {
  const last = window.location.pathname.split("/").pop() || "index.html";
  return last.toLowerCase();
}

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
  const isAdmin  = profile?.role === "admin";

  header.innerHTML = `
    <header class="topnav">
      <div class="brand">
        <img src="./img/iron_crest_color.png" class="logo-mark" alt="Iron Oath logo" />
        <span class="name">Iron Oath</span>
      </div>

      <nav class="nav-links">
        <a href="./index.html">Accueil</a>
        <a href="./profile.html">Profil</a>
        <a href="./officer.html" class="nav-officer">Officier</a>
        <a href="./admin.html" class="nav-admin">
          Admin
          <span id="waiting-badge" class="notif-dot" hidden>0</span>
        </a>
        <a href="./logs.html" class="nav-logs">Logs</a>
      </nav>

      <div class="session">
        <span class="who">${username}</span>
        <button id="logout-btn" class="btn">Déconnexion</button>
      </div>
    </header>
  `;

  setActiveNav();
  applyRoleNav(profile?.role);

  if (isAdmin) {
    refreshWaitingBadge();
  }
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

async function refreshWaitingBadge() {
  const el = document.getElementById("waiting-badge");
  if (!el) return;
  try {
    const { count, error } = await supabase
      .from("profiles")
      .select("*", { head: true, count: "exact" })
      .eq("role", "waiting");
    if (error) throw error;
    const n = Math.max(0, Number(count || 0));
    if (n === 0) {
      el.hidden = true;
    } else {
      el.hidden = false;
      el.textContent = String(n);
    }
  } catch (_) {
    el.hidden = true;
  }
}

window.__refreshWaitingBadge = refreshWaitingBadge;
