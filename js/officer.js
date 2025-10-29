async function loadResources() {
  const { data, error } = await supabase.from("resources").select("id,name").order("name");
  if (error) throw error;
  return data || [];
}

async function renderResources() {
  const tbody = document.querySelector("#res-table tbody");
  try {
    const rows = await loadResources();
    if (rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="2" class="muted">Aucune ressource</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map(r => `
      <tr data-id="${r.id}">
        <td>${r.name}</td>
        <td>
          <button class="btn danger btn-del">Supprimer</button>
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll(".btn-del").forEach(btn => btn.addEventListener("click", async (e) => {
      const tr = e.target.closest("tr");
      const id = Number(tr.dataset.id);
      if (!confirm("Supprimer cette ressource ? (et inventaires liés)")) return;
      try {
        const { error } = await supabase.rpc("resource_delete", { p_id: id });
        if (error) throw error;
        await renderResources();
      } catch (err) { alert("Erreur: " + err.message); }
    }));

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="2">Erreur: ${err.message}</td></tr>`;
  }
}

(async () => {
  const ctx = await routeGuard();
  if (!ctx.user) return;

  document.getElementById("btn-res-create")?.addEventListener("click", async () => {
    const name = (document.getElementById("res-new-name").value || "").trim();
    if (!name) return;
    try {
      const { error } = await supabase.rpc("resource_upsert", { p_id: null, p_name: name });
      if (error) throw error;
      document.getElementById("res-new-name").value = "";
      await renderResources();
    } catch (err) { alert("Erreur: " + err.message); }
  });

  await renderResources();
})();
