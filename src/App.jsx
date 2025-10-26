import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Package, DollarSign, FileText, Plus, Eye, Trash2, Edit2, 
  CheckCircle, XCircle, History, Download, Camera, Filter, Calendar, 
  Printer, Search, User, Phone, Menu, X, ChevronDown, ChevronUp, 
  ShoppingCart, Home, CreditCard, BarChart3, Settings, LogOut, Bell,
  AlertCircle, TrendingUp, Wallet, PieChart, Banknote, CreditCard as CreditCardIcon
} from 'lucide-react';
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
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showVoucherDisplay, setShowVoucherDisplay] = useState(false);
  const [showDebtPaymentModal, setShowDebtPaymentModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [soldVouchers, setSoldVouchers] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

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

  // Filter states
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

  // Real-time subscription untuk notifikasi
  useEffect(() => {
    if (!currentUser) return;

    // Subscribe ke perubahan sales
    const salesSubscription = supabase
      .channel('sales_changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'sales' },
        async (payload) => {
          // Ambil data admin untuk notifikasi
          const { data: adminData } = await supabase
            .from('admins')
            .select('name')
            .eq('id', payload.new.sold_by)
            .single();

          // Tambah notifikasi penjualan baru
          const newNotification = {
            id: Date.now(),
            type: 'sale',
            title: 'Penjualan Baru',
            message: `${adminData?.name || 'Admin'} menjual voucher ${payload.new.voucher_code}`,
            adminName: adminData?.name,
            amount: payload.new.amount,
            paymentMethod: payload.new.payment_method,
            timestamp: new Date().toISOString(),
            isNew: true
          };

          setNotifications(prev => [newNotification, ...prev.slice(0, 49)]); // Keep last 50
        }
      )
      .subscribe();

    // Subscribe ke perubahan debts
    const debtsSubscription = supabase
      .channel('debts_changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'debts' },
        async (payload) => {
          const { data: adminData } = await supabase
            .from('admins')
            .select('name')
            .eq('id', payload.new.admin_id)
            .single();

          const newNotification = {
            id: Date.now(),
            type: 'debt',
            title: 'Hutang Baru',
            message: `${adminData?.name || 'Admin'} mencatat hutang ${payload.new.customer_name}`,
            adminName: adminData?.name,
            amount: payload.new.amount,
            customerName: payload.new.customer_name,
            timestamp: new Date().toISOString(),
            isNew: true
          };

          setNotifications(prev => [newNotification, ...prev.slice(0, 49)]);
        }
      )
      .subscribe();

    // Subscribe ke pembayaran hutang
    const paymentsSubscription = supabase
      .channel('payments_changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'debt_payments' },
        async (payload) => {
          // Get debt info
          const { data: debtData } = await supabase
            .from('debts')
            .select('customer_name, admin_id')
            .eq('id', payload.new.debt_id)
            .single();

          const { data: adminData } = await supabase
            .from('admins')
            .select('name')
            .eq('id', payload.new.received_by)
            .single();

          const newNotification = {
            id: Date.now(),
            type: 'payment',
            title: 'Pembayaran Hutang',
            message: `${adminData?.name || 'Admin'} menerima pembayaran dari ${debtData?.customer_name || 'pelanggan'}`,
            adminName: adminData?.name,
            amount: payload.new.amount,
            customerName: debtData?.customer_name,
            timestamp: new Date().toISOString(),
            isNew: true
          };

          setNotifications(prev => [newNotification, ...prev.slice(0, 49)]);
        }
      )
      .subscribe();

    return () => {
      salesSubscription.unsubscribe();
      debtsSubscription.unsubscribe();
      paymentsSubscription.unsubscribe();
    };
  }, [currentUser]);

  // Load data dari database
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

  // Fungsi untuk auto screenshot
  const handleAutoScreenshot = async (vouchersData) => {
    if (!vouchersData || vouchersData.length === 0) return;

    try {
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '400px';
      tempContainer.style.background = 'white';
      tempContainer.style.padding = '20px';
      tempContainer.style.zIndex = '9999';
      
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

      const canvas = await html2canvas(tempContainer, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true
      });
      
      const link = document.createElement('a');
      link.download = `voucher-wifi-${new Date().getTime()}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      document.body.removeChild(tempContainer);

    } catch (error) {
      console.error('Error auto screenshot:', error);
    }
  };

  const handleScreenshotVoucher = async () => {
    if (!voucherCardRef.current) return;

    try {
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '400px';
      tempContainer.style.background = 'white';
      tempContainer.style.padding = '20px';
      tempContainer.style.zIndex = '9999';
      
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
          received_by: currentUser.id,
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

  // FUNGSI BARU: Total Cash Semua Admin
  const getTotalCashAllAdmins = () => {
    return sales
      .filter(sale => sale.payment_method === 'cash')
      .reduce((total, sale) => total + sale.amount, 0);
  };

  // FUNGSI BARU: Total Hutang Semua Admin
  const getTotalDebtAllAdmins = () => {
    return debts.reduce((total, debt) => total + debt.amount, 0);
  };

  // FUNGSI BARU: Total Hutang Belum Lunas Semua Admin
  const getTotalUnpaidDebtAllAdmins = () => {
    return debts.reduce((total, debt) => total + debt.remaining, 0);
  };

  // FUNGSI BARU: Total Terbayar Semua Admin
  const getTotalPaidDebtAllAdmins = () => {
    return debts.reduce((total, debt) => total + debt.paid, 0);
  };

  // Fungsi untuk menghitung total pendapatan per admin
  const getAdminRevenue = (adminId) => {
    const adminSales = sales.filter(s => s.sold_by === adminId);
    const cashSales = adminSales.filter(s => s.payment_method === 'cash');
    const debtSales = adminSales.filter(s => s.payment_method === 'hutang');
    
    const cashRevenue = cashSales.reduce((sum, s) => sum + s.amount, 0);
    const debtRevenue = debtSales.reduce((sum, s) => sum + s.amount, 0);
    const totalRevenue = cashRevenue + debtRevenue;

    return {
      cash: cashRevenue,
      debt: debtRevenue,
      total: totalRevenue,
      salesCount: adminSales.length,
      cashCount: cashSales.length,
      debtCount: debtSales.length
    };
  };

  // Fungsi untuk generate PDF dengan tema ungu-kuning
  const handlePrintReport = async (data, title, type = 'sales') => {
    try {
      if (typeof window.jsPDF === 'undefined') {
        throw new Error('Library PDF tidak tersedia');
      }

      const pdf = new window.jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      let yPosition = 20;

      // Header dengan gradient background ungu
      pdf.setFillColor(139, 92, 246); // Warna ungu
      pdf.rect(0, 0, pageWidth, 25, 'F');
      
      // Logo dan judul
      pdf.setFontSize(16);
      pdf.setTextColor(255, 255, 255);
      pdf.text('Wifisekre.net', pageWidth / 2, 12, { align: 'center' });
      
      pdf.setFontSize(14);
      pdf.text(title, pageWidth / 2, 20, { align: 'center' });

      // Informasi metadata
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 32);
      pdf.text(`Oleh: ${currentUser.name}`, 14, 36);
      pdf.text(`Total Data: ${data.length}`, pageWidth - 14, 32, { align: 'right' });

      yPosition = 45;

      if (type === 'dashboard') {
        // LAPORAN DASHBOARD
        pdf.setFontSize(12);
        pdf.setTextColor(40, 40, 40);
        pdf.text('Ringkasan Keuangan', 14, yPosition);
        yPosition += 10;

        // Statistik utama dengan tema ungu-kuning
        const stats = [
          { 
            label: 'Voucher Tersedia', 
            value: getAvailableVouchers().length.toString(), 
            color: [139, 92, 246], // Ungu
            bgColor: [250, 245, 255]
          },
          { 
            label: 'Total Penjualan', 
            value: `${sales.length} transaksi`, 
            color: [245, 158, 11], // Kuning
            bgColor: [255, 251, 235]
          },
          { 
            label: 'Pendapatan Cash', 
            value: `Rp ${getTotalRevenue().toLocaleString('id-ID')}`, 
            color: [34, 197, 94], // Hijau
            bgColor: [240, 253, 244]
          },
          { 
            label: 'Hutang Belum Lunas', 
            value: `Rp ${getTotalDebtAmount().toLocaleString('id-ID')}`, 
            color: [239, 68, 68], // Merah
            bgColor: [254, 242, 242]
          }
        ];

        stats.forEach((stat, index) => {
          const x = 14 + (index % 2) * 90;
          const y = yPosition + Math.floor(index / 2) * 20;
          
          // Background card
          pdf.setFillColor(...stat.bgColor);
          pdf.roundedRect(x, y, 80, 16, 3, 3, 'F');
          
          // Border dengan warna tema
          pdf.setDrawColor(...stat.color);
          pdf.setLineWidth(0.5);
          pdf.roundedRect(x, y, 80, 16, 3, 3, 'S');
          
          pdf.setFontSize(8);
          pdf.setTextColor(75, 85, 99);
          pdf.text(stat.label, x + 5, y + 6);
          
          pdf.setFontSize(9);
          pdf.setTextColor(...stat.color);
          pdf.setFont(undefined, 'bold');
          pdf.text(stat.value, x + 5, y + 12);
        });

        yPosition += 45;

        // PERFORMANCE ADMIN (Superadmin only)
        if (currentUser.role === 'superadmin') {
          pdf.setFontSize(12);
          pdf.setTextColor(139, 92, 246);
          pdf.text('Performance Admin', 14, yPosition);
          yPosition += 8;

          // Header tabel admin
          pdf.setFillColor(250, 245, 255); // Light purple
          pdf.rect(14, yPosition, pageWidth - 28, 8, 'F');
          pdf.setDrawColor(139, 92, 246);
          pdf.rect(14, yPosition, pageWidth - 28, 8, 'S');
          
          pdf.setFontSize(8);
          pdf.setTextColor(139, 92, 246);
          pdf.setFont(undefined, 'bold');
          pdf.text('Nama Admin', 16, yPosition + 5);
          pdf.text('Penjualan', 70, yPosition + 5, { align: 'right' });
          pdf.text('Cash', 95, yPosition + 5, { align: 'right' });
          pdf.text('Hutang', 120, yPosition + 5, { align: 'right' });
          pdf.text('Total', 150, yPosition + 5, { align: 'right' });
          pdf.text('Status', 180, yPosition + 5, { align: 'right' });
          yPosition += 10;

          pdf.setFont(undefined, 'normal');
          admins.filter(a => a.role === 'admin').forEach((admin, index) => {
            if (yPosition > 250) {
              pdf.addPage();
              yPosition = 20;
            }

            const revenue = getAdminRevenue(admin.id);
            const totalDebt = getTotalDebtAmount(admin.id);
            const statusColor = totalDebt === 0 ? [34, 197, 94] : [245, 158, 11];
            const statusText = totalDebt === 0 ? 'LUNAS' : 'BELUM LUNAS';
            
            const bgColor = index % 2 === 0 ? [255, 255, 255] : [250, 250, 250];
            
            pdf.setFillColor(...bgColor);
            pdf.rect(14, yPosition, pageWidth - 28, 6, 'F');
            
            pdf.setFontSize(7);
            pdf.setTextColor(40, 40, 40);
            pdf.text(admin.name, 16, yPosition + 4);
            pdf.text(revenue.salesCount.toString(), 70, yPosition + 4, { align: 'right' });
            pdf.text(`Rp ${revenue.cash.toLocaleString('id-ID')}`, 95, yPosition + 4, { align: 'right' });
            pdf.text(`Rp ${revenue.debt.toLocaleString('id-ID')}`, 120, yPosition + 4, { align: 'right' });
            pdf.text(`Rp ${revenue.total.toLocaleString('id-ID')}`, 150, yPosition + 4, { align: 'right' });
            
            pdf.setTextColor(...statusColor);
            pdf.text(statusText, 180, yPosition + 4, { align: 'right' });
            
            yPosition += 8;
          });
        }
      } else if (type === 'sales') {
        // LAPORAN PENJUALAN
        let totalCash = 0;
        let totalDebt = 0;
        let cashCount = 0;
        let debtCount = 0;

        data.forEach(sale => {
          if (sale.payment_method === 'cash') {
            totalCash += sale.amount || 0;
            cashCount++;
          } else {
            totalDebt += sale.amount || 0;
            debtCount++;
          }
        });

        const totalAll = totalCash + totalDebt;

        // Ringkasan penjualan dengan tema
        pdf.setFillColor(250, 245, 255);
        pdf.roundedRect(14, yPosition, pageWidth - 28, 25, 3, 3, 'F');
        pdf.setDrawColor(139, 92, 246);
        pdf.roundedRect(14, yPosition, pageWidth - 28, 25, 3, 3, 'S');
        
        pdf.setFontSize(9);
        pdf.setTextColor(139, 92, 246);
        pdf.setFont(undefined, 'bold');
        pdf.text('RINGKASAN PENJUALAN', 20, yPosition + 7);
        
        pdf.setFont(undefined, 'normal');
        pdf.setTextColor(75, 85, 99);
        pdf.text(`Total Transaksi: ${data.length}`, 20, yPosition + 12);
        pdf.text(`Cash: ${cashCount} transaksi`, 20, yPosition + 17);
        pdf.text(`Hutang: ${debtCount} transaksi`, 20, yPosition + 22);
        
        pdf.text(`Total Cash: Rp ${totalCash.toLocaleString('id-ID')}`, 120, yPosition + 12, { align: 'right' });
        pdf.text(`Total Hutang: Rp ${totalDebt.toLocaleString('id-ID')}`, 120, yPosition + 17, { align: 'right' });
        pdf.setTextColor(139, 92, 246);
        pdf.setFont(undefined, 'bold');
        pdf.text(`TOTAL: Rp ${totalAll.toLocaleString('id-ID')}`, 120, yPosition + 22, { align: 'right' });

        yPosition += 35;

        // Header tabel
        pdf.setFillColor(139, 92, 246);
        pdf.rect(14, yPosition, pageWidth - 28, 6, 'F');
        pdf.setFontSize(7);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont(undefined, 'bold');
        pdf.text('NO', 16, yPosition + 4);
        pdf.text('TANGGAL', 25, yPosition + 4);
        pdf.text('VOUCHER', 45, yPosition + 4);
        pdf.text('PELANGGAN', 75, yPosition + 4);
        pdf.text('METODE', 110, yPosition + 4);
        pdf.text('ADMIN', 130, yPosition + 4);
        pdf.text('JUMLAH', 180, yPosition + 4, { align: 'right' });
        yPosition += 8;

        // Data penjualan
        pdf.setFont(undefined, 'normal');
        data.forEach((sale, index) => {
          if (yPosition > 250) {
            pdf.addPage();
            yPosition = 20;
          }

          const bgColor = index % 2 === 0 ? [255, 255, 255] : [250, 250, 250];
          pdf.setFillColor(...bgColor);
          pdf.rect(14, yPosition, pageWidth - 28, 5, 'F');
          
          pdf.setFontSize(6);
          pdf.setTextColor(40, 40, 40);
          pdf.text((index + 1).toString(), 16, yPosition + 3.5);
          pdf.text(new Date(sale.sold_at).toLocaleDateString('id-ID'), 25, yPosition + 3.5);
          pdf.text(sale.voucher_code, 45, yPosition + 3.5);
          pdf.text(sale.customer_name !== '-' ? sale.customer_name : '-', 75, yPosition + 3.5);
          
          // Warna berdasarkan metode pembayaran
          if (sale.payment_method === 'cash') {
            pdf.setTextColor(34, 197, 94);
            pdf.text('CASH', 110, yPosition + 3.5);
          } else {
            pdf.setTextColor(245, 158, 11);
            pdf.text('HUTANG', 110, yPosition + 3.5);
          }
          
          pdf.setTextColor(40, 40, 40);
          pdf.text(sale.admin?.name || 'N/A', 130, yPosition + 3.5);
          pdf.text(`Rp ${(sale.amount || 0).toLocaleString('id-ID')}`, 180, yPosition + 3.5, { align: 'right' });
          
          yPosition += 6;
        });
      } else if (type === 'debts') {
        // LAPORAN HUTANG
        let totalDebt = 0;
        let totalPaid = 0;
        let totalRemaining = 0;
        let unpaidCount = 0;
        let paidCount = 0;
        let partialCount = 0;

        data.forEach(debt => {
          totalDebt += debt.amount;
          totalPaid += debt.paid;
          totalRemaining += debt.remaining;
          
          if (debt.status === 'paid') paidCount++;
          else if (debt.status === 'partial') partialCount++;
          else unpaidCount++;
        });

        // Ringkasan hutang dengan tema
        pdf.setFillColor(255, 251, 235); // Light yellow
        pdf.roundedRect(14, yPosition, pageWidth - 28, 30, 3, 3, 'F');
        pdf.setDrawColor(245, 158, 11); // Yellow
        pdf.roundedRect(14, yPosition, pageWidth - 28, 30, 3, 3, 'S');
        
        pdf.setFontSize(9);
        pdf.setTextColor(245, 158, 11);
        pdf.setFont(undefined, 'bold');
        pdf.text('RINGKASAN HUTANG', 20, yPosition + 7);
        
        pdf.setFont(undefined, 'normal');
        pdf.setTextColor(75, 85, 99);
        pdf.text(`Total Hutang: ${data.length} pelanggan`, 20, yPosition + 12);
        pdf.text(`Lunas: ${paidCount}`, 20, yPosition + 17);
        pdf.text(`Cicilan: ${partialCount}`, 20, yPosition + 22);
        pdf.text(`Belum Bayar: ${unpaidCount}`, 20, yPosition + 27);
        
        pdf.text(`Total Nilai: Rp ${totalDebt.toLocaleString('id-ID')}`, 120, yPosition + 12, { align: 'right' });
        pdf.text(`Total Terbayar: Rp ${totalPaid.toLocaleString('id-ID')}`, 120, yPosition + 17, { align: 'right' });
        pdf.setTextColor(239, 68, 68);
        pdf.setFont(undefined, 'bold');
        pdf.text(`Sisa Hutang: Rp ${totalRemaining.toLocaleString('id-ID')}`, 120, yPosition + 27, { align: 'right' });

        yPosition += 40;

        // Header tabel
        pdf.setFillColor(245, 158, 11); // Yellow
        pdf.rect(14, yPosition, pageWidth - 28, 6, 'F');
        pdf.setFontSize(7);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont(undefined, 'bold');
        pdf.text('NO', 16, yPosition + 4);
        pdf.text('PELANGGAN', 25, yPosition + 4);
        pdf.text('TELEPON', 60, yPosition + 4);
        pdf.text('TOTAL', 90, yPosition + 4, { align: 'right' });
        pdf.text('TERBAYAR', 115, yPosition + 4, { align: 'right' });
        pdf.text('SISA', 140, yPosition + 4, { align: 'right' });
        pdf.text('STATUS', 165, yPosition + 4, { align: 'right' });
        pdf.text('ADMIN', 180, yPosition + 4, { align: 'right' });
        yPosition += 8;

        // Data hutang
        pdf.setFont(undefined, 'normal');
        data.forEach((debt, index) => {
          if (yPosition > 250) {
            pdf.addPage();
            yPosition = 20;
          }

          const bgColor = index % 2 === 0 ? [255, 255, 255] : [255, 251, 235];
          pdf.setFillColor(...bgColor);
          pdf.rect(14, yPosition, pageWidth - 28, 5, 'F');
          
          pdf.setFontSize(6);
          pdf.setTextColor(40, 40, 40);
          pdf.text((index + 1).toString(), 16, yPosition + 3.5);
          pdf.text(debt.customer_name, 25, yPosition + 3.5);
          pdf.text(debt.customer_phone, 60, yPosition + 3.5);
          pdf.text(`Rp ${debt.amount.toLocaleString('id-ID')}`, 90, yPosition + 3.5, { align: 'right' });
          pdf.text(`Rp ${debt.paid.toLocaleString('id-ID')}`, 115, yPosition + 3.5, { align: 'right' });
          pdf.text(`Rp ${debt.remaining.toLocaleString('id-ID')}`, 140, yPosition + 3.5, { align: 'right' });
          
          // Status dengan warna
          if (debt.status === 'paid') {
            pdf.setTextColor(34, 197, 94);
            pdf.text('LUNAS', 165, yPosition + 3.5, { align: 'right' });
          } else if (debt.status === 'partial') {
            pdf.setTextColor(245, 158, 11);
            pdf.text('CICILAN', 165, yPosition + 3.5, { align: 'right' });
          } else {
            pdf.setTextColor(239, 68, 68);
            pdf.text('BELUM LUNAS', 165, yPosition + 3.5, { align: 'right' });
          }
          
          pdf.setTextColor(40, 40, 40);
          pdf.text(debt.admin?.name || 'N/A', 180, yPosition + 3.5, { align: 'right' });
          
          yPosition += 6;
        });
      }

      // Footer dengan branding
      const footerY = pdf.internal.pageSize.getHeight() - 10;
      pdf.setFontSize(8);
      pdf.setTextColor(139, 92, 246);
      pdf.text('Wifisekre.net - Sistem Manajemen Voucher WiFi', pageWidth / 2, footerY, { align: 'center' });

      pdf.save(`${title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().getTime()}.pdf`);
      
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

  // Mark notifications as read
  const markNotificationsAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, isNew: false }))
    );
  };

  // Get unread notifications count
  const getUnreadNotificationsCount = () => {
    return notifications.filter(notif => notif.isNew).length;
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-yellow-50 pb-20">
      {/* Header dengan User Info */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-purple-600" />
              <span className="ml-2 text-xl font-bold text-gray-800">wifisekre.net</span>
            </div>
            <div className="flex items-center space-x-4">
              {/* Notifications Bell */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    markNotificationsAsRead();
                  }}
                  className="p-2 text-gray-500 hover:text-purple-600 transition rounded-lg hover:bg-purple-50 relative"
                  title="Notifikasi"
                >
                  <Bell className="h-5 w-5" />
                  {getUnreadNotificationsCount() > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-4 flex items-center justify-center">
                      {getUnreadNotificationsCount()}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-800">Notifikasi Terbaru</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          Tidak ada notifikasi
                        </div>
                      ) : (
                        notifications.slice(0, 10).map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 border-b border-gray-100 hover:bg-gray-50 ${
                              notification.isNew ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <div className={`p-2 rounded-full ${
                                notification.type === 'sale' 
                                  ? 'bg-green-100 text-green-600'
                                  : notification.type === 'debt'
                                  ? 'bg-yellow-100 text-yellow-600'
                                  : 'bg-blue-100 text-blue-600'
                              }`}>
                                {notification.type === 'sale' && <TrendingUp className="h-4 w-4" />}
                                {notification.type === 'debt' && <FileText className="h-4 w-4" />}
                                {notification.type === 'payment' && <Wallet className="h-4 w-4" />}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-sm text-gray-800">
                                  {notification.title}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                  {notification.message}
                                </p>
                                {notification.amount && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Rp {notification.amount.toLocaleString('id-ID')}
                                  </p>
                                )}
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(notification.timestamp).toLocaleString('id-ID')}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-700">{currentUser.name}</p>
                <p className="text-xs text-gray-500 capitalize">{currentUser.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-red-600 transition rounded-lg hover:bg-red-50"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-4">
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
              getAdminRevenue={getAdminRevenue}
              getTotalCashAllAdmins={getTotalCashAllAdmins}
              getTotalDebtAllAdmins={getTotalDebtAllAdmins}
              getTotalUnpaidDebtAllAdmins={getTotalUnpaidDebtAllAdmins}
              getTotalPaidDebtAllAdmins={getTotalPaidDebtAllAdmins}
              onPrintReport={() => handlePrintReport(sales, 'Laporan Dashboard', 'dashboard')}
              reportRef={reportRef}
              notifications={notifications}
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
              sales={sales} // Semua admin bisa lihat semua penjualan
              admins={admins}
              filters={salesFilters}
              setFilters={setSalesFilters}
              onPrintReport={() => handlePrintReport(filterSales(sales), 'Laporan Penjualan', 'sales')}
              reportRef={reportRef}
            />
          )}

          {activeTab === 'debts' && (
            <DebtsTab
              currentUser={currentUser}
              debts={debts} // Semua admin bisa lihat semua hutang
              filters={debtsFilters}
              setFilters={setDebtsFilters}
              setSelectedDebt={setSelectedDebt}
              setShowDebtPaymentModal={setShowDebtPaymentModal}
              onPrintReport={() => handlePrintReport(filterDebts(debts), 'Laporan Hutang', 'debts')}
              reportRef={reportRef}
            />
          )}

          {activeTab === 'admins' && (
            <AdminsTab
              admins={admins}
              setShowAdminModal={setShowAdminModal}
              handleDeleteAdmin={handleDeleteAdmin}
              getAdminRevenue={getAdminRevenue}
              currentUser={currentUser}
              getTotalCashAllAdmins={getTotalCashAllAdmins}
              getTotalDebtAllAdmins={getTotalDebtAllAdmins}
              getTotalUnpaidDebtAllAdmins={getTotalUnpaidDebtAllAdmins}
              getTotalPaidDebtAllAdmins={getTotalPaidDebtAllAdmins}
            />
          )}
        </div>
      </div>

      {/* Bottom Navigation Bar Modern - 5 Menu untuk Semua User */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
        <div className="max-w-lg mx-auto">
          <div className="flex justify-around items-center px-2 sm:px-4">
            {/* Dashboard Button */}
            <BottomNavButton
              active={activeTab === 'dashboard'}
              onClick={() => setActiveTab('dashboard')}
              icon={<Home className="h-5 w-5" />}
              label="Home"
            />

            {/* Sales Button */}
            <BottomNavButton
              active={activeTab === 'sales'}
              onClick={() => setActiveTab('sales')}
              icon={<BarChart3 className="h-5 w-5" />}
              label="Sales"
            />

            {/* Sell Button - Tampilan Berbeda */}
            <div className="relative -mt-6">
              <button
                onClick={() => setActiveTab('sell')}
                className="flex flex-col items-center transition-all"
              >
                <div className={`p-3 sm:p-4 rounded-full transition-all shadow-lg ${
                  activeTab === 'sell' 
                    ? 'bg-gradient-to-r from-purple-600 to-purple-800 text-white scale-110' 
                    : 'bg-gradient-to-r from-purple-500 to-purple-700 text-white hover:scale-105'
                }`}>
                  <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <span className={`text-xs font-medium mt-1 ${
                  activeTab === 'sell' ? 'text-purple-600' : 'text-gray-500'
                }`}>Jual</span>
                {getAvailableVouchers().length > 0 && (
                  <div className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center shadow-md px-1">
                    {getAvailableVouchers().length}
                  </div>
                )}
              </button>
            </div>

            {/* Debts Button */}
            <BottomNavButton
              active={activeTab === 'debts'}
              onClick={() => setActiveTab('debts')}
              icon={<FileText className="h-5 w-5" />}
              label="Hutang"
            />

            {/* Admin Button - Untuk Semua User */}
            <BottomNavButton
              active={activeTab === 'admins'}
              onClick={() => setActiveTab('admins')}
              icon={<Settings className="h-5 w-5" />}
              label="Admin"
            />
          </div>
        </div>
      </div>
      
      {/* Modals */}
      {showAdminModal && currentUser.role === 'superadmin' && (
        <Modal title="Tambah Admin Baru" onClose={() => setShowAdminModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
              <input
                type="text"
                value={adminForm.name}
                onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-base"
                placeholder="Masukkan nama lengkap"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={adminForm.username}
                onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-base"
                placeholder="Buat username untuk login"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={adminForm.password}
                onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-base"
                placeholder="Buat password untuk login"
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
                    <h2 className="text-xl font-bold">Voucher WiFi #{idx + 1}</h2>
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
                <CheckCircle className="h-4 w-4 inline mr-1" />
                <strong>Auto Download Berhasil!</strong> Screenshot voucher telah otomatis terdownload.
                Gunakan tombol "Download Ulang" jika perlu download lagi.
              </p>
            </div>
          </div>
        </Modal>
      )}

      {showDebtPaymentModal && selectedDebt && (
        <Modal title="Bayar Hutang Pelanggan" onClose={() => setShowDebtPaymentModal(false)}>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Pelanggan: <strong>{selectedDebt.customer_name}</strong></p>
              <p className="text-sm text-gray-600">Telepon: <strong>{selectedDebt.customer_phone}</strong></p>
              <p className="text-sm text-gray-600">Total Hutang: <strong>Rp {selectedDebt.amount.toLocaleString('id-ID')}</strong></p>
              <p className="text-sm text-gray-600">Sudah Dibayar: <strong>Rp {selectedDebt.paid.toLocaleString('id-ID')}</strong></p>
              <p className="text-lg font-bold text-red-600 mt-2">Sisa Hutang: Rp {selectedDebt.remaining.toLocaleString('id-ID')}</p>
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

// Komponen Bottom Navigation Button yang Diperbarui
const BottomNavButton = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center py-3 px-4 transition-all ${
      active
        ? 'text-purple-600'
        : 'text-gray-500 hover:text-gray-700'
    }`}
  >
    <div className={`p-2 rounded-lg transition-colors ${
      active ? 'bg-purple-100' : 'hover:bg-gray-100'
    }`}>
      {icon}
    </div>
    <span className="text-xs mt-1 font-medium">{label}</span>
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
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Package className="h-16 w-16 text-purple-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-800">wifisekre.net</h1>
          <p className="text-gray-600 mt-2">Sistem Manajemen Penjualan Voucher</p>
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

// Komponen Dashboard Tab dengan Notifikasi dan Total Semua Admin
const DashboardTab = ({ 
  currentUser, vouchers, sales, debts, admins, getTotalRevenue, getTotalDebtAmount, 
  getAvailableVouchers, getAdminSales, getAdminDebts, getAdminRevenue,
  getTotalCashAllAdmins, getTotalDebtAllAdmins, getTotalUnpaidDebtAllAdmins, getTotalPaidDebtAllAdmins,
  onPrintReport, reportRef, notifications 
}) => {
  const isSuperadmin = currentUser.role === 'superadmin';
  const myRevenue = getTotalRevenue(currentUser.id);
  const myDebt = getTotalDebtAmount(currentUser.id);
  const totalRevenue = getTotalRevenue();
  const totalDebt = getTotalDebtAmount();

  // Data untuk semua admin
  const totalCashAllAdmins = getTotalCashAllAdmins();
  const totalDebtAllAdmins = getTotalDebtAllAdmins();
  const totalUnpaidDebtAllAdmins = getTotalUnpaidDebtAllAdmins();
  const totalPaidDebtAllAdmins = getTotalPaidDebtAllAdmins();

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-700 rounded-2xl p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold">Welcome, {currentUser.name}! 👋</h1>
        <p className="text-purple-100 mt-1">Selamat berjuang hari ini! Semoga penjualan lancar!</p>
        <div className="flex items-center mt-3 text-sm text-purple-200">
          <User className="h-4 w-4 mr-1" />
          <span>Role: {currentUser.role === 'superadmin' ? 'Super Admin' : 'Admin'}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard Overview</h2>
        <button
          onClick={onPrintReport}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2 text-sm w-full sm:w-auto justify-center"
        >
          <Printer className="h-4 w-4" />
          Cetak Laporan
        </button>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Package className="h-8 w-8" />}
          title="Voucher Tersedia"
          value={getAvailableVouchers().length}
          color="bg-purple-500"
        />
        <StatCard
          icon={<DollarSign className="h-8 w-8" />}
          title={isSuperadmin ? "Pendapatan Cash" : "Pendapatan Cash Saya"}
          value={`Rp ${(isSuperadmin ? totalRevenue : myRevenue).toLocaleString('id-ID')}`}
          color="bg-green-500"
        />
        <StatCard
          icon={<FileText className="h-8 w-8" />}
          title={isSuperadmin ? "Hutang Belum Lunas" : "Hutang Belum Lunas Saya"}
          value={`Rp ${(isSuperadmin ? totalDebt : myDebt).toLocaleString('id-ID')}`}
          color="bg-red-500"
        />
        <StatCard
          icon={<Users className="h-8 w-8" />}
          title={isSuperadmin ? "Total Penjualan" : "Penjualan Saya"}
          value={isSuperadmin ? sales.length : getAdminSales(currentUser.id).length}
          color="bg-yellow-500"
        />
      </div>

      {/* Total Semua Admin Section */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          Ringkasan Semua Admin
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Banknote className="h-6 w-6" />}
            title="Total Cash Semua Admin"
            value={`Rp ${totalCashAllAdmins.toLocaleString('id-ID')}`}
            color="bg-green-500"
            compact={true}
          />
          <StatCard
            icon={<CreditCardIcon className="h-6 w-6" />}
            title="Total Hutang Semua Admin"
            value={`Rp ${totalDebtAllAdmins.toLocaleString('id-ID')}`}
            color="bg-blue-500"
            compact={true}
          />
          <StatCard
            icon={<Wallet className="h-6 w-6" />}
            title="Hutang Terbayar"
            value={`Rp ${totalPaidDebtAllAdmins.toLocaleString('id-ID')}`}
            color="bg-emerald-500"
            compact={true}
          />
          <StatCard
            icon={<FileText className="h-6 w-6" />}
            title="Hutang Belum Lunas"
            value={`Rp ${totalUnpaidDebtAllAdmins.toLocaleString('id-ID')}`}
            color="bg-orange-500"
            compact={true}
          />
        </div>
      </div>

      {/* Notifications Section */}
      {notifications.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifikasi Terbaru
          </h3>
          <div className="space-y-3">
            {notifications.slice(0, 5).map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border ${
                  notification.isNew 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-full ${
                    notification.type === 'sale' 
                      ? 'bg-green-100 text-green-600'
                      : notification.type === 'debt'
                      ? 'bg-yellow-100 text-yellow-600'
                      : 'bg-blue-100 text-blue-600'
                  }`}>
                    {notification.type === 'sale' && <TrendingUp className="h-4 w-4" />}
                    {notification.type === 'debt' && <FileText className="h-4 w-4" />}
                    {notification.type === 'payment' && <Wallet className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">
                      {notification.title}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {notification.message}
                    </p>
                    {notification.amount && (
                      <p className="text-sm text-gray-700 mt-1 font-medium">
                        Rp {notification.amount.toLocaleString('id-ID')}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(notification.timestamp).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Sales dengan Icon */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Penjualan Terbaru</h3>
        <div className="space-y-3">
          {sales.slice(0, 5).map(sale => (
            <div key={sale.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center flex-1 min-w-0">
                {/* Icon berdasarkan metode pembayaran */}
                <div className={`mr-3 p-2 rounded-full ${
                  sale.payment_method === 'cash' 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-red-100 text-red-600'
                }`}>
                  {sale.payment_method === 'cash' ? (
                    <DollarSign className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800">Voucher: {sale.voucher_code}</p>
                  <p className="text-sm text-gray-600">
                    {sale.payment_method === 'cash' ? 'Cash' : 'Hutang'} • {sale.admin?.name || 'N/A'}
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
              </div>
              <div className="text-right ml-3">
                <p className="font-bold text-green-600">Rp {sale.amount.toLocaleString('id-ID')}</p>
                {sale.customer_name !== '-' && (
                  <p className="text-sm text-gray-600">{sale.customer_name}</p>
                )}
              </div>
            </div>
          ))}
          {sales.length === 0 && (
            <p className="text-center text-gray-500 py-6">Belum ada penjualan</p>
          )}
        </div>
      </div>

      {/* Admin Performance (Superadmin only) */}
      {isSuperadmin && (
        <div ref={reportRef} className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Performance Admin</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Nama Admin</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Penjualan</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Pendapatan Cash</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Pendapatan Hutang</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Total Pendapatan</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Status Hutang</th>
                </tr>
              </thead>
              <tbody>
                {admins.filter(a => a.role === 'admin').map(admin => {
                  const revenue = getAdminRevenue(admin.id);
                  const adminDebt = getTotalDebtAmount(admin.id);
                  const status = adminDebt === 0 ? 'LUNAS' : 'BELUM LUNAS';
                  const statusColor = adminDebt === 0 ? 'text-green-600' : 'text-red-600';
                  
                  return (
                    <tr key={admin.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{admin.name}</td>
                      <td className="py-3 px-4 text-right">{revenue.salesCount} voucher</td>
                      <td className="py-3 px-4 text-right text-green-600 font-medium">
                        Rp {revenue.cash.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 text-right text-blue-600 font-medium">
                        Rp {revenue.debt.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 text-right text-purple-600 font-bold">
                        Rp {revenue.total.toLocaleString('id-ID')}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${statusColor}`}>
                        {status}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// Komponen Sell Tab
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

  const nameSuggestions = getFilteredSuggestions(saleForm.customerName);

  const selectNameSuggestion = (name) => {
    setSaleForm({ ...saleForm, customerName: name });
    setShowNameSuggestions(false);
    
    const relatedSale = sales.find(s => s.customer_name === name);
    if (relatedSale && relatedSale.customer_phone && relatedSale.customer_phone !== '-') {
      setSaleForm(prev => ({ ...prev, customerPhone: relatedSale.customer_phone }));
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Jual Voucher WiFi</h2>
      
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
                    <p className="font-medium text-gray-800">{v.code}</p>
                    <p className="text-sm text-gray-600 truncate">Username: {v.username}</p>
                  </div>
                  {saleForm.voucherCodes.includes(v.code) && (
                    <CheckCircle className="h-6 w-6 text-purple-600 flex-shrink-0 ml-2" />
                  )}
                </div>
              </div>
            ))}
            {availableVouchers.length === 0 && (
              <p className="text-center text-gray-500 py-4">Tidak ada voucher tersedia</p>
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
          
          {customerSuggestions.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              <User className="h-3 w-3 inline mr-1" />
              {customerSuggestions.length} pelanggan tersedia dalam riwayat
            </p>
          )}
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Metode Pembayaran</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSaleForm({ ...saleForm, paymentMethod: 'cash' })}
              className={`p-4 border-2 rounded-lg font-medium transition ${
                saleForm.paymentMethod === 'cash'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <DollarSign className="h-5 w-5 inline mr-2" />
              Cash
            </button>
            <button
              onClick={() => setSaleForm({ ...saleForm, paymentMethod: 'hutang' })}
              className={`p-4 border-2 rounded-lg font-medium transition ${
                saleForm.paymentMethod === 'hutang'
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <FileText className="h-5 w-5 inline mr-2" />
              Hutang
            </button>
          </div>
        </div>

        {/* Phone Number untuk Hutang */}
        {saleForm.paymentMethod === 'hutang' && (
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm font-medium text-red-800 mb-3">
              <Phone className="h-4 w-4 inline mr-1" />
              Nomor telepon diperlukan untuk pembayaran hutang
            </p>
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
              <span className="text-2xl font-bold text-purple-600">Rp {totalAmount.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSellVoucher}
          disabled={saleForm.voucherCodes.length === 0}
          className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-purple-700 text-white rounded-lg font-bold hover:from-purple-600 hover:to-purple-800 transition transform hover:scale-105 disabled:bg-gray-300 disabled:cursor-not-allowed text-lg shadow-lg"
        >
          <CreditCard className="h-5 w-5 inline mr-2" />
          PROSES PENJUALAN
        </button>
      </div>
    </div>
  );
};

// Komponen Sales Tab - SEMUA ADMIN BISA LIHAT SEMUA PENJUALAN
const SalesTab = ({ currentUser, sales, admins, filters, setFilters, onPrintReport, reportRef }) => {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Semua Riwayat Penjualan</h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2 text-sm justify-center"
          >
            <Filter className="h-4 w-4" />
            {showFilters ? 'Sembunyikan Filter' : 'Tampilkan Filter'}
          </button>
          <button
            onClick={onPrintReport}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2 text-sm justify-center"
          >
            <Printer className="h-4 w-4" />
            Cetak Laporan
          </button>
        </div>
      </div>

      {/* Info untuk semua admin */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <User className="h-4 w-4 inline mr-1" />
          Semua admin dapat melihat semua penjualan dari seluruh admin.
        </p>
      </div>

      {/* Filter Section */}
      {showFilters && (
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-700 mb-4 flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Data
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
                placeholder="Cari nama pelanggan..."
              />
            </div>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Metode Pembayaran</label>
              <select
                value={filters.paymentMethod}
                onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
              >
                <option value="">Semua Metode</option>
                <option value="cash">Cash</option>
                <option value="hutang">Hutang</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div ref={reportRef}>
        {sales.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Belum ada riwayat penjualan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Tanggal & Jam</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Voucher</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Username</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Dijual Oleh</th>
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
                    <td className="py-3 px-4 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-gray-400" />
                        {sale.admin?.name || 'N/A'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {sale.payment_method === 'cash' ? (
                          <DollarSign className="h-4 w-4 text-green-600" />
                        ) : (
                          <FileText className="h-4 w-4 text-red-600" />
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          sale.payment_method === 'cash'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {sale.payment_method === 'cash' ? 'Cash' : 'Hutang'}
                        </span>
                      </div>
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

// Komponen Debts Tab - SEMUA ADMIN BISA LIHAT DAN BAYAR SEMUA HUTANG
const DebtsTab = ({ currentUser, debts, filters, setFilters, setSelectedDebt, setShowDebtPaymentModal, onPrintReport, reportRef }) => {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold text-gray-800">Semua Data Hutang Pelanggan</h2>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2 text-sm justify-center"
            >
              <Filter className="h-4 w-4" />
              {showFilters ? 'Sembunyikan Filter' : 'Tampilkan Filter'}
            </button>
            <button
              onClick={onPrintReport}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2 text-sm justify-center"
            >
              <Printer className="h-4 w-4" />
              Cetak Laporan
            </button>
          </div>
        </div>

        {/* Info untuk semua admin */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <User className="h-4 w-4 inline mr-1" />
            Semua admin dapat melihat dan membayar semua hutang dari seluruh admin.
          </p>
        </div>

        {/* Filter Section */}
        {showFilters && (
          <div className="mb-6 bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-700 mb-4 flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Data Hutang
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
                  placeholder="Cari nama pelanggan..."
                />
              </div>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status Hutang</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                >
                  <option value="">Semua Status</option>
                  <option value="unpaid">Belum Lunas</option>
                  <option value="partial">Cicilan</option>
                  <option value="paid">Lunas</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div ref={reportRef}>
          {debts.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-green-300 mx-auto mb-4" />
              <p className="text-gray-500">Tidak ada data hutang</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {debts.map(debt => (
                <div key={debt.id} className="border-2 border-red-200 rounded-lg p-4 bg-red-50">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-800">{debt.customer_name}</h3>
                      <p className="text-sm text-gray-600">{debt.customer_phone}</p>
                      {/* Tampilkan info admin untuk semua user */}
                      <div className="flex items-center gap-1 mt-1">
                        <User className="h-3 w-3 text-gray-400" />
                        <p className="text-xs text-gray-500">Admin: {debt.admin?.name || 'N/A'}</p>
                      </div>
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
                      {debt.status === 'unpaid' ? 'BELUM LUNAS' : 'CICILAN'}
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
                      <span className="text-gray-800">Sisa Hutang:</span>
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

                  {/* Tombol bayar hutang - aktif untuk semua user */}
                  <button
                    onClick={() => {
                      setSelectedDebt(debt);
                      setShowDebtPaymentModal(true);
                    }}
                    className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition text-sm font-medium"
                  >
                    <DollarSign className="h-4 w-4 inline mr-1" />
                    Bayar Hutang
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Komponen Admins Tab dengan Total Semua Admin
const AdminsTab = ({ 
  admins, 
  setShowAdminModal, 
  handleDeleteAdmin, 
  getAdminRevenue, 
  currentUser,
  getTotalCashAllAdmins,
  getTotalDebtAllAdmins,
  getTotalUnpaidDebtAllAdmins,
  getTotalPaidDebtAllAdmins
}) => {
  const isSuperadmin = currentUser.role === 'superadmin';

  return (
    <div className="space-y-6">
      {/* Total Semua Admin Card */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          Ringkasan Keuangan Semua Admin
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Banknote className="h-6 w-6" />}
            title="Total Cash"
            value={`Rp ${getTotalCashAllAdmins().toLocaleString('id-ID')}`}
            color="bg-green-500"
            compact={true}
          />
          <StatCard
            icon={<CreditCardIcon className="h-6 w-6" />}
            title="Total Hutang"
            value={`Rp ${getTotalDebtAllAdmins().toLocaleString('id-ID')}`}
            color="bg-blue-500"
            compact={true}
          />
          <StatCard
            icon={<Wallet className="h-6 w-6" />}
            title="Hutang Terbayar"
            value={`Rp ${getTotalPaidDebtAllAdmins().toLocaleString('id-ID')}`}
            color="bg-emerald-500"
            compact={true}
          />
          <StatCard
            icon={<FileText className="h-6 w-6" />}
            title="Hutang Belum Lunas"
            value={`Rp ${getTotalUnpaidDebtAllAdmins().toLocaleString('id-ID')}`}
            color="bg-orange-500"
            compact={true}
          />
        </div>
      </div>

      {/* Data Admin */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold text-gray-800">Data Admin</h2>
          {isSuperadmin && (
            <button
              onClick={() => setShowAdminModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2 text-sm w-full sm:w-auto justify-center"
            >
              <Plus className="h-4 w-4" />
              Tambah Admin
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {admins.map(admin => {
            const revenue = getAdminRevenue(admin.id);
            const totalDebt = revenue.debt;
            const status = totalDebt === 0 ? 'LUNAS' : 'BELUM LUNAS';
            const statusColor = totalDebt === 0 ? 'text-green-600' : 'text-red-600';
            
            return (
              <div key={admin.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800">{admin.name}</h3>
                    <p className="text-sm text-gray-600">@{admin.username}</p>
                    {admin.role === 'admin' && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-gray-500">
                          Penjualan: {revenue.salesCount} voucher
                        </p>
                        <p className="text-xs text-gray-500">
                          Cash: {revenue.cashCount} • Hutang: {revenue.debtCount}
                        </p>
                        <p className="text-xs text-green-600">
                          Pendapatan: Rp {revenue.total.toLocaleString('id-ID')}
                        </p>
                        <p className={`text-xs font-medium ${statusColor}`}>
                          Status Hutang: {status}
                        </p>
                      </div>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    admin.role === 'superadmin'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {admin.role === 'superadmin' ? 'Superadmin' : 'Admin'}
                  </span>
                </div>
                
                {admin.role !== 'superadmin' && isSuperadmin && (
                  <button
                    onClick={() => handleDeleteAdmin(admin.id)}
                    className="w-full px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Hapus Admin
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Info untuk admin biasa */}
        {!isSuperadmin && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <User className="h-4 w-4 inline mr-1" />
              Anda login sebagai Admin. Hanya Superadmin yang dapat menambah atau menghapus admin.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Komponen StatCard
const StatCard = ({ icon, title, value, color, compact = false }) => {
  return (
    <div className={`bg-white rounded-xl shadow-md ${compact ? 'p-3' : 'p-6'}`}>
      <div className={`${color} w-12 h-12 rounded-lg flex items-center justify-center text-white mb-3`}>
        {icon}
      </div>
      <h3 className={`text-gray-600 ${compact ? 'text-xs' : 'text-sm'} font-medium mb-1`}>{title}</h3>
      <p className={`font-bold text-gray-800 ${compact ? 'text-lg' : 'text-2xl'}`}>{value}</p>
    </div>
  );
};

// Komponen Modal
const Modal = ({ title, children, onClose, size = 'normal' }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`bg-white rounded-xl shadow-2xl w-full max-h-[90vh] overflow-y-auto ${
        size === 'large' ? 'max-w-2xl' : 'max-w-md'
      }`}>
        <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition p-1"
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

// Komponen Info
const Info = (props) => (
  <svg
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

export default WifiVoucherSalesApp;