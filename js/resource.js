function getParam(name){
  const u = new URL(window.location.href);
  return u.searchParams.get(name);
}

async function loadResource(){
  const id = getParam("id");
  const tErr = document.getElementById("res-error");
  const tEmpty = document.getElementById("res-empty");
  const tbody = document.getElementById("res-tbody");

  if (!id){ tErr.style.display=""; tErr.textContent="Paramètre 'id' manquant."; return; }

  const { data: res, error: e1 } = await supabase.from("resources").select("id,name").eq("id", id).single();
  if (e1){ tErr.style.display=""; tErr.textContent = "Erreur: " + e1.message; return; }
  document.getElementById("res-title").textContent = res.name;

  const { data, error } = await supabase
    .from("inventories")
    .select(`
      user_id,
      qty,
      profiles:profiles ( id, username )
    `)
    .eq("resource_id", id);

  if (error){ tErr.style.display=""; tErr.textContent = "Erreur: " + error.message; return; }

  const map = new Map();
  for (const row of (data || [])){
    const uid = row.user_id;
    const name = row.profiles?.username || "Inconnu";
    const q = Number(row.qty || 0);
    if (!map.has(uid)) map.set(uid, { username: name, qty: 0 });
    map.get(uid).qty += q;
  }

  const rows = Array.from(map.values()).filter(r => r.qty > 0);
  const total = rows.reduce((s, r) => s + r.qty, 0);
  document.getElementById("total-qty").textContent = total;

  if (rows.length === 0){
    tbody.innerHTML = "";
    tEmpty.style.display = "";
    return;
  }
  tEmpty.style.display = "none";

  rows.sort((a,b)=> b.qty - a.qty);
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.username}</td>
      <td>${r.qty}</td>
    </tr>
  `).join("");
}

(async () => {
  const ctx = await routeGuard();
  if (!ctx.user) return;
  await loadResource();
})();
