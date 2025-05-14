const express = require('express');
const fs = require('fs');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const PORT = 3000;

let database = JSON.parse(fs.readFileSync('database.json', 'utf-8'));

app.use(express.static(__dirname));
app.use(express.json());

app.post('/daftar', (req, res) => {
  const { nama, foto } = req.body;
  const akun = { nama, foto };
  database.akun[nama] = akun;
  fs.writeFileSync('database.json', JSON.stringify(database, null, 2));
  res.sendStatus(200);
});

app.get('/akun/:nama', (req, res) => {
  const akun = database.akun[req.params.nama];
  res.json(akun || null);
});

app.post('/upload', (req, res) => {
  const status = req.body;
  status.timestamp = Date.now();
  database.status.push(status);
  fs.writeFileSync('database.json', JSON.stringify(database, null, 2));
  io.emit('new-status', status);
  res.sendStatus(200);
});

app.get('/status', (req, res) => {
  res.json(database.status.slice(-30)); // Ambil 30 status terakhir
});

http.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});