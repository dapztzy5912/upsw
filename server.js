const express = require('express');
const fs = require('fs');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const PORT = 3000;
const path = require('path');
const multer = require('multer');
const upload = multer();

// Pastikan file database ada
const databasePath = 'database.json';
if (!fs.existsSync(databasePath)) {
  fs.writeFileSync(databasePath, JSON.stringify({
    akun: {},
    status: []
  }, null, 2));
}

let database = JSON.parse(fs.readFileSync(databasePath, 'utf-8'));

app.use(express.static(__dirname));
app.use(express.json({ limit: '50mb' }));

// Route untuk halaman utama - arahkan ke landing.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'landing.html'));
});

app.post('/daftar', (req, res) => {
  const { nama, foto } = req.body;
  const akun = { nama, foto };
  database.akun[nama] = akun;
  fs.writeFileSync(databasePath, JSON.stringify(database, null, 2));
  res.sendStatus(200);
});

app.get('/akun/:nama', (req, res) => {
  const akun = database.akun[req.params.nama];
  res.json(akun || null);
});

// Endpoint untuk upload status
app.post('/upload', (req, res) => {
  const { nama, fotoProfil, caption, file } = req.body;

  const newStatus = {
    nama,
    fotoProfil,
    caption,
    file,
    waktu: Date.now(),
    id: generateId() // Menambahkan ID unik untuk setiap status
  };

  database.status.push(newStatus);

  fs.writeFileSync(databasePath, JSON.stringify(database, null, 2));
  
  // Memberi tahu semua client bahwa ada status baru
  io.emit('new-status', newStatus);
  
  res.json({ success: true });
});

// Fungsi untuk menghasilkan ID unik
function generateId() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

app.get('/status', (req, res) => {
  res.json(database.status.slice(-30)); // Ambil 30 status terakhir
});

// Endpoint untuk mendapatkan status berdasarkan ID
app.get('/status/:id', (req, res) => {
  const status = database.status.find(s => s.id === req.params.id);
  if (status) {
    res.json(status);
  } else {
    res.status(404).json({ error: 'Status tidak ditemukan' });
  }
});

http.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Fungsi untuk membersihkan status yang sudah lama (lebih dari 24 jam)
function cleanupOldStatus() {
  const yesterday = Date.now() - 24 * 60 * 60 * 1000; // 24 jam yang lalu
  database.status = database.status.filter(status => status.waktu > yesterday);
  fs.writeFileSync(databasePath, JSON.stringify(database, null, 2));
}

// Jalankan pembersihan status lama setiap jam
setInterval(cleanupOldStatus, 60 * 60 * 1000);

// Socket.io untuk notifikasi real-time
io.on('connection', (socket) => {
  console.log('User connected');
  
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});
