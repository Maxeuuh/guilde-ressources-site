async function renderLogs() {
  const tbody = q("#donations tbody");
  const fmtInt = new Intl.NumberFormat("fr-FR");
  const fmtDate = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short", timeStyle: "medium"
  });

  try {
    const { data: logs, error } = await supabase
      .from("donations_log")
      .select("id, from_user, to_user, resource_id, qty, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const { data: users } = await supabase.from("profiles").select("id,username");
    const { data: res }   = await supabase.from("resources").select("id,name");

    const uname = Object.fromEntries((users||[]).map(u => [u.id, u.username]));
    const rname = Object.fromEntries((res||[]).map(r => [r.id, r.name]));

    if (!logs || logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="muted">Aucun don</td></tr>`;
      return;
    }

    tbody.innerHTML = logs.map(l => {
      const from = uname[l.from_user] || l.from_user;
      const to   = uname[l.to_user]   || l.to_user;
      const resn = rname[l.resource_id] || l.resource_id;
      const qty  = fmtInt.format(l.qty);
      const date = fmtDate.format(new Date(l.created_at));
      return `
        <tr>
          <td>${from}</td>
          <td>${to}</td>
          <td>${resn}</td>
          <td>${qty}</td>
          <td>${date}</td>
        </tr>`;
    }).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5">Erreur: ${err.message}</td></tr>`;
  }
}

(async () => {
  const ctx = await routeGuard();
  if (!ctx.user) return;
  renderHeader(ctx.profile);
  await renderLogs();
})();
