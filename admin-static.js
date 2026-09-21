const { createClient } = window.supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const form = document.querySelector("#articleForm");
const msg = document.querySelector("#msg");
const preview = document.querySelector("#preview");

function slugify(s){
  return s.toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
}
function esc(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function contentHtml(s){
  return String(s||"").split(/\n\s*\n/).map(p=>`<p>${esc(p).replace(/\n/g,"<br>")}</p>`).join("");
}
function isoFromLocal(v){
  const d = new Date(v);
  return d.toISOString();
}
function displayDate(v){
  return new Intl.DateTimeFormat("id-ID",{dateStyle:"long",timeStyle:"short",timeZone:"Asia/Jakarta"}).format(new Date(v));
}

document.querySelector("#title").addEventListener("input", e=>{
  document.querySelector("#slug").value = slugify(e.target.value);
});

form.addEventListener("submit", async e=>{
  e.preventDefault();
  msg.textContent="Menyimpan...";
  const fd = new FormData(form);
  const title=fd.get("title").trim(), slug=slugify(fd.get("slug")||title);
  const category=fd.get("category"), author=fd.get("author").trim()||"Redaksi";
  const excerpt=fd.get("excerpt").trim(), content=fd.get("content").trim();
  const publishedAt=fd.get("published_at") || new Date().toISOString();
  const status=fd.get("status");
  const file=document.querySelector("#image").files[0];

  if(!title || !excerpt || !content){msg.textContent="Judul, ringkasan, dan isi berita wajib diisi.";return;}

  let imageUrl="";
  if(file){
    const ext=(file.name.split(".").pop()||"jpg").toLowerCase();
    const path=`${Date.now()}-${slug}.${ext}`;
    const up=await db.storage.from("news-images").upload(path,file,{upsert:false});
    if(up.error){msg.textContent="Upload foto gagal: "+up.error.message;return;}
    imageUrl=db.storage.from("news-images").getPublicUrl(path).data.publicUrl;
  }

  const row={slug,title,category,excerpt,content,image_url:imageUrl,author,published_at:publishedAt,status,updated_at:new Date().toISOString()};
  const ins=await db.from("articles").upsert(row,{onConflict:"slug"}).select().single();
  if(ins.error){msg.textContent="Gagal menyimpan: "+ins.error.message;return;}

  const article=ins.data;
  const canonical=`https://banyuasinnews.github.io/berita/${article.slug}/`;
  const jsonld={
    "@context":"https://schema.org","@type":"NewsArticle",
    "mainEntityOfPage":{"@type":"WebPage","@id":canonical},
    "headline":article.title,
    "description":article.excerpt,
    "image":article.image_url?[article.image_url]:[],
    "datePublished":article.published_at,
    "dateModified":article.updated_at,
    "author":{"@type":"Person","name":article.author},
    "publisher":{"@type":"Organization","name":"Banyuasin News"},
    "articleSection":article.category
  };
  const template = await fetch("article-static-template.html").then(r=>r.text());
  const out=template
    .replaceAll("__TITLE__",esc(article.title))
    .replaceAll("__DESCRIPTION__",esc(article.excerpt))
    .replaceAll("__AUTHOR__",esc(article.author))
    .replaceAll("__CANONICAL__",canonical)
    .replaceAll("__IMAGE__",article.image_url||"https://banyuasinnews.github.io/og-default.jpg")
    .replaceAll("__IMAGE_ALT__",esc(article.title))
    .replaceAll("__DATE_ISO__",article.published_at)
    .replaceAll("__DATE_DISPLAY__",displayDate(article.published_at))
    .replaceAll("__CATEGORY__",esc(article.category))
    .replace("__CONTENT_HTML__",contentHtml(article.content))
    .replace("__JSONLD__",JSON.stringify(jsonld,null,2).replace(/</g,"\\u003c"));
  const blob=new Blob([out],{type:"text/html;charset=utf-8"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=`${article.slug}.html`;
  a.click();
  URL.revokeObjectURL(a.href);
  msg.innerHTML=`Berita tersimpan di Supabase. <b>File artikel statis juga sudah diunduh.</b><br>Upload file <code>${article.slug}.html</code> ke GitHub pada folder <code>berita/${article.slug}/index.html</code>.`;
  preview.innerHTML=`<strong>URL setelah upload:</strong><br>${canonical}`;
});
