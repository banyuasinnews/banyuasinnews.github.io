BANYUASIN NEWS - CMS DINAMIS

Ini adalah versi CMS yang benar-benar bisa:
- Login admin menggunakan Supabase Auth
- Menambah berita
- Menyimpan draft / menerbitkan berita
- Mengedit dan menghapus berita
- Upload foto ke Supabase Storage
- Menampilkan berita secara dinamis di GitHub Pages
- Halaman artikel berdasarkan slug

SETUP:
1. Buat project gratis di Supabase.
2. Buka SQL Editor dan jalankan schema.sql.
3. Di Authentication > Users, buat user admin dengan email/password.
4. Isi supabase-config.js dengan Project URL dan Publishable/anon key.
5. Upload semua file ke repository GitHub Pages.
6. Buka https://username.github.io/admin.html untuk login redaksi.

KEAMANAN:
- Jangan pernah memasukkan service_role key ke website.
- Publishable/anon key memang dapat berada di frontend jika Row Level Security (RLS) sudah benar.
- Gunakan akun admin yang kuat.
