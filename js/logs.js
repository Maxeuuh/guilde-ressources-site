async function renderLogs() {
  const tbody = q("#donations tbody");
  try {
    const { data: logs, error } = await supabase
      .from("donations_log")
      .select("id, from_user, to_user, resource_id, qty, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;

    // Map ids -> usernames / resource names
    const { data: users } = await supabase.from("profiles").select("id,username");
    const { data: res }   = await supabase.from("resources").select("id,name");
    const uname = Object.fromEntries((users||[]).map(u => [u.id, u.username]));
    const rname = Object.fromEntries((res||[]).map(r => [r.id, r.name]));

    if (!logs || logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="muted">Aucun don</td></tr>`;
      return;
    }

    tbody.innerHTML = logs.map(l => `
      <tr>
        <td>${uname[l.from_user] || l.from_user}</td>
        <td>${uname[l.to_user] || l.to_user}</td>
        <td>${rname[l.resource_id] || l.resource_id}</td>
        <td>${l.qty}</td>
        <td>${new Date(l.created_at).toLocaleString()}</td>
      </tr>
    `).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5">Erreur: ${err.message}</td></tr>`;
  }
}

(async () => {
  const ctx = await routeGuard();
  if (!ctx.user) return;
  await renderLogs();
})();
