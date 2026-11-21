/**
 * ==============================================================================
 * KONFIGURASI FRONTEND — E-ASN NEMAL
 * Berdasarkan Prinsip Keamanan: gas-rahasia-script-properties (R11)
 * 
 * Hanya memuat satu variabel titik temu backend (GAS_URL).
 * Seluruh rahasia, token, dan API key tersimpan aman di Script Properties.
 * ==============================================================================
 */

const CONFIG = {
  // Ganti URL di bawah dengan Web App URL dari deployment Google Apps Script Anda:
  // Contoh: 'https://script.google.com/macros/s/AKfycbwTmUmq-X3JJE2cOrN17pNiV6LOfJxvqCplZ5LV884whN1FojcXu67tljZG7SeCOtmN/exec'
  GAS_URL: '',

  // Nama Aplikasi & Instansi
  APP_NAME: 'E-ASN Nemal',
  INSTANSI: 'RSUD Nene Mallomo',
  VERSION: '2.1.0-TURBO',

  // Mode Otomatis Fallback (Simulasi Demo jika GAS_URL belum diisi)
  DEMO_MODE_IF_EMPTY: true
};
