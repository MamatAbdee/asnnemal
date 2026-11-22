/**
 * ==============================================================================
 * E-ASN NEMAL (RSUD NENE MALLOMO) — ZERO-DELAY FRONTEND ENGINE
 *
 * Optimasi Performa (gas-scale-turbo & gas-pro-api):
 * 1. CORS-Safe POST menggunakan Content-Type: text/plain;charset=utf-8
 * 2. SWR (Stale-While-Revalidate) via localStorage — 0ms instant render
 * 3. In-Flight Request Deduplication & Write Epoch
 * 4. Instant Client-Side View Switching, Search & Filtering (0ms lag)
 * 5. Adaptive Visibility-Aware Background Sync
 * ==============================================================================
 */

const SWR_KEY = 'e_asn_nemal_swr_v2';
const SWR_TTL_MS = 10 * 60 * 1000; // 10 menit

const AppState = {
  user: JSON.parse(localStorage.getItem('e_asn_user') || 'null'),
  token: localStorage.getItem('e_asn_token') || '',
  currentView: 'dashboard',
  bootData: null,
  unitFilter: 'SEMUA',
  monTab: 'kgb',
  kredFilter: 'ALL',
  archiveFilter: 'ALL',
  alertTab: 'kgb',
  theme: localStorage.getItem('e_asn_theme') || 'light',
  uploadedBase64: '',
  uploadedFileName: '',
  tasksDone: JSON.parse(localStorage.getItem('e_asn_tasks_done') || '{}'),
  waLogs: JSON.parse(localStorage.getItem('e_asn_wa_logs') || 'null') || [
    { nama: 'SK KGB dr. Budi Sp.PD', status: 'Terkirim', time: '10:15' },
    { nama: 'Berkas KP Ns. Ratna', status: 'Dibaca', time: '08:42' }
  ]
};

// ==============================================================================
// 1. TURBO API CLIENT (ANTI-CORS & DEDUPLIKASI IN-FLIGHT)
// ==============================================================================
const _inflight = {};
let _writeEpoch = 0;

function isDemoMode() {
  return !CONFIG.GAS_URL || CONFIG.GAS_URL.trim() === '';
}

async function api(action, payload = {}) {
  if (isDemoMode()) return handleMockApi(action, payload);

  const isRead = /^(get|list|fetch|read|boot|ping)/i.test(action);
  if (!isRead) {
    _writeEpoch++;
    return executeFetch(action, payload);
  }

  const key = `${_writeEpoch}|${action}|${JSON.stringify(payload)}`;
  if (_inflight[key]) return _inflight[key];

  const p = executeFetch(action, payload);
  _inflight[key] = p;
  p.finally(() => { delete _inflight[key]; });
  return p;
}

async function executeFetch(action, payload) {
  try {
    const res = await fetch(CONFIG.GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // WAJIB Anti-CORS GAS
      body: JSON.stringify({ action, data: payload, token: AppState.token })
    });
    const json = await res.json();

    // Jika backend mengembalikan antrean notifikasi non-blocking, drain di background
    if (json && json.nq > 0) {
      setTimeout(() => executeFetch('drainQueue', {}), 300);
    }
    return json;
  } catch (err) {
    console.error('API Error:', err);
    return { success: false, message: 'Gagal terhubung ke server GAS: ' + err.message };
  }
}

// ==============================================================================
// 2. DEMO / OFFLINE MOCK DATABASE (INSTANT PREVIEW)
// ==============================================================================
const MockDB = {
  employees: [
    {
      NIP: '198204152008011005', NIK: '7314011504820001', Nama_Lengkap: 'Budi Santoso', Gelar_Depan: 'dr.', Gelar_Belakang: 'Sp.PD',
      Status_Kepegawaian: 'PNS', Jenis_Kelamin: 'L', Tanggal_Lahir: '1982-04-15', No_HP_WA: '081234567890', Email: 'dr.budi@nemal-rs.go.id',
      Jenis_Jabatan: 'Fungsional Tertentu Nakes', Nama_Jabatan: 'Dokter Spesialis Penyakit Dalam', Unit_Kerja: 'Instalasi Rawat Inap',
      Golongan_Pangkat_Terakhir: 'IV/a', TMT_Golongan: '2022-04-01', TMT_KGB_Terakhir: '2024-11-10',
      Jadwal_KGB_Berikutnya: '2026-11-10', Jadwal_KP_Berikutnya: '2027-04-01', Batas_Usia_Pensiun: 60, TMT_Pensiun: '2042-05-01',
      Profesi: 'Dokter Spesialis', Nomor_STR: '73.01.1.1.20.21.098765', Masa_Berlaku_STR: '2029-03-15', Status_STR_Seumur_Hidup: 'Ya',
      Nomor_SIP: '446/123/SIP.DS/2024', Masa_Berlaku_SIP: '2029-03-15', Status_UKOM: 'Lulus', Jenjang_Terakhir: 'Profesi'
    },
    {
      NIP: '199108152014022001', NIK: '7314021508910002', Nama_Lengkap: 'Ratna Dewi', Gelar_Depan: 'Ns.', Gelar_Belakang: 'S.Kep',
      Status_Kepegawaian: 'PNS', Jenis_Kelamin: 'P', Tanggal_Lahir: '1991-08-15', No_HP_WA: '081987654321', Email: 'ns.ratna@nemal-rs.go.id',
      Jenis_Jabatan: 'Fungsional Tertentu Nakes', Nama_Jabatan: 'Perawat Ahli Muda', Unit_Kerja: 'Instalasi Gawat Darurat (IGD)',
      Golongan_Pangkat_Terakhir: 'III/c', TMT_Golongan: '2023-04-01', TMT_KGB_Terakhir: '2024-11-15',
      Jadwal_KGB_Berikutnya: '2026-11-15', Jadwal_KP_Berikutnya: '2027-01-15', Batas_Usia_Pensiun: 58, TMT_Pensiun: '2049-09-01',
      Profesi: 'Perawat', Nomor_STR: '140252119-3456789', Masa_Berlaku_STR: '2026-12-15', Status_STR_Seumur_Hidup: 'Tidak',
      Nomor_SIP: '446/890/SIP.P/2021', Masa_Berlaku_SIP: '2026-12-15', Status_UKOM: 'Lulus', Jenjang_Terakhir: 'Profesi'
    },
    {
      NIP: '198903222015032004', NIK: '7314022203890003', Nama_Lengkap: 'Maya Sari', Gelar_Depan: 'Bidan', Gelar_Belakang: 'A.Md.Keb',
      Status_Kepegawaian: 'PNS', Jenis_Kelamin: 'P', Tanggal_Lahir: '1989-03-22', No_HP_WA: '081567890123', Email: 'maya.keb@nemal-rs.go.id',
      Jenis_Jabatan: 'Fungsional Keterampilan', Nama_Jabatan: 'Bidan Pelaksana', Unit_Kerja: 'Kamar Bersalin (VK)',
      Golongan_Pangkat_Terakhir: 'III/b', TMT_Golongan: '2022-10-01', TMT_KGB_Terakhir: '2024-11-20',
      Jadwal_KGB_Berikutnya: '2026-11-20', Jadwal_KP_Berikutnya: '2027-02-01', Batas_Usia_Pensiun: 58, TMT_Pensiun: '2047-04-01',
      Profesi: 'Bidan', Nomor_STR: '120352119-1122334', Masa_Berlaku_STR: '2026-12-20', Status_STR_Seumur_Hidup: 'Tidak',
      Nomor_SIP: '446/789/SIP.B/2022', Masa_Berlaku_SIP: '2026-12-20', Status_UKOM: 'Lulus', Jenjang_Terakhir: 'D3'
    },
    {
      NIP: '198711042019031002', NIK: '7314010411870004', Nama_Lengkap: 'Hendra Wijaya', Gelar_Depan: 'drg.', Gelar_Belakang: 'M.Kes',
      Status_Kepegawaian: 'PNS', Jenis_Kelamin: 'L', Tanggal_Lahir: '1987-11-04', No_HP_WA: '081345678901', Email: 'drg.hendra@nemal-rs.go.id',
      Jenis_Jabatan: 'Fungsional Tertentu Nakes', Nama_Jabatan: 'Dokter Gigi Ahli Madya', Unit_Kerja: 'Instalasi Rawat Jalan',
      Golongan_Pangkat_Terakhir: 'IV/a', TMT_Golongan: '2023-04-01', TMT_KGB_Terakhir: '2025-03-01',
      Jadwal_KGB_Berikutnya: '2027-03-01', Jadwal_KP_Berikutnya: '2027-02-01', Batas_Usia_Pensiun: 60, TMT_Pensiun: '2047-12-01',
      Profesi: 'Dokter Gigi', Nomor_STR: '73.01.2.1.22.001234', Masa_Berlaku_STR: '2028-06-01', Status_STR_Seumur_Hidup: 'Ya',
      Nomor_SIP: '446/456/SIP.DG/2023', Masa_Berlaku_SIP: '2028-06-01', Status_UKOM: 'Lulus', Jenjang_Terakhir: 'S2'
    },
    {
      NIP: '199305122022032008', NIK: '7314021205930005', Nama_Lengkap: 'Rina Kusuma', Gelar_Depan: 'Apt.', Gelar_Belakang: 'S.Farm',
      Status_Kepegawaian: 'PPPK', Jenis_Kelamin: 'P', Tanggal_Lahir: '1993-05-12', No_HP_WA: '081778899001', Email: 'apt.rina@nemal-rs.go.id',
      Jenis_Jabatan: 'Fungsional Tertentu Nakes', Nama_Jabatan: 'Apoteker Ahli Pertama', Unit_Kerja: 'Instalasi Farmasi',
      Golongan_Pangkat_Terakhir: 'III/b', TMT_Golongan: '2022-03-01', TMT_KGB_Terakhir: '2024-03-01',
      Jadwal_KGB_Berikutnya: '2026-03-01', Jadwal_KP_Berikutnya: '2027-04-01', Batas_Usia_Pensiun: 58, TMT_Pensiun: '2051-06-01',
      Profesi: 'Apoteker', Nomor_STR: '19930512/STRA-UNHAS/2021', Masa_Berlaku_STR: '2028-05-12', Status_STR_Seumur_Hidup: 'Ya',
      Nomor_SIP: '446/321/SIPA/2022', Masa_Berlaku_SIP: '2027-05-12', Status_UKOM: 'Lulus', Jenjang_Terakhir: 'S1'
    },
    {
      NIP: '199609102023011009', NIK: '7314011009960006', Nama_Lengkap: 'Ahmad Fauzi', Gelar_Depan: '', Gelar_Belakang: 'A.Md.AK',
      Status_Kepegawaian: 'Non-ASN', Jenis_Kelamin: 'L', Tanggal_Lahir: '1996-09-10', No_HP_WA: '082112233445', Email: 'ahmad.lab@nemal-rs.go.id',
      Jenis_Jabatan: 'Pelaksana', Nama_Jabatan: 'Analis Laboratorium', Unit_Kerja: 'Instalasi Rawat Inap',
      Golongan_Pangkat_Terakhir: 'II/c', TMT_Golongan: '2023-01-01', TMT_KGB_Terakhir: '',
      Jadwal_KGB_Berikutnya: '', Jadwal_KP_Berikutnya: '', Batas_Usia_Pensiun: 58, TMT_Pensiun: '2054-10-01',
      Profesi: 'ATLM', Nomor_STR: '150252122-998877', Masa_Berlaku_STR: '2027-09-10', Status_STR_Seumur_Hidup: 'Tidak',
      Nomor_SIP: '446/654/SIP.ATLM/2023', Masa_Berlaku_SIP: '2027-09-10', Status_UKOM: 'Lulus', Jenjang_Terakhir: 'D3'
    }
  ],
  archives: [
    { ID_Dokumen: 'LAFKI-0942', NIP: '198204152008011005', Nama_Pemilik: 'dr. Budi Santoso, Sp.PD', Kategori_Dokumen: 'STR', Nama_Berkas: 'STR_198204152008011005_drBudi.pdf', Tanggal_Unggah: '2026-11-18' },
    { ID_Dokumen: 'LAFKI-0941', NIP: '198204152008011005', Nama_Pemilik: 'dr. Budi Santoso, Sp.PD', Kategori_Dokumen: 'SK', Nama_Berkas: 'SK_Pangkat_IVa_drBudi.pdf', Tanggal_Unggah: '2026-11-15' },
    { ID_Dokumen: 'LAFKI-0938', NIP: '199108152014022001', Nama_Pemilik: 'Ns. Ratna Dewi, S.Kep', Kategori_Dokumen: 'Ijazah', Nama_Berkas: 'Ijazah_Profesi_NsRatna.pdf', Tanggal_Unggah: '2026-11-12' },
    { ID_Dokumen: 'LAFKI-0935', NIP: '198903222015032004', Nama_Pemilik: 'Bidan Maya Sari, A.Md.Keb', Kategori_Dokumen: 'RKK', Nama_Berkas: 'RKK_SPK_BidanMaya.pdf', Tanggal_Unggah: '2026-11-10' }
  ]
};

function computeStatsFromList(list) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const kgb = list.filter(e => {
    if (!e.Jadwal_KGB_Berikutnya) return false;
    const d = new Date(e.Jadwal_KGB_Berikutnya);
    return !isNaN(d) && d.getFullYear() === y && d.getMonth() === m;
  });
  const kp = list.filter(e => {
    if (!e.Jadwal_KP_Berikutnya) return false;
    const d = new Date(e.Jadwal_KP_Berikutnya);
    const diff = Math.ceil((d - now) / 86400000);
    return !isNaN(d) && diff >= -7 && diff <= 95;
  });
  const str = list.filter(e => {
    if (!e.Masa_Berlaku_STR || String(e.Status_STR_Seumur_Hidup).toLowerCase() === 'ya') return false;
    const d = new Date(e.Masa_Berlaku_STR);
    return !isNaN(d) && Math.ceil((d - now) / 86400000) <= 90;
  });

  const total = list.length;
  const laki = list.filter(x => String(x.Jenis_Kelamin).startsWith('L')).length;
  const pns = list.filter(x => x.Status_Kepegawaian === 'PNS').length;
  const pppk = list.filter(x => x.Status_Kepegawaian === 'PPPK').length;
  const p3kPw = list.filter(x => String(x.Status_Kepegawaian || '').toUpperCase() === 'P3K PW').length;

  return {
    stats: {
      total,
      gender: { laki, perempuan: total - laki },
      statusKepegawaian: { pns, pppk, p3kPw, nonAsn: Math.max(0, total - pns - pppk - p3kPw) },
      golongan: {
        iv: list.filter(x => String(x.Golongan_Pangkat_Terakhir).startsWith('IV')).length,
        iii: list.filter(x => String(x.Golongan_Pangkat_Terakhir).startsWith('III')).length,
        ii: list.filter(x => String(x.Golongan_Pangkat_Terakhir).startsWith('II')).length,
        i: list.filter(x => String(x.Golongan_Pangkat_Terakhir).startsWith('I/')).length
      },
      pendidikan: {
        profesi: list.filter(x => x.Jenjang_Terakhir === 'Profesi').length,
        s2: list.filter(x => x.Jenjang_Terakhir === 'S2').length,
        s1: list.filter(x => x.Jenjang_Terakhir === 'S1').length,
        d3: list.filter(x => x.Jenjang_Terakhir === 'D3').length
      },
      kgbBulanIniCount: kgb.length,
      kp3BulanCount: kp.length,
      strSipWarningCount: str.length,
      totalArsip: MockDB.archives.length
    },
    alerts: { kgb, kp, str }
  };
}

function handleMockApi(action, payload) {
  return new Promise(resolve => {
    if (action === 'getBootData') {
      let emps = [...MockDB.employees];
      if (AppState.user && AppState.user.role === 'Pegawai') {
        emps = emps.filter(e => e.NIP === AppState.user.nip);
      }
      const { stats, alerts } = computeStatsFromList(emps);
      resolve({ success: true, demoMode: true, stats, alerts, employees: emps, archives: MockDB.archives });
    } else if (action === 'saveEmployee') {
      const idx = MockDB.employees.findIndex(e => e.NIP === payload.nip);
      const nextKgb = payload.tmtKgb ? addYearsStr(payload.tmtKgb, 2) : '';
      const mapped = {
        NIP: payload.nip, NIK: payload.nik, Nama_Lengkap: payload.nama,
        Gelar_Depan: payload.gelarDepan, Gelar_Belakang: payload.gelarBelakang,
        Status_Kepegawaian: payload.statusAsn, Jenis_Kelamin: payload.jenisKelamin,
        Tanggal_Lahir: payload.tanggalLahir, No_HP_WA: payload.noHp, Email: payload.email,
        Jenis_Jabatan: payload.jenisJabatan, Nama_Jabatan: payload.namaJabatan, Unit_Kerja: payload.unitKerja,
        Golongan_Pangkat_Terakhir: payload.golongan, TMT_Golongan: payload.tmtGolongan,
        TMT_KGB_Terakhir: payload.tmtKgb, Jadwal_KGB_Berikutnya: nextKgb,
        Jadwal_KP_Berikutnya: payload.jadwalKp, Batas_Usia_Pensiun: Number(payload.bup || 58),
        Profesi: payload.profesi, Nomor_STR: payload.noStr, Masa_Berlaku_STR: payload.masaStr,
        Nomor_SIP: payload.noSip, Masa_Berlaku_SIP: payload.masaSip, Jenjang_Terakhir: payload.jenjang || 'S1'
      };
      if (idx > -1) MockDB.employees[idx] = Object.assign({}, MockDB.employees[idx], mapped);
      else MockDB.employees.unshift(mapped);
      resolve({ success: true, message: `Data ${payload.nama} berhasil disimpan!` });
    } else if (action === 'uploadArchive') {
      const emp = MockDB.employees.find(e => e.NIP === payload.nip);
      MockDB.archives.unshift({
        ID_Dokumen: 'LAFKI-' + Math.floor(1000 + Math.random() * 9000),
        NIP: payload.nip,
        Nama_Pemilik: emp ? formatFullName(emp) : payload.nip,
        Kategori_Dokumen: payload.kategori,
        Nama_Berkas: payload.fileName || `${payload.kategori}_${payload.nip}.pdf`,
        Tanggal_Unggah: new Date().toISOString().slice(0, 10),
        base64: payload.base64 || ''
      });
      resolve({ success: true, message: 'Berkas PDF tersimpan aman (Mode Pratinjau)!' });
    } else if (action === 'deleteEmployee') {
      const idx = MockDB.employees.findIndex(e => String(e.NIP) === String(payload.nip));
      if (idx > -1) MockDB.employees.splice(idx, 1);
      resolve({ success: true, message: `Pegawai NIP ${payload.nip} berhasil dihapus.` });
    } else if (action === 'deleteAllEmployees') {
      MockDB.employees.length = 0;
      resolve({ success: true, message: 'Seluruh data pegawai berhasil dihapus.' });
    } else if (action === 'deleteArchive') {
      const idx = MockDB.archives.findIndex(a => String(a.ID_Dokumen) === String(payload.docId) || String(a.Drive_File_ID) === String(payload.docId));
      if (idx > -1) MockDB.archives.splice(idx, 1);
      resolve({ success: true, message: 'Berkas PDF berhasil dihapus.' });
    } else if (action === 'savePejabat') {
      const pj = { nama: payload.nama, jabatan: payload.jabatan || 'Kasubag Keuangan' };
      localStorage.setItem('e_asn_pejabat', JSON.stringify(pj));
      resolve({ success: true, message: 'Nama pejabat berhasil diperbarui!', pejabat: pj });
    } else if (action === 'changePassword') {
      resolve({ success: true, message: 'Kata sandi Super Admin berhasil diperbarui (Mode Demo).' });
    } else if (action === 'getArchiveFile') {
      const rec = MockDB.archives.find(a => String(a.Drive_File_ID) === String(payload.fileId) || String(a.ID_Dokumen) === String(payload.fileId));
      const b64 = (rec && rec.base64) ? rec.base64 : buildSamplePdfBase64((rec && rec.Nama_Berkas) || 'Dokumen_LAFKI.pdf');
      resolve({
        success: true,
        fileName: (rec && rec.Nama_Berkas) || 'Dokumen_LAFKI.pdf',
        mimeType: 'application/pdf',
        base64: b64
      });
    } else if (action === 'runMigration') {
      resolve({
        success: true,
        dryRun: !!payload.dryRun,
        result: {
          mode: payload.dryRun ? 'DRY_RUN (SIMULASI)' : 'EKSEKUSI_NYATA',
          sheets: {
            Master_Pegawai: { inserted: 12, updated: 4, skipped: 469 },
            Jabatan_Karier: { inserted: 12, updated: 8, skipped: 465 },
            Profesi_Kredensial: { inserted: 9, updated: 3, skipped: 473 }
          }
        }
      });
    } else if (action === 'getSettingsStatus') {
      resolve({ success: true, secrets: { WA_GATEWAY_TOKEN: { ada: false, tersamar: '' } } });
    } else if (action === 'saveSecret') {
      resolve({ success: true, message: 'Rahasia tersimpan di Script Properties (Simulasi).' });
    } else {
      resolve({ success: true, message: 'Aksi berhasil dieksekusi.' });
    }
  });
}

// ==============================================================================
// 3. BOOTSTRAP, LOGIN & RBAC
// ==============================================================================
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(AppState.theme);
  renderDateDisplay();
  setupGlobalListeners();

  const demoBox = document.getElementById('demo-login-box');
  if (demoBox) demoBox.style.display = isDemoMode() ? 'block' : 'none';

  // Bersihkan sesi DEMO_TOKEN & cache demo jika GAS_URL produksi sudah aktif
  if (!isDemoMode() && AppState.token === 'DEMO_TOKEN') {
    localStorage.removeItem('e_asn_token');
    localStorage.removeItem('e_asn_user');
    localStorage.removeItem(SWR_KEY);
    AppState.token = '';
    AppState.user = null;
  }

  if (AppState.user && (AppState.token || isDemoMode())) {
    enterApp();
  } else {
    document.getElementById('login-screen').style.display = 'flex';
  }
});

function selectLoginTab(role) {
  document.getElementById('login-role-admin').classList.toggle('active', role === 'admin');
  document.getElementById('login-role-pegawai').classList.toggle('active', role === 'pegawai');
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const nip = document.getElementById('login-nip').value.trim();
  const password = document.getElementById('login-pass').value;
  if (isDemoMode()) {
    demoLogin('SuperAdmin');
    return;
  }
  showLoader(true);
  const res = await api('login', { nip, password });
  showLoader(false);
  if (res.success) {
    AppState.token = res.token;
    AppState.user = res.user;
    localStorage.setItem('e_asn_token', res.token);
    localStorage.setItem('e_asn_user', JSON.stringify(res.user));
    showToast(`Selamat datang, ${res.user.nama}!`, 'success');
    enterApp();
  } else {
    showToast(res.message || 'Login gagal!', 'error');
  }
}

function demoLogin(role) {
  const presets = {
    SuperAdmin: { nip: 'yuyun', nama: 'Kasubag Keuangan', role: 'SuperAdmin', unit: 'Subbagian Keuangan' },
    Operator: { nip: '198812152011012003', nama: 'Siti Nurhaliza, A.Md.Keb', role: 'Operator', unit: 'Subbagian Kepegawaian' },
    Pegawai: { nip: '198204152008011005', nama: 'dr. Budi Santoso, Sp.PD', role: 'Pegawai', unit: 'Instalasi Rawat Inap' }
  };
  AppState.user = presets[role];
  AppState.token = 'DEMO_TOKEN';
  localStorage.setItem('e_asn_user', JSON.stringify(AppState.user));
  localStorage.setItem('e_asn_token', AppState.token);
  showToast(`Masuk sebagai ${AppState.user.nama} (${role})`, 'success');
  enterApp();
}

function handleLogout() {
  localStorage.removeItem('e_asn_token');
  localStorage.removeItem('e_asn_user');
  localStorage.removeItem(SWR_KEY);
  AppState.user = null;
  AppState.token = '';
  document.getElementById('app-container').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  showToast('Anda telah keluar dari sesi E-ASN Nemal.', 'info');
}

function renderPejabatSidebar() {
  let pj = (AppState.bootData && AppState.bootData.pejabat) || null;
  if (!pj || !pj.nama) {
    try { pj = JSON.parse(localStorage.getItem('e_asn_pejabat') || 'null'); } catch (e) {}
  }
  const nama = (pj && pj.nama) || (AppState.user && AppState.user.nama) || 'Kasubag Keuangan';
  const jabatan = (pj && pj.jabatan) || 'Kasubag Keuangan';

  const nameEl = document.getElementById('sidebar-user-name');
  const roleEl = document.getElementById('sidebar-user-role');
  const initEl = document.getElementById('sidebar-user-initials');
  if (nameEl) nameEl.textContent = nama;
  if (roleEl) roleEl.textContent = jabatan;
  if (initEl) initEl.textContent = getInitials(nama);

  const inNama = document.getElementById('setting-pejabat-nama');
  const inJab = document.getElementById('setting-pejabat-jabatan');
  if (inNama && pj && pj.nama && !inNama.value) inNama.value = pj.nama;
  if (inJab && pj && pj.jabatan) inJab.value = pj.jabatan;
}

function populateWorkspaceUnits(allEmps) {
  const sel = document.getElementById('workspace-unit-select');
  if (!sel) return;
  const units = Array.from(new Set(
    (allEmps || [])
      .map(e => String(e.Unit_Kerja || '').trim())
      .filter(Boolean)
  )).sort((a, b) => a.localeCompare(b, 'id'));

  const prev = AppState.unitFilter;
  sel.innerHTML = '<option value="SEMUA">Unit: Seluruh RS</option>' +
    units.map(u => `<option value="${u.replace(/"/g, '&quot;')}">${u}</option>`).join('');

  if (prev !== 'SEMUA' && units.includes(prev)) {
    sel.value = prev;
  } else {
    AppState.unitFilter = 'SEMUA';
    sel.value = 'SEMUA';
  }
}

function enterApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-container').style.display = 'grid';

  renderPejabatSidebar();

  // Terapkan RBAC pada elemen admin-only & superadmin-only
  const isAdmin = AppState.user.role === 'SuperAdmin' || AppState.user.role === 'Operator';
  const isSuperAdmin = AppState.user.role === 'SuperAdmin';
  document.querySelectorAll('.admin-only').forEach(el => {
    if (el.dataset && el.dataset.view === 'settings') {
      el.style.display = isSuperAdmin ? '' : 'none';
    } else {
      el.style.display = isAdmin ? '' : 'none';
    }
  });
  document.querySelectorAll('.superadmin-only').forEach(el => {
    el.style.display = isSuperAdmin ? '' : 'none';
  });

  // SWR Instant Hydration (0ms load dari cache lokal!)
  const cachedSwr = readSwrCache();
  if (cachedSwr) {
    AppState.bootData = cachedSwr;
    renderAllViews();
  }

  // Revalidate diam-diam di background
  loadBootData(!cachedSwr);
}

// ==============================================================================
// 4. SWR DATA LOADER & ZERO-DELAY RENDERING (LAZY VIEW RENDER)
// ==============================================================================
function readSwrCache() {
  try {
    const raw = localStorage.getItem(SWR_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (Date.now() - obj.ts > SWR_TTL_MS) return null;
    if (obj.role !== (AppState.user && AppState.user.role)) return null;
    if (obj.demo !== isDemoMode()) return null;
    return obj.data;
  } catch (e) { return null; }
}

function writeSwrCache(data) {
  try {
    localStorage.setItem(SWR_KEY, JSON.stringify({ ts: Date.now(), role: AppState.user && AppState.user.role, demo: isDemoMode(), data }));
  } catch (e) {}
}

function clearSwrCache() {
  try { localStorage.removeItem(SWR_KEY); } catch (e) {}
}

async function loadBootData(withSpinner = false) {
  if (withSpinner) showLoader(true);
  const res = await api('getBootData');
  if (withSpinner) showLoader(false);

  if (res && res.success) {
    AppState.bootData = res;
    if (res.pejabat && res.pejabat.nama) {
      localStorage.setItem('e_asn_pejabat', JSON.stringify(res.pejabat));
    }
    writeSwrCache(res);
    renderAllViews();
  } else if (res && /sesi/i.test(res.message || '')) {
    handleLogout();
  }
}

function getAllValidEmployees() {
  const emps = (AppState.bootData && AppState.bootData.employees) || [];
  // Filter ketat: hanya pegawai yang benar-benar memiliki NIP & Nama Lengkap (Fix #9)
  return emps.filter(e => String(e.NIP || '').trim() !== '' && String(e.Nama_Lengkap || '').trim() !== '');
}

function getFilteredEmployees() {
  const emps = getAllValidEmployees();
  if (AppState.unitFilter === 'SEMUA') return emps;
  return emps.filter(e => String(e.Unit_Kerja || '').trim().toLowerCase() === AppState.unitFilter.trim().toLowerCase());
}

function renderAllViews() {
  if (!AppState.bootData) return;
  const allEmps = getAllValidEmployees();
  populateWorkspaceUnits(allEmps);
  renderPejabatSidebar();

  const emps = getFilteredEmployees();
  const { stats, alerts } = computeStatsFromList(emps);

  renderTopbarBadges(stats);
  renderPriorityTasks(alerts);
  renderWaFeed();
  populateUploadEmpSelect(allEmps);
  renderActiveViewOnly(emps, stats, alerts);
}

function renderActiveViewOnly(empsOpt, statsOpt, alertsOpt) {
  if (!AppState.bootData) return;
  const emps = empsOpt || getFilteredEmployees();
  const computed = (statsOpt && alertsOpt) ? { stats: statsOpt, alerts: alertsOpt } : computeStatsFromList(emps);
  const v = AppState.currentView;

  if (v === 'dashboard') {
    renderHeroCards(computed.stats, computed.alerts);
    renderDashboard2x2(computed.stats);
    renderRecentVerify(emps);
  } else if (v === 'directory') {
    applyDirectoryFilters();
  } else if (v === 'monitoring') {
    renderMonitoringTable(AppState.monTab);
  } else if (v === 'kredensial') {
    renderKredensialTable();
  } else if (v === 'arsip') {
    renderArchivesTable();
  } else if (v === 'settings') {
    loadSettingsStatus();
  }
}

function renderTopbarBadges(stats) {
  document.getElementById('badge-kgb-count').textContent = stats.kgbBulanIniCount;
  document.getElementById('badge-kp-count').textContent = stats.kp3BulanCount;
  document.getElementById('mon-kgb-val').textContent = stats.kgbBulanIniCount;
  document.getElementById('mon-kp-val').textContent = stats.kp3BulanCount;
  document.getElementById('kred-warn-val').textContent = stats.strSipWarningCount;
  document.getElementById('arsip-total-val').textContent = (AppState.bootData.archives || []).length;
}

function renderHeroCards(stats, alerts) {
  const dateShort = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const compliance = stats.total > 0 ? Math.round(((stats.total - stats.strSipWarningCount) / stats.total) * 100) : 100;
  document.getElementById('kred-rate-val').textContent = compliance + '%';

  document.getElementById('hero-card-kgb').innerHTML = `
    <div class="hero-card-top"><span class="hero-date">${dateShort}</span><span class="hero-menu-btn">⋮</span></div>
    <h3 class="hero-title">Kenaikan Gaji Berkala (KGB) Bulan Ini</h3>
    <div>
      <div class="hero-progress-meta"><span>Progress</span><span>65%</span></div>
      <div class="hero-progress-track"><div class="hero-progress-fill" style="width:65%;"></div></div>
    </div>
    <div class="hero-card-bottom">
      <div class="avatar-stack">${renderAvatarStack(alerts.kgb)}</div>
      <span class="hero-badge-pill"><i class="ri-checkbox-blank-circle-fill" style="color:var(--primary-violet); font-size:7px;"></i> ${stats.kgbBulanIniCount} Pegawai</span>
    </div>`;

  document.getElementById('hero-card-kp').innerHTML = `
    <div class="hero-card-top"><span class="hero-date">${dateShort}</span><span class="hero-menu-btn">⋮</span></div>
    <h3 class="hero-title">Usulan Kenaikan Pangkat (KP) 3 Bulan Depan</h3>
    <div>
      <div class="hero-progress-meta"><span>Kelengkapan Berkas</span><span>40%</span></div>
      <div class="hero-progress-track"><div class="hero-progress-fill" style="width:40%;"></div></div>
    </div>
    <div class="hero-card-bottom">
      <div class="avatar-stack">${renderAvatarStack(alerts.kp)}</div>
      <span class="hero-badge-pill"><i class="ri-checkbox-blank-circle-fill" style="color:var(--accent-fuchsia); font-size:7px;"></i> ${stats.kp3BulanCount} Pegawai</span>
    </div>`;

  document.getElementById('hero-card-str').innerHTML = `
    <div class="hero-card-top"><span class="hero-date">${dateShort}</span><span class="hero-menu-btn">⋮</span></div>
    <h3 class="hero-title">Kepatuhan Legalitas STR &amp; SIP Nakes</h3>
    <div>
      <div class="hero-progress-meta"><span>Tingkat Kepatuhan</span><span>${compliance}%</span></div>
      <div class="hero-progress-track"><div class="hero-progress-fill" style="width:${compliance}%;"></div></div>
    </div>
    <div class="hero-card-bottom">
      <div class="avatar-stack">${renderAvatarStack(alerts.str)}</div>
      <span class="hero-badge-pill"><i class="ri-checkbox-blank-circle-fill" style="color:var(--accent-emerald); font-size:7px;"></i> ${stats.strSipWarningCount} Perpanjang</span>
    </div>`;
}

function renderAvatarStack(list) {
  if (!list || !list.length) return '<div class="avatar-pile">0</div>';
  return list.slice(0, 3).map(x => `<div class="avatar-pile">${getInitials(x.Nama_Lengkap)}</div>`).join('');
}

function renderDashboard2x2(stats) {
  const hasData = stats.total > 0;
  const t = Math.max(1, stats.total);
  const pL = hasData ? Math.round((stats.gender.laki / t) * 100) : 0;
  const pP = hasData ? (100 - pL) : 0;
  const pPns = hasData ? Math.round((stats.statusKepegawaian.pns / t) * 100) : 0;
  const pPppk = hasData ? Math.round((stats.statusKepegawaian.pppk / t) * 100) : 0;
  const pP3kPw = hasData ? Math.round(((stats.statusKepegawaian.p3kPw || 0) / t) * 100) : 0;
  const pNon = hasData ? Math.max(0, 100 - pPns - pPppk - pP3kPw) : 0;

  document.getElementById('dashboard-stats-2x2').innerHTML = `
    <!-- Card 1: Gender -->
    <div class="glass-panel">
      <div class="stat-card-head">
        <div class="stat-ic-box" style="background:#ede9fe; color:var(--primary-violet);"><i class="ri-group-line"></i></div>
        <div><h4>Gender</h4><p>Total ${stats.total} SDM Rumah Sakit</p></div>
      </div>
      <div class="bar-row">
        <div class="bar-row-top"><span>● Laki-laki</span><span>${stats.gender.laki} (${pL}%)</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${pL}%; background:var(--primary-violet);"></div></div>
      </div>
      <div class="bar-row">
        <div class="bar-row-top"><span>● Perempuan</span><span>${stats.gender.perempuan} (${pP}%)</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${pP}%; background:var(--accent-fuchsia);"></div></div>
      </div>
      <div class="stat-card-foot"><span>Dominan: Nakes &amp; Bidan</span><span style="color:var(--primary-violet);">Aktif 100%</span></div>
    </div>

    <!-- Card 2: Golongan -->
    <div class="glass-panel">
      <div class="stat-card-head">
        <div class="stat-ic-box" style="background:#fef3c7; color:var(--accent-amber);"><i class="ri-medal-line"></i></div>
        <div><h4>Golongan</h4><p>Pangkat ASN &amp; Non-ASN</p></div>
      </div>
      ${[
        ['Gol. IV', stats.golongan.iv], ['Gol. III', stats.golongan.iii],
        ['Gol. II', stats.golongan.ii], ['Gol. I', stats.golongan.i]
      ].map(([lbl, val]) => `
        <div class="bar-row" style="margin-bottom:7px;">
          <div class="bar-row-top"><span>${lbl}</span><span>${val} org</span></div>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.round((val / t) * 100)}%; background:var(--primary-violet);"></div></div>
        </div>`).join('')}
      <div class="stat-card-foot"><span>Dominan: Gol. III &amp; IV</span><span style="color:var(--accent-emerald);">Terdata</span></div>
    </div>

    <!-- Card 3: Pendidikan -->
    <div class="glass-panel">
      <div class="stat-card-head">
        <div class="stat-ic-box" style="background:#d1fae5; color:var(--accent-emerald);"><i class="ri-graduation-cap-line"></i></div>
        <div><h4>Pendidikan</h4><p>Kualifikasi Akademik Nakes</p></div>
      </div>
      <div class="edu-2x2">
        <div class="edu-tile"><span>Profesi / Spesialis</span><strong>${stats.pendidikan.profesi}</strong><small>${Math.round((stats.pendidikan.profesi / t) * 100)}%</small></div>
        <div class="edu-tile"><span>Magister (S2)</span><strong>${stats.pendidikan.s2}</strong><small>${Math.round((stats.pendidikan.s2 / t) * 100)}%</small></div>
        <div class="edu-tile"><span>Sarjana (D4/S1)</span><strong>${stats.pendidikan.s1}</strong><small>${Math.round((stats.pendidikan.s1 / t) * 100)}%</small></div>
        <div class="edu-tile"><span>Diploma III</span><strong>${stats.pendidikan.d3}</strong><small>${Math.round((stats.pendidikan.d3 / t) * 100)}%</small></div>
      </div>
      <div class="stat-card-foot"><span>Standar LAFKI</span><span style="color:var(--accent-emerald);">Terakreditasi</span></div>
    </div>

    <!-- Card 4: Status Kepegawaian -->
    <div class="glass-panel">
      <div class="stat-card-head">
        <div class="stat-ic-box" style="background:#e0f2fe; color:var(--accent-cyan);"><i class="ri-briefcase-4-line"></i></div>
        <div><h4>Status Kepegawaian</h4><p>PNS, PPPK, P3K PW &amp; Non-ASN</p></div>
      </div>
      <div class="bar-row">
        <div class="bar-row-top"><span>● PNS</span><span>${stats.statusKepegawaian.pns} (${pPns}%)</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${pPns}%; background:var(--primary-violet);"></div></div>
      </div>
      <div class="bar-row">
        <div class="bar-row-top"><span>● PPPK</span><span>${stats.statusKepegawaian.pppk} (${pPppk}%)</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${pPppk}%; background:var(--accent-emerald);"></div></div>
      </div>
      <div class="bar-row">
        <div class="bar-row-top"><span>● P3K PW</span><span>${stats.statusKepegawaian.p3kPw || 0} (${pP3kPw}%)</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${pP3kPw}%; background:var(--accent-cyan);"></div></div>
      </div>
      <div class="bar-row">
        <div class="bar-row-top"><span>● Non-ASN</span><span>${stats.statusKepegawaian.nonAsn} (${pNon}%)</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${pNon}%; background:var(--accent-amber);"></div></div>
      </div>
      <div class="stat-card-foot"><span>Total Terdata</span><span style="color:var(--primary-violet);">${stats.total} SDM</span></div>
    </div>`;
}

function renderRecentVerify(emps) {
  const el = document.getElementById('recent-verify-list');
  const tags = [
    { txt: 'KGB OK', cls: 'warning' },
    { txt: 'CEK KP', cls: 'info' },
    { txt: 'STR HABIS', cls: 'danger' },
    { txt: 'AKTIF', cls: 'active' }
  ];
  document.getElementById('verify-count-pill').textContent = Math.min(4, emps.length) + ' Berkas';
  el.innerHTML = emps.slice(0, 4).map((e, i) => `
    <div class="verify-row">
      <div class="verify-left">
        <div class="wa-feed-thumb">${getInitials(e.Nama_Lengkap)}</div>
        <div style="min-width:0;">
          <h5>${formatFullName(e)}</h5>
          <p>${e.Unit_Kerja || 'RSUD'}</p>
        </div>
      </div>
      <span class="badge-status ${tags[i % tags.length].cls}">${tags[i % tags.length].txt}</span>
    </div>`).join('');
}

function renderPriorityTasks(alerts) {
  const el = document.getElementById('priority-tasks-list');
  const tasks = [
    ...(alerts.kgb || []).slice(0, 1).map(e => ({ id: 'kgb-' + e.NIP, title: 'SK KGB ' + formatFullName(e), pct: 80, hp: e.No_HP_WA, nama: formatFullName(e), kat: 'KGB' })),
    ...(alerts.kp || []).slice(0, 1).map(e => ({ id: 'kp-' + e.NIP, title: 'Berkas KP ' + formatFullName(e), pct: 45, hp: e.No_HP_WA, nama: formatFullName(e), kat: 'Kenaikan Pangkat' })),
    ...(alerts.str || []).slice(0, 1).map(e => ({ id: 'str-' + e.NIP, title: 'Perpanjangan STR ' + formatFullName(e), pct: 25, hp: e.No_HP_WA, nama: formatFullName(e), kat: 'Perpanjangan STR/SIP' }))
  ];
  if (!tasks.length) {
    el.innerHTML = '<p style="font-size:12px; color:var(--text-secondary);">Semua jadwal prioritas tuntas!</p>';
    return;
  }
  el.innerHTML = tasks.map((t, idx) => {
    const done = !!AppState.tasksDone[t.id];
    return `
      <div class="task-card-item">
        <span class="task-order-num">0${idx + 1}</span>
        <div class="task-detail">
          <div class="task-title ${done ? 'done' : ''}">${t.title}</div>
          <div class="task-progress-micro"><div class="task-progress-micro-fill" style="width:${done ? 100 : t.pct}%;"></div></div>
        </div>
        <button class="btn-task-wa" title="Kirim Pengingat WA" onclick="kirimWaCepat('${t.hp || '081234567890'}', '${escapeQuotes(t.nama)}', '${t.kat}')">
          <i class="ri-whatsapp-fill"></i>
        </button>
        <button class="task-check-btn ${done ? 'checked' : ''}" onclick="toggleTaskDone('${t.id}')">
          ${done ? '<i class="ri-check-line"></i>' : ''}
        </button>
      </div>`;
  }).join('');
}

function toggleTaskDone(id) {
  AppState.tasksDone[id] = !AppState.tasksDone[id];
  localStorage.setItem('e_asn_tasks_done', JSON.stringify(AppState.tasksDone));
  renderAllViews();
}

function renderWaFeed() {
  const el = document.getElementById('wa-feed-list-container');
  el.innerHTML = AppState.waLogs.slice(0, 4).map(l => `
    <div class="wa-feed-row">
      <div class="wa-feed-thumb">${getInitials(l.nama)}</div>
      <div class="wa-feed-text">
        <h6>${l.nama}</h6>
        <p><span style="color:var(--wa-green); font-weight:700;">${l.status} ✓</span></p>
      </div>
      <span class="wa-time">${l.time}</span>
    </div>`).join('');
}

// ==============================================================================
// 5. DIREKTORI, MONITORING, KREDENSIAL & ARSIP (INSTANT 0MS FILTER)
// ==============================================================================
function applyDirectoryFilters() {
  const q = (document.getElementById('topbar-search-input')?.value || '').toLowerCase().trim();
  const statusAsn = document.getElementById('filter-status-asn')?.value || 'SEMUA';
  const kred = document.getElementById('filter-kredensial')?.value || 'SEMUA';

  let list = getFilteredEmployees();
  if (q) {
    list = list.filter(e =>
      String(e.Nama_Lengkap).toLowerCase().includes(q) ||
      String(e.NIP).includes(q) ||
      String(e.Unit_Kerja || '').toLowerCase().includes(q) ||
      String(e.Nama_Jabatan || '').toLowerCase().includes(q)
    );
  }
  if (statusAsn !== 'SEMUA') list = list.filter(e => e.Status_Kepegawaian === statusAsn);
  if (kred === 'WARNING') {
    const now = new Date();
    list = list.filter(e => e.Masa_Berlaku_STR && String(e.Status_STR_Seumur_Hidup) !== 'Ya' && Math.ceil((new Date(e.Masa_Berlaku_STR) - now) / 86400000) <= 90);
  }

  const tbody = document.getElementById('employee-table-body');
  if (!tbody) return;
  document.getElementById('dir-subtitle').textContent = `${list.length} SDM RSUD Nene Mallomo ditampilkan`;

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:28px; color:var(--text-secondary);">Tidak ada pegawai yang cocok dengan filter.</td></tr>';
    return;
  }

  const isAdmin = AppState.user && (AppState.user.role === 'SuperAdmin' || AppState.user.role === 'Operator');
  const isSuperAdmin = AppState.user && AppState.user.role === 'SuperAdmin';
  tbody.innerHTML = list.map(e => {
    const strWarn = isExpiringSoon(e.Masa_Berlaku_STR, e.Status_STR_Seumur_Hidup);
    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:10px; cursor:pointer;" title="Klik untuk melihat profil & checklist dokumen" onclick="openEmployeeProfileModal('${escapeQuotes(e.NIP)}')">
            <div class="wa-feed-thumb">${getInitials(e.Nama_Lengkap)}</div>
            <div>
              <strong style="color:var(--primary-violet);">${formatFullName(e)}</strong>
              <div style="font-size:11px; color:var(--text-secondary); letter-spacing:0.03em;">${e.NIP}</div>
            </div>
          </div>
        </td>
        <td>${e.Unit_Kerja || '-'}<div style="font-size:11px; color:var(--text-secondary);">${e.Nama_Jabatan || ''}</div></td>
        <td><strong>${e.Status_Kepegawaian || 'PNS'}</strong> • ${e.Golongan_Pangkat_Terakhir || '-'}</td>
        <td><span class="badge-status ${strWarn ? 'warning' : 'active'}">${strWarn ? 'H-90 Kedaluwarsa' : 'Aktif'}</span></td>
        <td style="font-size:11.5px;">KGB: <strong>${e.Jadwal_KGB_Berikutnya || '-'}</strong><br>KP: ${e.Jadwal_KP_Berikutnya || '-'}</td>
        <td>
          <div style="display:flex; gap:6px;">
            ${isAdmin ? `<button class="btn-secondary" style="padding:5px 9px;" title="Ubah 7 Tab" onclick="openEditEmployee('${e.NIP}')"><i class="ri-edit-line"></i></button>` : ''}
            <button class="btn-task-wa" title="Kirim WhatsApp" onclick="kirimWaCepat('${e.No_HP_WA || '081234567890'}', '${escapeQuotes(formatFullName(e))}', 'Kepegawaian')"><i class="ri-whatsapp-fill"></i></button>
            ${isSuperAdmin ? `<button class="btn-secondary" style="padding:5px 9px; color:#ef4444; border-color:#fecaca;" title="Hapus Pegawai" onclick="handleDeleteEmployee('${e.NIP}', '${escapeQuotes(formatFullName(e))}')"><i class="ri-delete-bin-line"></i></button>` : ''}
          </div>
        </td>
      </tr>`;
  }).join('');
}

function renderMonitoringTable(tab) {
  AppState.monTab = tab;
  ['kgb', 'kp', 'bup'].forEach(t => {
    const el = document.getElementById('mon-tab-' + t);
    if (el) el.classList.toggle('active', t === tab);
  });
  const emps = getFilteredEmployees();
  const { alerts } = computeStatsFromList(emps);
  const rows = tab === 'kgb' ? alerts.kgb : tab === 'kp' ? alerts.kp : emps;
  const tbody = document.getElementById('monitoring-table-body');
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:24px; color:var(--text-secondary);">Tidak ada jadwal jatuh tempo pada kategori ini.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(e => {
    const targetDate = tab === 'kgb' ? e.Jadwal_KGB_Berikutnya : tab === 'kp' ? e.Jadwal_KP_Berikutnya : `${e.TMT_Pensiun || '-'} (BUP ${e.Batas_Usia_Pensiun || 58} Thn)`;
    const katLabel = tab === 'kgb' ? 'KGB' : tab === 'kp' ? 'Kenaikan Pangkat' : 'Persiapan Pensiun';
    return `
      <tr>
        <td><strong>${formatFullName(e)}</strong><div style="font-size:11px; color:var(--text-secondary);">${e.NIP}</div></td>
        <td>${e.Golongan_Pangkat_Terakhir || '-'} • ${e.Nama_Jabatan || '-'}</td>
        <td>${e.Unit_Kerja || '-'}</td>
        <td><span class="badge-status warning"><i class="ri-time-line"></i> ${targetDate || '-'}</span></td>
        <td>
          <button class="btn-wa-action" onclick="kirimWaCepat('${e.No_HP_WA || '081234567890'}', '${escapeQuotes(formatFullName(e))}', '${katLabel}')">
            <i class="ri-whatsapp-fill"></i> Kirim Pengingat WA
          </button>
        </td>
      </tr>`;
  }).join('');
}

function filterKredensial(mode, btn) {
  AppState.kredFilter = mode;
  document.querySelectorAll('#view-kredensial .pill-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderKredensialTable();
}

function renderKredensialTable() {
  const tbody = document.getElementById('kredensial-table-body');
  if (!tbody) return;
  let list = getFilteredEmployees();
  if (AppState.kredFilter === 'WARN') list = list.filter(e => isExpiringSoon(e.Masa_Berlaku_STR, e.Status_STR_Seumur_Hidup));
  if (AppState.kredFilter === 'LIFETIME') list = list.filter(e => String(e.Status_STR_Seumur_Hidup).toLowerCase() === 'ya');

  tbody.innerHTML = list.map(e => {
    const warn = isExpiringSoon(e.Masa_Berlaku_STR, e.Status_STR_Seumur_Hidup);
    return `
      <tr>
        <td><strong>${formatFullName(e)}</strong><div style="font-size:11px; color:var(--text-secondary);">${e.NIP} • ${e.Profesi || e.Nama_Jabatan}</div></td>
        <td>${e.Nomor_STR || '-'}<div style="font-size:11px; color:var(--text-secondary);">${String(e.Status_STR_Seumur_Hidup).toLowerCase() === 'ya' ? 'Seumur Hidup' : 's.d. ' + (e.Masa_Berlaku_STR || '-')}</div></td>
        <td>${e.Nomor_SIP || '-'}<div style="font-size:11px; color:var(--text-secondary);">s.d. ${e.Masa_Berlaku_SIP || '-'}</div></td>
        <td><span class="badge-status ${warn ? 'danger' : 'active'}">${warn ? 'Segera Perpanjang' : 'Valid'}</span></td>
        <td>
          <button class="btn-task-wa" onclick="kirimWaCepat('${e.No_HP_WA || '081234567890'}', '${escapeQuotes(formatFullName(e))}', 'Perpanjangan STR/SIP')">
            <i class="ri-whatsapp-fill"></i>
          </button>
        </td>
      </tr>`;
  }).join('');
}

function filterArchives(cat, btn) {
  AppState.archiveFilter = cat;
  document.querySelectorAll('#view-arsip .pill-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderArchivesTable();
}

function renderArchivesTable() {
  const container = document.getElementById('archive-grouped-container');
  if (!container) return;

  const allEmps = getAllValidEmployees();
  const empByNip = {};
  allEmps.forEach(e => { empByNip[String(e.NIP).trim()] = e; });

  let list = ((AppState.bootData && AppState.bootData.archives) || []).filter(a =>
    String(a.ID_Dokumen || '').trim() !== '' || String(a.Nama_Berkas || '').trim() !== ''
  );

  // Filter berdasarkan Work Space Unit Kerja jika aktif
  if (AppState.unitFilter !== 'SEMUA') {
    const unitLower = AppState.unitFilter.trim().toLowerCase();
    list = list.filter(a => {
      const owner = empByNip[String(a.NIP || '').trim()];
      return owner && String(owner.Unit_Kerja || '').trim().toLowerCase() === unitLower;
    });
  }

  // Filter berdasarkan kategori pill tab
  if (AppState.archiveFilter !== 'ALL') {
    list = list.filter(a => String(a.Kategori_Dokumen || '').toUpperCase().includes(AppState.archiveFilter.toUpperCase()));
  }

  if (!list.length) {
    container.innerHTML = '<div style="text-align:center; padding:32px; color:var(--text-secondary);">Belum ada berkas PDF pada kategori ini.</div>';
    return;
  }

  // Kelompokkan berkas PDF berdasarkan pemilik (NIP) agar tidak tercampur (Poin #8)
  const groups = {};
  const groupOrder = [];
  list.forEach(a => {
    const key = String(a.NIP || 'LAINNYA').trim();
    if (!groups[key]) {
      groups[key] = [];
      groupOrder.push(key);
    }
    groups[key].push(a);
  });

  const isAdmin = AppState.user && (AppState.user.role === 'SuperAdmin' || AppState.user.role === 'Operator');

  container.innerHTML = groupOrder.map(nip => {
    const files = groups[nip];
    const owner = empByNip[nip];
    const ownerName = owner ? formatFullName(owner) : (files[0].Nama_Pemilik || nip);
    const ownerUnit = owner ? (owner.Unit_Kerja || 'RSUD Nene Mallomo') : 'Arsip Pegawai';
    const ownerGol = owner ? (owner.Golongan_Pangkat_Terakhir || '-') : '';

    const filesHtml = files.map(a => {
      const fId = a.Drive_File_ID || a.ID_Dokumen;
      const docId = a.ID_Dokumen || a.Drive_File_ID;
      return `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 12px; border-radius:12px; border:1px solid var(--card-border-subtle); background:var(--bg-card); flex-wrap:wrap;">
          <div style="display:flex; align-items:center; gap:10px; min-width:0; flex:1;">
            <i class="ri-file-pdf-2-line" style="color:#ef4444; font-size:20px; flex-shrink:0;"></i>
            <div style="min-width:0;">
              <div style="font-size:12.5px; font-weight:700; word-break:break-word;">${a.Nama_Berkas}</div>
              <div style="font-size:11px; color:var(--text-secondary); margin-top:2px;">
                <span class="badge-status info" style="padding:2px 8px; font-size:10px;">${a.Kategori_Dokumen}</span>
                <span style="margin-left:6px;">Diunggah: ${String(a.Tanggal_Unggah || '-').slice(0, 10)}</span>
              </div>
            </div>
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn-secondary" style="padding:5px 10px; font-size:11.5px;" onclick="viewArchiveDocument('${escapeQuotes(fId)}', '${escapeQuotes(a.Nama_Berkas)}')"><i class="ri-eye-line"></i> Lihat</button>
            <button class="btn-primary" style="padding:5px 10px; font-size:11.5px;" onclick="downloadArchiveDocument('${escapeQuotes(fId)}', '${escapeQuotes(a.Nama_Berkas)}')"><i class="ri-download-line"></i> Unduh</button>
            ${isAdmin ? `<button class="btn-secondary" style="padding:5px 10px; font-size:11.5px; color:#ef4444; border-color:#fecaca;" title="Hapus Berkas PDF" onclick="handleDeleteArchive('${escapeQuotes(docId)}', '${escapeQuotes(a.Nama_Berkas)}')"><i class="ri-delete-bin-line"></i> Hapus</button>` : ''}
          </div>
        </div>`;
    }).join('');

    return `
      <div style="border:1px solid var(--card-border-subtle); border-radius:18px; padding:16px; background:var(--bg-card-subtle);">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px; padding-bottom:10px; border-bottom:1px dashed var(--card-border-subtle); flex-wrap:wrap;">
          <div style="display:flex; align-items:center; gap:10px; cursor:pointer;" onclick="${owner ? `openEmployeeProfileModal('${escapeQuotes(nip)}')` : ''}">
            <div class="wa-feed-thumb" style="width:38px; height:38px; font-size:13px;">${getInitials(ownerName)}</div>
            <div>
              <div style="font-size:14px; font-weight:800; color:var(--text-primary);">${ownerName}</div>
              <div style="font-size:11.5px; color:var(--text-secondary);">NIP: ${nip} • ${ownerUnit}${ownerGol ? ' • ' + ownerGol : ''}</div>
            </div>
          </div>
          <span class="badge-status active"><i class="ri-folder-2-line"></i> ${files.length} Berkas PDF</span>
        </div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${filesHtml}
        </div>
      </div>`;
  }).join('');
}

async function handleDeleteArchive(docId, fileName) {
  if (!AppState.user || (AppState.user.role !== 'SuperAdmin' && AppState.user.role !== 'Operator')) {
    showToast('Hanya Admin atau Super Admin yang dapat menghapus berkas PDF.', 'error');
    return;
  }
  if (!confirm(`Yakin ingin menghapus berkas PDF:\n${fileName}?`)) return;

  // Optimistic UI: langsung hilangkan dari tampilan (0ms lag)
  const prevArchives = (AppState.bootData && AppState.bootData.archives) ? [...AppState.bootData.archives] : [];
  if (AppState.bootData && Array.isArray(AppState.bootData.archives)) {
    AppState.bootData.archives = AppState.bootData.archives.filter(a =>
      String(a.ID_Dokumen) !== String(docId) && String(a.Drive_File_ID) !== String(docId)
    );
    document.getElementById('arsip-total-val').textContent = AppState.bootData.archives.length;
    renderArchivesTable();
  }

  const res = await api('deleteArchive', { docId });
  if (res.success) {
    clearSwrCache();
    writeSwrCache(AppState.bootData);
    showToast(res.message || 'Berkas PDF berhasil dihapus.', 'success');
  } else {
    // Rollback jika server gagal
    if (AppState.bootData) AppState.bootData.archives = prevArchives;
    renderArchivesTable();
    showToast(res.message || 'Gagal menghapus berkas PDF.', 'error');
  }
}

// ==============================================================================
// 5B. UNGGAH TAB 7, HAPUS PEGAWAI (SUPER ADMIN) & LIHAT/UNDUH ARSIP PDF
// ==============================================================================
function uploadTab7Doc(kategori, inputId) {
  const nip = document.getElementById('form-nip').value.trim();
  if (!nip) {
    showToast('Isi NIP pada Tab 1 terlebih dahulu sebelum mengunggah berkas!', 'error');
    switchFormTab(1);
    return;
  }
  const input = document.getElementById(inputId);
  const file = input && input.files && input.files[0];
  if (!file) {
    showToast(`Pilih file PDF untuk ${kategori} terlebih dahulu.`, 'error');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast('Ukuran PDF maksimal 5 MB!', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = async () => {
    const base64 = String(reader.result).split(',')[1] || '';
    showLoader(true);
    const res = await api('uploadArchive', {
      nip,
      kategori,
      fileName: `${kategori.replace(/[^a-zA-Z0-9]+/g, '_')}_${nip}.pdf`,
      base64
    });
    showLoader(false);
    if (res.success) {
      input.value = '';
      clearSwrCache();
      showToast(`Berkas ${kategori} berhasil diunggah!`, 'success');
      await loadBootData(false);
    } else {
      showToast(res.message || `Gagal mengunggah ${kategori}.`, 'error');
    }
  };
  reader.readAsDataURL(file);
}

async function handleDeleteEmployee(nip, nama) {
  if (!AppState.user || AppState.user.role !== 'SuperAdmin') {
    showToast('Hanya Super Admin yang dapat menghapus data pegawai.', 'error');
    return;
  }
  if (!confirm(`Yakin ingin menghapus data pegawai:\n${nama} (NIP: ${nip})?`)) return;

  // Optimistic UI: langsung hapus dari memori & render (0ms)
  const prevEmps = (AppState.bootData && AppState.bootData.employees) ? [...AppState.bootData.employees] : [];
  if (AppState.bootData && Array.isArray(AppState.bootData.employees)) {
    AppState.bootData.employees = AppState.bootData.employees.filter(e => String(e.NIP).trim() !== String(nip).trim());
    renderAllViews();
  }

  const res = await api('deleteEmployee', { nip });
  if (res.success) {
    clearSwrCache();
    writeSwrCache(AppState.bootData);
    showToast(res.message || 'Pegawai berhasil dihapus.', 'success');
  } else {
    if (AppState.bootData) AppState.bootData.employees = prevEmps;
    renderAllViews();
    showToast(res.message || 'Gagal menghapus pegawai.', 'error');
  }
}

async function handleDeleteAllEmployees() {
  if (!AppState.user || AppState.user.role !== 'SuperAdmin') {
    showToast('Hanya Super Admin yang dapat menghapus seluruh pegawai.', 'error');
    return;
  }
  const konfirm = prompt('PERINGATAN: Seluruh data master pegawai akan dihapus!\nKetik HAPUS SEMUA untuk melanjutkan:');
  if (konfirm !== 'HAPUS SEMUA') {
    showToast('Penghapusan seluruh pegawai dibatalkan.', 'info');
    return;
  }

  // Optimistic UI: kosongkan tampilan langsung (0ms)
  const prevEmps = (AppState.bootData && AppState.bootData.employees) ? [...AppState.bootData.employees] : [];
  if (AppState.bootData) {
    AppState.bootData.employees = [];
    renderAllViews();
  }

  showLoader(true);
  const res = await api('deleteAllEmployees', {});
  showLoader(false);
  if (res.success) {
    clearSwrCache();
    writeSwrCache(AppState.bootData);
    showToast(res.message || 'Seluruh data pegawai berhasil dihapus.', 'success');
  } else {
    if (AppState.bootData) AppState.bootData.employees = prevEmps;
    renderAllViews();
    showToast(res.message || 'Gagal menghapus seluruh pegawai.', 'error');
  }
}

let _activePdfUrl = '';

function base64ToPdfBlobUrl(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  return URL.createObjectURL(blob);
}

async function viewArchiveDocument(fileId, fileName) {
  showLoader(true);
  const res = await api('getArchiveFile', { fileId });
  showLoader(false);
  if (!res.success || !res.base64) {
    showToast(res.message || 'Gagal membuka pratinjau dokumen PDF.', 'error');
    return;
  }
  if (_activePdfUrl) URL.revokeObjectURL(_activePdfUrl);
  _activePdfUrl = base64ToPdfBlobUrl(res.base64);
  document.getElementById('pdf-preview-title').textContent = res.fileName || fileName || 'Pratinjau Dokumen PDF';
  document.getElementById('pdf-preview-frame').src = _activePdfUrl;
  const dlBtn = document.getElementById('pdf-preview-download-btn');
  dlBtn.onclick = () => triggerPdfDownload(_activePdfUrl, res.fileName || fileName || 'Dokumen.pdf');
  document.getElementById('pdf-preview-modal').classList.add('active');
}

function closePdfPreviewModal() {
  document.getElementById('pdf-preview-modal').classList.remove('active');
  document.getElementById('pdf-preview-frame').src = 'about:blank';
}

function openEmployeeProfileModal(nip) {
  const emps = (AppState.bootData && AppState.bootData.employees) || [];
  const e = emps.find(x => String(x.NIP) === String(nip));
  if (!e) {
    showToast('Data profil pegawai tidak ditemukan.', 'error');
    return;
  }

  const allArchives = (AppState.bootData && AppState.bootData.archives) || [];
  const empArchives = allArchives.filter(a => String(a.NIP) === String(nip));

  const checklistSpecs = [
    { label: '1. SK CPNS', match: a => /sk\s*cpns|cpns/i.test(`${a.Kategori_Dokumen || ''} ${a.Nama_Berkas || ''}`) },
    { label: '2. SK PNS', match: a => /\bsk[\s_]*pns\b/i.test(`${a.Kategori_Dokumen || ''} ${a.Nama_Berkas || ''}`) },
    { label: '3. SK Pangkat/Gol Terakhir', match: a => /pangkat|gol|^sk$/i.test(`${a.Kategori_Dokumen || ''}`) || /pangkat/i.test(`${a.Nama_Berkas || ''}`) },
    { label: '4. SK Jabatan Terakhir', match: a => /jabatan/i.test(`${a.Kategori_Dokumen || ''} ${a.Nama_Berkas || ''}`) },
    { label: '5. SK Berkala Terakhir (KGB)', match: a => /berkala|kgb/i.test(`${a.Kategori_Dokumen || ''} ${a.Nama_Berkas || ''}`) },
    { label: '6. Ijazah Terakhir', match: a => /ijazah/i.test(`${a.Kategori_Dokumen || ''} ${a.Nama_Berkas || ''}`) },
    { label: '7. Sertifikat Pelatihan', match: a => /sertifikat|pelatihan|diklat/i.test(`${a.Kategori_Dokumen || ''} ${a.Nama_Berkas || ''}`) },
    { label: '8. Kredensial (STR / SIP / RKK)', match: a => /kredensial|str|sip|rkk|spk/i.test(`${a.Kategori_Dokumen || ''} ${a.Nama_Berkas || ''}`) }
  ];

  let uploadedCount = 0;
  const checklistHtml = checklistSpecs.map(spec => {
    const found = empArchives.find(spec.match);
    if (found) uploadedCount++;
    const fId = found ? (found.Drive_File_ID || found.ID_Dokumen) : '';
    return `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 12px; border-radius:12px; border:1px solid var(--card-border-subtle); background:${found ? 'rgba(220,252,231,0.35)' : 'var(--bg-card-subtle)'}; flex-wrap:wrap;">
        <div style="display:flex; align-items:center; gap:10px; min-width:0;">
          <i class="${found ? 'ri-checkbox-circle-fill' : 'ri-close-circle-line'}" style="font-size:19px; color:${found ? '#10b981' : '#ef4444'}; flex-shrink:0;"></i>
          <div style="min-width:0;">
            <div style="font-size:12.5px; font-weight:700;">${spec.label}</div>
            <div style="font-size:11px; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:340px;">
              ${found ? found.Nama_Berkas : 'Belum diunggah'}
            </div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          ${found ? `
            <button type="button" class="btn-secondary" style="padding:5px 10px; font-size:11.5px;" onclick="viewArchiveDocument('${escapeQuotes(fId)}', '${escapeQuotes(found.Nama_Berkas)}')"><i class="ri-eye-line"></i> Lihat</button>
            <button type="button" class="btn-primary" style="padding:5px 10px; font-size:11.5px;" onclick="downloadArchiveDocument('${escapeQuotes(fId)}', '${escapeQuotes(found.Nama_Berkas)}')"><i class="ri-download-line"></i> Unduh</button>
          ` : `<span class="badge-status danger">Belum Upload</span>`}
        </div>
      </div>`;
  }).join('');

  const body = document.getElementById('employee-profile-modal-body');
  body.innerHTML = `
    <div style="display:flex; align-items:center; gap:14px; margin-bottom:18px; padding-right:32px; flex-wrap:wrap;">
      <div class="alert-avatar" style="width:58px; height:58px; font-size:19px;">${getInitials(e.Nama_Lengkap)}</div>
      <div style="flex:1; min-width:200px;">
        <h3 style="font-size:19px; font-weight:800; line-height:1.2;">${formatFullName(e)}</h3>
        <div style="font-size:12px; color:var(--text-secondary); margin-top:3px; letter-spacing:0.03em;">NIP: <strong>${e.NIP}</strong> • NIK: ${e.NIK || '-'}</div>
        <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:8px;">
          <span class="badge-status info">${e.Status_Kepegawaian || 'PNS'}</span>
          <span class="badge-status active">${e.Golongan_Pangkat_Terakhir || '-'}</span>
          <span class="badge-status warning">${e.Unit_Kerja || 'RSUD Nene Mallomo'}</span>
        </div>
      </div>
    </div>

    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(175px, 1fr)); gap:10px; margin-bottom:18px;">
      <div style="padding:10px 12px; border-radius:12px; background:var(--bg-card-subtle); border:1px solid var(--card-border-subtle);">
        <div style="font-size:10.5px; color:var(--text-secondary); font-weight:700;">JABATAN / PROFESI</div>
        <div style="font-size:12.5px; font-weight:700; margin-top:2px;">${e.Nama_Jabatan || '-'}</div>
      </div>
      <div style="padding:10px 12px; border-radius:12px; background:var(--bg-card-subtle); border:1px solid var(--card-border-subtle);">
        <div style="font-size:10.5px; color:var(--text-secondary); font-weight:700;">KONTAK WA / EMAIL</div>
        <div style="font-size:12px; font-weight:700; margin-top:2px;">${e.No_HP_WA || '-'}<br><span style="font-weight:500; color:var(--text-secondary);">${e.Email || '-'}</span></div>
      </div>
      <div style="padding:10px 12px; border-radius:12px; background:var(--bg-card-subtle); border:1px solid var(--card-border-subtle);">
        <div style="font-size:10.5px; color:var(--text-secondary); font-weight:700;">KGB &amp; KENAIKAN PANGKAT</div>
        <div style="font-size:12px; font-weight:700; margin-top:2px;">KGB: ${e.Jadwal_KGB_Berikutnya || '-'}<br>KP: ${e.Jadwal_KP_Berikutnya || '-'}</div>
      </div>
      <div style="padding:10px 12px; border-radius:12px; background:var(--bg-card-subtle); border:1px solid var(--card-border-subtle);">
        <div style="font-size:10.5px; color:var(--text-secondary); font-weight:700;">STR / SIP &amp; PENSIUN</div>
        <div style="font-size:12px; font-weight:700; margin-top:2px;">STR: ${e.Masa_Berlaku_STR || '-'}<br>BUP: ${e.TMT_Pensiun || '-'}</div>
      </div>
    </div>

    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
      <h4 style="font-size:13.5px; font-weight:800;"><i class="ri-file-list-3-line" style="color:var(--primary-violet);"></i> Checklist Kelengkapan Dokumen</h4>
      <span class="badge-status ${uploadedCount === checklistSpecs.length ? 'active' : 'warning'}">${uploadedCount} / ${checklistSpecs.length} Diunggah</span>
    </div>
    <div style="display:flex; flex-direction:column; gap:8px;">
      ${checklistHtml}
    </div>
  `;

  const editBtn = document.getElementById('profile-modal-edit-btn');
  if (editBtn) {
    const isAdmin = AppState.user && (AppState.user.role === 'SuperAdmin' || AppState.user.role === 'Operator');
    editBtn.style.display = isAdmin ? '' : 'none';
    editBtn.onclick = () => { closeEmployeeProfileModal(); openEditEmployee(e.NIP); };
  }

  document.getElementById('employee-profile-modal').classList.add('active');
}

function closeEmployeeProfileModal() {
  document.getElementById('employee-profile-modal').classList.remove('active');
}

async function downloadArchiveDocument(fileId, fileName) {
  showLoader(true);
  const res = await api('getArchiveFile', { fileId });
  showLoader(false);
  if (!res.success || !res.base64) {
    showToast(res.message || 'Gagal mengunduh dokumen PDF.', 'error');
    return;
  }
  const url = base64ToPdfBlobUrl(res.base64);
  triggerPdfDownload(url, res.fileName || fileName || 'Dokumen.pdf');
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  showToast(`Mengunduh ${res.fileName || fileName}...`, 'success');
}

function triggerPdfDownload(blobUrl, fileName) {
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = fileName.endsWith('.pdf') ? fileName : fileName + '.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function buildSamplePdfBase64(title) {
  const safe = String(title || 'Dokumen LAFKI').replace(/[()\\]/g, '');
  const pdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length ${65 + safe.length} >> stream
BT /F1 16 Tf 50 760 Td (E-ASN Nemal - Arsip LAFKI: ${safe}) Tj ET
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000241 00000 n 
0000000380 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
450
%%EOF`;
  return btoa(pdf);
}

// ==============================================================================
// 6. MODAL LONCENG NOTIFIKASI & KIRIM WA 1-KLIK
// ==============================================================================
function openAlertModal(type = 'kgb') {
  AppState.alertTab = type;
  document.getElementById('notification-center-modal').classList.add('active');
  switchAlertTab(type);
}

function closeAlertModal() {
  document.getElementById('notification-center-modal').classList.remove('active');
}

function switchAlertTab(tab) {
  AppState.alertTab = tab;
  document.querySelectorAll('#notification-center-modal .segmented-tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });

  const { stats, alerts } = computeStatsFromList(getFilteredEmployees());
  document.getElementById('modal-tab-kgb').textContent = `KGB Bulan Ini (${stats.kgbBulanIniCount})`;
  document.getElementById('modal-tab-kp').textContent = `KP 3 Bulan Depan (${stats.kp3BulanCount})`;
  document.getElementById('modal-tab-str').textContent = `STR/SIP Kedaluwarsa (${stats.strSipWarningCount})`;

  const items = tab === 'kgb' ? alerts.kgb : tab === 'kp' ? alerts.kp : alerts.str;
  document.getElementById('modal-alert-summary').textContent = `${items.length} Pegawai Memerlukan Tindakan`;

  const container = document.getElementById('modal-alert-list-container');
  if (!items.length) {
    container.innerHTML = '<p style="text-align:center; padding:28px; color:var(--text-secondary);">Tidak ada pegawai yang jatuh tempo pada kategori ini.</p>';
    return;
  }

  const katLabel = tab === 'kgb' ? 'KGB' : tab === 'kp' ? 'Kenaikan Pangkat' : 'Perpanjangan STR/SIP';
  container.innerHTML = items.map(e => {
    const due = tab === 'kgb' ? e.Jadwal_KGB_Berikutnya : tab === 'kp' ? e.Jadwal_KP_Berikutnya : e.Masa_Berlaku_STR;
    return `
      <div class="alert-row-card">
        <div class="alert-identity-block">
          <div class="alert-avatar">${getInitials(e.Nama_Lengkap)}</div>
          <div>
            <h4 style="font-size:14px; font-weight:800;">${formatFullName(e)} <span style="font-size:11px; font-weight:600; color:var(--text-tertiary);">NIP: ${e.NIP}</span></h4>
            <p style="font-size:12px; color:var(--text-secondary);">${e.Golongan_Pangkat_Terakhir || '-'} • ${e.Unit_Kerja || 'RSUD'}</p>
            <span class="alert-tag-due"><i class="ri-time-line"></i> Jatuh Tempo: ${due || 'Bulan Ini'}</span>
          </div>
        </div>
        <button class="btn-wa-action" onclick="kirimWaCepat('${e.No_HP_WA || '081234567890'}', '${escapeQuotes(formatFullName(e))}', '${katLabel}')">
          <i class="ri-whatsapp-fill"></i> Kirim Pengingat WA
        </button>
      </div>`;
  }).join('');
}

async function kirimWaCepat(noHp, nama, kategori) {
  const pesan = `Yth. Bapak/Ibu ${nama},\n\nSubbagian Kepegawaian RSUD Nene Mallomo menginformasikan bahwa jadwal *${kategori}* Anda memerlukan kelengkapan berkas.\nMohon segera menyiapkan SK terakhir, SKP, dan dokumen pendukung melalui portal E-ASN Nemal.\n\nTerima kasih.\n- Kasubag Kepegawaian RSUD Nene Mallomo -`;
  const cleanHp = String(noHp || '').replace(/[^0-9]/g, '');
  const formattedHp = cleanHp.startsWith('0') ? '62' + cleanHp.slice(1) : cleanHp;

  // Catat & kirim ke server jika tidak mode demo
  if (!isDemoMode()) {
    const res = await api('sendWANotification', { noHp: formattedHp, nama, pesan });
    if (res.success && res.hasGateway) {
      showToast(`Pesan WA ke ${nama} dikirim via Gateway!`, 'success');
    } else {
      window.open(`https://wa.me/${formattedHp}?text=${encodeURIComponent(pesan)}`, '_blank');
      showToast(`Membuka WhatsApp untuk ${nama}...`, 'success');
    }
  } else {
    window.open(`https://wa.me/${formattedHp}?text=${encodeURIComponent(pesan)}`, '_blank');
    showToast(`Membuka WhatsApp untuk ${nama}...`, 'success');
  }

  const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  AppState.waLogs.unshift({ nama: `${kategori} ${nama}`, status: 'Terkirim', time });
  localStorage.setItem('e_asn_wa_logs', JSON.stringify(AppState.waLogs.slice(0, 10)));
  renderWaFeed();
}

// ==============================================================================
// 7. FORMULIR 7-TAB, UNGGAH KREDENSIAL, PENGATURAN & MIGRASI
// ==============================================================================
function openAddEmployeeModal() {
  document.getElementById('pegawai-form').reset();
  document.getElementById('form-modal-title').textContent = 'Tambah Pegawai Baru';
  switchFormTab(1);
  document.getElementById('employee-form-modal').classList.add('active');
}

function openEditEmployee(nip) {
  const e = (AppState.bootData?.employees || []).find(x => String(x.NIP) === String(nip));
  if (!e) return;
  document.getElementById('form-nip').value = e.NIP || '';
  document.getElementById('form-nik').value = e.NIK || '';
  document.getElementById('form-nama').value = e.Nama_Lengkap || '';
  document.getElementById('form-gelar-depan').value = e.Gelar_Depan || '';
  document.getElementById('form-gelar-belakang').value = e.Gelar_Belakang || '';
  document.getElementById('form-gender').value = e.Jenis_Kelamin || 'L';
  document.getElementById('form-tgl-lahir').value = e.Tanggal_Lahir || '';
  document.getElementById('form-hp').value = e.No_HP_WA || '';
  document.getElementById('form-email').value = e.Email || '';
  document.getElementById('form-status-asn').value = e.Status_Kepegawaian || 'PNS';
  document.getElementById('form-jabatan').value = e.Nama_Jabatan || '';
  document.getElementById('form-unit').value = e.Unit_Kerja || '';
  document.getElementById('form-golongan').value = e.Golongan_Pangkat_Terakhir || 'III/a';
  document.getElementById('form-tmt-kgb').value = e.TMT_KGB_Terakhir || '';
  document.getElementById('form-jadwal-kp').value = e.Jadwal_KP_Berikutnya || '';
  document.getElementById('form-bup').value = e.Batas_Usia_Pensiun || '58';
  document.getElementById('form-profesi').value = e.Profesi || '';
  document.getElementById('form-str').value = e.Nomor_STR || '';
  document.getElementById('form-str-exp').value = e.Masa_Berlaku_STR || '';
  document.getElementById('form-sip').value = e.Nomor_SIP || '';
  document.getElementById('form-sip-exp').value = e.Masa_Berlaku_SIP || '';

  document.getElementById('form-modal-title').textContent = 'Ubah Profil Pegawai';
  switchFormTab(1);
  document.getElementById('employee-form-modal').classList.add('active');
}

function closeEmployeeFormModal() {
  document.getElementById('employee-form-modal').classList.remove('active');
}

function switchFormTab(idx) {
  document.querySelectorAll('.form-tab-btn').forEach(b => b.classList.toggle('active', Number(b.dataset.tab) === idx));
  document.querySelectorAll('.form-tab-content').forEach(p => { p.style.display = Number(p.dataset.pane) === idx ? 'block' : 'none'; });
}

async function handleSaveEmployeeForm(ev) {
  ev.preventDefault();
  const payload = {
    nip: document.getElementById('form-nip').value.trim(),
    nik: document.getElementById('form-nik').value.trim(),
    nama: document.getElementById('form-nama').value.trim(),
    gelarDepan: document.getElementById('form-gelar-depan').value.trim(),
    gelarBelakang: document.getElementById('form-gelar-belakang').value.trim(),
    jenisKelamin: document.getElementById('form-gender').value,
    tanggalLahir: document.getElementById('form-tgl-lahir').value,
    noHp: document.getElementById('form-hp').value.trim(),
    email: document.getElementById('form-email').value.trim(),
    statusAsn: document.getElementById('form-status-asn').value,
    jenisJabatan: document.getElementById('form-jenis-jabatan').value,
    namaJabatan: document.getElementById('form-jabatan').value.trim(),
    unitKerja: document.getElementById('form-unit').value.trim(),
    golongan: document.getElementById('form-golongan').value,
    tmtGolongan: document.getElementById('form-tmt-gol').value,
    tmtKgb: document.getElementById('form-tmt-kgb').value,
    jadwalKp: document.getElementById('form-jadwal-kp').value,
    bup: document.getElementById('form-bup').value,
    profesi: document.getElementById('form-profesi').value.trim(),
    noStr: document.getElementById('form-str').value.trim(),
    masaStr: document.getElementById('form-str-exp').value,
    noSip: document.getElementById('form-sip').value.trim(),
    masaSip: document.getElementById('form-sip-exp').value,
    jenjang: document.getElementById('form-jenjang').value,
    thnLulus: document.getElementById('form-thn-lulus').value.trim(),
    kampus: document.getElementById('form-kampus').value.trim(),
    diklat: document.getElementById('form-diklat').value.trim()
  };

  showLoader(true);
  const res = await api('saveEmployee', payload);
  showLoader(false);
  if (res.success) {
    clearSwrCache();
    showToast(res.message, 'success');
    closeEmployeeFormModal();
    await loadBootData(false);
  } else {
    showToast(res.message || 'Gagal menyimpan data.', 'error');
  }
}

function populateUploadEmpSelect(emps) {
  const sel = document.getElementById('upload-emp-select');
  if (!sel) return;
  sel.innerHTML = emps.map(e => `<option value="${e.NIP}">${formatFullName(e)} — ${e.NIP}</option>`).join('');
}

function openUploadCredentialModal() {
  AppState.uploadedBase64 = '';
  AppState.uploadedFileName = '';
  document.getElementById('upload-file-label').textContent = 'Klik untuk memilih berkas PDF';
  document.getElementById('upload-credential-modal').classList.add('active');
}

function closeUploadCredentialModal() {
  document.getElementById('upload-credential-modal').classList.remove('active');
}

function handleFilePicked(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    showToast('Ukuran PDF maksimal 5 MB!', 'error');
    return;
  }
  AppState.uploadedFileName = file.name;
  document.getElementById('upload-file-label').textContent = `Dipilih: ${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
  const reader = new FileReader();
  reader.onload = () => { AppState.uploadedBase64 = String(reader.result).split(',')[1] || ''; };
  reader.readAsDataURL(file);
}

async function handleUploadCredentialSubmit(ev) {
  ev.preventDefault();
  const payload = {
    nip: document.getElementById('upload-emp-select').value,
    kategori: document.getElementById('upload-doc-cat').value,
    nomor: document.getElementById('upload-doc-num').value,
    masaBerlaku: document.getElementById('upload-doc-exp').value,
    seumurHidup: document.getElementById('upload-str-lifetime').checked,
    fileName: AppState.uploadedFileName,
    base64: AppState.uploadedBase64
  };
  showLoader(true);
  const res = await api('uploadArchive', payload);
  showLoader(false);
  if (res.success) {
    clearSwrCache();
    showToast(res.message, 'success');
    closeUploadCredentialModal();
    await loadBootData(false);
  } else {
    showToast(res.message || 'Gagal mengunggah berkas.', 'error');
  }
}

async function handleSavePejabat() {
  const nama = document.getElementById('setting-pejabat-nama').value.trim();
  const jabatan = document.getElementById('setting-pejabat-jabatan').value.trim() || 'Kasubag Keuangan';
  if (!nama) {
    showToast('Nama pejabat Kasubag Keuangan wajib diisi!', 'error');
    return;
  }
  showLoader(true);
  const res = await api('savePejabat', { nama, jabatan });
  showLoader(false);
  if (res.success) {
    const pj = res.pejabat || { nama, jabatan };
    if (AppState.bootData) AppState.bootData.pejabat = pj;
    localStorage.setItem('e_asn_pejabat', JSON.stringify(pj));
    clearSwrCache();
    writeSwrCache(AppState.bootData);
    renderPejabatSidebar();
    showToast(res.message || 'Nama pejabat berhasil diperbarui!', 'success');
  } else {
    showToast(res.message || 'Gagal menyimpan nama pejabat.', 'error');
  }
}

async function handleChangePassword(ev) {
  ev.preventDefault();
  const oldPassword = document.getElementById('pass-old').value;
  const newPassword = document.getElementById('pass-new').value;
  const confirmPassword = document.getElementById('pass-confirm').value;

  if (newPassword.length < 6) {
    showToast('Kata sandi baru minimal 6 karakter!', 'error');
    return;
  }
  if (newPassword !== confirmPassword) {
    showToast('Konfirmasi kata sandi baru tidak cocok!', 'error');
    return;
  }

  showLoader(true);
  const res = await api('changePassword', { oldPassword, newPassword });
  showLoader(false);
  if (res.success) {
    document.getElementById('change-password-form').reset();
    showToast(res.message || 'Kata sandi Super Admin berhasil diperbarui!', 'success');
  } else {
    showToast(res.message || 'Gagal mengubah kata sandi.', 'error');
  }
}

async function handleSaveWaToken() {
  const val = document.getElementById('setting-wa-token').value.trim();
  showLoader(true);
  const res = await api('saveSecret', { key: 'WA_GATEWAY_TOKEN', value: val });
  showLoader(false);
  if (res.success) {
    document.getElementById('setting-wa-token').value = '';
    showToast(res.message, 'success');
    loadSettingsStatus();
  } else {
    showToast(res.message, 'error');
  }
}

async function loadSettingsStatus() {
  if (!AppState.user || AppState.user.role !== 'SuperAdmin') return;
  const res = await api('getSettingsStatus');
  if (res.success) {
    if (res.secrets && res.secrets.WA_GATEWAY_TOKEN) {
      const st = res.secrets.WA_GATEWAY_TOKEN;
      document.getElementById('setting-wa-status').textContent = st.ada
        ? `Status: Token tersimpan aman (${st.tersamar})`
        : 'Status: Belum disetel (Mode Direct Link wa.me aktif)';
    }
    if (res.pejabat) {
      const inNama = document.getElementById('setting-pejabat-nama');
      const inJab = document.getElementById('setting-pejabat-jabatan');
      if (inNama && res.pejabat.nama) inNama.value = res.pejabat.nama;
      if (inJab && res.pejabat.jabatan) inJab.value = res.pejabat.jabatan;
    }
  }
}

async function handleRunMigration(dryRun) {
  const oldId = document.getElementById('migrasi-old-id').value.trim();
  if (!oldId) { showToast('Masukkan ID atau URL Spreadsheet Lama terlebih dahulu!', 'error'); return; }
  showLoader(true);
  const res = await api('runMigration', { oldSpreadsheetId: oldId, dryRun });
  showLoader(false);
  const out = document.getElementById('migrasi-output');
  if (res.success) {
    out.style.display = 'block';
    out.textContent = JSON.stringify(res.result, null, 2);
    showToast(dryRun ? 'Simulasi Dry-Run selesai!' : 'Delta-Sync migrasi berhasil!', 'success');
    if (!dryRun) { clearSwrCache(); loadBootData(false); }
  } else {
    showToast(res.message || 'Migrasi gagal.', 'error');
  }
}

// ==============================================================================
// 8. ROUTING, EXPORT EXCEL & HELPERS (DEBOUNCE & LAZY RENDER)
// ==============================================================================
let _searchTimer = null;

function setupGlobalListeners() {
  document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(el => {
    el.addEventListener('click', () => {
      if (el.dataset.view) switchView(el.dataset.view);
    });
  });

  document.getElementById('topbar-search-input')?.addEventListener('input', () => {
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(() => {
      if (AppState.currentView !== 'directory') switchView('directory');
      else applyDirectoryFilters();
    }, 150);
  });

  document.querySelectorAll('.date-pill-item').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.date-pill-item').forEach(d => d.classList.remove('active'));
      el.classList.add('active');
    });
  });

  // Adaptive Background Refresh saat tab kembali aktif (gas-scale-turbo)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && AppState.user) {
      loadBootData(false);
    }
  });
}

function switchView(viewName) {
  AppState.currentView = viewName;
  const titles = {
    dashboard: 'Dashboard',
    directory: 'Data Pegawai',
    monitoring: 'Monitoring KGB & KP',
    kredensial: 'Kredensial STR/SIP',
    arsip: 'Arsip Digital Akreditasi',
    settings: 'Pengaturan Sistem'
  };
  document.getElementById('page-title').textContent = titles[viewName] || 'Dashboard';

  document.querySelectorAll('.view-section').forEach(s => {
    s.style.display = s.id === 'view-' + viewName ? 'block' : 'none';
  });
  document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.view === viewName);
  });

  renderActiveViewOnly();
}

function handleWorkspaceUnitChange(unit) {
  AppState.unitFilter = unit;
  renderAllViews();
  showToast(`Menampilkan unit: ${unit === 'SEMUA' ? 'Seluruh RS' : unit}`, 'info');
}

function exportEmployeesToCsv() {
  const list = getFilteredEmployees();
  if (!list.length) { showToast('Tidak ada data untuk diekspor.', 'error'); return; }
  const headers = ['NIP', 'NIK', 'Nama_Lengkap', 'Status_ASN', 'Golongan', 'Jabatan', 'Unit_Kerja', 'No_HP_WA', 'Jadwal_KGB', 'Jadwal_KP', 'Nomor_STR', 'Masa_STR'];
  const rows = list.map(e => [
    e.NIP, e.NIK, formatFullName(e), e.Status_Kepegawaian, e.Golongan_Pangkat_Terakhir,
    e.Nama_Jabatan, e.Unit_Kerja, e.No_HP_WA, e.Jadwal_KGB_Berikutnya, e.Jadwal_KP_Berikutnya, e.Nomor_STR, e.Masa_Berlaku_STR
  ].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','));

  const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `E-ASN_Nemal_Nominatif_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  showToast('Berkas Excel (.CSV) berhasil diunduh!', 'success');
}

function toggleTheme() {
  const next = AppState.theme === 'light' ? 'dark' : 'light';
  applyTheme(next);
  showToast(`Mode ${next === 'dark' ? 'Gelap' : 'Terang'} aktif`, 'info');
}

function applyTheme(t) {
  AppState.theme = t;
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('e_asn_theme', t);
}

function renderDateDisplay() {
  const str = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  const el = document.getElementById('current-date-text');
  if (el) el.textContent = str;
}

function formatFullName(e) {
  return `${e.Gelar_Depan ? e.Gelar_Depan + ' ' : ''}${e.Nama_Lengkap || ''}${e.Gelar_Belakang ? ', ' + e.Gelar_Belakang : ''}`.trim();
}

function isExpiringSoon(dateStr, isLifetime) {
  if (!dateStr || String(isLifetime).toLowerCase() === 'ya') return false;
  const d = new Date(dateStr);
  return !isNaN(d) && Math.ceil((d - new Date()) / 86400000) <= 90;
}

function addYearsStr(dateStr, years) {
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

function getInitials(name = '') {
  const p = String(name).replace(/^(dr\.|drg\.|Ns\.|Apt\.|Bidan|H\.)\s*/i, '').trim().split(/\s+/).filter(Boolean);
  if (!p.length) return 'RS';
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[1][0]).toUpperCase();
}

function escapeQuotes(s) {
  return String(s || '').replace(/'/g, "\\'");
}

function showToast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="${type === 'success' ? 'ri-checkbox-circle-line' : type === 'error' ? 'ri-error-warning-line' : 'ri-information-line'}"></i><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => { t.remove(); }, 3200);
}

function showLoader(show) {
  const el = document.getElementById('app-loader');
  if (el) el.style.display = show ? 'flex' : 'none';
}
