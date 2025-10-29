// js/auth.js

function normalizeRoute() {
  let p = window.location.pathname;
  const last = p.split("/").pop();
  if (!last || last === "") return "index.html";
  return last.toLowerCase();
}
const ROUTE = normalizeRoute();

const PAGES = {
  publicOnly:   ["login.html"],
  waitingOnly:  ["waiting.html"],
  memberAndUp:  ["index.html", "profile.html", "resource.html"],
  officerOnly:  ["officer.html", "logs.html"],
  adminOnly:    ["admin.html"],
};

function go(to) { window.location.href = to; }

function applyRoleNav(role) {
  const elOfficer = Array.from(document.querySelectorAll(".nav-officer"));
  const elAdmin   = Array.from(document.querySelectorAll(".nav-admin"));
  const elLogs    = Array.from(document.querySelectorAll(".nav-logs"));
  const showOfficer = role === "officer" || role === "admin";
  const showAdmin   = role === "admin";
  elOfficer.forEach(el => el.style.display = showOfficer ? "" : "none");
  elLogs.forEach(el => el.style.display = showOfficer ? "" : "none");
  elAdmin.forEach(el => el.style.display = showAdmin   ? "" : "none");
}

async function routeGuard() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    if (ROUTE !== "login.html") go("./login.html");
    return { user: null, profile: null };
  }

  // Récupère le profil; s’il n’existe pas => on force l’attente
  let profile = null;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, role, email")
      .eq("id", user.id)
      .single();
    if (!error) profile = data;
  } catch {}

  const role = profile?.role || "waiting";

  // Profil manquant OU rôle waiting => waiting.html uniquement
  if ((role === "waiting" || !profile) && ROUTE !== "waiting.html") {
    go("./waiting.html"); 
    return { user, profile };
  }

  // Si connecté et sur login => redirige
  if (ROUTE === "login.html") {
    if (role === "waiting" || !profile) go("./waiting.html");
    else go("./index.html");
    return { user, profile };
  }

  // Accès par rôle
  const needsMemberAndUp = PAGES.memberAndUp.includes(ROUTE);
  const needsOfficer     = PAGES.officerOnly.includes(ROUTE);
  const needsAdmin       = PAGES.adminOnly.includes(ROUTE);

  if (needsMemberAndUp && (role === "waiting" || !profile)) { go("./waiting.html"); return { user, profile }; }
  if (needsOfficer && !(role === "officer" || role === "admin")) { go("./index.html"); return { user, profile }; }
  if (needsAdmin && role !== "admin") { go("./index.html"); return { user, profile }; }

  // Header/nav
  if (document.getElementById("site-header")) {
    renderHeader(profile);
    applyRoleNav(role);
  }

  // Logout
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await supabase.auth.signOut();
      go("./login.html");
    });
  }

  return { user, profile };
}

supabase.auth.onAuthStateChange((_e, _s) => {});
routeGuard();
