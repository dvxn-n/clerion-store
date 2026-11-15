// CONFIGURACIÓN: pega aquí los datos de tu proyecto Supabase cuando lo creemos.
const SUPABASE_URL = "https://sknxuruzkyhdmaqycype.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_qDHinqY4soCILbO__348yw_rzqnj_gk";
const WHATSAPP_NUMBER = "573183119738"; // Indicativo 57, sin +, espacios ni guiones.

const hasConfig = SUPABASE_URL.startsWith("https://") && !SUPABASE_ANON_KEY.startsWith("PEGA_");
const db = hasConfig ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const $ = (id) => document.getElementById(id);
const money = (n) => "$" + Number(n).toLocaleString("es-CO") + " COP";
let cachedProducts = [];

$("whatsapp-link").href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hola, estoy interesado/a en un producto de CLERION STORE.")}`;

function escapeHtml(value="") {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function showModal(){ $("admin-modal").classList.remove("hidden"); $("auth-message").textContent=""; }
function hideModal(){ $("admin-modal").classList.add("hidden"); }
$("admin-open").addEventListener("click", showModal);
$("close-admin").addEventListener("click", hideModal);
$("admin-modal").addEventListener("click", e => { if(e.target === $("admin-modal")) hideModal(); });

async function loadPublicProducts(){
  if(!db){
    $("catalog-status").textContent = "La tienda está preparada. Falta conectar la base de datos para mostrar tus productos.";
    $("product-count").textContent = "CATÁLOGO EN CONFIGURACIÓN";
    $("product-grid").innerHTML = "";
    return;
  }
  const {data,error} = await db.from("products").select("*").order("created_at",{ascending:false});
  if(error){ $("catalog-status").textContent = "No pudimos cargar el catálogo. Revisa la configuración."; return; }
  cachedProducts = data || [];
  renderCatalog(cachedProducts);
}
function renderCatalog(products){
  $("catalog-status").textContent = products.length ? "" : "Próximamente encontrarás aquí nuestra selección de prendas.";
  $("product-count").textContent = `${products.length} PRODUCTO${products.length===1?"":"S"}`;
  $("product-grid").innerHTML = products.map(p => `
    <article class="product-card">
      <div class="product-photo">
        ${p.image_url ? `<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}">` : `<div class="photo-placeholder">C.</div>`}
        <span class="status ${p.status==="sold"?"sold":""}">${p.status==="sold"?"AGOTADO":"DISPONIBLE"}</span>
      </div>
      <div class="product-info"><div class="product-row"><h3>${escapeHtml(p.name)}</h3><span class="product-price">${money(p.price)}</span></div>
      <div class="product-meta">TALLA: ${escapeHtml(p.sizes || "Consultar")}</div></div>
    </article>`).join("");
}

function setAuthMessage(message){ $("auth-message").textContent = message; }
function setProductMessage(message){ $("product-message").textContent = message; }

$("login-form").addEventListener("submit", async e => {
  e.preventDefault();
  if(!db){ setAuthMessage("Primero debemos conectar la página con Supabase. Sigue la guía INSTRUCCIONES."); return; }
  setAuthMessage("Ingresando...");
  const {error} = await db.auth.signInWithPassword({
    email:$("login-email").value.trim(),
    password:$("login-password").value
  });
  if(error){ setAuthMessage("No se pudo iniciar sesión. Revisa tu correo y contraseña."); return; }
  await showDashboard();
});

async function showDashboard(){
  $("auth-view").classList.add("hidden");
  $("dashboard-view").classList.remove("hidden");
  $("product-form").classList.add("hidden");
  await loadAdminProducts();
}
async function loadAdminProducts(){
  const {data,error} = await db.from("products").select("*").order("created_at",{ascending:false});
  if(error){ $("admin-product-list").textContent = "No se pudo cargar el inventario. Verifica que tu usuario tenga permisos de administrador."; return; }
  cachedProducts = data || [];
  $("stat-total").textContent = cachedProducts.length;
  $("stat-available").textContent = cachedProducts.filter(p=>p.status==="available").length;
  $("stat-sold").textContent = cachedProducts.filter(p=>p.status==="sold").length;
  $("admin-product-list").innerHTML = cachedProducts.map(p=>`
    <div class="admin-item">
      ${p.image_url ? `<img class="admin-thumb" src="${escapeHtml(p.image_url)}" alt="">` : `<div class="admin-thumb photo-placeholder">C.</div>`}
      <div class="admin-item-info"><strong>${escapeHtml(p.name)}</strong><span>${money(p.price)} · ${escapeHtml(p.sizes||"Sin talla")} · ${p.status==="sold"?"Agotado":"Disponible"}</span></div>
      <div class="admin-item-actions"><button data-edit="${p.id}">EDITAR</button><button data-delete="${p.id}">ELIMINAR</button></div>
    </div>`).join("") || "<p class='muted small'>Todavía no tienes productos. Agrega el primero.</p>";
  $("admin-product-list").querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>editProduct(b.dataset.edit)));
  $("admin-product-list").querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",()=>deleteProduct(b.dataset.delete)));
  renderCatalog(cachedProducts);
}

$("new-product").addEventListener("click",()=>{
  $("product-form").reset(); $("product-id").value=""; $("form-title").textContent="Nuevo producto";
  setProductMessage(""); $("product-form").classList.remove("hidden");
  $("product-form").scrollIntoView({behavior:"smooth",block:"start"});
});
$("cancel-edit").addEventListener("click",()=> $("product-form").classList.add("hidden"));

function editProduct(id){
  const p = cachedProducts.find(x=>String(x.id)===String(id)); if(!p)return;
  $("product-id").value=p.id; $("product-name").value=p.name; $("product-price").value=p.price;
  $("product-sizes").value=p.sizes||""; $("product-status").value=p.status;
  $("product-image").value=""; $("form-title").textContent="Editar producto";
  setProductMessage(""); $("product-form").classList.remove("hidden");
  $("product-form").scrollIntoView({behavior:"smooth",block:"start"});
}
async function deleteProduct(id){
  if(!confirm("¿Seguro que quieres eliminar este producto?"))return;
  const {error}=await db.from("products").delete().eq("id",id);
  if(error){alert("No se pudo eliminar. Revisa los permisos.");return;}
  await loadAdminProducts();
}

$("product-form").addEventListener("submit",async e=>{
  e.preventDefault(); if(!db)return;
  const id=$("product-id").value;
  const payload={name:$("product-name").value.trim(),price:Number($("product-price").value),
    sizes:$("product-sizes").value.trim(),status:$("product-status").value};
  if(!payload.name || !Number.isFinite(payload.price) || payload.price<0){setProductMessage("Revisa el nombre y el precio.");return;}
  setProductMessage("Guardando...");
  const file=$("product-image").files[0];
  if(file){
    if(!file.type.startsWith("image/")){setProductMessage("Selecciona un archivo de imagen.");return;}
    const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"-");
    const path=`${crypto.randomUUID()}-${safeName}`;
    const {error:uploadError}=await db.storage.from("product-images").upload(path,file,{upsert:false});
    if(uploadError){setProductMessage("No se pudo subir la foto. Verifica el bucket y sus permisos.");return;}
    const {data}=db.storage.from("product-images").getPublicUrl(path);
    payload.image_url=data.publicUrl;
  }
  const result=id ? await db.from("products").update(payload).eq("id",id) : await db.from("products").insert(payload);
  if(result.error){setProductMessage("No se pudo guardar. Verifica que tu cuenta sea administradora.");return;}
  $("product-form").classList.add("hidden"); await loadAdminProducts();
});
$("logout-button").addEventListener("click",async()=>{
  if(db) await db.auth.signOut();
  $("dashboard-view").classList.add("hidden"); $("auth-view").classList.remove("hidden");
  $("login-form").reset(); setAuthMessage("Sesión cerrada.");
});
async function checkExistingSession(){
  if(!db)return;
  const {data}=await db.auth.getSession();
  if(data.session) await showDashboard();
  db.auth.onAuthStateChange((_event,session)=>{
    if(!session){$("dashboard-view").classList.add("hidden");$("auth-view").classList.remove("hidden");}
  });
}
loadPublicProducts();
checkExistingSession();
