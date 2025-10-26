import React, { useState, useEffect, useRef } from 'react';
import { Users, Package, DollarSign, FileText, Plus, Eye, Trash2, Edit2, CheckCircle, XCircle, History, Download, Camera, Filter, Calendar, Printer, Search, User, Phone, Menu, X, ChevronDown, ChevronUp, ShoppingCart } from 'lucide-react';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import jsPDF from 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm';
import html2canvas from 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // State untuk customer suggestions
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);

  // Ref untuk UI
  const voucherCardRef = useRef(null);
  const reportRef = useRef(null);

  // Load data dari database dengan persistensi login
  useEffect(() => {
    const loadInitialData = async () => {
      const savedUser = localStorage.getItem('currentUser');
      
      try {
        setLoading(true);
        
        // Load semua data
        const { data: vouchersData, error: vouchersError } = await supabase
          .from('vouchers')
          .select('*')
          .order('code');
        
        if (vouchersError) throw vouchersError;
        setVouchers(vouchersData || []);

        const { data: adminsData, error: adminsError } = await supabase
          .from('admins')
          .select('*');
        
        if (adminsError) throw adminsError;
        setAdmins(adminsData || []);

        const { data: salesData, error: salesError } = await supabase
          .from('sales')
          .select(`
            *,
            admin:admins(name)
          `)
          .order('sold_at', { ascending: false });
        
        if (salesError) throw salesError;
        setSales(salesData || []);

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

        // Auto-login jika user tersimpan
        if (savedUser) {
          const user = JSON.parse(savedUser);
          const validUser = adminsData.find(a => a.id === user.id && a.username === user.username);
          
          if (validUser) {
            setCurrentUser(validUser);
          } else {
            localStorage.removeItem('currentUser');
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        alert('Gagal memuat data: ' + error.message);
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Update customer suggestions
  useEffect(() => {
    const names = getCustomerNames();
    setCustomerSuggestions(names);
  }, [sales, debts]);

  // Fungsi untuk mendapatkan daftar nama pelanggan unik
  const getCustomerNames = () => {
    const names = new Set();
    
    sales.forEach(sale => {
      if (sale.customer_name && sale.customer_name !== '-') {
        names.add(sale.customer_name);
      }
    });
    
    debts.forEach(debt => {
      if (debt.customer_name) {
        names.add(debt.customer_name);
      }
    });
    
    return Array.from(names).sort();
  };

  // Fungsi untuk filter suggestions
  const getFilteredSuggestions = (input) => {
    if (!input) return customerSuggestions.slice(0, 5);
    return customerSuggestions.filter(name => 
      name.toLowerCase().includes(input.toLowerCase())
    ).slice(0, 5);
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
    setMobileMenuOpen(false);
  };

  const handleAddAdmin = async () => {
    if (!adminForm.name || !adminForm.username || !adminForm.password) {
      alert('Semua field harus diisi!');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('admins')
        .insert([{
          name: adminForm.name,
          username: adminForm.username,
          password: adminForm.password,
          role: 'admin'
        }])
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

      // Jika hutang, create debt record
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
      const soldVouchersData = selectedVouchers.map(v => ({
        username: v.username,
        password: v.password,
        customerName: saleForm.customerName || 'Pelanggan',
        soldAt: soldAt
      }));
      
      setSoldVouchers(soldVouchersData);
      setShowVoucherDisplay(true);
      setShowSaleModal(false);

      setSaleForm({ voucherCodes: [], paymentMethod: 'cash', customerName: '', customerPhone: '' });

      // Auto download screenshot setelah modal muncul
      setTimeout(() => {
        handleAutoScreenshot(soldVouchersData);
      }, 1000);

    } catch (error) {
      console.error('Error selling voucher:', error);
      alert('Gagal melakukan penjualan: ' + error.message);
    }
  };

  // Fungsi baru untuk auto screenshot
  const handleAutoScreenshot = async (vouchersData) => {
    if (!vouchersData || vouchersData.length === 0) return;

    try {
      // Buat elemen temporary untuk screenshot
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '400px';
      tempContainer.style.background = 'white';
      tempContainer.style.padding = '20px';
      tempContainer.style.zIndex = '9999';
      
      // Clone dan modifikasi konten voucher untuk screenshot
      const voucherCards = vouchersData.map((voucher, idx) => `
        <div style="background: linear-gradient(135deg, #8B5CF6 0%, #D946EF 100%); border-radius: 16px; padding: 20px; color: white; margin-bottom: 16px;">
          <div style="text-align: center; margin-bottom: 16px;">
            <div style="background: rgba(255,255,255,0.2); border-radius: 50%; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
              <span style="font-size: 20px;">📶</span>
            </div>
            <h2 style="font-size: 18px; font-weight: bold; margin: 0;">Voucher WiFi #${idx + 1}</h2>
            <p style="color: #f0abfc; font-size: 12px; margin: 4px 0 0 0;">wifisekre.net</p>
          </div>

          <div style="background: rgba(255,255,255,0.2); border-radius: 12px; padding: 16px; margin-bottom: 12px; backdrop-filter: blur(10px);">
            <div style="margin-bottom: 12px;">
              <p style="color: #f0abfc; font-size: 11px; margin: 0 0 4px 0;">Username</p>
              <p style="font-size: 20px; font-weight: bold; font-family: monospace; letter-spacing: 2px; margin: 0; word-break: break-all;">${voucher.username}</p>
            </div>
            <div>
              <p style="color: #f0abfc; font-size: 11px; margin: 0 0 4px 0;">Password</p>
              <p style="font-size: 20px; font-weight: bold; font-family: monospace; letter-spacing: 2px; margin: 0; word-break: break-all;">${voucher.password}</p>
            </div>
          </div>

          <div style="text-align: center; font-size: 11px; color: #f0abfc;">
            <p style="margin: 0;">Untuk: ${voucher.customerName}</p>
            <p style="margin: 4px 0 0 0;">${new Date(voucher.soldAt).toLocaleDateString('id-ID', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>
        </div>
      `).join('');

      tempContainer.innerHTML = voucherCards;
      document.body.appendChild(tempContainer);

      // Ambil screenshot
      const canvas = await html2canvas(tempContainer, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true
      });
      
      // Download screenshot
      const link = document.createElement('a');
      link.download = `voucher-wifi-${new Date().getTime()}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Hapus temporary container
      document.body.removeChild(tempContainer);

    } catch (error) {
      console.error('Error auto screenshot:', error);
      // Tetap tampilkan modal meski screenshot gagal
      console.log('Gagal auto screenshot, user masih bisa screenshot manual');
    }
  };

  const handleScreenshotVoucher = async () => {
    if (!voucherCardRef.current) return;

    try {
      // Buat container temporary untuk screenshot yang lebih baik
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '400px';
      tempContainer.style.background = 'white';
      tempContainer.style.padding = '20px';
      tempContainer.style.zIndex = '9999';
      
      // Clone konten dari voucherCardRef
      tempContainer.innerHTML = voucherCardRef.current.innerHTML;
      document.body.appendChild(tempContainer);

      const canvas = await html2canvas(tempContainer, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true
      });
      
      const link = document.createElement('a');
      link.download = `vouchers-${new Date().getTime()}.png`;
      link.href = canvas.toDataURL();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      document.body.removeChild(tempContainer);
    } catch (error) {
      console.error('Error taking screenshot:', error);
      alert('Gagal mengambil screenshot. Silakan screenshot manual.');
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

  const loadData = async () => {
    try {
      setLoading(true);
      
      const { data: vouchersData, error: vouchersError } = await supabase
        .from('vouchers')
        .select('*')
        .order('code');
      
      if (vouchersError) throw vouchersError;
      setVouchers(vouchersData || []);

      const { data: adminsData, error: adminsError } = await supabase
        .from('admins')
        .select('*');
      
      if (adminsError) throw adminsError;
      setAdmins(adminsData || []);

      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          admin:admins(name)
        `)
        .order('sold_at', { ascending: false });
      
      if (salesError) throw salesError;
      setSales(salesData || []);

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

  const handlePrintReport = async (data, title) => {
    try {
      if (typeof window.jsPDF === 'undefined') {
        throw new Error('Library PDF tidak tersedia');
      }

      const pdf = new window.jsPDF('p', 'mm', 'a4');
      
      // Judul
      pdf.setFontSize(18);
      pdf.setTextColor(40, 40, 40);
      pdf.text(title, 105, 20, { align: 'center' });
      
      // Informasi metadata
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 30);
      pdf.text(`Oleh: ${currentUser.name}`, 14, 36);
      pdf.text(`Total Data: ${data.length}`, 14, 42);
      
      let yPosition = 55;
      let totalAmount = 0;
      let totalCash = 0;
      let totalDebt = 0;

      if (title.includes('Penjualan') || title.includes('Dashboard')) {
        data.forEach(sale => {
          totalAmount += sale.amount || 0;
          if (sale.payment_method === 'cash') {
            totalCash += sale.amount || 0;
          } else {
            totalDebt += sale.amount || 0;
          }
        });

        // Data penjualan
        data.forEach((sale, index) => {
          if (yPosition > 270) {
            pdf.addPage();
            yPosition = 20;
          }
          
          pdf.setFontSize(9);
          pdf.text(`${index + 1}. ${sale.voucher_code} - ${sale.customer_name}`, 14, yPosition);
          yPosition += 5;
          pdf.text(`   ${new Date(sale.sold_at).toLocaleDateString('id-ID')} - ${sale.payment_method === 'cash' ? 'Cash' : 'Hutang'} - Rp ${(sale.amount || 0).toLocaleString('id-ID')}`, 14, yPosition);
          yPosition += 8;
        });

        // Total
        yPosition += 5;
        pdf.setFontSize(11);
        pdf.setFont(undefined, 'bold');
        pdf.text('TOTAL PENJUALAN:', 14, yPosition);
        yPosition += 7;
        pdf.text(`Total Semua: Rp ${totalAmount.toLocaleString('id-ID')}`, 14, yPosition);
        yPosition += 5;
        pdf.setTextColor(0, 128, 0);
        pdf.text(`Total Cash: Rp ${totalCash.toLocaleString('id-ID')}`, 14, yPosition);
        yPosition += 5;
        pdf.setTextColor(200, 0, 0);
        pdf.text(`Total Hutang: Rp ${totalDebt.toLocaleString('id-ID')}`, 14, yPosition);
      }

      pdf.save(`${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Gagal membuat PDF: ' + error.message);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-yellow-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data...</p>
          <p className="text-sm text-gray-500 mt-2">Silakan tunggu sebentar</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-yellow-50">
      {/* Mobile Header */}
      <nav className="bg-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-purple-600" />
              <span className="ml-2 text-xl font-bold text-gray-800 hidden sm:block">wifisekre.net</span>
              <span className="ml-2 text-xl font-bold text-gray-800 sm:hidden">wifisekre.net</span>
            </div>
            
            {/* Desktop User Info */}
            <div className="hidden md:flex items-center space-x-4">
              <span className="text-gray-700 text-sm">
                <strong>{currentUser.name}</strong> ({currentUser.role})
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm"
              >
                Logout
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center space-x-2">
              <span className="text-sm text-gray-700">{currentUser.name}</span>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 px-3 py-4">
            <div className="space-y-2">
              <button
                onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition ${
                  activeTab === 'dashboard'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📊 Dashboard
              </button>
              <button
                onClick={() => { setActiveTab('sell'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition ${
                  activeTab === 'sell'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                💳 Jual Voucher
              </button>
              <button
                onClick={() => { setActiveTab('sales'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition ${
                  activeTab === 'sales'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📈 Riwayat Penjualan
              </button>
              <button
                onClick={() => { setActiveTab('debts'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition ${
                  activeTab === 'debts'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                💰 Data Hutang
              </button>
              {currentUser.role === 'superadmin' && (
                <button
                  onClick={() => { setActiveTab('admins'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition ${
                    activeTab === 'admins'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  👥 Kelola Admin
                </button>
              )}
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        )}
      </nav>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
        {/* Desktop Tabs */}
        <div className="hidden md:flex mb-6 flex-wrap gap-2">
          <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon="📊">
            Dashboard
          </TabButton>
          <TabButton active={activeTab === 'sell'} onClick={() => setActiveTab('sell')} icon="💳">
            Jual Voucher
          </TabButton>
          <TabButton active={activeTab === 'sales'} onClick={() => setActiveTab('sales')} icon="📈">
            Riwayat Penjualan
          </TabButton>
          <TabButton active={activeTab === 'debts'} onClick={() => setActiveTab('debts')} icon="💰">
            Data Hutang
          </TabButton>
          {currentUser.role === 'superadmin' && (
            <TabButton active={activeTab === 'admins'} onClick={() => setActiveTab('admins')} icon="👥">
              Kelola Admin
            </TabButton>
          )}
        </div>

        {/* Mobile Current Tab Indicator */}
        <div className="md:hidden mb-4">
          <div className="bg-white rounded-lg shadow-sm p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-800">
                {activeTab === 'dashboard' && '📊 Dashboard'}
                {activeTab === 'sell' && '💳 Jual Voucher'}
                {activeTab === 'sales' && '📈 Riwayat Penjualan'}
                {activeTab === 'debts' && '💰 Data Hutang'}
                {activeTab === 'admins' && '👥 Kelola Admin'}
              </span>
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="min-h-[calc(100vh-200px)]">
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
              customerSuggestions={customerSuggestions}
              getFilteredSuggestions={getFilteredSuggestions}
              sales={sales}
              showNameSuggestions={showNameSuggestions}
              setShowNameSuggestions={setShowNameSuggestions}
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
      </div>

      {/* Floating Action Button untuk Mobile - Jual Voucher */}
      <div className="md:hidden fixed bottom-6 right-6 z-30">
        <button
          onClick={() => setActiveTab('sell')}
          className="w-16 h-16 bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 text-white rounded-full shadow-2xl flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 animate-bounce"
          style={{
            boxShadow: '0 8px 25px rgba(139, 92, 246, 0.5)'
          }}
        >
          <ShoppingCart className="h-8 w-8" />
        </button>
        <div className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
          {getAvailableVouchers().length}
        </div>
      </div>

      {/* Modals */}
      {showAdminModal && (
        <Modal title="Tambah Admin Baru" onClose={() => setShowAdminModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
              <input
                type="text"
                value={adminForm.name}
                onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-base"
                placeholder="Nama lengkap admin"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={adminForm.username}
                onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-base"
                placeholder="Username untuk login"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={adminForm.password}
                onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-base"
                placeholder="Password untuk login"
              />
            </div>
            <button
              onClick={handleAddAdmin}
              className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
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
          size="large"
        >
          <div className="space-y-4">
            <div ref={voucherCardRef} className="space-y-4 max-h-96 overflow-y-auto bg-white p-4 rounded-lg" style={{ minWidth: '350px' }}>
              {soldVouchers.map((voucher, idx) => (
                <div 
                  key={idx} 
                  className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-6 text-white shadow-lg"
                  style={{ minWidth: '320px' }}
                >
                  <div className="text-center mb-4">
                    <div className="bg-white bg-opacity-20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                      <Package className="h-8 w-8" />
                    </div>
                    <h2 className="text-xl font-bold">Voucher WiFi #${idx + 1}</h2>
                    <p className="text-purple-200 text-sm">wifisekre.net</p>
                  </div>

                  <div className="bg-white bg-opacity-20 rounded-xl p-4 mb-4 backdrop-blur-sm">
                    <div className="space-y-3">
                      <div>
                        <p className="text-purple-200 text-xs mb-1">Username</p>
                        <p className="text-2xl font-bold font-mono tracking-wider break-all">{voucher.username}</p>
                      </div>
                      <div>
                        <p className="text-purple-200 text-xs mb-1">Password</p>
                        <p className="text-2xl font-bold font-mono tracking-wider break-all">{voucher.password}</p>
                      </div>
                    </div>
                  </div>

                  <div className="text-center text-xs text-purple-200">
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
                className="px-4 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition flex items-center justify-center gap-2 text-sm"
              >
                <Download className="h-4 w-4" />
                Download Ulang
              </button>
              <button
                onClick={() => setShowVoucherDisplay(false)}
                className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm"
              >
                Tutup
              </button>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="text-sm text-purple-800">
                ✅ <strong>Auto Download Berhasil!</strong> Screenshot voucher telah otomatis terdownload.
                Gunakan tombol "Download Ulang" jika perlu download lagi.
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-base"
                placeholder="Masukkan jumlah pembayaran"
              />
            </div>
            <button
              onClick={handlePayDebt}
              className="w-full px-4 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition font-medium"
            >
              Proses Pembayaran
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// Komponen TabButton untuk reusable tab
const TabButton = ({ active, onClick, icon, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2.5 rounded-lg font-medium transition text-sm ${
      active
        ? 'bg-purple-600 text-white shadow-md'
        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
    }`}
  >
    <span className="hidden sm:inline">{icon} </span>
    {children}
  </button>
);

// Komponen Login Page
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-yellow-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Package className="h-16 w-16 text-purple-600 mx-auto mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">wifisekre.net</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Sistem Manajemen Penjualan Voucher</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base"
              required
              placeholder="Masukkan username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base"
              required
              placeholder="Masukkan password"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition text-base"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

// Komponen Dashboard Tab
const DashboardTab = ({ currentUser, vouchers, sales, debts, admins, getTotalRevenue, getTotalDebtAmount, getAvailableVouchers, getAdminSales, getAdminDebts, onPrintReport, reportRef }) => {
  const isSuperadmin = currentUser.role === 'superadmin';
  const myRevenue = getTotalRevenue(currentUser.id);
  const myDebt = getTotalDebtAmount(currentUser.id);
  const totalRevenue = getTotalRevenue();
  const totalDebt = getTotalDebtAmount();

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Dashboard</h2>
        <button
          onClick={onPrintReport}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2 text-sm w-full sm:w-auto justify-center"
        >
          <Printer className="h-4 w-4" />
          Cetak Laporan
        </button>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={<Package className="h-6 w-6 sm:h-8 sm:w-8" />}
          title="Voucher Tersedia"
          value={getAvailableVouchers().length}
          color="bg-purple-500"
          compact
        />
        <StatCard
          icon={<DollarSign className="h-6 w-6 sm:h-8 sm:w-8" />}
          title={isSuperadmin ? "Total Pendapatan" : "Pendapatan Saya"}
          value={`Rp ${(isSuperadmin ? totalRevenue : myRevenue).toLocaleString('id-ID')}`}
          color="bg-yellow-500"
          compact
        />
        <StatCard
          icon={<FileText className="h-6 w-6 sm:h-8 sm:w-8" />}
          title={isSuperadmin ? "Total Hutang" : "Hutang Saya"}
          value={`Rp ${(isSuperadmin ? totalDebt : myDebt).toLocaleString('id-ID')}`}
          color="bg-red-500"
          compact
        />
        <StatCard
          icon={<Users className="h-6 w-6 sm:h-8 sm:w-8" />}
          title={isSuperadmin ? "Total Penjualan" : "Penjualan Saya"}
          value={isSuperadmin ? sales.length : getAdminSales(currentUser.id).length}
          color="bg-purple-500"
          compact
        />
      </div>

      {/* Recent Sales */}
      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Penjualan Terbaru</h3>
        <div className="space-y-3">
          {(isSuperadmin ? sales : getAdminSales(currentUser.id))
            .slice(0, 5)
            .map(sale => (
              <div key={sale.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate text-sm sm:text-base">Voucher: {sale.voucher_code}</p>
                  <p className="text-xs sm:text-sm text-gray-600">
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
                <div className="text-right ml-3">
                  <p className="font-bold text-green-600 text-sm sm:text-base">Rp {sale.amount.toLocaleString('id-ID')}</p>
                  {sale.customer_name !== '-' && (
                    <p className="text-xs text-gray-600 truncate max-w-[100px]">{sale.customer_name}</p>
                  )}
                </div>
              </div>
            ))}
          {(isSuperadmin ? sales : getAdminSales(currentUser.id)).length === 0 && (
            <p className="text-center text-gray-500 py-6 text-sm">Belum ada penjualan</p>
          )}
        </div>
      </div>

      {/* Admin Performance (Superadmin only) */}
      {isSuperadmin && (
        <div ref={reportRef} className="bg-white rounded-xl shadow-md p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Performa Admin</h3>
          <div className="overflow-x-auto">
            <div className="min-w-full">
              <div className="bg-gray-50 rounded-lg p-3 hidden sm:grid sm:grid-cols-4 gap-4 text-sm font-semibold text-gray-700">
                <div>Nama Admin</div>
                <div className="text-right">Penjualan</div>
                <div className="text-right">Pendapatan Cash</div>
                <div className="text-right">Total Hutang</div>
              </div>
              <div className="space-y-3 sm:space-y-2">
                {admins.filter(a => a.role === 'admin').map(admin => {
                  const adminSales = getAdminSales(admin.id);
                  const adminRevenue = adminSales.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + s.amount, 0);
                  const adminDebts = getAdminDebts(admin.id);
                  const adminDebtTotal = adminDebts.reduce((sum, d) => sum + d.remaining, 0);
                  
                  return (
                    <div key={admin.id} className="bg-gray-50 rounded-lg p-3 sm:p-0 sm:bg-transparent sm:grid sm:grid-cols-4 sm:gap-4 sm:items-center hover:bg-gray-50">
                      {/* Mobile View */}
                      <div className="sm:hidden space-y-2">
                        <div className="font-medium text-gray-800">{admin.name}</div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Penjualan:</span>
                          <span>{adminSales.length} voucher</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Pendapatan:</span>
                          <span className="text-green-600">Rp {adminRevenue.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Hutang:</span>
                          <span className="text-red-600">Rp {adminDebtTotal.toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                      
                      {/* Desktop View */}
                      <div className="hidden sm:block py-3">{admin.name}</div>
                      <div className="hidden sm:block text-right py-3">{adminSales.length} voucher</div>
                      <div className="hidden sm:block text-right py-3 text-green-600 font-medium">
                        Rp {adminRevenue.toLocaleString('id-ID')}
                      </div>
                      <div className="hidden sm:block text-right py-3 text-red-600 font-medium">
                        Rp {adminDebtTotal.toLocaleString('id-ID')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Komponen Sell Tab dengan Autocomplete
const SellTab = ({ 
  vouchers, 
  saleForm, 
  setSaleForm, 
  handleSellVoucher, 
  getAvailableVouchers, 
  toggleVoucherSelection,
  customerSuggestions,
  getFilteredSuggestions,
  sales,
  showNameSuggestions,
  setShowNameSuggestions
}) => {
  const availableVouchers = getAvailableVouchers();
  const totalAmount = saleForm.voucherCodes.length * 1000;

  // Dapatkan suggestions berdasarkan input
  const nameSuggestions = getFilteredSuggestions(saleForm.customerName);

  // Fungsi untuk memilih suggestion nama
  const selectNameSuggestion = (name) => {
    setSaleForm({ ...saleForm, customerName: name });
    setShowNameSuggestions(false);
    
    // Auto-fill nomor telepon jika tersedia di data
    const relatedSale = sales.find(s => s.customer_name === name);
    if (relatedSale && relatedSale.customer_phone && relatedSale.customer_phone !== '-') {
      setSaleForm(prev => ({ ...prev, customerPhone: relatedSale.customer_phone }));
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 max-w-4xl mx-auto">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6">Jual Voucher</h2>
      
      <div className="space-y-6">
        {/* Voucher Selection */}
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
                    ? 'bg-purple-100 border-2 border-purple-500'
                    : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm sm:text-base">{v.code}</p>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">Username & Password: {v.username}</p>
                  </div>
                  {saleForm.voucherCodes.includes(v.code) && (
                    <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 flex-shrink-0 ml-2" />
                  )}
                </div>
              </div>
            ))}
            {availableVouchers.length === 0 && (
              <p className="text-center text-gray-500 py-4 text-sm">Tidak ada voucher tersedia</p>
            )}
          </div>
        </div>

        {/* Customer Name dengan Autocomplete */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">Nama Pelanggan</label>
          <input
            type="text"
            value={saleForm.customerName}
            onChange={(e) => {
              setSaleForm({ ...saleForm, customerName: e.target.value });
              setShowNameSuggestions(true);
            }}
            onFocus={() => setShowNameSuggestions(true)}
            onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-base"
            placeholder="Ketik nama pelanggan atau pilih dari riwayat"
          />
          
          {/* Dropdown Suggestions */}
          {showNameSuggestions && nameSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              <div className="p-2 text-xs text-gray-500 border-b border-gray-200">
                Pilih dari riwayat pelanggan:
              </div>
              {nameSuggestions.map((name, index) => (
                <div
                  key={index}
                  onClick={() => selectNameSuggestion(name)}
                  className="px-3 py-2 cursor-pointer hover:bg-purple-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium text-gray-800 text-sm">{name}</div>
                  <div className="text-xs text-gray-500">
                    {sales.find(s => s.customer_name === name)?.customer_phone || 'No phone'}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Info tentang suggestions */}
          {customerSuggestions.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              💡 {customerSuggestions.length} pelanggan tersedia dalam riwayat
            </p>
          )}
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Metode Pembayaran</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSaleForm({ ...saleForm, paymentMethod: 'cash' })}
              className={`p-3 sm:p-4 border-2 rounded-lg font-medium transition text-sm ${
                saleForm.paymentMethod === 'cash'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              💵 Cash
            </button>
            <button
              onClick={() => setSaleForm({ ...saleForm, paymentMethod: 'hutang' })}
              className={`p-3 sm:p-4 border-2 rounded-lg font-medium transition text-sm ${
                saleForm.paymentMethod === 'hutang'
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              📋 Hutang
            </button>
          </div>
        </div>

        {/* Phone Number untuk Hutang */}
        {saleForm.paymentMethod === 'hutang' && (
          <div className="p-3 sm:p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm font-medium text-red-800 mb-3">Nomor telepon diperlukan untuk pembayaran hutang</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Telepon</label>
              <input
                type="tel"
                value={saleForm.customerPhone}
                onChange={(e) => setSaleForm({ ...saleForm, customerPhone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-base"
                placeholder="08xxxxxxxxxx"
              />
            </div>
          </div>
        )}

        {/* Total Amount */}
        <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-700 text-sm sm:text-base">Jumlah Voucher:</span>
            <span className="font-bold text-gray-800 text-sm sm:text-base">{saleForm.voucherCodes.length}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-700 text-sm sm:text-base">Harga per Voucher:</span>
            <span className="font-medium text-gray-800 text-sm sm:text-base">Rp 1.000</span>
          </div>
          <div className="border-t border-gray-300 pt-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-base sm:text-lg font-medium text-gray-700">Total Harga:</span>
              <span className="text-xl sm:text-2xl font-bold text-purple-600">Rp {totalAmount.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSellVoucher}
          disabled={saleForm.voucherCodes.length === 0}
          className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-purple-700 text-white rounded-lg font-bold hover:from-purple-600 hover:to-purple-800 transition transform hover:scale-105 disabled:bg-gray-300 disabled:cursor-not-allowed text-lg shadow-lg"
        >
          🚀 PROSES PENJUALAN
        </button>

        {/* Tips */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 sm:p-4">
          <h4 className="font-medium text-purple-800 mb-2 text-sm sm:text-base">💡 Tips Penggunaan</h4>
          <ul className="text-xs sm:text-sm text-purple-700 space-y-1">
            <li>• Ketik nama pelanggan untuk melihat saran dari riwayat</li>
            <li>• Klik nama dari saran untuk mengisi otomatis</li>
            <li>• Login Anda akan tetap tersimpan setelah refresh halaman</li>
            <li>• Screenshot voucher akan otomatis terdownload setelah pembelian</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Komponen Sales Tab
const SalesTab = ({ currentUser, sales, admins, filters, setFilters, onPrintReport, reportRef }) => {
  const isSuperadmin = currentUser.role === 'superadmin';
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Riwayat Penjualan</h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2 text-sm justify-center order-2 sm:order-1"
          >
            <Filter className="h-4 w-4" />
            {showFilters ? 'Sembunyikan Filter' : 'Tampilkan Filter'}
          </button>
          <button
            onClick={onPrintReport}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2 text-sm justify-center order-1 sm:order-2"
          >
            <Printer className="h-4 w-4" />
            Cetak Laporan
          </button>
        </div>
      </div>

      {/* Filter Section */}
      {showFilters && (
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-700 mb-4 flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Akhir</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pelanggan</label>
              <input
                type="text"
                value={filters.customerName}
                onChange={(e) => setFilters({ ...filters, customerName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                placeholder="Cari nama..."
              />
            </div>
            {isSuperadmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Admin</label>
                <select
                  value={filters.adminName}
                  onChange={(e) => setFilters({ ...filters, adminName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
              >
                <option value="">Semua</option>
                <option value="cash">Cash</option>
                <option value="hutang">Hutang</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div ref={reportRef}>
        {sales.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <FileText className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm sm:text-base">Belum ada riwayat penjualan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Mobile View */}
            <div className="sm:hidden space-y-3">
              {sales.map(sale => (
                <div key={sale.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 text-sm">Voucher: {sale.voucher_code}</p>
                      <p className="text-xs text-gray-600 mt-1">Username: {sale.voucher_username}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      sale.payment_method === 'cash'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {sale.payment_method === 'cash' ? '💵 Cash' : '📋 Hutang'}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Tanggal:</span>
                      <span>{new Date(sale.sold_at).toLocaleDateString('id-ID')}</span>
                    </div>
                    {isSuperadmin && (
                      <div className="flex justify-between">
                        <span>Admin:</span>
                        <span>{sale.admin?.name || 'N/A'}</span>
                      </div>
                    )}
                    {sale.customer_name !== '-' && (
                      <>
                        <div className="flex justify-between">
                          <span>Pelanggan:</span>
                          <span>{sale.customer_name}</span>
                        </div>
                        {sale.customer_phone && sale.customer_phone !== '-' && (
                          <div className="flex justify-between">
                            <span>Telepon:</span>
                            <span>{sale.customer_phone}</span>
                          </div>
                        )}
                      </>
                    )}
                    <div className="flex justify-between font-medium">
                      <span>Harga:</span>
                      <span className="text-green-600">Rp {sale.amount.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View */}
            <table className="hidden sm:table w-full min-w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Tanggal & Jam</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Voucher</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Username/Password</th>
                  {isSuperadmin && (
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Dijual Oleh</th>
                  )}
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Pembayaran</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Pelanggan</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700 text-sm">Harga</th>
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
                    <td className="py-3 px-4 font-medium text-sm">{sale.voucher_code}</td>
                    <td className="py-3 px-4 font-mono text-sm bg-gray-50 rounded">{sale.voucher_username}</td>
                    {isSuperadmin && (
                      <td className="py-3 px-4 text-sm">{sale.admin?.name || 'N/A'}</td>
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
                    <td className="py-3 px-4 text-right font-bold text-green-600 text-sm">
                      Rp {sale.amount.toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// Komponen Debts Tab
const DebtsTab = ({ currentUser, debts, filters, setFilters, setSelectedDebt, setShowDebtPaymentModal, onPrintReport, reportRef }) => {
  const isSuperadmin = currentUser.role === 'superadmin';
  const [showFilters, setShowFilters] = useState(false);
  const unpaidDebts = debts.filter(d => d.status !== 'paid');
  const paidDebts = debts.filter(d => d.status === 'paid');

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Data Hutang Belum Lunas</h2>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2 text-sm justify-center order-2 sm:order-1"
            >
              <Filter className="h-4 w-4" />
              {showFilters ? 'Sembunyikan Filter' : 'Tampilkan Filter'}
            </button>
            <button
              onClick={onPrintReport}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2 text-sm justify-center order-1 sm:order-2"
            >
              <Printer className="h-4 w-4" />
              Cetak Laporan
            </button>
          </div>
        </div>

        {/* Filter Section */}
        {showFilters && (
          <div className="mb-6 bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-700 mb-4 flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Akhir</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pelanggan</label>
                <input
                  type="text"
                  value={filters.customerName}
                  onChange={(e) => setFilters({ ...filters, customerName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                  placeholder="Cari nama..."
                />
              </div>
              {isSuperadmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Admin</label>
                  <select
                    value={filters.adminName}
                    onChange={(e) => setFilters({ ...filters, adminName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                >
                  <option value="">Semua Status</option>
                  <option value="unpaid">Belum Bayar</option>
                  <option value="partial">Cicilan</option>
                  <option value="paid">Lunas</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div ref={reportRef}>
          {unpaidDebts.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-green-300 mx-auto mb-4" />
              <p className="text-gray-500 text-sm sm:text-base">Tidak ada hutang yang belum lunas</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {unpaidDebts.map(debt => (
                <div key={debt.id} className="border-2 border-red-200 rounded-lg p-4 bg-red-50">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-800 text-sm sm:text-base">{debt.customer_name}</h3>
                      <p className="text-xs sm:text-sm text-gray-600">{debt.customer_phone}</p>
                      {isSuperadmin && (
                        <p className="text-xs text-gray-500 mt-1">Admin: {debt.admin?.name || 'N/A'}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(debt.created_at).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
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
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-gray-600">Total Hutang:</span>
                      <span className="font-medium">Rp {debt.amount.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-gray-600">Sudah Dibayar:</span>
                      <span className="font-medium text-green-600">Rp {debt.paid.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-sm sm:text-lg font-bold">
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
                    className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition text-sm font-medium"
                  >
                    Bayar Hutang
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Paid Debts Section */}
      {paidDebts.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Hutang Lunas</h2>
          <div className="space-y-3">
            {paidDebts.map(debt => (
              <div key={debt.id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm sm:text-base">{debt.customer_name}</p>
                  <p className="text-xs sm:text-sm text-gray-600">{debt.customer_phone}</p>
                  {isSuperadmin && (
                    <p className="text-xs text-gray-500">Admin: {debt.admin?.name || 'N/A'}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    {new Date(debt.created_at).toLocaleDateString('id-ID')}
                  </p>
                </div>
                <div className="text-right ml-3">
                  <p className="font-bold text-green-600 text-sm sm:text-base">Rp {debt.amount.toLocaleString('id-ID')}</p>
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

// Komponen Admins Tab
const AdminsTab = ({ admins, setShowAdminModal, handleDeleteAdmin }) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Kelola Admin</h2>
        <button
          onClick={() => setShowAdminModal(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2 text-sm w-full sm:w-auto justify-center"
        >
          <Plus className="h-4 w-4" />
          Tambah Admin
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {admins.map(admin => (
          <div key={admin.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-800 text-sm sm:text-base">{admin.name}</h3>
                <p className="text-xs sm:text-sm text-gray-600">@{admin.username}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                admin.role === 'superadmin'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-yellow-100 text-yellow-700'
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

// Komponen StatCard yang Responsif
const StatCard = ({ icon, title, value, color, compact = false }) => {
  return (
    <div className={`bg-white rounded-xl shadow-md ${compact ? 'p-3' : 'p-4 sm:p-6'}`}>
      <div className={`${color} ${compact ? 'w-8 h-8' : 'w-10 h-10 sm:w-12 sm:h-12'} rounded-lg flex items-center justify-center text-white mb-3`}>
        {icon}
      </div>
      <h3 className={`text-gray-600 ${compact ? 'text-xs' : 'text-sm'} font-medium mb-1`}>{title}</h3>
      <p className={`font-bold text-gray-800 ${compact ? 'text-lg' : 'text-xl sm:text-2xl'}`}>{value}</p>
    </div>
  );
};

// Komponen Modal yang Responsif
const Modal = ({ title, children, onClose, size = 'normal' }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50">
      <div className={`bg-white rounded-xl shadow-2xl w-full max-h-[90vh] overflow-y-auto ${
        size === 'large' ? 'max-w-2xl' : 'max-w-md'
      }`}>
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h3 className="text-lg sm:text-xl font-bold text-gray-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition p-1"
          >
            <XCircle className="h-6 w-6" />
          </button>
        </div>
        <div className="p-4 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default WifiVoucherSalesApp;