const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const qs = new URLSearchParams(location.search);
const category = qs.get("category");
const escapeHtml = s => String(s ?? "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const articleUrl = slug => `article.html?slug=${encodeURIComponent(slug)}`;

async function loadNews(){
  document.getElementById("today").textContent = new Date().toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"});
  let q=db.from("articles").select("*").eq("status","published").order("published_at",{ascending:false}).limit(30);
  if(category) q=q.eq("category",category);
  const {data,error}=await q;
  if(error){document.getElementById("latest").innerHTML=`<div class="error">Database belum terhubung. Periksa supabase-config.js.</div>`;return;}
  const news=data||[];
  render(news);
}
function photo(n, cls){return n.image_url?`<div class="${cls}"><img src="${escapeHtml(n.image_url)}" alt="${escapeHtml(n.title)}"></div>`:`<div class="${cls}">FOTO</div>`}
function render(news){
  if(!news.length){document.getElementById("lead").innerHTML='<div class="empty">Belum ada berita yang diterbitkan.</div>';document.getElementById("latest").innerHTML="";return;}
  const n=news[0];
  document.getElementById("lead").innerHTML=`<article class="lead"><a href="${articleUrl(n.slug)}">${photo(n,"lead-photo")}</a><div class="lead-copy"><span class="tag">${escapeHtml(n.category)}</span><h1><a href="${articleUrl(n.slug)}">${escapeHtml(n.title)}</a></h1><p>${escapeHtml(n.excerpt||"")}</p><div class="by">${new Date(n.published_at).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})} • ${escapeHtml(n.author)}</div></div></article>`;
  document.getElementById("featured").innerHTML=news.slice(1,3).map(n=>`<article>${photo(n,"side-photo")}<span class="tag">${escapeHtml(n.category)}</span><h3><a href="${articleUrl(n.slug)}">${escapeHtml(n.title)}</a></h3><small>${escapeHtml(n.author)}</small></article>`).join("");
  document.getElementById("latest").innerHTML=news.map(n=>`<article class="card">${photo(n,"card-photo")}<div class="card-body"><span class="tag">${escapeHtml(n.category)}</span><h3><a href="${articleUrl(n.slug)}">${escapeHtml(n.title)}</a></h3><small>${new Date(n.published_at).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})} • ${escapeHtml(n.author)}</small></div></article>`).join("");
  document.getElementById("popular").innerHTML=news.slice(0,5).map((n,i)=>`<div class="pop"><b>${i+1}</b><a href="${articleUrl(n.slug)}">${escapeHtml(n.title)}</a></div>`).join("");
}
document.getElementById("searchBtn").onclick=()=>{const p=document.getElementById("searchPanel");p.style.display=p.style.display==="block"?"none":"block";document.getElementById("searchInput").focus();};
document.getElementById("searchInput").oninput=async e=>{const q=e.target.value.trim();if(!q){loadNews();return;}const {data}=await db.from("articles").select("*").eq("status","published").ilike("title",`%${q}%`).order("published_at",{ascending:false});render(data||[]);}
loadNews();