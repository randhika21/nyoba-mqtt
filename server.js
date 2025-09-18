const mqtt = require('mqtt');
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-adminsdk.json'); // <- ganti jika beda

// Inisialisasi Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://nyoba-b974e-default-rtdb.asia-southeast1.firebasedatabase.app' // GANTI dengan database URL kamu
});

const db = admin.firestore();

const client = mqtt.connect('mqtt://broker.hivemq.com');

// Daftar topik
const topicSuhu = 'awikwoksuhu';
const topicKelembapan = 'awikwokkelembapan';
const topicRelay = 'awikwokrelay'; // ✅ Tambahan untuk relay

// Data sensor sementara
let dataSensor = {
  suhu: null,
  kelembapan: null,
  timestamp: null
};

client.on('connect', () => {
  console.log('✅ Terhubung ke broker MQTT');
  client.subscribe([topicSuhu, topicKelembapan, topicRelay]); // ✅ Tambahkan topik relay
});

client.on('message', async (topic, message) => {
  const payload = message.toString();
  const waktu = new Date();

  if (topic === topicSuhu) {
    dataSensor.suhu = parseFloat(payload);
  } else if (topic === topicKelembapan) {
    dataSensor.kelembapan = parseFloat(payload);
  } else if (topic === topicRelay) {
    // ✅ Simpan data relay langsung
    const relayData = {
      status: payload === '1' ? 'ON' : 'OFF',
      raw: payload,
      timestamp: waktu
    };

    try {
      await db.collection('relayData').add(relayData);
      console.log('🔌 Data relay disimpan:', relayData);
    } catch (error) {
      console.error('❌ Gagal menyimpan data relay:', error);
    }

    return; // Jangan lanjut ke penyimpanan data sensor
  }

  // Jika kedua data sensor sudah lengkap, simpan ke Firestore
  if (dataSensor.suhu !== null && dataSensor.kelembapan !== null) {
    dataSensor.timestamp = waktu;

    try {
      await db.collection('sensorData').add(dataSensor);
      console.log('📥 Data sensor disimpan:', dataSensor);
    } catch (error) {
      console.error('❌ Gagal menyimpan data sensor:', error);
    }

    // Reset data
    dataSensor = { suhu: null, kelembapan: null, timestamp: null };
  }
});
