const express = require('express');
const mqtt = require('mqtt');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Ambil kredensial dari environment variable (pastikan sudah diset di Render)
const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);

// Fix private key (ganti \\n jadi newline beneran)
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

// Inisialisasi Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://nyoba-b974e-default-rtdb.asia-southeast1.firebasedatabase.app'
});

const db = admin.firestore(); // pakai Firestore, bisa diganti admin.database() jika pake Realtime DB

// MQTT setup
const client = mqtt.connect('mqtt://broker.hivemq.com');

const topicSuhu = 'awikwoksuhu';
const topicKelembapan = 'awikwokkelembapan';

let dataSensor = {
  suhu: null,
  kelembapan: null,
  timestamp: null
};

client.on('connect', () => {
  console.log('Terhubung ke broker MQTT');
  client.subscribe([topicSuhu, topicKelembapan], (err) => {
    if (err) {
      console.error('Gagal subscribe:', err);
    }
  });
});

client.on('message', async (topic, message) => {
  const payload = message.toString();
  const waktu = new Date();

  if (topic === topicSuhu) {
    dataSensor.suhu = parseFloat(payload);
  } else if (topic === topicKelembapan) {
    dataSensor.kelembapan = parseFloat(payload);
  }

  if (dataSensor.suhu !== null && dataSensor.kelembapan !== null) {
    dataSensor.timestamp = waktu;

    try {
      await db.collection('sensorData').add(dataSensor);
      console.log('Data disimpan ke Firebase:', dataSensor);
    } catch (error) {
      console.error('Gagal menyimpan ke Firebase:', error);
    }

    // Reset data supaya gak dobel
    dataSensor = {
      suhu: null,
      kelembapan: null,
      timestamp: null
    };
  }
});

// Web server endpoint buat health check / simple response
app.get('/', (req, res) => {
  res.send('Server MQTT + Firebase berjalan lancar 👍');
});

// Start web server supaya Render bisa detect open port
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
