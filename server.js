const mqtt = require('mqtt');
const admin = require('firebase-admin');

// Ambil kredensial dari environment variable
const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);

// Inisialisasi Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://nyoba-b974e-default-rtdb.asia-southeast1.firebasedatabase.app'
});

const db = admin.firestore(); // atau gunakan admin.database() untuk Realtime Database

// Connect ke broker MQTT
const client = mqtt.connect('mqtt://broker.hivemq.com');

// Topik yang sama dengan ESP32
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

  // Simpan ke Firebase hanya jika kedua nilai sudah ada
  if (dataSensor.suhu !== null && dataSensor.kelembapan !== null) {
    dataSensor.timestamp = waktu;

    try {
      await db.collection('sensorData').add(dataSensor);
      console.log('Data disimpan ke Firebase:', dataSensor);
    } catch (error) {
      console.error('Gagal menyimpan ke Firebase:', error);
    }

    // Reset agar tidak dobel-dobel
    dataSensor = {
      suhu: null,
      kelembapan: null,
      timestamp: null
    };
  }
});
