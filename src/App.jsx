import React, { useState, useEffect, useRef } from 'react';
import { Users, Package, DollarSign, FileText, Plus, Eye, Trash2, Edit2, CheckCircle, XCircle, History, Download, Camera } from 'lucide-react';

const WifiVoucherSalesApp = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [vouchers, setVouchers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [sales, setSales] = useState([]);
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showVoucherDisplay, setShowVoucherDisplay] = useState(false);
  const [showDebtPaymentModal, setShowDebtPaymentModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [soldVoucher, setSoldVoucher] = useState(null);

  // Form states
  const [saleForm, setSaleForm] = useState({
    voucherCode: '',
    paymentMethod: 'cash',
    customerName: '',
    customerPhone: ''
  });

  const [debtPaymentForm, setDebtPaymentForm] = useState({
    amount: 0
  });

  const [adminForm, setAdminForm] = useState({
    name: '',
    username: '',
    password: ''
  });

  // Ref for voucher card screenshot
  const voucherCardRef = useRef(null);

  // Load data from storage
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Check if window.storage exists (only in Claude.ai environment)
      const hasStorage = typeof window.storage !== 'undefined';
      
      if (!hasStorage) {
        // Use localStorage for local development
        console.log('Using localStorage (local development mode)');
        
        // Load vouchers
        const vouchersData = localStorage.getItem('vouchers');
        if (vouchersData) {
          setVouchers(JSON.parse(vouchersData));
        } else {
          await initializeVouchers();
        }

        // Load admins
        const adminsData = localStorage.getItem('admins');
        if (adminsData) {
          setAdmins(JSON.parse(adminsData));
        } else {
          await initializeAdmins();
        }

        // Load sales
        const salesData = localStorage.getItem('sales');
        if (salesData) {
          setSales(JSON.parse(salesData));
        } else {
          setSales([]);
        }

        // Load debts
        const debtsData = localStorage.getItem('debts');
        if (debtsData) {
          setDebts(JSON.parse(debtsData));
        } else {
          setDebts([]);
        }
      } else {
        // Use window.storage for Claude.ai environment
        console.log('Using window.storage (Claude.ai mode)');
        
        // Load vouchers
        try {
          const vouchersData = await window.storage.get('vouchers');
          if (vouchersData) {
            setVouchers(JSON.parse(vouchersData.value));
          } else {
            await initializeVouchers();
          }
        } catch (error) {
          await initializeVouchers();
        }

        // Load admins
        try {
          const adminsData = await window.storage.get('admins');
          if (adminsData) {
            setAdmins(JSON.parse(adminsData.value));
          } else {
            await initializeAdmins();
          }
        } catch (error) {
          await initializeAdmins();
        }

        // Load sales
        try {
          const salesData = await window.storage.get('sales');
          if (salesData) {
            setSales(JSON.parse(salesData.value));
          }
        } catch (error) {
          setSales([]);
        }

        // Load debts
        try {
          const debtsData = await window.storage.get('debts');
          if (debtsData) {
            setDebts(JSON.parse(debtsData.value));
          }
        } catch (error) {
          setDebts([]);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const initializeVouchers = async () => {
    const voucherData = [
      "6827", "6456", "5756", "5383", "5966", "2382", "9852", "8335", "5879", "8532",
      "5279", "3882", "8588", "4536", "5468", "4327", "7662", "2925", "9895", "8298",
      "3946", "8469", "7554", "4496", "3722", "7827", "9298", "2332", "8289", "2528",
      "9265", "6997", "2677", "9673", "8865", "9979", "4966", "3929", "9835", "5484",
      "2446", "8893", "7594", "2597", "7946", "3645", "5277", "4388", "3452", "8547",
      "4426", "5663", "2987", "5728", "7433", "9493", "8845", "5434", "9867", "2293",
      "6629", "3526", "2754", "2875", "4554", "9378", "2954", "6977", "9263", "5859",
      "5926", "4289", "5526", "5527", "5775", "3248", "3347", "3294", "5968", "4635",
      "2474", "5727", "7355", "9229", "4247", "5935", "5785", "4924", "2753", "4379"
    ];

    const initialVouchers = voucherData.map((code, idx) => ({
      id: `voucher_${idx + 1}`,
      code: code,
      username: code,
      password: code,
      status: 'available',
      soldBy: null,
      soldAt: null
    }));

    setVouchers(initialVouchers);
    
    // Save based on environment
    if (typeof window.storage !== 'undefined') {
      await window.storage.set('vouchers', JSON.stringify(initialVouchers));
    } else {
      localStorage.setItem('vouchers', JSON.stringify(initialVouchers));
    }
    
    console.log('Vouchers initialized:', initialVouchers.length);
  };

  const initializeAdmins = async () => {
    const superadmin = {
      id: 'admin_0',
      name: 'Superadmin',
      username: 'superadmin',
      password: 'admin123',
      role: 'superadmin'
    };
    
    const initialAdmins = [superadmin];
    setAdmins(initialAdmins);
    
    // Save based on environment
    if (typeof window.storage !== 'undefined') {
      await window.storage.set('admins', JSON.stringify(initialAdmins));
    } else {
      localStorage.setItem('admins', JSON.stringify(initialAdmins));
    }
    
    console.log('Admins initialized:', initialAdmins);
  };

  const saveData = async (key, data) => {
    try {
      if (typeof window.storage !== 'undefined') {
        await window.storage.set(key, JSON.stringify(data));
      } else {
        localStorage.setItem(key, JSON.stringify(data));
      }
      console.log(`Saved ${key}:`, data);
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
    }
  };

  const handleLogin = (username, password) => {
    const admin = admins.find(a => a.username === username && a.password === password);
    if (admin) {
      setCurrentUser(admin);
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  const handleAddAdmin = async () => {
    if (!adminForm.name || !adminForm.username || !adminForm.password) {
      alert('Semua field harus diisi!');
      return;
    }

    const newAdmin = {
      id: `admin_${Date.now()}`,
      name: adminForm.name,
      username: adminForm.username,
      password: adminForm.password,
      role: 'admin'
    };

    const updatedAdmins = [...admins, newAdmin];
    setAdmins(updatedAdmins);
    await saveData('admins', updatedAdmins);

    setAdminForm({ name: '', username: '', password: '' });
    setShowAdminModal(false);
    alert('Admin berhasil ditambahkan!');
  };

  const handleDeleteAdmin = async (adminId) => {
    if (!window.confirm('Yakin ingin menghapus admin ini?')) return;
    
    const updatedAdmins = admins.filter(a => a.id !== adminId);
    setAdmins(updatedAdmins);
    await saveData('admins', updatedAdmins);
  };

  const handleSellVoucher = async () => {
    if (!saleForm.voucherCode) {
      alert('Pilih voucher terlebih dahulu!');
      return;
    }

    const voucher = vouchers.find(v => v.code === saleForm.voucherCode && v.status === 'available');
    if (!voucher) {
      alert('Voucher tidak tersedia!');
      return;
    }

    if (saleForm.paymentMethod === 'hutang' && (!saleForm.customerName || !saleForm.customerPhone)) {
      alert('Nama dan nomor telepon pelanggan harus diisi untuk pembayaran hutang!');
      return;
    }

    const saleId = `sale_${Date.now()}`;
    const newSale = {
      id: saleId,
      voucherCode: voucher.code,
      voucherUsername: voucher.username,
      voucherPassword: voucher.password,
      amount: 1000,
      paymentMethod: saleForm.paymentMethod,
      soldBy: currentUser.id,
      soldByName: currentUser.name,
      customerName: saleForm.customerName || '-',
      customerPhone: saleForm.customerPhone || '-',
      soldAt: new Date().toISOString()
    };

    const updatedSales = [...sales, newSale];
    setSales(updatedSales);
    await saveData('sales', updatedSales);

    const updatedVouchers = vouchers.map(v => 
      v.code === voucher.code 
        ? { ...v, status: 'sold', soldBy: currentUser.id, soldAt: new Date().toISOString() }
        : v
    );
    setVouchers(updatedVouchers);
    await saveData('vouchers', updatedVouchers);

    if (saleForm.paymentMethod === 'hutang') {
      const newDebt = {
        id: `debt_${Date.now()}`,
        saleId: saleId,
        customerName: saleForm.customerName,
        customerPhone: saleForm.customerPhone,
        amount: 1000,
        paid: 0,
        remaining: 1000,
        status: 'unpaid',
        adminId: currentUser.id,
        adminName: currentUser.name,
        createdAt: new Date().toISOString(),
        payments: []
      };

      const updatedDebts = [...debts, newDebt];
      setDebts(updatedDebts);
      await saveData('debts', updatedDebts);
    }

    // Show voucher display
    setSoldVoucher({
      username: voucher.username,
      password: voucher.password,
      customerName: saleForm.customerName || 'Pelanggan',
      soldAt: new Date().toISOString()
    });
    setShowVoucherDisplay(true);
    setShowSaleModal(false);

    setSaleForm({ voucherCode: '', paymentMethod: 'cash', customerName: '', customerPhone: '' });
  };

  const handlePayDebt = async () => {
    if (!selectedDebt || debtPaymentForm.amount <= 0) {
      alert('Masukkan jumlah pembayaran yang valid!');
      return;
    }

    if (debtPaymentForm.amount > selectedDebt.remaining) {
      alert('Jumlah pembayaran melebihi sisa hutang!');
      return;
    }

    const payment = {
      id: `payment_${Date.now()}`,
      amount: debtPaymentForm.amount,
      paidAt: new Date().toISOString(),
      receivedBy: currentUser.name
    };

    const updatedDebts = debts.map(d => {
      if (d.id === selectedDebt.id) {
        const newPaid = d.paid + debtPaymentForm.amount;
        const newRemaining = d.remaining - debtPaymentForm.amount;
        return {
          ...d,
          paid: newPaid,
          remaining: newRemaining,
          status: newRemaining === 0 ? 'paid' : 'partial',
          payments: [...d.payments, payment]
        };
      }
      return d;
    });

    setDebts(updatedDebts);
    await saveData('debts', updatedDebts);

    setDebtPaymentForm({ amount: 0 });
    setSelectedDebt(null);
    setShowDebtPaymentModal(false);
    alert('Pembayaran berhasil dicatat!');
  };

  const handleScreenshotVoucher = async () => {
    if (!voucherCardRef.current) return;

    try {
      // Import html2canvas dynamically
      const html2canvas = (await import('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js')).default;
      
      const canvas = await html2canvas(voucherCardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2
      });
      
      const link = document.createElement('a');
      link.download = `voucher-${soldVoucher.username}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('Error taking screenshot:', error);
      alert('Gagal mengambil screenshot. Silakan screenshot manual.');
    }
  };

  const getAdminSales = (adminId) => {
    return sales.filter(s => s.soldBy === adminId);
  };

  const getAdminDebts = (adminId) => {
    return debts.filter(d => d.adminId === adminId);
  };

  const getTotalRevenue = (adminId = null) => {
    const relevantSales = adminId ? getAdminSales(adminId) : sales;
    return relevantSales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.amount, 0);
  };

  const getTotalDebtAmount = (adminId = null) => {
    const relevantDebts = adminId ? getAdminDebts(adminId) : debts;
    return relevantDebts.reduce((sum, d) => sum + d.remaining, 0);
  };

  const getAvailableVouchers = () => {
    return vouchers.filter(v => v.status === 'available');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-bold text-gray-800">wifisekre.net</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                <strong>{currentUser.name}</strong> ({currentUser.role})
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('sell')}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              activeTab === 'sell'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Jual Voucher
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              activeTab === 'sales'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Riwayat Penjualan
          </button>
          <button
            onClick={() => setActiveTab('debts')}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              activeTab === 'debts'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Data Hutang
          </button>
          {currentUser.role === 'superadmin' && (
            <button
              onClick={() => setActiveTab('admins')}
              className={`px-6 py-2 rounded-lg font-medium transition ${
                activeTab === 'admins'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Kelola Admin
            </button>
          )}
        </div>

        {activeTab === 'dashboard' && (
          <DashboardTab
            currentUser={currentUser}
            vouchers={vouchers}
            sales={sales}
            debts={debts}
            admins={admins}
            getTotalRevenue={getTotalRevenue}
            getTotalDebtAmount={getTotalDebtAmount}
            getAvailableVouchers={getAvailableVouchers}
            getAdminSales={getAdminSales}
            getAdminDebts={getAdminDebts}
          />
        )}

        {activeTab === 'sell' && (
          <SellTab
            vouchers={vouchers}
            saleForm={saleForm}
            setSaleForm={setSaleForm}
            handleSellVoucher={handleSellVoucher}
            getAvailableVouchers={getAvailableVouchers}
          />
        )}

        {activeTab === 'sales' && (
          <SalesTab
            currentUser={currentUser}
            sales={sales}
            admins={admins}
            getAdminSales={getAdminSales}
          />
        )}

        {activeTab === 'debts' && (
          <DebtsTab
            currentUser={currentUser}
            debts={debts}
            getAdminDebts={getAdminDebts}
            setSelectedDebt={setSelectedDebt}
            setShowDebtPaymentModal={setShowDebtPaymentModal}
          />
        )}

        {activeTab === 'admins' && currentUser.role === 'superadmin' && (
          <AdminsTab
            admins={admins}
            setShowAdminModal={setShowAdminModal}
            handleDeleteAdmin={handleDeleteAdmin}
          />
        )}
      </div>

      {showAdminModal && (
        <Modal title="Tambah Admin Baru" onClose={() => setShowAdminModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
              <input
                type="text"
                value={adminForm.name}
                onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={adminForm.username}
                onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={adminForm.password}
                onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={handleAddAdmin}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              Tambah Admin
            </button>
          </div>
        </Modal>
      )}

      {showVoucherDisplay && soldVoucher && (
        <Modal 
          title="Voucher Berhasil Dijual!" 
          onClose={() => setShowVoucherDisplay(false)}
        >
          <div className="space-y-4">
            <div ref={voucherCardRef} className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-8 text-white">
              <div className="text-center mb-6">
                <div className="bg-white bg-opacity-20 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                  <Package className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-bold">Voucher WiFi</h2>
                <p className="text-indigo-100">HARIAN-OGROG</p>
              </div>

              <div className="bg-white bg-opacity-20 rounded-xl p-6 mb-4 backdrop-blur-sm">
                <div className="space-y-4">
                  <div>
                    <p className="text-indigo-100 text-sm mb-1">Username</p>
                    <p className="text-3xl font-bold font-mono tracking-wider">{soldVoucher.username}</p>
                  </div>
                  <div>
                    <p className="text-indigo-100 text-sm mb-1">Password</p>
                    <p className="text-3xl font-bold font-mono tracking-wider">{soldVoucher.password}</p>
                  </div>
                </div>
              </div>

              <div className="text-center text-sm text-indigo-100">
                <p>Untuk: {soldVoucher.customerName}</p>
                <p className="mt-2">{new Date(soldVoucher.soldAt).toLocaleDateString('id-ID', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleScreenshotVoucher}
                className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
              >
                <Download className="h-5 w-5" />
                Download
              </button>
              <button
                onClick={() => setShowVoucherDisplay(false)}
                className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                Tutup
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                💡 <strong>Tips:</strong> Gunakan tombol Download atau screenshot manual untuk menyimpan voucher ini
              </p>
            </div>
          </div>
        </Modal>
      )}

      {showDebtPaymentModal && selectedDebt && (
        <Modal title="Bayar Hutang" onClose={() => setShowDebtPaymentModal(false)}>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Pelanggan: <strong>{selectedDebt.customerName}</strong></p>
              <p className="text-sm text-gray-600">Telepon: <strong>{selectedDebt.customerPhone}</strong></p>
              <p className="text-sm text-gray-600">Total Hutang: <strong>Rp {selectedDebt.amount.toLocaleString('id-ID')}</strong></p>
              <p className="text-sm text-gray-600">Sudah Dibayar: <strong>Rp {selectedDebt.paid.toLocaleString('id-ID')}</strong></p>
              <p className="text-lg font-bold text-red-600 mt-2">Sisa: Rp {selectedDebt.remaining.toLocaleString('id-ID')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Pembayaran</label>
              <input
                type="number"
                value={debtPaymentForm.amount}
                onChange={(e) => setDebtPaymentForm({ amount: parseFloat(e.target.value) || 0 })}
                max={selectedDebt.remaining}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={handlePayDebt}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Proses Pembayaran
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onLogin(username, password)) {
      setUsername('');
      setPassword('');
    } else {
      alert('Username atau password salah!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Package className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-800">Voucher WiFi Sales</h1>
          <p className="text-gray-600 mt-2">Sistem Manajemen Penjualan</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition"
          >
            Login
          </button>
        </form>
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 text-center">
          </p>
        </div>
      </div>
    </div>
  );
};

const DashboardTab = ({ currentUser, vouchers, sales, debts, admins, getTotalRevenue, getTotalDebtAmount, getAvailableVouchers, getAdminSales, getAdminDebts }) => {
  const isSuperadmin = currentUser.role === 'superadmin';
  const myRevenue = getTotalRevenue(currentUser.id);
  const myDebt = getTotalDebtAmount(currentUser.id);
  const totalRevenue = getTotalRevenue();
  const totalDebt = getTotalDebtAmount();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Package className="h-8 w-8" />}
          title="Voucher Tersedia"
          value={getAvailableVouchers().length}
          color="bg-blue-500"
        />
        <StatCard
          icon={<DollarSign className="h-8 w-8" />}
          title={isSuperadmin ? "Total Pendapatan" : "Pendapatan Saya"}
          value={`Rp ${(isSuperadmin ? totalRevenue : myRevenue).toLocaleString('id-ID')}`}
          color="bg-green-500"
        />
        <StatCard
          icon={<FileText className="h-8 w-8" />}
          title={isSuperadmin ? "Total Hutang" : "Hutang Saya"}
          value={`Rp ${(isSuperadmin ? totalDebt : myDebt).toLocaleString('id-ID')}`}
          color="bg-red-500"
        />
        <StatCard
          icon={<Users className="h-8 w-8" />}
          title={isSuperadmin ? "Total Penjualan" : "Penjualan Saya"}
          value={isSuperadmin ? sales.length : getAdminSales(currentUser.id).length}
          color="bg-purple-500"
        />
      </div>

      {isSuperadmin && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Performa Admin</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Nama Admin</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Penjualan</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Pendapatan Cash</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Total Hutang</th>
                </tr>
              </thead>
              <tbody>
                {admins.filter(a => a.role === 'admin').map(admin => {
                  const adminSales = getAdminSales(admin.id);
                  const adminRevenue = adminSales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.amount, 0);
                  const adminDebts = getAdminDebts(admin.id);
                  const adminDebtTotal = adminDebts.reduce((sum, d) => sum + d.remaining, 0);
                  
                  return (
                    <tr key={admin.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">{admin.name}</td>
                      <td className="text-right py-3 px-4">{adminSales.length} voucher</td>
                      <td className="text-right py-3 px-4 text-green-600 font-medium">
                        Rp {adminRevenue.toLocaleString('id-ID')}
                      </td>
                      <td className="text-right py-3 px-4 text-red-600 font-medium">
                        Rp {adminDebtTotal.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Penjualan Terbaru</h3>
        <div className="space-y-3">
          {(isSuperadmin ? sales : getAdminSales(currentUser.id))
            .slice(-5)
            .reverse()
            .map(sale => (
              <div key={sale.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">Voucher: {sale.voucherCode}</p>
                  <p className="text-sm text-gray-600">
                    {sale.paymentMethod === 'cash' ? '💵 Cash' : '📋 Hutang'} • {sale.soldByName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(sale.soldAt).toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">Rp {sale.amount.toLocaleString('id-ID')}</p>
                  {sale.customerName !== '-' && (
                    <p className="text-xs text-gray-600">{sale.customerName}</p>
                  )}
                </div>
              </div>
            ))}
          {(isSuperadmin ? sales : getAdminSales(currentUser.id)).length === 0 && (
            <p className="text-center text-gray-500 py-8">Belum ada penjualan</p>
          )}
        </div>
      </div>
    </div>
  );
};

const SellTab = ({ vouchers, saleForm, setSaleForm, handleSellVoucher, getAvailableVouchers }) => {
  const availableVouchers = getAvailableVouchers();

  return (
    <div className="bg-white rounded-xl shadow-md p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Jual Voucher</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pilih Voucher ({availableVouchers.length} tersedia)
          </label>
          <select
            value={saleForm.voucherCode}
            onChange={(e) => setSaleForm({ ...saleForm, voucherCode: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- Pilih Voucher --</option>
            {availableVouchers.map(v => (
              <option key={v.id} value={v.code}>
                {v.code} (Username & Password: {v.username})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Metode Pembayaran</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setSaleForm({ ...saleForm, paymentMethod: 'cash' })}
              className={`p-4 border-2 rounded-lg font-medium transition ${
                saleForm.paymentMethod === 'cash'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              💵 Cash
            </button>
            <button
              onClick={() => setSaleForm({ ...saleForm, paymentMethod: 'hutang' })}
              className={`p-4 border-2 rounded-lg font-medium transition ${
                saleForm.paymentMethod === 'hutang'
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              📋 Hutang
            </button>
          </div>
        </div>

        {saleForm.paymentMethod === 'hutang' && (
          <div className="space-y-4 p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm font-medium text-red-800">Data pelanggan diperlukan untuk pembayaran hutang</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pelanggan</label>
              <input
                type="text"
                value={saleForm.customerName}
                onChange={(e) => setSaleForm({ ...saleForm, customerName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Masukkan nama pelanggan"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Telepon</label>
              <input
                type="tel"
                value={saleForm.customerPhone}
                onChange={(e) => setSaleForm({ ...saleForm, customerPhone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="08xxxxxxxxxx"
              />
            </div>
          </div>
        )}

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium text-gray-700">Total Harga:</span>
            <span className="text-2xl font-bold text-indigo-600">Rp 1.000</span>
          </div>
        </div>

        <button
          onClick={handleSellVoucher}
          disabled={!saleForm.voucherCode}
          className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Proses Penjualan
        </button>
      </div>
    </div>
  );
};

const SalesTab = ({ currentUser, sales, admins, getAdminSales }) => {
  const isSuperadmin = currentUser.role === 'superadmin';
  const displaySales = isSuperadmin ? sales : getAdminSales(currentUser.id);

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Riwayat Penjualan</h2>
      
      {displaySales.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Belum ada riwayat penjualan</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Tanggal</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Voucher</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Username/Password</th>
                {isSuperadmin && (
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Dijual Oleh</th>
                )}
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Pembayaran</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Pelanggan</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Harga</th>
              </tr>
            </thead>
            <tbody>
              {displaySales.slice().reverse().map(sale => (
                <tr key={sale.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm">
                    {new Date(sale.soldAt).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="py-3 px-4 font-medium">{sale.voucherCode}</td>
                  <td className="py-3 px-4 font-mono text-sm bg-gray-50 rounded">{sale.voucherUsername}</td>
                  {isSuperadmin && (
                    <td className="py-3 px-4">{sale.soldByName}</td>
                  )}
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      sale.paymentMethod === 'cash'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {sale.paymentMethod === 'cash' ? '💵 Cash' : '📋 Hutang'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {sale.customerName !== '-' ? (
                      <div>
                        <p className="font-medium">{sale.customerName}</p>
                        <p className="text-gray-500 text-xs">{sale.customerPhone}</p>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-green-600">
                    Rp {sale.amount.toLocaleString('id-ID')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const DebtsTab = ({ currentUser, debts, getAdminDebts, setSelectedDebt, setShowDebtPaymentModal }) => {
  const isSuperadmin = currentUser.role === 'superadmin';
  const displayDebts = isSuperadmin ? debts : getAdminDebts(currentUser.id);
  const unpaidDebts = displayDebts.filter(d => d.status !== 'paid');
  const paidDebts = displayDebts.filter(d => d.status === 'paid');

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Data Hutang Belum Lunas</h2>
        
        {unpaidDebts.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-green-300 mx-auto mb-4" />
            <p className="text-gray-500">Tidak ada hutang yang belum lunas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {unpaidDebts.map(debt => (
              <div key={debt.id} className="border-2 border-red-200 rounded-lg p-4 bg-red-50">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-800">{debt.customerName}</h3>
                    <p className="text-sm text-gray-600">{debt.customerPhone}</p>
                    {isSuperadmin && (
                      <p className="text-xs text-gray-500 mt-1">Admin: {debt.adminName}</p>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    debt.status === 'unpaid'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {debt.status === 'unpaid' ? 'Belum Bayar' : 'Cicilan'}
                  </span>
                </div>
                
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Hutang:</span>
                    <span className="font-medium">Rp {debt.amount.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Sudah Dibayar:</span>
                    <span className="font-medium text-green-600">Rp {debt.paid.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-gray-800">Sisa:</span>
                    <span className="text-red-600">Rp {debt.remaining.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${(debt.paid / debt.amount) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    {((debt.paid / debt.amount) * 100).toFixed(0)}% terbayar
                  </p>
                </div>

                {debt.payments.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-700 mb-1">Riwayat Pembayaran:</p>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {debt.payments.map(payment => (
                        <div key={payment.id} className="text-xs bg-white p-2 rounded">
                          <div className="flex justify-between">
                            <span>Rp {payment.amount.toLocaleString('id-ID')}</span>
                            <span className="text-gray-500">
                              {new Date(payment.paidAt).toLocaleDateString('id-ID')}
                            </span>
                          </div>
                          <p className="text-gray-500">Diterima: {payment.receivedBy}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    setSelectedDebt(debt);
                    setShowDebtPaymentModal(true);
                  }}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                >
                  Bayar Hutang
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {paidDebts.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Hutang Lunas</h2>
          <div className="space-y-3">
            {paidDebts.map(debt => (
              <div key={debt.id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                <div>
                  <p className="font-medium text-gray-800">{debt.customerName}</p>
                  <p className="text-sm text-gray-600">{debt.customerPhone}</p>
                  {isSuperadmin && (
                    <p className="text-xs text-gray-500">Admin: {debt.adminName}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">Rp {debt.amount.toLocaleString('id-ID')}</p>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">✓ Lunas</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const AdminsTab = ({ admins, setShowAdminModal, handleDeleteAdmin }) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Kelola Admin</h2>
        <button
          onClick={() => setShowAdminModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Tambah Admin
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {admins.map(admin => (
          <div key={admin.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-gray-800">{admin.name}</h3>
                <p className="text-sm text-gray-600">@{admin.username}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                admin.role === 'superadmin'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {admin.role === 'superadmin' ? 'Superadmin' : 'Admin'}
              </span>
            </div>
            
            {admin.role !== 'superadmin' && (
              <button
                onClick={() => handleDeleteAdmin(admin.id)}
                className="w-full px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-sm font-medium flex items-center justify-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Hapus Admin
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value, color }) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className={`${color} w-12 h-12 rounded-lg flex items-center justify-center text-white mb-4`}>
        {icon}
      </div>
      <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  );
};

const Modal = ({ title, children, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <XCircle className="h-6 w-6" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default WifiVoucherSalesApp;