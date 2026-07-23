import { TranslationKeys } from './en';

export const id: TranslationKeys = {
  // Common & Navigation
  common: {
    appName: 'Ledger',
    loading: 'Memuat...',
    save: 'Simpan',
    cancel: 'Batal',
    confirm: 'Konfirmasi',
    back: 'Kembali',
    or: 'ATAU',
    logout: 'Keluar',
    settings: 'Pengaturan',
    searchPlaceholder: 'Cari transaksi, aset...',
    copied: 'Tersalin!',
    language: 'Bahasa',
    english: 'English',
    indonesian: 'Bahasa Indonesia',
  },

  // Welcome Screen
  welcome: {
    headline: 'Keuangan Anda,\ndalam satu genggaman.',
    tagline: 'Kelola Rupiah, USDT & USDC dengan mudah.',
    getStarted: 'Mulai Sekarang',
    getStartedSubtitle: 'Bergabunglah dengan ribuan pengguna aman.',
    createAccount: 'Buat Akun Baru',
    logIn: 'Masuk Akun',
    continueWithGoogle: 'Lanjutkan dengan Google',
    badgeTransfer: '💸  Transfer Instan',
    badgeSecurity: '🔒  Dilindungi 2FA',
    badgeSwap: '🔄  Tukar Crypto',
    legalDisclaimer: 'Dengan melanjutkan, Anda menyetujui Syarat & Kebijakan Privasi kami.',
  },

  // Auth (Login & Register)
  auth: {
    welcomeBack: 'Selamat Datang Kembali',
    loginSubtitle: 'Akses dasbor keuangan aman Anda',
    createAccountTitle: 'Buat Akun',
    registerSubtitle: 'Bergabunglah dengan Ledger untuk mengelola aset secara aman',
    usernameLabel: 'NAMA PENGGUNA',
    usernamePlaceholder: 'Contoh: johndoe',
    emailLabel: 'ALAMAT EMAIL',
    emailPlaceholder: 'nama@example.com',
    passwordLabel: 'KATA SANDI (MIN 6 KARAKTER)',
    passwordPlaceholder: '••••••••',
    twoFactorVerification: 'Verifikasi 2FA',
    twoFactorSubtitle: 'Masukkan 6 digit kode dari aplikasi authenticator Anda',
    otpLabel: 'KODE OTP',
    verifyCode: 'Verifikasi Kode',
    backToLogin: 'Kembali ke Halaman Masuk',
    dontHaveAccount: 'Belum memiliki akun?',
    alreadyHaveAccount: 'Sudah memiliki akun?',
    signUp: 'Daftar',
    logIn: 'Masuk',
    registerSuccess: 'Registrasi berhasil! Silakan masuk dengan akun baru Anda.',
  },

  // Dashboard
  dashboard: {
    estimatedPortfolio: 'ESTIMASI TOTAL PORTOFOLIO',
    profitLoss: 'Kinerja Portofolio',
    allTime: 'Semua waktu',
    filterAll: 'Semua',
    filterCrypto: 'Crypto',
    filterFiat: 'Fiat',
    recentTransactions: 'Transaksi Terkini',
    viewAll: 'Lihat Semua',
    yourAssets: 'Aset Anda',
    quickTransfer: 'Transfer',
    quickTopUp: 'Top Up',
    quickSwap: 'Tukar (Swap)',
    quickWithdraw: 'Tarik Saldo',
    transferDesc: 'Kirim dana instan',
    topUpDesc: 'Isi saldo via Midtrans',
    swapDesc: 'Tukar kurs real-time',
    withdrawDesc: 'Pencairan ke bank/wallet',
    noTransactions: 'Belum ada transaksi terkini.',
  },

  // Crypto Screen
  crypto: {
    cryptoTitle: 'Crypto Stablecoin',
    cryptoSubtitle: 'Deposit & Penarikan USDT/USDC on-chain',
    depositTab: 'Deposit',
    withdrawTab: 'Penarikan',
    selectAsset: 'Pilih Aset',
    networkNotice: 'POLYGON AMOY TESTNET',
    depositAddress: 'Alamat Deposit Anda',
    copyAddress: 'Salin Alamat Wallet',
    noAddress: 'Alamat deposit tidak tersedia',
    recipientAddress: 'ALAMAT PENERIMA (EVM)',
    recipientPlaceholder: '0x...',
    withdrawAmount: 'JUMLAH PENARIKAN',
    minimumWithdraw: 'Penarikan minimum: 1.0',
    availableBalance: 'Saldo Tersedia',
    submitWithdrawal: 'Kirim Penarikan Crypto',
  },

  // Swap Screen
  swap: {
    swapTitle: 'Tukar Instan (Swap)',
    swapSubtitle: 'Tukar IDR, USDT, & USDC secara instan dengan kurs real-time',
    payFrom: 'BAYAR DARI',
    receiveTo: 'DITERIMA DI',
    balance: 'Saldo',
    currentRate: 'Kurs Pasangan Aset',
    swapFee: 'Biaya Penukaran (0.5%)',
    performSwap: 'Lakukan Penukaran',
    insufficientBalance: 'Saldo Tidak Mencukupi',
  },

  // TopUp Screen
  topup: {
    topUpTitle: 'Top Up IDR',
    enterAmount: 'MASUKKAN JUMLAH TOP UP',
    quickSelect: 'Pilih Nominal Cepat',
    notesLabel: 'CATATAN (OPSIONAL)',
    notesPlaceholder: 'Contoh: Top up bulanan',
    continuePayment: 'Lanjutkan ke Pembayaran',
  },

  // History Screen
  history: {
    historyTitle: 'Riwayat Transaksi',
    allTypes: 'Semua Tipe',
    transfers: 'Transfer',
    topUps: 'Top Up',
    withdrawals: 'Penarikan',
    swaps: 'Tukar (Swap)',
  },

  // Settings Screen
  settings: {
    settingsTitle: 'Pengaturan Akun',
    profileSection: 'Informasi Profil',
    securitySection: 'Keamanan & 2FA',
    preferencesSection: 'Preferensi & Tampilan',
    themeMode: 'Mode Tampilan',
    languagePreference: 'Preferensi Bahasa',
    languageDesc: 'Pilih bahasa tampilan aplikasi yang Anda sukai',
    enable2FA: 'Aktifkan Autentikasi 2FA',
    disable2FA: 'Nonaktifkan Autentikasi 2FA',
    logoutBtn: 'Keluar dari Ledger',
    appVersion: 'Ledger Hybrid Wallet v1.0.0',
  },
};
