async function loadPending() {
  const { data, error } = await supabase
    .from("profiles").select("id,username,email,role")
    .eq("role","waiting").order("created_at");
  if (error) throw error;
  return data || [];
}

async function loadAllUsers() {
  const { data, error } = await supabase
    .from("profiles").select("id,username,email,role")
    .order("username");
  if (error) throw error;
  return data || [];
}

async function renderPending() {
  const tbody = document.querySelector("#pending-users tbody");
  try {
    const rows = await loadPending();
    if (!rows || rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" class="muted">Personne en attente</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(u => `
      <tr data-id="${u.id}">
        <td>${u.username}</td>
        <td>${u.email || ""}</td>
        <td class="row">
          <button class="btn primary approve-member">Accepter (member)</button>
          <button class="btn danger reject">Refuser</button>
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll(".approve-member").forEach(b => b.addEventListener("click", async (e) => {
      const tr = e.target.closest("tr");
      const uid = tr?.dataset?.id;
      if (!uid) return;
      try {
        const { error } = await supabase.rpc("admin_approve", { p_user: uid, p_new_role: "member" });
        if (error) throw error;
        await renderPending(); await renderAll();
      } catch (err) { alert("Erreur: " + (err?.message || err)); }
    }));

    tbody.querySelectorAll(".reject").forEach(b => b.addEventListener("click", async (e) => {
      const tr = e.target.closest("tr");
      const uid = tr?.dataset?.id;
      if (!uid) return;
      if (!confirm("Refuser ce compte ? (Supprime le profil et ses données d'inventaire/logs)")) return;
      try {
        const { error } = await supabase.rpc("admin_reject_cleanup", { p_user: uid });
        if (error) throw error;
        await renderPending(); await renderAll();
      } catch (err) { alert("Erreur: " + (err?.message || err)); }
    }));

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="3">Erreur: ${err?.message || err}</td></tr>`;
  }
}

async function renderAll() {
  const tbody = document.querySelector("#all-users tbody");
  try {
    const rows = await loadAllUsers();
    if (!rows || rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="muted">Aucun utilisateur</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(u => `
      <tr data-id="${u.id}">
        <td>${u.username}</td>
        <td>${u.email || ""}</td>
        <td>
          <select class="role">
            ${["waiting","member","officer","admin"].map(r => `<option value="${r}" ${u.role===r?"selected":""}>${r}</option>`).join("")}
          </select>
        </td>
        <td><button class="btn save">Appliquer</button></td>
      </tr>
    `).join("");

    tbody.querySelectorAll(".save").forEach(btn => btn.addEventListener("click", async (e) => {
      const tr = e.target.closest("tr");
      const uid = tr?.dataset?.id;
      const role = tr?.querySelector(".role")?.value;
      if (!uid || !role) return;
      try {
        const { error } = await supabase.rpc("admin_set_role", { p_user: uid, p_role: role });
        if (error) throw error;
        await renderPending(); await renderAll();
      } catch (err) { alert("Erreur: " + (err?.message || err)); }
    }));

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4">Erreur: ${err?.message || err}</td></tr>`;
  }
}

(async () => {
  const ctx = await routeGuard();
  if (!ctx.user) return;
  await renderPending();
  await renderAll();
})();
