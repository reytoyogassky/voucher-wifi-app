import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Users, Package, DollarSign, FileText, Plus, Eye, Trash2, Edit2, 
  CheckCircle, XCircle, History, Download, Camera, Filter, Calendar, 
  Printer, Search, User, Phone, Menu, X, ChevronDown, ChevronUp, 
  ShoppingCart, Home, CreditCard, BarChart3, Settings, LogOut, Bell,
  AlertCircle, TrendingUp, Wallet, PieChart, Banknote, CreditCard as CreditCardIcon,
  Check, Clock, Calendar as CalendarIcon, Info, Sparkles
} from 'lucide-react';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import jsPDF from 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm';
import html2canvas from 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm';

// KONFIGURASI SUPABASE
const SUPABASE_URL = 'https://nvfmqhoeigxhbrdyscqz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52Zm1xaG9laWd4aGJyZHlzY3F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0NDk2NTMsImV4cCI6MjA3NzAyNTY1M30.2xfjtHus5q-fXa7pVjkn1zN2648vZxe5gVBgpM-Sx4g';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Fungsi utilitas
const formatRupiah = (number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(number);
};

const getDaysDiff = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffTime = Math.abs(now - date);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

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
  const [showDebtPaymentConfirmation, setShowDebtPaymentConfirmation] = useState(false);
  const [showOverdueDebts, setShowOverdueDebts] = useState(false);

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
  const [overdueDebtsList, setOverdueDebtsList] = useState([]);

  // Ref untuk UI
  const voucherCardRef = useRef(null);
  const reportRef = useRef(null);

  // Fungsi untuk cek hutang yang overdue (lebih dari 7 hari)
  const checkOverdueDebts = useCallback((debtsList) => {
    const now = new Date();
    const overdueDebts = debtsList.filter(debt => {
      if (debt.status !== 'unpaid') return false;
      
      const debtDate = new Date(debt.created_at);
      const diffTime = now - debtDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays >= 7;
    });
    
    return overdueDebts;
  }, []);

  // Fungsi untuk generate overdue notification
  const generateOverdueNotification = (overdueDebts) => {
    if (overdueDebts.length === 0) return null;
    
    const notificationId = 'overdue_debts_notification';
    const existingNotification = notifications.find(n => n.id === notificationId);
    
    if (existingNotification) return existingNotification;
    
    return {
      id: notificationId,
      type: 'overdue',
      title: 'Hutang Jatuh Tempo ⚠️',
      message: `${overdueDebts.length} hutang belum lunas selama 7 hari atau lebih`,
      details: overdueDebts,
      timestamp: new Date().toISOString(),
      isNew: true,
      priority: 'high'
    };
  };

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
            id: `sale_${Date.now()}`,
            type: 'sale',
            title: 'Penjualan Baru 💰',
            message: `${adminData?.name || 'Admin'} menjual voucher ${payload.new.voucher_code}`,
            adminName: adminData?.name,
            amount: payload.new.amount,
            paymentMethod: payload.new.payment_method,
            timestamp: new Date().toISOString(),
            isNew: true,
            priority: 'medium'
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
            id: `debt_${Date.now()}`,
            type: 'debt',
            title: 'Hutang Baru 📝',
            message: `${adminData?.name || 'Admin'} mencatat hutang ${payload.new.customer_name}`,
            adminName: adminData?.name,
            amount: payload.new.amount,
            customerName: payload.new.customer_name,
            timestamp: new Date().toISOString(),
            isNew: true,
            priority: 'high'
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
            id: `payment_${Date.now()}`,
            type: 'payment',
            title: 'Pembayaran Hutang ✅',
            message: `${adminData?.name || 'Admin'} menerima pembayaran dari ${debtData?.customer_name || 'pelanggan'}`,
            adminName: adminData?.name,
            amount: payload.new.amount,
            customerName: debtData?.customer_name,
            timestamp: new Date().toISOString(),
            isNew: true,
            priority: 'medium'
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

  // Cek hutang overdue setiap kali debts berubah
  useEffect(() => {
    if (debts.length > 0) {
      const overdueDebts = checkOverdueDebts(debts);
      setOverdueDebtsList(overdueDebts);
      
      if (overdueDebts.length > 0) {
        const overdueNotification = generateOverdueNotification(overdueDebts);
        if (overdueNotification) {
          setNotifications(prev => {
            const existingIndex = prev.findIndex(n => n.id === overdueNotification.id);
            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = overdueNotification;
              return updated;
            }
            return [overdueNotification, ...prev];
          });
        }
      }
    }
  }, [debts, checkOverdueDebts, generateOverdueNotification]);

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
        
        if (debtsError) {
          console.warn('Error loading payments, trying without:', debtsError);
          // Coba ambil tanpa payments
          const { data: simpleDebtsData, error: simpleError } = await supabase
            .from('debts')
            .select('*, admin:admins(name)')
            .order('created_at', { ascending: false });
          
          if (simpleError) throw simpleError;
          
          // Transform status hutang: hanya lunas dan belum lunas
          const transformedDebts = (simpleDebtsData || []).map(debt => {
            const remaining = debt.remaining || (debt.amount - (debt.paid || 0));
            const status = remaining === 0 ? 'paid' : 'unpaid';
            return {
              ...debt,
              remaining,
              status: status,
              payments: []
            };
          });
          
          setDebts(transformedDebts);
        } else {
          // Transform status hutang: hanya lunas dan belum lunas
          const transformedDebts = (debtsData || []).map(debt => {
            let status = 'unpaid';
            const remaining = debt.remaining || (debt.amount - (debt.paid || 0));
            if (remaining === 0) {
              status = 'paid';
            }
            return {
              ...debt,
              remaining,
              status: status
            };
          });
          
          setDebts(transformedDebts);
        }

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

    // VALIDASI NAMA PEMBELI WAJIB DIISI - untuk semua metode pembayaran
    if (!saleForm.customerName.trim()) {
      alert('Nama pelanggan harus diisi!');
      return;
    }

    // Untuk pembayaran hutang, nomor telepon juga wajib
    if (saleForm.paymentMethod === 'hutang' && (!saleForm.customerPhone || !saleForm.customerPhone.trim())) {
      alert('Nomor telepon pelanggan harus diisi untuk pembayaran hutang!');
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

  // FUNGSI BARU: Bayar hutang dengan satu klik (melunasi seluruhnya)
  const handlePayDebtOneClick = async (debt) => {
    if (!debt || debt.remaining === 0) {
      alert('Hutang ini sudah lunas!');
      return;
    }

    try {
      // Update debt record - langsung lunasi seluruh sisa hutang
      const { error: updateError } = await supabase
        .from('debts')
        .update({
          paid: debt.amount,
          remaining: 0,
          status: 'paid'
        })
        .eq('id', debt.id);

      if (updateError) throw updateError;

      // Insert payment record untuk pembayaran penuh
      const paymentData = {
        debt_id: debt.id,
        amount: debt.remaining,
        received_by: currentUser.id,
        paid_at: new Date().toISOString()
      };

      // Coba dengan payment_type, jika error coba tanpa
      try {
        const { error: paymentError } = await supabase
          .from('debt_payments')
          .insert([{ ...paymentData, payment_type: 'full' }]);

        if (paymentError) throw paymentError;
      } catch (paymentError) {
        console.warn('Failed with payment_type, trying without:', paymentError);
        const { error: paymentError2 } = await supabase
          .from('debt_payments')
          .insert([paymentData]);
        
        if (paymentError2) throw paymentError2;
      }

      // Reload data
      await loadData();

      setShowDebtPaymentConfirmation(false);
      alert(`Hutang ${debt.customer_name} sebesar Rp ${debt.remaining.toLocaleString('id-ID')} telah dilunasi!`);
    } catch (error) {
      console.error('Error paying debt:', error);
      alert('Gagal melunasi hutang: ' + error.message);
    }
  };

  // FUNGSI LAMA: Bayar hutang dengan input jumlah
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
      const newStatus = newRemaining === 0 ? 'paid' : 'unpaid';

      // Insert payment record
      const paymentData = {
        debt_id: selectedDebt.id,
        amount: debtPaymentForm.amount,
        received_by: currentUser.id,
        paid_at: new Date().toISOString()
      };

      // Coba dengan payment_type, jika error coba tanpa
      try {
        const { error: paymentError } = await supabase
          .from('debt_payments')
          .insert([{ ...paymentData, payment_type: 'partial' }]);

        if (paymentError) throw paymentError;
      } catch (paymentError) {
        console.warn('Failed with payment_type, trying without:', paymentError);
        const { error: paymentError2 } = await supabase
          .from('debt_payments')
          .insert([paymentData]);
        
        if (paymentError2) throw paymentError2;
      }

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

      try {
        const { data: debtsData, error: debtsError } = await supabase
          .from('debts')
          .select(`
            *,
            admin:admins(name),
            payments:debt_payments(*)
          `)
          .order('created_at', { ascending: false });
        
        if (debtsError) throw debtsError;
        
        // Transform status hutang: hanya lunas dan belum lunas
        const transformedDebts = (debtsData || []).map(debt => {
          let status = 'unpaid';
          const remaining = debt.remaining || (debt.amount - (debt.paid || 0));
          if (remaining === 0) {
            status = 'paid';
          }
          return {
            ...debt,
            remaining,
            status: status
          };
        });
        
        setDebts(transformedDebts);
      } catch (debtsError) {
        console.warn('Error loading debts with payments:', debtsError);
        // Coba ambil tanpa payments
        const { data: simpleDebtsData, error: simpleError } = await supabase
          .from('debts')
          .select('*, admin:admins(name)')
          .order('created_at', { ascending: false });
        
        if (simpleError) throw simpleError;
        
        const transformedDebts = (simpleDebtsData || []).map(debt => {
          let status = 'unpaid';
          const remaining = debt.remaining || (debt.amount - (debt.paid || 0));
          if (remaining === 0) {
            status = 'paid';
          }
          return {
            ...debt,
            remaining,
            status: status,
            payments: []
          };
        });
        
        setDebts(transformedDebts);
      }

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
    return debts
      .filter(debt => debt.status === 'unpaid')
      .reduce((total, debt) => total + debt.remaining, 0);
  };

  // FUNGSI BARU: Total Hutang Lunas Semua Admin
  const getTotalPaidDebtAllAdmins = () => {
    return debts
      .filter(debt => debt.status === 'paid')
      .reduce((total, debt) => total + debt.amount, 0);
  };

  // FUNGSI BARU: Total Hutang Belum Lunas per Admin
  const getUnpaidDebtCount = (adminId = null) => {
    const relevantDebts = adminId ? debts.filter(d => d.admin_id === adminId) : debts;
    return relevantDebts.filter(debt => debt.status === 'unpaid').length;
  };

  // FUNGSI BARU: Total Hutang Lunas per Admin
  const getPaidDebtCount = (adminId = null) => {
    const relevantDebts = adminId ? debts.filter(d => d.admin_id === adminId) : debts;
    return relevantDebts.filter(debt => debt.status === 'paid').length;
  };

  // Fungsi untuk menghitung total pendapatan per admin
  const getAdminRevenue = (adminId) => {
    const adminSales = sales.filter(s => s.sold_by === adminId);
    const cashSales = adminSales.filter(s => s.payment_method === 'cash');
    const debtSales = adminSales.filter(s => s.payment_method === 'hutang');
    
    const cashRevenue = cashSales.reduce((sum, s) => sum + s.amount, 0);
    const debtRevenue = debtSales.reduce((sum, s) => sum + s.amount, 0);
    const totalRevenue = cashRevenue + debtRevenue;

    // Hitung hutang lunas dan belum lunas untuk admin ini
    const adminDebts = debts.filter(d => d.admin_id === adminId);
    const unpaidDebts = adminDebts.filter(d => d.status === 'unpaid');
    const paidDebts = adminDebts.filter(d => d.status === 'paid');

    return {
      cash: cashRevenue,
      debt: debtRevenue,
      total: totalRevenue,
      salesCount: adminSales.length,
      cashCount: cashSales.length,
      debtCount: debtSales.length,
      unpaidDebtCount: unpaidDebts.length,
      paidDebtCount: paidDebts.length,
      unpaidDebtAmount: unpaidDebts.reduce((sum, d) => sum + d.remaining, 0),
      paidDebtAmount: paidDebts.reduce((sum, d) => sum + d.amount, 0)
    };
  };

  // Fungsi untuk generate PDF dengan tema ungu-kuning
  const handlePrintReport = async (data, title, type = 'sales') => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      let yPosition = 20;

      // Header dengan gradient background ungu
      pdf.setFillColor(139, 92, 246);
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

        const stats = [
          { 
            label: 'Voucher Tersedia', 
            value: getAvailableVouchers().length.toString(), 
            color: [139, 92, 246],
            bgColor: [250, 245, 255]
          },
          { 
            label: 'Total Penjualan', 
            value: `${sales.length} transaksi`, 
            color: [245, 158, 11],
            bgColor: [255, 251, 235]
          },
          { 
            label: 'Pendapatan Cash', 
            value: `Rp ${getTotalRevenue().toLocaleString('id-ID')}`, 
            color: [34, 197, 94],
            bgColor: [240, 253, 244]
          },
          { 
            label: 'Hutang Belum Lunas', 
            value: `Rp ${getTotalUnpaidDebtAllAdmins().toLocaleString('id-ID')}`, 
            color: [239, 68, 68],
            bgColor: [254, 242, 242]
          }
        ];

        stats.forEach((stat, index) => {
          const x = 14 + (index % 2) * 90;
          const y = yPosition + Math.floor(index / 2) * 20;
          
          pdf.setFillColor(...stat.bgColor);
          pdf.roundedRect(x, y, 80, 16, 3, 3, 'F');
          
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

          pdf.setFillColor(250, 245, 255);
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
          pdf.text('Status Hutang', 180, yPosition + 5, { align: 'right' });
          yPosition += 10;

          pdf.setFont(undefined, 'normal');
          admins.filter(a => a.role === 'admin').forEach((admin, index) => {
            if (yPosition > 250) {
              pdf.addPage();
              yPosition = 20;
            }

            const revenue = getAdminRevenue(admin.id);
            const statusColor = revenue.unpaidDebtCount === 0 ? [34, 197, 94] : [245, 158, 11];
            const statusText = revenue.unpaidDebtCount === 0 ? 'LUNAS' : 'BELUM LUNAS';
            
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

        data.forEach(debt => {
          totalDebt += debt.amount;
          totalPaid += debt.paid;
          totalRemaining += debt.remaining;
          
          if (debt.status === 'paid') paidCount++;
          else unpaidCount++;
        });

        pdf.setFillColor(255, 251, 235);
        pdf.roundedRect(14, yPosition, pageWidth - 28, 25, 3, 3, 'F');
        pdf.setDrawColor(245, 158, 11);
        pdf.roundedRect(14, yPosition, pageWidth - 28, 25, 3, 3, 'S');
        
        pdf.setFontSize(9);
        pdf.setTextColor(245, 158, 11);
        pdf.setFont(undefined, 'bold');
        pdf.text('RINGKASAN HUTANG', 20, yPosition + 7);
        
        pdf.setFont(undefined, 'normal');
        pdf.setTextColor(75, 85, 99);
        pdf.text(`Total Hutang: ${data.length} pelanggan`, 20, yPosition + 12);
        pdf.text(`Lunas: ${paidCount}`, 20, yPosition + 17);
        pdf.text(`Belum Lunas: ${unpaidCount}`, 20, yPosition + 22);
        
        pdf.text(`Total Nilai: Rp ${totalDebt.toLocaleString('id-ID')}`, 120, yPosition + 12, { align: 'right' });
        pdf.text(`Total Terbayar: Rp ${totalPaid.toLocaleString('id-ID')}`, 120, yPosition + 17, { align: 'right' });
        pdf.setTextColor(239, 68, 68);
        pdf.setFont(undefined, 'bold');
        pdf.text(`Sisa Hutang: Rp ${totalRemaining.toLocaleString('id-ID')}`, 120, yPosition + 22, { align: 'right' });

        yPosition += 35;

        pdf.setFillColor(245, 158, 11);
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
          
          if (debt.status === 'paid') {
            pdf.setTextColor(34, 197, 94);
            pdf.text('LUNAS', 165, yPosition + 3.5, { align: 'right' });
          } else {
            pdf.setTextColor(239, 68, 68);
            pdf.text('BELUM LUNAS', 165, yPosition + 3.5, { align: 'right' });
          }
          
          pdf.setTextColor(40, 40, 40);
          pdf.text(debt.admin?.name || 'N/A', 180, yPosition + 3.5, { align: 'right' });
          
          yPosition += 6;
        });
      }

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
    return relevantDebts.filter(d => d.status === 'unpaid').reduce((sum, d) => sum + d.remaining, 0);
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

  // Fungsi untuk mark overdue debt as read
  const markOverdueAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.type === 'overdue' ? { ...notif, isNew: false } : notif
      )
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-yellow-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto"></div>
            <Package className="absolute inset-0 m-auto h-8 w-8 text-purple-600" />
          </div>
          <p className="mt-4 text-gray-600 font-medium">Memuat data...</p>
          <p className="text-sm text-gray-500 mt-2">Menyiapkan dashboard Anda</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-yellow-50 pb-20">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom, 20px);
        }
      `}</style>

      {/* Header dengan User Info */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="relative">
                <Package className="h-8 w-8 text-purple-600" />
                <div className="absolute -top-1 -right-1 bg-yellow-400 w-3 h-3 rounded-full"></div>
              </div>
              <span className="ml-2 text-xl font-bold text-gray-800">wifisekre.net</span>
            </div>
            <div className="flex items-center space-x-4">
              {/* Notifications Bell dengan overdue alert */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    markNotificationsAsRead();
                    markOverdueAsRead();
                  }}
                  className="p-2 text-gray-500 hover:text-purple-600 transition rounded-lg hover:bg-purple-50 relative group"
                  title="Notifikasi"
                >
                  <Bell className="h-5 w-5" />
                  {getUnreadNotificationsCount() > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-4 flex items-center justify-center">
                      {getUnreadNotificationsCount()}
                    </span>
                  )}
                  
                  {/* Overdue debts indicator */}
                  {overdueDebtsList.length > 0 && (
                    <div className="absolute -top-1 -right-1">
                      <div className="relative">
                        <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
                        <div className="relative bg-red-600 text-white text-xs font-bold rounded-full min-w-[18px] h-4 flex items-center justify-center">
                          {overdueDebtsList.length}
                        </div>
                      </div>
                    </div>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-[80vh] overflow-hidden animate-slideUp">
                    <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-white">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-gray-800">Notifikasi</h3>
                        <div className="flex items-center gap-2">
                          {overdueDebtsList.length > 0 && (
                            <button
                              onClick={() => {
                                setShowOverdueDebts(true);
                                setShowNotifications(false);
                              }}
                              className="px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full hover:bg-red-200 transition"
                            >
                              Lihat {overdueDebtsList.length} hutang overdue
                            </button>
                          )}
                          <button
                            onClick={markNotificationsAsRead}
                            className="text-sm text-purple-600 hover:text-purple-800"
                          >
                            Tandai semua dibaca
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="overflow-y-auto max-h-[calc(80vh-120px)]">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500">Tidak ada notifikasi</p>
                        </div>
                      ) : (
                        notifications.slice(0, 20).map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition ${
                              notification.isNew ? 'bg-blue-50' : ''
                            } ${notification.priority === 'high' ? 'border-l-4 border-l-red-500' : ''}`}
                          >
                            <div className="flex items-start space-x-3">
                              <div className={`p-2 rounded-full ${
                                notification.type === 'sale' 
                                  ? 'bg-green-100 text-green-600'
                                  : notification.type === 'debt'
                                  ? 'bg-yellow-100 text-yellow-600'
                                  : notification.type === 'payment'
                                  ? 'bg-blue-100 text-blue-600'
                                  : notification.type === 'overdue'
                                  ? 'bg-red-100 text-red-600'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {notification.type === 'sale' && <TrendingUp className="h-4 w-4" />}
                                {notification.type === 'debt' && <FileText className="h-4 w-4" />}
                                {notification.type === 'payment' && <Wallet className="h-4 w-4" />}
                                {notification.type === 'overdue' && <AlertCircle className="h-4 w-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                  <p className="font-medium text-gray-800 text-sm">
                                    {notification.title}
                                  </p>
                                  {notification.isNew && (
                                    <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                                      BARU
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  {notification.message}
                                </p>
                                {notification.amount && (
                                  <p className="text-sm font-medium text-gray-700 mt-1">
                                    {formatRupiah(notification.amount)}
                                  </p>
                                )}
                                {notification.type === 'overdue' && notification.details && (
                                  <div className="mt-2">
                                    <p className="text-xs text-red-600 font-medium">
                                      {notification.details.length} hutang perlu segera ditagih
                                    </p>
                                  </div>
                                )}
                                <p className="text-xs text-gray-400 mt-2">
                                  {new Date(notification.timestamp).toLocaleString('id-ID', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    day: '2-digit',
                                    month: 'short'
                                  })}
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
              getUnpaidDebtCount={getUnpaidDebtCount}
              getPaidDebtCount={getPaidDebtCount}
              onPrintReport={() => handlePrintReport(sales, 'Laporan Dashboard', 'dashboard')}
              reportRef={reportRef}
              notifications={notifications}
              overdueDebtsList={overdueDebtsList}
              setShowOverdueDebts={setShowOverdueDebts}
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
              sales={sales}
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
              debts={debts}
              filters={debtsFilters}
              setFilters={setDebtsFilters}
              setSelectedDebt={setSelectedDebt}
              setShowDebtPaymentModal={setShowDebtPaymentModal}
              onPrintReport={() => handlePrintReport(filterDebts(debts), 'Laporan Hutang', 'debts')}
              reportRef={reportRef}
              handlePayDebtOneClick={handlePayDebtOneClick}
              setShowDebtPaymentConfirmation={setShowDebtPaymentConfirmation}
              filterDebts={filterDebts}
              overdueDebtsList={overdueDebtsList}
              setShowOverdueDebts={setShowOverdueDebts}
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

      {/* Bottom Navigation Bar Modern */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom shadow-lg">
        <div className="max-w-lg mx-auto">
          <div className="flex justify-around items-center px-2 sm:px-4 py-1">
            <BottomNavButton
              active={activeTab === 'dashboard'}
              onClick={() => setActiveTab('dashboard')}
              icon={<Home className="h-5 w-5" />}
              label="Home"
              badgeCount={overdueDebtsList.length > 0 ? overdueDebtsList.length : 0}
            />

            <BottomNavButton
              active={activeTab === 'sales'}
              onClick={() => setActiveTab('sales')}
              icon={<BarChart3 className="h-5 w-5" />}
              label="Sales"
              badgeCount={0}
            />

            <div className="relative -mt-8">
              <button
                onClick={() => setActiveTab('sell')}
                className="flex flex-col items-center transition-all group"
              >
                <div className={`p-3 sm:p-4 rounded-full transition-all shadow-lg relative overflow-hidden ${
                  activeTab === 'sell' 
                    ? 'bg-gradient-to-r from-purple-600 to-purple-800 text-white scale-110 ring-4 ring-purple-200' 
                    : 'bg-gradient-to-r from-purple-500 to-purple-700 text-white hover:scale-105 hover:shadow-xl'
                }`}>
                  <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 relative z-10" />
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <span className={`text-xs font-medium mt-1 ${
                  activeTab === 'sell' ? 'text-purple-600 font-bold' : 'text-gray-500'
                }`}>Jual</span>
                {getAvailableVouchers().length > 0 && (
                  <div className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center shadow-md px-1 ring-2 ring-white">
                    {getAvailableVouchers().length}
                  </div>
                )}
              </button>
            </div>

            <BottomNavButton
              active={activeTab === 'debts'}
              onClick={() => setActiveTab('debts')}
              icon={<FileText className="h-5 w-5" />}
              label="Hutang"
              badgeCount={getUnpaidDebtCount()}
            />

            <BottomNavButton
              active={activeTab === 'admins'}
              onClick={() => setActiveTab('admins')}
              icon={<Settings className="h-5 w-5" />}
              label="Admin"
              badgeCount={0}
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

      {/* Modal Konfirmasi Pembayaran Hutang dengan Satu Klik */}
      {showDebtPaymentConfirmation && selectedDebt && (
        <Modal 
          title="Konfirmasi Pelunasan Hutang" 
          onClose={() => setShowDebtPaymentConfirmation(false)}
        >
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Lunasi Hutang Sekarang?</h3>
              <p className="text-gray-600 mt-2">
                Anda akan melunasi seluruh sisa hutang pelanggan ini dengan sekali klik.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Pelanggan:</span>
                  <span className="font-medium">{selectedDebt.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Hutang:</span>
                  <span className="font-medium">Rp {selectedDebt.amount.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Sudah Dibayar:</span>
                  <span className="font-medium text-green-600">Rp {selectedDebt.paid.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2 mt-2">
                  <span className="text-gray-800">Sisa Hutang:</span>
                  <span className="text-red-600">Rp {selectedDebt.remaining.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  Setelah dilunasi, status hutang akan berubah menjadi <strong>LUNAS</strong> dan tidak dapat dikembalikan.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowDebtPaymentConfirmation(false)}
                className="px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition font-medium flex items-center justify-center gap-2"
              >
                <X className="h-4 w-4" />
                Batal
              </button>
              <button
                onClick={() => handlePayDebtOneClick(selectedDebt)}
                className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center justify-center gap-2"
              >
                <Check className="h-4 w-4" />
                Ya, Lunasi
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Hutang Overdue */}
      {showOverdueDebts && (
        <Modal 
          title="Hutang Jatuh Tempo (≥ 7 Hari)" 
          onClose={() => setShowOverdueDebts(false)}
          size="large"
        >
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-red-800 font-medium">
                    {overdueDebtsList.length} hutang belum lunas selama 7 hari atau lebih
                  </p>
                  <p className="text-sm text-red-600 mt-1">
                    Segera lakukan penagihan kepada pelanggan berikut:
                  </p>
                </div>
              </div>
            </div>

            {overdueDebtsList.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
                <p className="text-gray-600">Tidak ada hutang yang jatuh tempo</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {overdueDebtsList.map((debt, index) => {
                  const daysDiff = getDaysDiff(debt.created_at);
                  return (
                    <div key={debt.id} className="border border-red-200 rounded-lg p-4 bg-white hover:bg-red-50 transition">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-gray-800">{debt.customer_name}</h4>
                          <p className="text-sm text-gray-600">{debt.customer_phone}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <User className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500">Admin: {debt.admin?.name || 'N/A'}</span>
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                          {daysDiff} HARI
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Total Hutang:</span>
                          <span className="font-medium">Rp {debt.amount.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Sisa Hutang:</span>
                          <span className="font-bold text-red-600">Rp {debt.remaining.toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex justify-between items-center">
                        <div className="text-xs text-gray-500">
                          <CalendarIcon className="h-3 w-3 inline mr-1" />
                          {new Date(debt.created_at).toLocaleDateString('id-ID')}
                        </div>
                        <button
                          onClick={() => {
                            setSelectedDebt(debt);
                            setShowOverdueDebts(false);
                            setShowDebtPaymentConfirmation(true);
                          }}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition"
                        >
                          Lunasi Sekarang
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowOverdueDebts(false)}
                className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// Komponen Bottom Navigation Button
const BottomNavButton = ({ active, onClick, icon, label, badgeCount = 0 }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center py-3 px-2 transition-all relative group ${
      active
        ? 'text-purple-600'
        : 'text-gray-500 hover:text-gray-700'
    }`}
  >
    <div className={`p-2 rounded-xl transition-all duration-200 relative ${
      active 
        ? 'bg-gradient-to-br from-purple-100 to-purple-50 shadow-sm' 
        : 'group-hover:bg-gray-100'
    }`}>
      {icon}
      {badgeCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 ring-2 ring-white">
          {badgeCount > 9 ? '9+' : badgeCount}
        </span>
      )}
    </div>
    <span className="text-xs mt-1 font-medium">{label}</span>
    
    {active && (
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-purple-500 to-purple-700 rounded-t-lg"></div>
    )}
  </button>
);

// Komponen Login Page
const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      alert('Username dan password harus diisi!');
      return;
    }
    
    setIsLoading(true);
    
    // Simulasi loading
    setTimeout(() => {
      if (onLogin(username, password)) {
        setUsername('');
        setPassword('');
      } else {
        alert('Username atau password salah!');
      }
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-yellow-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md transform transition-all hover:shadow-3xl">
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <div className="bg-gradient-to-r from-purple-500 to-purple-700 p-4 rounded-2xl inline-block">
              <Package className="h-16 w-16 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 bg-yellow-400 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-lg">
              WiFi
            </div>
          </div>
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base transition"
              required
              placeholder="Masukkan username"
              disabled={isLoading}
            />
          </div>
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base transition pr-12"
              required
              placeholder="Masukkan password"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-10 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? (
                <Eye className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 rounded-lg font-medium text-base transition ${
              isLoading
                ? 'bg-purple-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 transform hover:scale-[1.02] active:scale-95'
            } text-white`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Loading...
              </span>
            ) : (
              'Login'
            )}
          </button>
        </form>
        
        <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <p className="text-sm text-purple-700 flex items-start">
            <Info className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
            <span>Gunakan username dan password yang diberikan admin untuk login ke sistem</span>
          </p>
        </div>
      </div>
    </div>
  );
};

// Komponen Dashboard Tab dengan Notifikasi
const DashboardTab = ({ 
  currentUser, vouchers, sales, debts, admins, getTotalRevenue, getTotalDebtAmount, 
  getAvailableVouchers, getAdminSales, getAdminDebts, getAdminRevenue,
  getTotalCashAllAdmins, getTotalDebtAllAdmins, getTotalUnpaidDebtAllAdmins, getTotalPaidDebtAllAdmins,
  getUnpaidDebtCount, getPaidDebtCount,
  onPrintReport, reportRef, notifications,
  overdueDebtsList, setShowOverdueDebts
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

  // Hitung statistik hutang
  const unpaidDebtCount = getUnpaidDebtCount();
  const paidDebtCount = getPaidDebtCount();

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-700 rounded-2xl p-6 text-white shadow-lg transform transition-transform hover:scale-[1.01] duration-300">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Selamat datang, {currentUser.name}! 👋</h1>
            <p className="text-purple-100 mt-1 opacity-90">Selamat berjuang hari ini! Semoga penjualan lancar!</p>
            <div className="flex items-center mt-3 text-sm text-purple-200">
              <User className="h-4 w-4 mr-1" />
              <span>Role: {currentUser.role === 'superadmin' ? 'Super Admin' : 'Admin'}</span>
              <span className="mx-2">•</span>
              <span>{getAvailableVouchers().length} voucher tersedia</span>
              {overdueDebtsList.length > 0 && (
                <>
                  <span className="mx-2">•</span>
                  <span className="text-red-200">
                    <AlertCircle className="h-3 w-3 inline mr-1" />
                    {overdueDebtsList.length} hutang overdue
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="hidden md:block">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
              <Sparkles className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Alert Overdue Debts */}
      {overdueDebtsList.length > 0 && (
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-2xl p-4 text-white shadow-lg animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="h-6 w-6 mr-3" />
              <div>
                <p className="font-bold">HUTANG JATUH TEMPO!</p>
                <p className="text-sm opacity-90">{overdueDebtsList.length} hutang belum lunas selama 7 hari atau lebih</p>
              </div>
            </div>
            <button
              onClick={() => setShowOverdueDebts(true)}
              className="px-4 py-2 bg-white text-red-600 rounded-lg font-medium hover:bg-gray-100 transition"
            >
              Lihat Detail
            </button>
          </div>
        </div>
      )}

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
          trend={getAvailableVouchers().length < 10 ? "low" : "good"}
          description="Siap dijual"
        />
        <StatCard
          icon={<DollarSign className="h-8 w-8" />}
          title={isSuperadmin ? "Pendapatan Cash" : "Pendapatan Cash Saya"}
          value={`Rp ${(isSuperadmin ? totalRevenue : myRevenue).toLocaleString('id-ID')}`}
          color="bg-green-500"
          trend="up"
          description="Dari penjualan cash"
        />
        <StatCard
          icon={<FileText className="h-8 w-8" />}
          title={isSuperadmin ? "Hutang Belum Lunas" : "Hutang Belum Lunas Saya"}
          value={`Rp ${(isSuperadmin ? totalDebt : myDebt).toLocaleString('id-ID')}`}
          color="bg-red-500"
          trend={totalDebt > 0 ? "warning" : "good"}
          description="Perlu ditagih"
        />
        <StatCard
          icon={<Users className="h-8 w-8" />}
          title={isSuperadmin ? "Total Penjualan" : "Penjualan Saya"}
          value={isSuperadmin ? sales.length : getAdminSales(currentUser.id).length}
          color="bg-yellow-500"
          trend="up"
          description="Transaksi sukses"
        />
      </div>

      {/* Statistik Hutang */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Statistik Hutang
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<CheckCircle className="h-6 w-6" />}
            title="Hutang Lunas"
            value={paidDebtCount}
            color="bg-green-500"
            compact={true}
          />
          <StatCard
            icon={<XCircle className="h-6 w-6" />}
            title="Hutang Belum Lunas"
            value={unpaidDebtCount}
            color="bg-red-500"
            compact={true}
          />
          <StatCard
            icon={<Wallet className="h-6 w-6" />}
            title="Total Nilai Lunas"
            value={`Rp ${totalPaidDebtAllAdmins.toLocaleString('id-ID')}`}
            color="bg-emerald-500"
            compact={true}
          />
          <StatCard
            icon={<AlertCircle className="h-6 w-6" />}
            title="Total Nilai Belum Lunas"
            value={`Rp ${totalUnpaidDebtAllAdmins.toLocaleString('id-ID')}`}
            color="bg-orange-500"
            compact={true}
          />
        </div>
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
            icon={<CheckCircle className="h-6 w-6" />}
            title="Hutang Lunas"
            value={`Rp ${totalPaidDebtAllAdmins.toLocaleString('id-ID')}`}
            color="bg-emerald-500"
            compact={true}
          />
          <StatCard
            icon={<AlertCircle className="h-6 w-6" />}
            title="Hutang Belum Lunas"
            value={`Rp ${totalUnpaidDebtAllAdmins.toLocaleString('id-ID')}`}
            color="bg-orange-500"
            compact={true}
          />
        </div>
      </div>

      {/* Recent Sales */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Penjualan Terbaru</h3>
        <div className="space-y-3">
          {sales.slice(0, 5).map(sale => (
            <div key={sale.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
              <div className="flex items-center flex-1 min-w-0">
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
                  <p className="font-medium text-gray-800 truncate">Voucher: {sale.voucher_code}</p>
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
                  <p className="text-sm text-gray-600 truncate max-w-[120px]">{sale.customer_name}</p>
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
                  const status = revenue.unpaidDebtCount === 0 ? 'LUNAS' : 'BELUM LUNAS';
                  const statusColor = revenue.unpaidDebtCount === 0 ? 'text-green-600' : 'text-red-600';
                  
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

  const isFormValid = () => {
    if (saleForm.voucherCodes.length === 0) return false;
    if (!saleForm.customerName.trim()) return false;
    if (saleForm.paymentMethod === 'hutang' && !saleForm.customerPhone.trim()) return false;
    return true;
  };

  const selectNameSuggestion = (name) => {
    setSaleForm({ ...saleForm, customerName: name });
    setShowNameSuggestions(false);
    
    const relatedSale = sales.find(s => s.customer_name === name);
    if (relatedSale && relatedSale.customer_phone && relatedSale.customer_phone !== '-') {
      setSaleForm(prev => ({ ...prev, customerPhone: relatedSale.customer_phone }));
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Jual Voucher WiFi</h2>
          <p className="text-gray-600 mt-1">Pilih voucher, isi data pelanggan, dan proses penjualan</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
            {availableVouchers.length} tersedia
          </div>
          <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
            {saleForm.voucherCodes.length} terpilih
          </div>
        </div>
      </div>
      
      <div className="space-y-6">
        {/* Voucher Selection */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <label className="block text-lg font-bold text-gray-800">
              Pilih Voucher ({availableVouchers.length} tersedia)
            </label>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 font-medium">Dipilih:</span>
              <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-bold min-w-8 text-center">
                {saleForm.voucherCodes.length}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[500px] overflow-y-auto p-4 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
            {availableVouchers.map(v => (
              <div
                key={v.id}
                onClick={() => toggleVoucherSelection(v.code)}
                className={`
                  relative p-4 rounded-2xl cursor-pointer transition-all duration-300 border-2 min-h-[140px] flex flex-col justify-between
                  shadow-md hover:shadow-lg
                  ${saleForm.voucherCodes.includes(v.code)
                    ? 'bg-gradient-to-br from-purple-500 to-purple-700 text-white border-purple-600 transform scale-105 shadow-xl'
                    : 'bg-gradient-to-br from-white to-gray-50 border-gray-200 hover:border-purple-300 hover:bg-white'
                  }
                `}
              >
                <div className={`absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center border-2 ${
                  saleForm.voucherCodes.includes(v.code)
                    ? 'bg-white text-purple-600 border-white'
                    : 'bg-white border-gray-300 text-transparent'
                }`}>
                  {saleForm.voucherCodes.includes(v.code) && (
                    <CheckCircle className="h-4 w-4" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="mb-3">
                    <p className={`font-bold text-lg mb-2 ${
                      saleForm.voucherCodes.includes(v.code) ? 'text-white' : 'text-gray-800'
                    }`}>
                      {v.code}
                    </p>
                    <div className={`text-xs space-y-1 ${
                      saleForm.voucherCodes.includes(v.code) ? 'text-purple-100' : 'text-gray-600'
                    }`}>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span className="truncate">{v.username}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        <span className="truncate">{v.password}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`text-right ${
                  saleForm.voucherCodes.includes(v.code) ? 'text-yellow-300' : 'text-green-600'
                }`}>
                  <p className="text-sm font-bold">Rp 1.000</p>
                </div>

                {saleForm.voucherCodes.includes(v.code) && (
                  <div className="absolute inset-0 border-2 border-yellow-400 rounded-2xl pointer-events-none animate-pulse"></div>
                )}
              </div>
            ))}
            
            {availableVouchers.length === 0 && (
              <div className="col-span-full text-center py-12">
                <Package className="h-20 w-20 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-xl font-semibold">Tidak ada voucher tersedia</p>
                <p className="text-gray-400 text-sm mt-2">Semua voucher sudah terjual</p>
              </div>
            )}
          </div>

          {availableVouchers.length > 0 && (
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  const allCodes = availableVouchers.map(v => v.code);
                  setSaleForm(prev => ({ ...prev, voucherCodes: allCodes }));
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition flex items-center gap-2 font-medium"
              >
                <CheckCircle className="h-4 w-4" />
                Pilih Semua
              </button>
              <button
                onClick={() => setSaleForm(prev => ({ ...prev, voucherCodes: [] }))}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg text-sm hover:bg-gray-600 transition flex items-center gap-2 font-medium"
              >
                <XCircle className="h-4 w-4" />
                Batal Pilih
              </button>
              <div className="flex-1"></div>
              <div className="text-sm text-gray-600 font-medium">
                Total: <span className="text-purple-600 font-bold">{saleForm.voucherCodes.length} voucher</span>
              </div>
            </div>
          )}
        </div>

        {/* Customer Name */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nama Pelanggan <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={saleForm.customerName}
            onChange={(e) => {
              setSaleForm({ ...saleForm, customerName: e.target.value });
              setShowNameSuggestions(true);
            }}
            onFocus={() => setShowNameSuggestions(true)}
            onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-base transition"
            placeholder="Masukkan nama pelanggan (wajib diisi)"
            required
          />
          
          {showNameSuggestions && nameSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-2 bg-white border-2 border-purple-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
              <div className="p-2 text-xs text-purple-600 border-b border-purple-100 bg-purple-50 font-medium">
                💡 Pilih dari riwayat pelanggan:
              </div>
              {nameSuggestions.map((name, index) => (
                <div
                  key={index}
                  onClick={() => selectNameSuggestion(name)}
                  className="px-4 py-3 cursor-pointer hover:bg-purple-50 border-b border-gray-100 last:border-b-0 transition"
                >
                  <div className="font-medium text-gray-800 text-sm">{name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {sales.find(s => s.customer_name === name)?.customer_phone || 'No phone'}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {customerSuggestions.length > 0 && (
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <User className="h-3 w-3" />
              {customerSuggestions.length} pelanggan tersedia dalam riwayat
            </p>
          )}
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Metode Pembayaran</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setSaleForm({ ...saleForm, paymentMethod: 'cash' })}
              className={`p-4 border-2 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-3 ${
                saleForm.paymentMethod === 'cash'
                  ? 'border-green-500 bg-green-50 text-green-700 shadow-md scale-105'
                  : 'border-gray-300 hover:border-gray-400 bg-white hover:shadow-sm'
              }`}
            >
              <div className={`p-2 rounded-lg ${
                saleForm.paymentMethod === 'cash' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
              }`}>
                <DollarSign className="h-5 w-5" />
              </div>
              <span className="font-semibold">Cash</span>
            </button>
            <button
              onClick={() => setSaleForm({ ...saleForm, paymentMethod: 'hutang' })}
              className={`p-4 border-2 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-3 ${
                saleForm.paymentMethod === 'hutang'
                  ? 'border-red-500 bg-red-50 text-red-700 shadow-md scale-105'
                  : 'border-gray-300 hover:border-gray-400 bg-white hover:shadow-sm'
              }`}
            >
              <div className={`p-2 rounded-lg ${
                saleForm.paymentMethod === 'hutang' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
              }`}>
                <FileText className="h-5 w-5" />
              </div>
              <span className="font-semibold">Hutang</span>
            </button>
          </div>
        </div>

        {/* Phone Number untuk Hutang */}
        {saleForm.paymentMethod === 'hutang' && (
          <div className="p-4 bg-red-50 rounded-xl border-2 border-red-200">
            <p className="text-sm font-medium text-red-800 mb-3 flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Nomor telepon diperlukan untuk pembayaran hutang
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nomor Telepon</label>
              <input
                type="tel"
                value={saleForm.customerPhone}
                onChange={(e) => setSaleForm({ ...saleForm, customerPhone: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-base transition"
                placeholder="08xxxxxxxxxx"
              />
            </div>
          </div>
        )}

        {/* Total Amount */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-2xl border-2 border-purple-200">
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-700 text-lg font-medium">Jumlah Voucher:</span>
            <span className="font-bold text-gray-800 text-xl">{saleForm.voucherCodes.length}</span>
          </div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-700 text-lg font-medium">Harga per Voucher:</span>
            <span className="font-bold text-gray-800 text-xl">Rp 1.000</span>
          </div>
          <div className="border-t-2 border-purple-300 pt-4 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-xl font-bold text-gray-800">Total Harga:</span>
              <span className="text-3xl font-bold text-purple-600">Rp {totalAmount.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>

        {/* Validation Message */}
        {!isFormValid() && (
          <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
            <p className="text-red-700 text-sm flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4" />
              Nama pelanggan harus diisi sebelum melakukan penjualan
            </p>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSellVoucher}
          disabled={!isFormValid()}
          className={`w-full px-6 py-4 text-white rounded-xl font-bold transition-all duration-300 text-lg shadow-lg ${
            isFormValid() 
              ? 'bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 transform hover:scale-[1.02] active:scale-95' 
              : 'bg-gray-300 cursor-not-allowed opacity-50'
          }`}
        >
          <CreditCard className="h-6 w-6 inline mr-3" />
          {isFormValid() ? (
            `PROSES PENJUALAN - Rp ${totalAmount.toLocaleString('id-ID')}`
          ) : (
            'LENGKAPI FORM TERLEBIH DAHULU'
          )}
        </button>
      </div>
    </div>
  );
};

// Komponen Sales Tab
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

// Komponen DebtsTab
const DebtsTab = ({ 
  currentUser, 
  debts, 
  filters, 
  setFilters, 
  setSelectedDebt, 
  setShowDebtPaymentModal, 
  onPrintReport, 
  reportRef,
  handlePayDebtOneClick,
  setShowDebtPaymentConfirmation,
  filterDebts,
  overdueDebtsList,
  setShowOverdueDebts
}) => {
  const [showFilters, setShowFilters] = useState(false);

  const statusOptions = [
    { value: '', label: 'Semua Status' },
    { value: 'unpaid', label: 'Belum Lunas' },
    { value: 'paid', label: 'Lunas' }
  ];

  const sortDebts = (debtsList) => {
    if (!debtsList || debtsList.length === 0) return [];
    
    const sorted = [...debtsList];
    
    sorted.sort((a, b) => {
      if (a.status === 'unpaid' && b.status === 'paid') return -1;
      if (a.status === 'paid' && b.status === 'unpaid') return 1;
      
      if (a.status === 'unpaid' && b.status === 'unpaid') {
        return b.remaining - a.remaining;
      }
      
      return new Date(b.created_at) - new Date(a.created_at);
    });
    
    return sorted;
  };

  const filteredDebts = filterDebts(debts);
  const sortedDebts = sortDebts(filteredDebts);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold text-gray-800">Semua Data Hutang Pelanggan</h2>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {overdueDebtsList.length > 0 && (
              <button
                onClick={() => setShowOverdueDebts(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2 text-sm justify-center"
              >
                <AlertCircle className="h-4 w-4" />
                {overdueDebtsList.length} Overdue
              </button>
            )}
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
          <p className="text-sm text-blue-800 mt-1">
            <AlertCircle className="h-4 w-4 inline mr-1" />
            <strong>Urutan Tampilan:</strong> Hutang BELUM LUNAS ditampilkan di atas, LUNAS di bawah.
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
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <div ref={reportRef}>
          {sortedDebts.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-green-300 mx-auto mb-4" />
              <p className="text-gray-500">Tidak ada data hutang</p>
            </div>
          ) : (
            <div>
              {/* Header untuk hutang belum lunas */}
              {sortedDebts.some(d => d.status === 'unpaid') && (
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-red-600 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Hutang Belum Lunas
                    <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-1 rounded-full">
                      {sortedDebts.filter(d => d.status === 'unpaid').length}
                    </span>
                  </h3>
                </div>
              )}

              {/* Grid untuk hutang belum lunas */}
              {sortedDebts.some(d => d.status === 'unpaid') && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
                  {sortedDebts
                    .filter(debt => debt.status === 'unpaid')
                    .map(debt => {
                      const daysDiff = getDaysDiff(debt.created_at);
                      return (
                      <div key={debt.id} className={`border-2 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ${
                        daysDiff >= 7 ? 'border-red-300 bg-red-50' : 'border-yellow-300 bg-yellow-50'
                      }`}>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-800">{debt.customer_name}</h3>
                            <p className="text-sm text-gray-600">{debt.customer_phone}</p>
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
                            {daysDiff >= 7 && (
                              <p className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {daysDiff} hari belum lunas
                              </p>
                            )}
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            daysDiff >= 7 
                              ? 'bg-red-100 text-red-700 border border-red-300' 
                              : 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                          }`}>
                            {daysDiff >= 7 ? 'OVERDUE' : 'BELUM LUNAS'}
                          </span>
                        </div>
                        
                        <div className="space-y-2 mb-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Total Hutang:</span>
                            <span className="font-medium">Rp {debt.amount.toLocaleString('id-ID')}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Sudah Dibayar:</span>
                            <span className="font-medium text-yellow-600">
                              Rp {debt.paid.toLocaleString('id-ID')}
                            </span>
                          </div>
                          <div className="flex justify-between text-lg font-bold">
                            <span className="text-gray-800">Sisa Hutang:</span>
                            <span className="text-red-600">Rp {debt.remaining.toLocaleString('id-ID')}</span>
                          </div>
                        </div>

                        <div className="mb-3">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                debt.remaining === 0 
                                  ? 'bg-green-500' 
                                  : debt.paid > 0 
                                    ? 'bg-yellow-500' 
                                    : 'bg-red-500'
                              }`}
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
                                <div key={payment.id} className="text-xs bg-white p-2 rounded border">
                                  <div className="flex justify-between">
                                    <span>Rp {payment.amount.toLocaleString('id-ID')}</span>
                                    <span className="text-gray-500">
                                      {new Date(payment.paid_at).toLocaleDateString('id-ID')}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <button
                          onClick={() => {
                            setSelectedDebt(debt);
                            setShowDebtPaymentConfirmation(true);
                          }}
                          className="w-full px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition text-sm font-medium flex items-center justify-center gap-2 shadow-md mt-2"
                        >
                          <DollarSign className="h-4 w-4" />
                          LUNASI HUTANG (Rp {debt.remaining.toLocaleString('id-ID')})
                        </button>
                      </div>
                    )}
                  )}
                </div>
              )}

              {/* Header untuk hutang lunas */}
              {sortedDebts.some(d => d.status === 'paid') && (
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-green-600 mb-2 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Hutang Lunas
                    <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded-full">
                      {sortedDebts.filter(d => d.status === 'paid').length}
                    </span>
                  </h3>
                </div>
              )}

              {/* Grid untuk hutang lunas */}
              {sortedDebts.some(d => d.status === 'paid') && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {sortedDebts
                    .filter(debt => debt.status === 'paid')
                    .map(debt => (
                    <div key={debt.id} className="border-2 border-green-200 rounded-lg p-4 bg-green-50 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-800">{debt.customer_name}</h3>
                          <p className="text-sm text-gray-600">{debt.customer_phone}</p>
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
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-300">
                          LUNAS
                        </span>
                      </div>
                      
                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Total Hutang:</span>
                          <span className="font-medium">Rp {debt.amount.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Sudah Dibayar:</span>
                          <span className="font-medium text-green-600">
                            Rp {debt.paid.toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div className="flex justify-between text-lg font-bold">
                          <span className="text-gray-800">Sisa Hutang:</span>
                          <span className="text-green-600">Rp 0</span>
                        </div>
                      </div>

                      {debt.payments && debt.payments.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-gray-700 mb-1">Riwayat Pembayaran:</p>
                          <div className="space-y-1 max-h-24 overflow-y-auto">
                            {debt.payments.map(payment => (
                              <div key={payment.id} className="text-xs bg-white p-2 rounded border">
                                <div className="flex justify-between">
                                  <span>Rp {payment.amount.toLocaleString('id-ID')}</span>
                                  <span className="text-gray-500">
                                    {new Date(payment.paid_at).toLocaleDateString('id-ID')}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="text-center p-2 bg-green-100 rounded-lg border border-green-200">
                        <p className="text-sm text-green-700 font-medium flex items-center justify-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Hutang telah dilunasi
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          Dilunasi: {new Date(
                            debt.payments && debt.payments.length > 0 
                              ? debt.payments[debt.payments.length - 1]?.paid_at 
                              : debt.created_at
                          ).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Komponen Admins Tab
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
            icon={<CheckCircle className="h-6 w-6" />}
            title="Hutang Lunas"
            value={`Rp ${getTotalPaidDebtAllAdmins().toLocaleString('id-ID')}`}
            color="bg-emerald-500"
            compact={true}
          />
          <StatCard
            icon={<AlertCircle className="h-6 w-6" />}
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
            const status = revenue.unpaidDebtCount === 0 ? 'LUNAS' : 'BELUM LUNAS';
            const statusColor = revenue.unpaidDebtCount === 0 ? 'text-green-600' : 'text-red-600';
            
            return (
              <div key={admin.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
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
                          Status Hutang: {status} ({revenue.unpaidDebtCount} belum lunas)
                        </p>
                        <p className="text-xs text-gray-500">
                          Hutang Lunas: {revenue.paidDebtCount} • Nilai: Rp {revenue.paidDebtAmount.toLocaleString('id-ID')}
                        </p>
                        <p className="text-xs text-red-500">
                          Hutang Belum Lunas: {revenue.unpaidDebtCount} • Nilai: Rp {revenue.unpaidDebtAmount.toLocaleString('id-ID')}
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
const StatCard = ({ icon, title, value, color, compact = false, trend = null, description = "" }) => {
  const trendColors = {
    up: "text-green-500",
    down: "text-red-500",
    warning: "text-yellow-500",
    low: "text-orange-500",
    good: "text-emerald-500"
  };

  return (
    <div className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 ${compact ? 'p-3' : 'p-6'} relative overflow-hidden group`}>
      <div className={`absolute -right-8 -top-8 w-24 h-24 ${color} opacity-10 rounded-full group-hover:scale-150 transition-transform duration-500`}></div>
      
      <div className="flex items-start justify-between mb-3">
        <div className={`${color} w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md`}>
          {icon}
        </div>
        {trend && (
          <div className={`text-sm font-medium ${trendColors[trend]}`}>
            {trend === 'up' && '↑'}
            {trend === 'down' && '↓'}
            {trend === 'warning' && '⚠'}
            {trend === 'low' && '!'}
            {trend === 'good' && '✓'}
          </div>
        )}
      </div>
      <h3 className={`text-gray-600 ${compact ? 'text-xs' : 'text-sm'} font-medium mb-1`}>{title}</h3>
      <p className={`font-bold text-gray-800 ${compact ? 'text-lg' : 'text-2xl'} mb-2`}>{value}</p>
      {description && (
        <p className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {description}
        </p>
      )}
    </div>
  );
};

// Komponen Modal
const Modal = ({ title, children, onClose, size = 'normal' }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleClickOutside = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn"
      onClick={handleClickOutside}
    >
      <div 
        ref={modalRef}
        className={`bg-white rounded-xl shadow-2xl w-full max-h-[90vh] overflow-y-auto animate-slideUp ${
          size === 'large' ? 'max-w-2xl' : 'max-w-md'
        }`}
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition p-1 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-6 w-6" />
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