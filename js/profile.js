// js/profile.js — Modèle sans `id` (clé primaire composite), full code

"use strict";

/* ========== Helpers ========== */
function $(id) { return document.getElementById(id); }
function setText(el, txt){ if (el) el.textContent = txt; }
function notify(msg, ok=true){
  const el = $("profile-feedback");
  if (!el) return;
  el.classList.remove("error");
  if (!ok) el.classList.add("error");
  setText(el, msg || "");
}

/* ========== Init ========== */
async function initProfile() {
  try {
    const ctx = await routeGuard();           // fournie par auth.js
    if (!ctx?.user) return;

    renderHeader(ctx.profile);                // fournie par common-ui.js
    applyRoleNav(ctx.profile?.role);

    // Remplir les selects (ressources / membres)
    await Promise.all([
      loadResourceOptions("res-add"),
      loadResourceOptions("donate-res"),
      loadMemberOptions("donate-to"),
    ]);

    wireEvents(ctx.user.id);

    await loadMyInventory(ctx.user.id);
    notify(""); // clear
  } catch (err) {
    console.error(err);
    notify("Erreur d'initialisation : " + (err.message || err), false);
  }
}

/* ========== Remplissage selects ========== */
async function loadResourceOptions(selectId){
  const sel = $(selectId);
  if (!sel) return;

  sel.innerHTML = `<option value="" disabled selected>— choisir —</option>`;

  const { data, error } = await supabase
    .from("resources")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    console.error("loadResourceOptions:", error);
    sel.innerHTML = `<option value="" disabled selected>(erreur)</option>`;
    sel.disabled = true;
    notify("Erreur chargement ressources : " + error.message, false);
    return;
  }
  if (!data || data.length === 0) {
    sel.innerHTML = `<option value="" disabled selected>(aucune ressource)</option>`;
    sel.disabled = true;
    return;
  }
  sel.disabled = false;
  sel.innerHTML = `<option value="" disabled selected>— choisir —</option>` +
    data.map(r => `<option value="${r.id}">${r.name}</option>`).join("");
}

async function loadMemberOptions(selectId){
  const sel = $(selectId);
  if (!sel) return;

  sel.innerHTML = `<option value="" disabled selected>— choisir —</option>`;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, role")
    .in("role", ["member","officer","admin"])
    .order("username", { ascending: true });

  if (error) {
    console.error("loadMemberOptions:", error);
    sel.innerHTML = `<option value="" disabled selected>(erreur)</option>`;
    sel.disabled = true;
    notify("Erreur chargement membres : " + error.message, false);
    return;
  }
  if (!data || data.length === 0) {
    sel.innerHTML = `<option value="" disabled selected>(aucun membre)</option>`;
    sel.disabled = true;
    return;
  }
  sel.disabled = false;
  sel.innerHTML = `<option value="" disabled selected>— choisir —</option>` +
    data.map(u => `<option value="${u.id}">${u.username} (${u.role})</option>`).join("");
}

/* ========== Inventaire : lecture ========== */
async function loadMyInventory(userId){
  const tbody = $("inv-body");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="3">Chargement...</td></tr>`;

  const { data, error } = await supabase
    .from("inventories")
    .select("resource_id, qty, resources:resources(name)")
    .eq("user_id", userId)
    .order("resource_id");

  if (error){
    console.error("loadMyInventory:", error);
    tbody.innerHTML = `<tr><td colspan="3">Erreur: ${error.message}</td></tr>`;
    notify("Erreur lecture inventaire : " + error.message, false);
    return;
  }

  // Agrégation de sécurité si doublons
  const map = new Map();
  for (const row of (data || [])) {
    const rid = row.resource_id;
    const name = row.resources?.name || "??";
    const q = Number(row.qty || 0);
    if (!map.has(rid)) map.set(rid, { resource_id: rid, name, qty: 0 });
    map.get(rid).qty += q;
  }
  const rows = Array.from(map.values());

  if (rows.length === 0){
    tbody.innerHTML = `<tr><td colspan="3">Vide</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => `
    <tr data-rid="${r.resource_id}">
      <td>${r.name}</td>
      <td style="width:200px"><input class="qty" type="number" min="0" value="${r.qty}"></td>
      <td class="row">
        <button class="btn" data-action="save">Mettre à jour</button>
        <button class="btn danger" data-action="del">Supprimer</button>
      </td>
    </tr>
  `).join("");

  // Actions
  tbody.querySelectorAll("button[data-action='save']").forEach(btn=>{
    btn.addEventListener("click", async (e)=>{
      const tr = e.target.closest("tr");
      const rid = Number(tr.getAttribute("data-rid"));
      const val = Number(tr.querySelector("input.qty").value || 0);
      await setMyQty(userId, rid, val);
      await loadMyInventory(userId);
    });
  });
  tbody.querySelectorAll("button[data-action='del']").forEach(btn=>{
    btn.addEventListener("click", async (e)=>{
      const tr = e.target.closest("tr");
      const rid = Number(tr.getAttribute("data-rid"));
      if (!confirm("Supprimer cette ressource de votre inventaire ?")) return;
      await setMyQty(userId, rid, 0);
      await loadMyInventory(userId);
    });
  });
}

/* ========== Inventaire : mutations (clé composite) ========== */
async function addToMyInventory(userId, resourceId, qty){
  qty = Number(qty || 0);
  resourceId = Number(resourceId || 0);
  if (!resourceId || qty <= 0) return alert("Renseigne une ressource et une quantité valide.");

  // Upsert-style : si existe, on additionne; sinon on insère
  const { data, error } = await supabase
    .from("inventories")
    .select("qty")
    .eq("user_id", userId).eq("resource_id", resourceId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") { // PGRST116 = no rows
    console.error("addToMyInventory/select:", error);
    return alert(error.message);
  }

  if (!data) {
    const { error: e2 } = await supabase
      .from("inventories")
      .insert({ user_id: userId, resource_id: resourceId, qty });
    if (e2) {
      console.error("addToMyInventory/insert:", e2);
      return alert(e2.message);
    }
  } else {
    const { error: e1 } = await supabase
      .from("inventories")
      .update({ qty: Number(data.qty||0) + qty })
      .eq("user_id", userId).eq("resource_id", resourceId);
    if (e1) {
      console.error("addToMyInventory/update:", e1);
      return alert(e1.message);
    }
  }
  notify("Quantité ajoutée.");
}

async function setMyQty(userId, resourceId, qty){
  qty = Number(qty || 0);
  resourceId = Number(resourceId || 0);

  if (qty <= 0){
    const { error } = await supabase
      .from("inventories")
      .delete()
      .eq("user_id", userId).eq("resource_id", resourceId);
    if (error) {
      console.error("setMyQty/delete:", error);
      alert(error.message);
    } else {
      notify("Ressource supprimée.");
    }
    return;
  }

  // Upsert via clé composite
  const { error } = await supabase
    .from("inventories")
    .upsert(
      { user_id: userId, resource_id: resourceId, qty },
      { onConflict: "user_id,resource_id" }
    );
  if (error) {
    console.error("setMyQty/upsert:", error);
    alert(error.message);
  } else {
    notify("Quantité mise à jour.");
  }
}

/* ========== Don : via RPC make_donation (resource_id en BIGINT) ========== */
async function donate(fromUserId){
  const toId  = $("donate-to")?.value || "";
  const resId = Number(($("donate-res")?.value) || 0); // BIGINT attendu côté SQL
  const qty   = Number(($("donate-qty")?.value) || 0);

  if (!toId || !resId || qty <= 0) return alert("Champs de don invalides.");
  if (toId === fromUserId) return alert("Impossible de se donner à soi-même.");

  const { error } = await supabase.rpc("make_donation", {
    p_from: fromUserId,
    p_to: toId,
    p_resource: resId,  // number => bigint
    p_qty: qty
  });
  if (error) {
    console.error("donate/rpc:", error);
    return alert(error.message);
  }

  if ($("donate-qty")) $("donate-qty").value = "";
  notify("Don effectué !");
}

/* ========== Events ========== */
function wireEvents(userId){
  $("btn-add")?.addEventListener("click", async ()=>{
    const resId = $("res-add")?.value;
    const qty   = $("qty-add")?.value;
    await addToMyInventory(userId, resId, qty);
    if ($("qty-add")) $("qty-add").value = "";
    await loadMyInventory(userId);
  });

  $("btn-donate")?.addEventListener("click", async ()=>{
    await donate(userId);
    await loadMyInventory(userId);
  });
}

/* ========== GO ========== */
initProfile();
