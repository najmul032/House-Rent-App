import { useState, useEffect, FormEvent } from 'react';
import { 
  LayoutDashboard, 
  Home, 
  DoorOpen, 
  Users, 
  Wallet, 
  Receipt, 
  BarChart3, 
  LogOut, 
  Menu, 
  X,
  Plus,
  Search,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Languages,
  AlertCircle
} from 'lucide-react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider, 
  signOut,
  User
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  House, 
  Room, 
  Tenant, 
  Payment, 
  Expense 
} from './types';

// Components
import Dashboard from './components/Dashboard';
import HousesList from './components/HousesList';
import RoomsList from './components/RoomsList';
import TenantsList from './components/TenantsList';
import PaymentsList from './components/PaymentsList';
import ExpensesList from './components/ExpensesList';
import Reports from './components/Reports';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';

type Screen = 'dashboard' | 'houses' | 'rooms' | 'tenants' | 'payments' | 'expenses' | 'reports';

function AppContent() {
  const { t, language, setLanguage } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeScreen, setActiveScreen] = useState<Screen>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Data States
  const [houses, setHouses] = useState<House[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;

    const qHouses = query(collection(db, 'houses'), where('ownerUid', '==', user.uid));
    const qRooms = query(collection(db, 'rooms'), where('ownerUid', '==', user.uid));
    const qTenants = query(collection(db, 'tenants'), where('ownerUid', '==', user.uid));
    const qPayments = query(collection(db, 'payments'), where('ownerUid', '==', user.uid));
    const qExpenses = query(collection(db, 'expenses'), where('ownerUid', '==', user.uid));

    const unsubHouses = onSnapshot(qHouses, (snap) => {
      setHouses(snap.docs.map(d => ({ id: d.id, ...d.data() } as House)));
    });
    const unsubRooms = onSnapshot(qRooms, (snap) => {
      setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() } as Room)));
    });
    const unsubTenants = onSnapshot(qTenants, (snap) => {
      setTenants(snap.docs.map(d => ({ id: d.id, ...d.data() } as Tenant)));
    });
    const unsubPayments = onSnapshot(qPayments, (snap) => {
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
    });
    const unsubExpenses = onSnapshot(qExpenses, (snap) => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
    });

    return () => {
      unsubHouses();
      unsubRooms();
      unsubTenants();
      unsubPayments();
      unsubExpenses();
    };
  }, [user]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login failed", error);
      if (error.code === 'auth/popup-blocked') {
        setAuthError(language === 'bn' ? "পপ-আপ ব্লক করা হয়েছে! দয়া করে এই সাইটের জন্য পপ-আপ অনুমতি দিন।" : "Popup blocked! Please allow popups for this site.");
      } else if (error.code === 'auth/cancelled-popup-request') {
        setAuthError(null);
      } else if (error.code === 'auth/network-request-failed') {
        setAuthError(language === 'bn' ? "ইন্টারনেট সংযোগ নেই! দয়া করে আপনার ইন্টারনেট চেক করুন।" : "Network error! Please check your internet connection.");
      } else if (error.code === 'auth/internal-error') {
        setAuthError(language === 'bn' ? "অভ্যন্তরীণ ত্রুটি! দয়া করে আবার চেষ্টা করুন।" : "Internal error! Please try again.");
      } else {
        setAuthError(`${t('loginError')} (${error.code || 'Unknown Error'})`);
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      await signInAnonymously(auth);
    } catch (error: any) {
      console.error("Guest login failed", error);
      if (error.code === 'auth/operation-not-allowed') {
        setAuthError(language === 'bn' 
          ? "অতিথি লগইন সক্রিয় করা নেই। দয়া করে ফায়ারবেস কনসোল থেকে 'Anonymous' অথেন্টিকেশন সক্রিয় করুন।" 
          : "Anonymous login is not enabled. Please enable 'Anonymous' authentication in the Firebase Console.");
      } else {
        setAuthError(language === 'bn' ? "অতিথি লগইন ব্যর্থ হয়েছে।" : "Guest login failed.");
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleEmailAuth = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error("Email auth failed", error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setAuthError(language === 'bn' ? t('wrongPassword') : t('wrongPassword'));
      } else if (error.code === 'auth/email-already-in-use') {
        setAuthError(t('emailAlreadyInUse'));
      } else if (error.code === 'auth/weak-password') {
        setAuthError(t('weakPassword'));
      } else if (error.code === 'auth/operation-not-allowed') {
        setAuthError(t('operationNotAllowed'));
      } else {
        setAuthError(t('authError'));
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
            <Home className="w-10 h-10 text-emerald-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-stone-900 tracking-tight">House Rent</h1>
            <p className="text-stone-500">{t('manageProperties')}</p>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-500 uppercase ml-1">{t('email')}</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@mail.com"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-500 uppercase ml-1">{t('password')}</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
                required
              />
            </div>

            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {authError}
              </div>
            )}

            <button 
              type="submit"
              disabled={isAuthLoading}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              {isAuthLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
              ) : (
                authMode === 'login' ? t('login') : t('signup')
              )}
            </button>

            <button 
              type="button"
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              className="w-full text-xs font-bold text-emerald-600 hover:underline"
            >
              {authMode === 'login' ? t('dontHaveAccount') : t('alreadyHaveAccount')}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-stone-200"></span>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-white px-2 text-stone-400 font-bold">{t('or')}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={handleLogin}
              disabled={isAuthLoading}
              className="py-3 px-4 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
              Google
            </button>
            <button 
              onClick={handleGuestLogin}
              disabled={isAuthLoading}
              className="py-3 px-4 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Users className="w-4 h-4" />
              {language === 'bn' ? "অতিথি" : "Guest"}
            </button>
          </div>

          <div className="flex justify-center gap-4 pt-2">
            <button 
              onClick={() => setLanguage('en')}
              className={`text-xs font-bold transition-all ${language === 'en' ? 'text-emerald-600 underline underline-offset-4' : 'text-stone-400'}`}
            >
              English
            </button>
            <button 
              onClick={() => setLanguage('bn')}
              className={`text-xs font-bold transition-all ${language === 'bn' ? 'text-emerald-600 underline underline-offset-4' : 'text-stone-400'}`}
            >
              বাংলা
            </button>
          </div>

          <p className="text-[10px] text-stone-400 mt-2 italic leading-relaxed">
            {language === 'bn' 
              ? "লগইন করতে সমস্যা হলে আপনার ব্রাউজারে 'Third-party cookies' অনুমতি দিন এবং পপ-আপ ব্লক করা নেই তা নিশ্চিত করুন।" 
              : "If you have trouble logging in, please allow 'Third-party cookies' and ensure popups are not blocked in your browser settings."}
          </p>
          
          <div className="pt-4 space-y-2">
            <button 
              onClick={() => setShowTroubleshooting(!showTroubleshooting)}
              className="text-[10px] font-bold text-emerald-600 hover:underline underline-offset-4"
            >
              {t('troubleshooting')}
            </button>
            
            {showTroubleshooting && (
              <div className="text-[10px] text-stone-500 text-left bg-stone-50 p-3 rounded-xl space-y-2 border border-stone-100 animate-in fade-in slide-in-from-top-1">
                <p className="font-bold text-stone-700 underline">{t('troubleshooting')}:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>{t('allowCookies')}</li>
                  <li>{t('checkPopup')}</li>
                  <li>
                    <p className="mt-1 font-semibold">{t('authorizedDomains')}</p>
                    <code className="block bg-stone-200 p-1 mt-1 rounded text-[9px] break-all">
                      ais-dev-m6pq26h7i4b5wzlbma3ok3-666313297997.asia-southeast1.run.app
                    </code>
                    <code className="block bg-stone-200 p-1 mt-1 rounded text-[9px] break-all">
                      ais-pre-m6pq26h7i4b5wzlbma3ok3-666313297997.asia-southeast1.run.app
                    </code>
                  </li>
                </ul>
              </div>
            )}
            
            <div className="pt-2">
              <button 
                onClick={() => window.location.reload()}
                className="text-[10px] text-stone-400 hover:text-emerald-600 transition-colors"
              >
                {language === 'bn' ? "পেজ রিফ্রেশ করুন" : "Refresh Page"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { id: 'houses', label: t('houses'), icon: Home },
    { id: 'rooms', label: t('rooms'), icon: DoorOpen },
    { id: 'tenants', label: t('tenants'), icon: Users },
    { id: 'payments', label: t('payments'), icon: Wallet },
    { id: 'expenses', label: t('expenses'), icon: Receipt },
    { id: 'reports', label: t('reports'), icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-stone-50 flex">
      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-white border-r border-stone-200 transition-all duration-300 ease-in-out lg:translate-x-0",
          isSidebarOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0 lg:w-20"
        )}
      >
        <div className="h-full flex flex-col">
          <div className="p-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shrink-0">
              <Home className="w-6 h-6 text-white" />
            </div>
            {isSidebarOpen && <span className="font-bold text-lg text-stone-900 truncate">House Rent</span>}
          </div>

          <nav className="flex-1 px-3 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveScreen(item.id as Screen);
                  if (window.innerWidth < 1024) {
                    setIsSidebarOpen(false);
                  }
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all group",
                  activeScreen === item.id 
                    ? "bg-emerald-50 text-emerald-700" 
                    : "text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                )}
              >
                <item.icon className={cn("w-5 h-5 shrink-0", activeScreen === item.id ? "text-emerald-600" : "text-stone-400 group-hover:text-stone-600")} />
                {isSidebarOpen && <span className="font-medium">{item.label}</span>}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-stone-100 space-y-4">
            {isSidebarOpen && (
              <div className="flex items-center gap-2 px-3 py-2 bg-stone-50 rounded-xl">
                <Languages className="w-4 h-4 text-stone-400" />
                <div className="flex gap-1 flex-1">
                  <button 
                    onClick={() => setLanguage('en')}
                    className={`flex-1 py-1 text-xs font-bold rounded-md transition-all ${language === 'en' ? 'bg-white text-emerald-600 shadow-sm' : 'text-stone-400'}`}
                  >
                    EN
                  </button>
                  <button 
                    onClick={() => setLanguage('bn')}
                    className={`flex-1 py-1 text-xs font-bold rounded-md transition-all ${language === 'bn' ? 'bg-white text-emerald-600 shadow-sm' : 'text-stone-400'}`}
                  >
                    BN
                  </button>
                </div>
              </div>
            )}

            <button 
              onClick={handleLogout}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-stone-500 hover:bg-red-50 hover:text-red-600 transition-all group"
              )}
            >
              <LogOut className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span className="font-medium">{t('logout')}</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all duration-300 min-w-0",
        isSidebarOpen ? "lg:ml-64" : "lg:ml-20"
      )}>
        <header className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-40">
          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-stone-100 rounded-lg text-stone-500"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h2 className="text-lg sm:text-xl font-semibold text-stone-900 capitalize truncate max-w-[150px] sm:max-w-none">
              {navItems.find(i => i.id === activeScreen)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium text-stone-900">{user.displayName || user.email?.split('@')[0] || 'User'}</p>
              <p className="text-xs text-stone-500">{user.email}</p>
            </div>
            <img 
              src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email?.split('@')[0] || 'User'}&background=random`} 
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-stone-200"
              alt="Profile"
            />
          </div>
        </header>

        <div className="p-4 sm:p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeScreen}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeScreen === 'dashboard' && (
                <Dashboard 
                  houses={houses} 
                  rooms={rooms} 
                  tenants={tenants} 
                  payments={payments} 
                  expenses={expenses} 
                />
              )}
              {activeScreen === 'houses' && <HousesList houses={houses} rooms={rooms} tenants={tenants} user={user} />}
              {activeScreen === 'rooms' && <RoomsList rooms={rooms} houses={houses} tenants={tenants} user={user} />}
              {activeScreen === 'tenants' && <TenantsList tenants={tenants} rooms={rooms} houses={houses} payments={payments} user={user} />}
              {activeScreen === 'payments' && <PaymentsList payments={payments} tenants={tenants} user={user} />}
              {activeScreen === 'expenses' && <ExpensesList expenses={expenses} houses={houses} user={user} />}
              {activeScreen === 'reports' && (
                <Reports 
                  payments={payments} 
                  expenses={expenses} 
                  houses={houses} 
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
