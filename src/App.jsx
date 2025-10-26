import React, { useState, useEffect, useRef } from 'react';
import { Users, Package, DollarSign, FileText, Plus, Eye, Trash2, Edit2, CheckCircle, XCircle, History, Download, Camera, Filter, Calendar, Printer } from 'lucide-react';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import jsPDF from 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm';

// KONFIGURASI SUPABASE
const SUPABASE_URL = 'https://nvfmqhoeigxhbrdyscqz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52Zm1xaG9laWd4aGJyZHlzY3F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0NDk2NTMsImV4cCI6MjA3NzAyNTY1M30.2xfjtHus5q-fXa7pVjkn1zN2648vZxe5gVBgpM-Sx4g';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  const [soldVouchers, setSoldVouchers] = useState([]);

  // Form states
  const [saleForm, setSaleForm] = useState({
    voucherCodes: [],
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

  // Filter states untuk Sales dan Debts
  const [salesFilters, setSalesFilters] = useState({
    startDate: '',
    endDate: '',
    customerName: '',
    adminName: '',
    paymentMethod: ''
  });

  const [debtsFilters, setDebtsFilters] = useState({
    startDate: '',
    endDate: '',
    customerName: '',
    adminName: '',
    status: ''
  });

  // Ref for voucher card screenshot dan PDF
  const voucherCardRef = useRef(null);
  const reportRef = useRef(null);

  // Load data from database
  useEffect(() => {
    // Persist login: Load dari localStorage
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      loadData().then(() => {
        const validUser = admins.find(a => a.id === user.id && a.username === user.username);
        if (validUser) {
          setCurrentUser(validUser);
        } else {
          localStorage.removeItem('currentUser');
        }
      });
    } else {
      loadData();
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load vouchers
      const { data: vouchersData, error: vouchersError } = await supabase
        .from('vouchers')
        .select('*')
        .order('code');
      
      if (vouchersError) throw vouchersError;
      setVouchers(vouchersData || []);

      // Load admins
      const { data: adminsData, error: adminsError } = await supabase
        .from('admins')
        .select('*');
      
      if (adminsError) throw adminsError;
      setAdmins(adminsData || []);

      // Load sales with admin info
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          admin:admins(name)
        `)
        .order('sold_at', { ascending: false });
      
      if (salesError) throw salesError;
      setSales(salesData || []);

      // Load debts with admin info
      const { data: debtsData, error: debtsError } = await supabase
        .from('debts')
        .select(`
          *,
          admin:admins(name),
          payments:debt_payments(*)
        `)
        .order('created_at', { ascending: false });
      
      if (debtsError) throw debtsError;
      setDebts(debtsData || []);

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Gagal memuat data: ' + error.message);
      setLoading(false);
    }
  };

  const handleLogin = (username, password) => {
    const admin = admins.find(a => a.username === username && a.password === password);
    if (admin) {
      setCurrentUser(admin);
      localStorage.setItem('currentUser', JSON.stringify(admin));
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setActiveTab('dashboard');
  };

  const handleAddAdmin = async () => {
    if (!adminForm.name || !adminForm.username || !adminForm.password) {
      alert('Semua field harus diisi!');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('admins')
        .insert([
          {
            name: adminForm.name,
            username: adminForm.username,
            password: adminForm.password,
            role: 'admin'
          }
        ])
        .select();

      if (error) throw error;

      setAdmins([...admins, data[0]]);
      setAdminForm({ name: '', username: '', password: '' });
      setShowAdminModal(false);
      alert('Admin berhasil ditambahkan!');
    } catch (error) {
      console.error('Error adding admin:', error);
      alert('Gagal menambahkan admin: ' + error.message);
    }
  };

  const handleDeleteAdmin = async (adminId) => {
    if (!window.confirm('Yakin ingin menghapus admin ini?')) return;
    
    try {
      const { error } = await supabase
        .from('admins')
        .delete()
        .eq('id', adminId);

      if (error) throw error;

      setAdmins(admins.filter(a => a.id !== adminId));
      alert('Admin berhasil dihapus!');
    } catch (error) {
      console.error('Error deleting admin:', error);
      alert('Gagal menghapus admin: ' + error.message);
    }
  };

  const handleSellVoucher = async () => {
    if (saleForm.voucherCodes.length === 0) {
      alert('Pilih minimal 1 voucher!');
      return;
    }

    if (saleForm.paymentMethod === 'hutang' && (!saleForm.customerName || !saleForm.customerPhone)) {
      alert('Nama dan nomor telepon pelanggan harus diisi untuk pembayaran hutang!');
      return;
    }

    try {
      const selectedVouchers = vouchers.filter(v => 
        saleForm.voucherCodes.includes(v.code) && v.status === 'available'
      );

      if (selectedVouchers.length === 0) {
        alert('Voucher tidak tersedia!');
        return;
      }

      const totalAmount = selectedVouchers.length * 1000;
      const soldAt = new Date().toISOString();

      // Insert sales records
      const salesRecords = selectedVouchers.map(voucher => ({
        voucher_code: voucher.code,
        voucher_username: voucher.username,
        voucher_password: voucher.password,
        amount: 1000,
        payment_method: saleForm.paymentMethod,
        sold_by: currentUser.id,
        customer_name: saleForm.customerName || '-',
        customer_phone: saleForm.customerPhone || '-',
        sold_at: soldAt
      }));

      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .insert(salesRecords)
        .select();

      if (salesError) throw salesError;

      // Update vouchers status
      const { error: updateError } = await supabase
        .from('vouchers')
        .update({
          status: 'sold',
          sold_by: currentUser.id,
          sold_at: soldAt
        })
        .in('code', saleForm.voucherCodes);

      if (updateError) throw updateError;

      // If hutang, create debt record
      if (saleForm.paymentMethod === 'hutang') {
        const { error: debtError } = await supabase
          .from('debts')
          .insert([{
            sale_ids: salesData.map(s => s.id),
            customer_name: saleForm.customerName,
            customer_phone: saleForm.customerPhone,
            amount: totalAmount,
            paid: 0,
            remaining: totalAmount,
            status: 'unpaid',
            admin_id: currentUser.id
          }]);

        if (debtError) throw debtError;
      }

      // Reload data
      await loadData();

      // Show voucher display
      setSoldVouchers(selectedVouchers.map(v => ({
        username: v.username,
        password: v.password,
        customerName: saleForm.customerName || 'Pelanggan',
        soldAt: soldAt
      })));
      setShowVoucherDisplay(true);
      setShowSaleModal(false);

      setSaleForm({ voucherCodes: [], paymentMethod: 'cash', customerName: '', customerPhone: '' });
      alert('Penjualan berhasil!');
    } catch (error) {
      console.error('Error selling voucher:', error);
      alert('Gagal melakukan penjualan: ' + error.message);
    }
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

    try {
      const newPaid = selectedDebt.paid + debtPaymentForm.amount;
      const newRemaining = selectedDebt.remaining - debtPaymentForm.amount;
      const newStatus = newRemaining === 0 ? 'paid' : 'partial';

      // Insert payment record
      const { error: paymentError } = await supabase
        .from('debt_payments')
        .insert([{
          debt_id: selectedDebt.id,
          amount: debtPaymentForm.amount,
          received_by: currentUser.name,
          paid_at: new Date().toISOString()
        }]);

      if (paymentError) throw paymentError;

      // Update debt
      const { error: updateError } = await supabase
        .from('debts')
        .update({
          paid: newPaid,
          remaining: newRemaining,
          status: newStatus
        })
        .eq('id', selectedDebt.id);

      if (updateError) throw updateError;

      // Reload data
      await loadData();

      setDebtPaymentForm({ amount: 0 });
      setSelectedDebt(null);
      setShowDebtPaymentModal(false);
      alert('Pembayaran berhasil dicatat!');
    } catch (error) {
      console.error('Error paying debt:', error);
      alert('Gagal mencatat pembayaran: ' + error.message);
    }
  };

  const handleScreenshotVoucher = async () => {
    if (!voucherCardRef.current) return;

    try {
      const html2canvas = (await import('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js')).default;
      
      const canvas = await html2canvas(voucherCardRef.current, {
        backgroundColor: '#ffffff',
        scale: 2
      });
      
      const link = document.createElement('a');
      link.download = `vouchers-${new Date().getTime()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('Error taking screenshot:', error);
      alert('Gagal mengambil screenshot. Silakan screenshot manual.');
    }
  };

  // Fungsi filter data
  const filterSales = (salesData) => {
    return salesData.filter(sale => {
      const saleDate = new Date(sale.sold_at);
      const startDate = salesFilters.startDate ? new Date(salesFilters.startDate) : null;
      const endDate = salesFilters.endDate ? new Date(salesFilters.endDate) : null;
      
      if (startDate && saleDate < startDate) return false;
      if (endDate && saleDate > endDate) return false;
      if (salesFilters.customerName && !sale.customer_name.toLowerCase().includes(salesFilters.customerName.toLowerCase())) return false;
      if (salesFilters.adminName && sale.admin?.name !== salesFilters.adminName) return false;
      if (salesFilters.paymentMethod && sale.payment_method !== salesFilters.paymentMethod) return false;
      return true;
    });
  };

  const filterDebts = (debtsData) => {
    return debtsData.filter(debt => {
      const debtDate = new Date(debt.created_at);
      const startDate = debtsFilters.startDate ? new Date(debtsFilters.startDate) : null;
      const endDate = debtsFilters.endDate ? new Date(debtsFilters.endDate) : null;
      
      if (startDate && debtDate < startDate) return false;
      if (endDate && debtDate > endDate) return false;
      if (debtsFilters.customerName && !debt.customer_name.toLowerCase().includes(debtsFilters.customerName.toLowerCase())) return false;
      if (debtsFilters.adminName && debt.admin?.name !== debtsFilters.adminName) return false;
      if (debtsFilters.status && debt.status !== debtsFilters.status) return false;
      return true;
    });
  };

  // Fungsi cetak PDF
  const handlePrintReport = async (data, title) => {
    if (!reportRef.current) return;
    
    try {
      const html2canvas = (await import('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js')).default;
      const pdf = new jsPDF();
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 10, 10, 190, 0);
      pdf.save(`${title}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Gagal generate PDF. Silakan coba lagi.');
    }
  };

  const toggleVoucherSelection = (code) => {
    setSaleForm(prev => ({
      ...prev,
      voucherCodes: prev.voucherCodes.includes(code)
        ? prev.voucherCodes.filter(c => c !== code)
        : [...prev.voucherCodes, code]
    }));
  };

  const getAdminSales = (adminId) => {
    return sales.filter(s => s.sold_by === adminId);
  };

  const getAdminDebts = (adminId) => {
    return debts.filter(d => d.admin_id === adminId);
  };

  const getTotalRevenue = (adminId = null) => {
    const relevantSales = adminId ? getAdminSales(adminId) : sales;
    return relevantSales.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + s.amount, 0);
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
            onPrintReport={() => handlePrintReport(sales, 'Laporan Dashboard')}
            reportRef={reportRef}
          />
        )}

        {activeTab === 'sell' && (
          <SellTab
            vouchers={vouchers}
            saleForm={saleForm}
            setSaleForm={setSaleForm}
            handleSellVoucher={handleSellVoucher}
            getAvailableVouchers={getAvailableVouchers}
            toggleVoucherSelection={toggleVoucherSelection}
          />
        )}

        {activeTab === 'sales' && (
          <SalesTab
            currentUser={currentUser}
            sales={filterSales(currentUser.role === 'superadmin' ? sales : getAdminSales(currentUser.id))}
            admins={admins}
            filters={salesFilters}
            setFilters={setSalesFilters}
            onPrintReport={() => handlePrintReport(filterSales(currentUser.role === 'superadmin' ? sales : getAdminSales(currentUser.id)), 'Laporan Penjualan')}
            reportRef={reportRef}
          />
        )}

        {activeTab === 'debts' && (
          <DebtsTab
            currentUser={currentUser}
            debts={filterDebts(currentUser.role === 'superadmin' ? debts : getAdminDebts(currentUser.id))}
            filters={debtsFilters}
            setFilters={setDebtsFilters}
            setSelectedDebt={setSelectedDebt}
            setShowDebtPaymentModal={setShowDebtPaymentModal}
            onPrintReport={() => handlePrintReport(filterDebts(currentUser.role === 'superadmin' ? debts : getAdminDebts(currentUser.id)), 'Laporan Hutang')}
            reportRef={reportRef}
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

      {showVoucherDisplay && soldVouchers.length > 0 && (
        <Modal 
          title="Voucher Berhasil Dijual!" 
          onClose={() => setShowVoucherDisplay(false)}
        >
          <div className="space-y-4">
            <div ref={voucherCardRef} className="space-y-4">
              {soldVouchers.map((voucher, idx) => (
                <div key={idx} className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
                  <div className="text-center mb-4">
                    <div className="bg-white bg-opacity-20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                      <Package className="h-8 w-8" />
                    </div>
                    <h2 className="text-xl font-bold">Voucher WiFi #{idx + 1}</h2>
                    <p className="text-indigo-100">HARIAN-OGROG</p>
                  </div>

                  <div className="bg-white bg-opacity-20 rounded-xl p-4 mb-3 backdrop-blur-sm">
                    <div className="space-y-3">
                      <div>
                        <p className="text-indigo-100 text-xs mb-1">Username</p>
                        <p className="text-2xl font-bold font-mono tracking-wider">{voucher.username}</p>
                      </div>
                      <div>
                        <p className="text-indigo-100 text-xs mb-1">Password</p>
                        <p className="text-2xl font-bold font-mono tracking-wider">{voucher.password}</p>
                      </div>
                    </div>
                  </div>

                  <div className="text-center text-xs text-indigo-100">
                    <p>Untuk: {voucher.customerName}</p>
                    <p className="mt-1">{new Date(voucher.soldAt).toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                  </div>
                </div>
              ))}
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
              <p className="text-sm text-gray-600">Pelanggan: <strong>{selectedDebt.customer_name}</strong></p>
              <p className="text-sm text-gray-600">Telepon: <strong>{selectedDebt.customer_phone}</strong></p>
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
      </div>
    </div>
  );
};

const DashboardTab = ({ currentUser, vouchers, sales, debts, admins, getTotalRevenue, getTotalDebtAmount, getAvailableVouchers, getAdminSales, getAdminDebts, onPrintReport, reportRef }) => {
  const isSuperadmin = currentUser.role === 'superadmin';
  const myRevenue = getTotalRevenue(currentUser.id);
  const myDebt = getTotalDebtAmount(currentUser.id);
  const totalRevenue = getTotalRevenue();
  const totalDebt = getTotalDebtAmount();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        <button
          onClick={onPrintReport}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 text-sm md:text-base"
        >
          <Printer className="h-5 w-5" />
          Cetak Laporan
        </button>
      </div>
      
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
        <div ref={reportRef} className="bg-white rounded-xl shadow-md p-6">
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
                  const adminRevenue = adminSales.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + s.amount, 0);
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
            .slice(0, 5)
            .map(sale => (
              <div key={sale.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">Voucher: {sale.voucher_code}</p>
                  <p className="text-sm text-gray-600">
                    {sale.payment_method === 'cash' ? '💵 Cash' : '📋 Hutang'} • {sale.admin?.name || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(sale.sold_at).toLocaleString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">Rp {sale.amount.toLocaleString('id-ID')}</p>
                  {sale.customer_name !== '-' && (
                    <p className="text-xs text-gray-600">{sale.customer_name}</p>
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

const SellTab = ({ vouchers, saleForm, setSaleForm, handleSellVoucher, getAvailableVouchers, toggleVoucherSelection }) => {
  const availableVouchers = getAvailableVouchers();
  const totalAmount = saleForm.voucherCodes.length * 1000;

  return (
    <div className="bg-white rounded-xl shadow-md p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Jual Voucher</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pilih Voucher ({availableVouchers.length} tersedia) - Dipilih: {saleForm.voucherCodes.length}
          </label>
          <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2">
            {availableVouchers.map(v => (
              <div
                key={v.id}
                onClick={() => toggleVoucherSelection(v.code)}
                className={`p-3 rounded-lg cursor-pointer transition ${
                  saleForm.voucherCodes.includes(v.code)
                    ? 'bg-indigo-100 border-2 border-indigo-500'
                    : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-800">{v.code}</p>
                    <p className="text-sm text-gray-600">Username & Password: {v.username}</p>
                  </div>
                  {saleForm.voucherCodes.includes(v.code) && (
                    <CheckCircle className="h-6 w-6 text-indigo-600" />
                  )}
                </div>
              </div>
            ))}
            {availableVouchers.length === 0 && (
              <p className="text-center text-gray-500 py-4">Tidak ada voucher tersedia</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Nama Pelanggan</label>
          <input
            type="text"
            value={saleForm.customerName}
            onChange={(e) => setSaleForm({ ...saleForm, customerName: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="Masukkan nama pelanggan"
          />
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
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm font-medium text-red-800 mb-3">Nomor telepon diperlukan untuk pembayaran hutang</p>
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
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-700">Jumlah Voucher:</span>
            <span className="font-bold text-gray-800">{saleForm.voucherCodes.length}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-700">Harga per Voucher:</span>
            <span className="font-medium text-gray-800">Rp 1.000</span>
          </div>
          <div className="border-t border-gray-300 pt-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-gray-700">Total Harga:</span>
              <span className="text-2xl font-bold text-indigo-600">Rp {totalAmount.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleSellVoucher}
          disabled={saleForm.voucherCodes.length === 0}
          className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Proses Penjualan
        </button>
      </div>
    </div>
  );
};

const SalesTab = ({ currentUser, sales, admins, filters, setFilters, onPrintReport, reportRef }) => {
  const isSuperadmin = currentUser.role === 'superadmin';

  return (
    <div className="bg-white rounded-xl shadow-md p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">Riwayat Penjualan</h2>
        <button
          onClick={onPrintReport}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 text-sm md:text-base"
        >
          <Printer className="h-5 w-5" />
          Cetak Laporan
        </button>
      </div>

      {/* Filter Section */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-700 mb-4 flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filter
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Akhir</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pelanggan</label>
            <input
              type="text"
              value={filters.customerName}
              onChange={(e) => setFilters({ ...filters, customerName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
              placeholder="Cari nama..."
            />
          </div>
          {isSuperadmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Admin</label>
              <select
                value={filters.adminName}
                onChange={(e) => setFilters({ ...filters, adminName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="">Semua Admin</option>
                {admins.map(admin => (
                  <option key={admin.id} value={admin.name}>{admin.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Metode Pembayaran</label>
            <select
              value={filters.paymentMethod}
              onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="">Semua</option>
              <option value="cash">Cash</option>
              <option value="hutang">Hutang</option>
            </select>
          </div>
        </div>
      </div>

      <div ref={reportRef} className="overflow-x-auto">
        {sales.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Belum ada riwayat penjualan</p>
          </div>
        ) : (
          <table className="w-full min-w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Tanggal & Jam</th>
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
              {sales.map(sale => (
                <tr key={sale.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm">
                    {new Date(sale.sold_at).toLocaleString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="py-3 px-4 font-medium">{sale.voucher_code}</td>
                  <td className="py-3 px-4 font-mono text-sm bg-gray-50 rounded">{sale.voucher_username}</td>
                  {isSuperadmin && (
                    <td className="py-3 px-4">{sale.admin?.name || 'N/A'}</td>
                  )}
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      sale.payment_method === 'cash'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {sale.payment_method === 'cash' ? '💵 Cash' : '📋 Hutang'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {sale.customer_name !== '-' ? (
                      <div>
                        <p className="font-medium">{sale.customer_name}</p>
                        <p className="text-gray-500 text-xs">{sale.customer_phone}</p>
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
        )}
      </div>
    </div>
  );
};

const DebtsTab = ({ currentUser, debts, filters, setFilters, setSelectedDebt, setShowDebtPaymentModal, onPrintReport, reportRef }) => {
  const isSuperadmin = currentUser.role === 'superadmin';
  const unpaidDebts = debts.filter(d => d.status !== 'paid');
  const paidDebts = debts.filter(d => d.status === 'paid');

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-4 md:p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">Data Hutang Belum Lunas</h2>
          <button
            onClick={onPrintReport}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 text-sm md:text-base"
          >
            <Printer className="h-5 w-5" />
            Cetak Laporan
          </button>
        </div>

        {/* Filter Section */}
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-700 mb-4 flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Akhir</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pelanggan</label>
              <input
                type="text"
                value={filters.customerName}
                onChange={(e) => setFilters({ ...filters, customerName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                placeholder="Cari nama..."
              />
            </div>
            {isSuperadmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Admin</label>
                <select
                  value={filters.adminName}
                  onChange={(e) => setFilters({ ...filters, adminName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="">Semua Admin</option>
                  {Array.from(new Set(debts.map(d => d.admin?.name).filter(Boolean))).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status Hutang</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="">Semua Status</option>
                <option value="unpaid">Belum Bayar</option>
                <option value="partial">Cicilan</option>
                <option value="paid">Lunas</option>
              </select>
            </div>
          </div>
        </div>

        <div ref={reportRef}>
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
                      <h3 className="font-bold text-gray-800">{debt.customer_name}</h3>
                      <p className="text-sm text-gray-600">{debt.customer_phone}</p>
                      {isSuperadmin && (
                        <p className="text-xs text-gray-500 mt-1">Admin: {debt.admin?.name || 'N/A'}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(debt.created_at).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
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

                  {debt.payments && debt.payments.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-700 mb-1">Riwayat Pembayaran:</p>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {debt.payments.map(payment => (
                          <div key={payment.id} className="text-xs bg-white p-2 rounded">
                            <div className="flex justify-between">
                              <span>Rp {payment.amount.toLocaleString('id-ID')}</span>
                              <span className="text-gray-500">
                                {new Date(payment.paid_at).toLocaleDateString('id-ID')}
                              </span>
                            </div>
                            <p className="text-gray-500">Diterima: {payment.received_by}</p>
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
      </div>

      {paidDebts.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Hutang Lunas</h2>
          <div className="space-y-3">
            {paidDebts.map(debt => (
              <div key={debt.id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                <div>
                  <p className="font-medium text-gray-800">{debt.customer_name}</p>
                  <p className="text-sm text-gray-600">{debt.customer_phone}</p>
                  {isSuperadmin && (
                    <p className="text-xs text-gray-500">Admin: {debt.admin?.name || 'N/A'}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    {new Date(debt.created_at).toLocaleDateString('id-ID')}
                  </p>
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