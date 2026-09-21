const {createClient}=supabase;
const db=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
let editing=null;
let allArticles=[];

const $=id=>document.getElementById(id);
function msg(text,good=false){
  const el=$("saveMsg"); el.textContent=text; el.parentElement.classList.toggle("is-error",!good); el.parentElement.classList.toggle("is-good",good);
}
function loginMsg(text,good=false){ const el=$("loginMsg"); el.textContent=text; el.className="msg "+(good?"good":""); }
function slugify(value){return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,80);}
function countText(){
  $("titleCount").textContent=$("title").value.length;
  $("excerptCount").textContent=$("excerpt").value.length;
  const words=$("content").value.trim().split(/\s+/).filter(Boolean).length;
  $("wordCount").textContent=words;
}
function resetEditor(){
  editing=null; ["title","slug","excerpt","content"].forEach(id=>$(id).value="");
  $("category").value="BANYUASIN"; $("author").value="Redaksi"; $("status").value="published";
  $("image").value=""; $("image").dataset.current=""; clearPreview();
  $("editorTitle").textContent="Buat Berita Baru"; $("editState").textContent="DRAFT BARU"; $("editState").className="status-pill"; msg("Siap membuat berita baru.",true); countText();
}
function clearPreview(){ $("imagePreview").style.display="none"; $("previewImg").src=""; $("previewName").textContent=""; $("previewInfo").textContent=""; }
function showPreview(file){
  if(!file)return;
  const max=8*1024*1024;
  if(file.size>max){msg("Ukuran foto maksimal 8 MB.");$("image").value="";return;}
  if(!file.type.startsWith("image/")){msg("File harus berupa gambar.");$("image").value="";return;}
  const url=URL.createObjectURL(file); $("previewImg").src=url; $("previewName").textContent=file.name; $("previewInfo").textContent=(file.size/1024/1024).toFixed(2)+" MB"; $("imagePreview").style.display="flex";
}
async function session(){const {data}=await db.auth.getSession(); if(data.session)showDashboard(); else showLogin();}
function showLogin(){$("loginBox").style.display="block";$ ("dashboard").style.display="none";$ ("logoutBtn").style.display="none";}
async function showDashboard(){$("loginBox").style.display="none";$ ("dashboard").style.display="block";$ ("logoutBtn").style.display="inline-block";await listArticles();}

$("loginBtn").onclick=async()=>{const email=$("email").value.trim(),password=$("password").value;if(!email||!password){loginMsg("Email dan password wajib diisi.");return}$("loginBtn").disabled=true;loginMsg("Memeriksa akun...");const {error}=await db.auth.signInWithPassword({email,password});$("loginBtn").disabled=false;if(error)loginMsg(error.message);else showDashboard();};
$("logoutBtn").onclick=async()=>{await db.auth.signOut();showLogin();};
$("newBtn").onclick=()=>{resetEditor();window.scrollTo({top:0,behavior:"smooth"});$("title").focus();};
$("cancelBtn").onclick=()=>{resetEditor();};
$("title").oninput=()=>{if(!editing)$("slug").value=slugify($("title").value);countText();};
$("excerpt").oninput=countText; $("content").oninput=countText;
$("chooseImage").onclick=()=>$("image").click();
$("dropZone").onclick=e=>{if(e.target.id!=="chooseImage")$("image").click();};
$("dropZone").ondragover=e=>{e.preventDefault();$("dropZone").classList.add("dragover");};
$("dropZone").ondragleave=()=>$("dropZone").classList.remove("dragover");
$("dropZone").ondrop=e=>{e.preventDefault();$("dropZone").classList.remove("dragover");const f=e.dataTransfer.files[0];if(f){const dt=new DataTransfer();dt.items.add(f);$("image").files=dt.files;showPreview(f);}};
$("image").onchange=()=>showPreview($("image").files[0]);
$("removeImage").onclick=()=>{$("image").value="";$ ("image").dataset.current="";clearPreview();};
$("listSearch").oninput=()=>renderList($("listSearch").value.trim().toLowerCase());

$("saveBtn").onclick=async()=>{
  const title=$("title").value.trim(),slug=$("slug").value.trim(),category=$("category").value,author=$("author").value.trim()||"Redaksi",excerpt=$("excerpt").value.trim(),content=$("content").value.trim(),status=$("status").value,file=$("image").files[0];
  if(!title||!slug||!excerpt||!content){msg("Judul, slug, ringkasan, dan isi berita wajib diisi.");return;}
  if(slug.length<3){msg("Slug terlalu pendek.");return;}
  const btn=$("saveBtn");btn.disabled=true;btn.textContent="Menyimpan...";msg("Menyimpan berita...");
  let image_url=$("image").dataset.current||null;
  if(file){const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"");const path=`${crypto.randomUUID()}.${ext}`;const up=await db.storage.from("news-images").upload(path,file,{upsert:false,contentType:file.type});if(up.error){msg("Upload foto gagal: "+up.error.message);btn.disabled=false;btn.textContent="Simpan Berita";return;}image_url=db.storage.from("news-images").getPublicUrl(path).data.publicUrl;}
  const row={slug,title,category,author,excerpt,content,image_url,status,published_at:new Date().toISOString(),updated_at:new Date().toISOString()};
  const res=editing?await db.from("articles").update(row).eq("id",editing):await db.from("articles").insert(row);
  if(res.error){msg("Gagal menyimpan: "+res.error.message);btn.disabled=false;btn.textContent="Simpan Berita";return;}
  msg(status==="published"?"Berita berhasil diterbitkan ke website.":"Draft berhasil disimpan.",true);btn.disabled=false;btn.textContent="Simpan Berita";editing=null;await listArticles();
  $("editorTitle").textContent="Berita Tersimpan";$("editState").textContent=status==="published"?"TERBIT":"DRAFT";$("editState").className="status-pill "+status; 
};

async function listArticles(){
  const {data,error}=await db.from("articles").select("*").order("created_at",{ascending:false});
  if(error){$("articleList").textContent=error.message;return;} allArticles=data||[]; updateStats(); renderList($("listSearch").value.trim().toLowerCase());
}
function updateStats(){ $("totalCount").textContent=allArticles.length; $("publishedCount").textContent=allArticles.filter(x=>x.status==="published").length; $("draftCount").textContent=allArticles.filter(x=>x.status==="draft").length; }
function renderList(q=""){
  const data=allArticles.filter(n=>!q||n.title.toLowerCase().includes(q)||n.category.toLowerCase().includes(q));
  $("articleList").innerHTML=data.map(n=>`<article class="admin-item"><div class="item-main">${n.image_url?`<img src="${esc(n.image_url)}" alt="">`:`<div class="item-thumb">BN</div>`}<div><b>${esc(n.title)}</b><small>${esc(n.category)} · <span class="mini-status ${n.status}">${n.status==="published"?"Terbit":"Draft"}</span></small></div></div><div class="item-actions"><button onclick="editArticle('${n.id}')">Edit</button><button class="danger" onclick="deleteArticle('${n.id}')">Hapus</button></div></article>`).join("")||"<div class='empty-list'>Belum ada berita tersimpan.</div>";
}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
window.editArticle=async id=>{const n=allArticles.find(x=>x.id===id);if(!n)return;editing=id;$("title").value=n.title;$("slug").value=n.slug;$("category").value=n.category;$("author").value=n.author;$("excerpt").value=n.excerpt||"";$("content").value=n.content||"";$("status").value=n.status;$("image").value="";$("image").dataset.current=n.image_url||"";if(n.image_url){$("previewImg").src=n.image_url;$("previewName").textContent="Foto saat ini";$("previewInfo").textContent="Pilih foto baru jika ingin mengganti";$("imagePreview").style.display="flex";}else clearPreview();$("editorTitle").textContent="Edit Berita";$("editState").textContent=n.status==="published"?"TERBIT":"DRAFT";$("editState").className="status-pill "+n.status;countText();window.scrollTo({top:0,behavior:"smooth"});};
window.deleteArticle=async id=>{if(!confirm("Hapus berita ini? Tindakan ini tidak dapat dibatalkan."))return;const {error}=await db.from("articles").delete().eq("id",id);if(error)alert(error.message);else{msg("Berita dihapus.",true);await listArticles();}};
session();
