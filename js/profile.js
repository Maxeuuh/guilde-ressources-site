function $(id){ return document.getElementById(id); }

function computeTotal(stacks, units){
  const s = Number(stacks||0);
  const u = Number(units||0);
  return Math.max(0, s*64 + u);
}

async function initProfile(){
  const ctx = await routeGuard();
  if (!ctx.user) return;

  renderHeader(ctx.profile);
  applyRoleNav(ctx.profile?.role);

  await Promise.all([
    loadResourceOptions("add-resource-select"),
    loadResourceOptions("sub-resource-select"),
    loadResourceOptions("don-resource-select"),
    loadMemberOptions("don-user", ctx.user.id)
  ]);

  wireEvents(ctx.user.id);
  await loadMyInventory(ctx.user.id);
}

async function loadResourceOptions(selectId){
  const sel = $(selectId);
  sel.innerHTML = `<option value="" disabled selected>— choisir —</option>`;
  const { data, error } = await supabase.from("resources").select("id,name").order("name");
  if (error){ sel.innerHTML = `<option value="" disabled selected>(erreur)</option>`; sel.disabled=true; return; }
  sel.disabled = false;
  sel.innerHTML += data.map(r=>`<option value="${r.id}">${r.name}</option>`).join("");
}

async function loadMemberOptions(selectId, currentUserId){
  const sel = $(selectId);
  sel.innerHTML = `<option value="" disabled selected>— choisir —</option>`;
  const { data, error } = await supabase
    .from("profiles").select("id,username,role")
    .in("role",["member","officer","admin"]).order("username");
  if (error){ sel.innerHTML = `<option value="" disabled selected>(erreur)</option>`; sel.disabled=true; return; }
  const rows = (data||[]).filter(u => u.id !== currentUserId);
  if (rows.length===0){ sel.innerHTML = `<option value="" disabled selected>(aucun membre)</option>`; sel.disabled=true; return; }
  sel.innerHTML += rows.map(u=>`<option value="${u.id}">${u.username} (${u.role})</option>`).join("");
}

async function loadMyInventory(userId){
  const tbody = $("inv-body");
  tbody.innerHTML = `<tr><td colspan="3">Chargement…</td></tr>`;
  const { data, error } = await supabase
    .from("inventories")
    .select("resource_id, qty, resources:resources(name)")
    .eq("user_id", userId).order("resource_id");
  if (error){ tbody.innerHTML = `<tr><td colspan="3">${error.message}</td></tr>`; return; }

  const map = new Map();
  for (const row of (data||[])){
    const rid=row.resource_id; const name=row.resources?.name||"??";
    const q=Number(row.qty||0);
    if(!map.has(rid)) map.set(rid,{name,qty:0,resource_id:rid});
    map.get(rid).qty+=q;
  }
  const rows = Array.from(map.values());
  if(rows.length===0){tbody.innerHTML=`<tr><td colspan="3">Vide</td></tr>`;return;}
  tbody.innerHTML = rows.map(r=>`
    <tr data-rid="${r.resource_id}">
      <td>${r.name}</td>
      <td style="width:200px"><input class="qty" type="number" min="0" value="${r.qty}"></td>
      <td class="row">
        <button class="btn" data-action="save">Mettre à jour</button>
        <button class="btn danger" data-action="del">Supprimer</button>
      </td>
    </tr>`).join("");

  tbody.querySelectorAll("button[data-action='save']").forEach(b=>{
    b.addEventListener("click",async e=>{
      const tr=e.target.closest("tr");
      const rid=tr.dataset.rid;
      const val=Number(tr.querySelector("input.qty").value||0);
      await setMyQty(userId,rid,val);
      await loadMyInventory(userId);
    });
  });
  tbody.querySelectorAll("button[data-action='del']").forEach(b=>{
    b.addEventListener("click",async e=>{
      const tr=e.target.closest("tr");
      const rid=tr.dataset.rid;
      if(!confirm("Supprimer cette ressource ?"))return;
      await setMyQty(userId,rid,0);
      await loadMyInventory(userId);
    });
  });
}

async function setMyQty(userId,resourceId,qty){
  qty=Number(qty||0);
  if(qty<=0){
    const {error}=await supabase.from("inventories").delete().eq("user_id",userId).eq("resource_id",resourceId);
    if(error)alert(error.message);return;
  }
  const {error}=await supabase.from("inventories")
    .upsert({user_id:userId,resource_id:resourceId,qty},{onConflict:"user_id,resource_id"});
  if(error)alert(error.message);
}
async function addToMyInventory(uid,rid,qty){
  const {data,error}=await supabase.from("inventories").select("qty").eq("user_id",uid).eq("resource_id",rid).maybeSingle();
  if(error&&error.code!=="PGRST116"){alert(error.message);return;}
  if(!data){
    const {error:e2}=await supabase.from("inventories").insert({user_id:uid,resource_id:rid,qty});
    if(e2)alert(e2.message);
  }else{
    const {error:e1}=await supabase.from("inventories").update({qty:Number(data.qty||0)+qty}).eq("user_id",uid).eq("resource_id",rid);
    if(e1)alert(e1.message);
  }
}
async function subFromMyInventory(uid,rid,qty){
  const {data,error}=await supabase.from("inventories").select("qty").eq("user_id",uid).eq("resource_id",rid).maybeSingle();
  if(error&&error.code!=="PGRST116"){alert(error.message);return;}
  const cur=Number(data?.qty||0);
  const next=Math.max(0,cur-qty);
  await setMyQty(uid,rid,next);
}

async function donate(fromUserId){
  const toId=$("don-user").value;
  const resId=$("don-resource-select").value;
  const qty=Number($("don-qty").value||0);
  if(!toId||!resId||qty<=0)return alert("Champs invalides.");
  if(toId===fromUserId)return alert("Impossible de se donner à soi-même.");
  const {error}=await supabase.rpc("make_donation",{p_from:fromUserId,p_to:toId,p_resource:Number(resId),p_qty:qty});
  if(error)return alert(error.message);
  $("don-qty").value="";alert("Don effectué !");
}

function wireEvents(userId){
  ["add-stacks","add-units"].forEach(id=>{
    $(id).addEventListener("input",()=>{
      $("add-total").textContent=computeTotal($("add-stacks").value,$("add-units").value);
    });
  });
  ["sub-stacks","sub-units"].forEach(id=>{
    $(id).addEventListener("input",()=>{
      $("sub-total").textContent=computeTotal($("sub-stacks").value,$("sub-units").value);
    });
  });

  $("btn-add").addEventListener("click",async()=>{
    const resId=$("add-resource-select").value;
    const total=computeTotal($("add-stacks").value,$("add-units").value);
    if(!resId)return alert("Choisis une ressource.");
    if(total<=0)return alert("Quantité invalide.");
    await addToMyInventory(userId,Number(resId),total);
    ["add-stacks","add-units"].forEach(i=>$(i).value="");
    $("add-total").textContent="0";
    await loadMyInventory(userId);
  });

  $("btn-sub").addEventListener("click",async()=>{
    const resId=$("sub-resource-select").value;
    const total=computeTotal($("sub-stacks").value,$("sub-units").value);
    if(!resId)return alert("Choisis une ressource.");
    if(total<=0)return alert("Quantité invalide.");
    await subFromMyInventory(userId,Number(resId),total);
    ["sub-stacks","sub-units"].forEach(i=>$(i).value="");
    $("sub-total").textContent="0";
    await loadMyInventory(userId);
  });

  $("btn-donate").addEventListener("click",async()=>{
    await donate(userId);
    await loadMyInventory(userId);
  });
}

initProfile();
