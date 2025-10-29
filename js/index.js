// js/index.js

function goToResource(id){
  window.location = `resource.html?id=${id}`;
}

async function loadResources() {
  const { data, error } = await supabase
    .from("resources")
    .select("id, name")
    .order("name");

  const list = document.getElementById("resource-list");

  if (error) {
    console.error(error);
    list.innerHTML = `<div class="callout">Erreur de chargement : ${error.message}</div>`;
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = `<div class="muted">Aucune ressource définie pour l’instant.</div>`;
    return;
  }

  // Utilise un <button> pour un meilleur a11y (tab, Enter/Space)
  list.innerHTML = data.map(r => `
    <button class="res-item" type="button" data-id="${r.id}" aria-label="Voir ${r.name}">
      <span class="label">${r.name}</span>
    </button>
  `).join("");

  // Click + clavier
  document.querySelectorAll(".res-item").forEach(btn => {
    const id = btn.getAttribute("data-id");
    btn.addEventListener("click", () => goToResource(id));
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        goToResource(id);
      }
    });
  });
}

// Init
(async () => {
  const ctx = await routeGuard();
  if (!ctx.user) return;
  await loadResources();
})();
