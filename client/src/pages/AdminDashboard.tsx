import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  UserPlus,
  Wallet,
  ArrowDownToLine,
  Settings as SettingsIcon,
  ChevronDown,
  Dices
} from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Admin components
import { RouletteSettings } from "@/components/admin/RouletteSettings";
import { UsersManagement } from "@/components/admin/UsersManagement";
import { TransactionsManagement } from "@/components/admin/TransactionsManagement";
import { WithdrawalsManagement } from "@/components/admin/WithdrawalsManagement";
import { GeneralSettings } from "@/components/admin/GeneralSettings";
import { AffiliatesManagement } from "@/components/admin/AffiliatesManagement";

interface DashboardStats {
  totalUsers: number;
  totalDeposits: string;
  totalBets: string;
  totalWinnings: string;
  platformProfit: string;
  activeGames: number;
  pendingWithdrawals: number;
  accountBalance: string;
  todayDeposits: string;
  confirmedDeposits: number;
  paidWithdrawals: string;
}

type Section = 'dashboard' | 'users' | 'affiliates' | 'deposits' | 'withdrawals' | 'roulette' | 'system' | 'general-settings';

export default function AdminDashboard() {
  const { user, isAdmin, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [gestaoOpen, setGestaoOpen] = useState(true);
  const [jogosOpen, setJogosOpen] = useState(true);
  const [sistemaOpen, setSistemaOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (response.ok) {
        const { token } = await response.json();
        localStorage.setItem('adminToken', token);
        window.location.reload(); // Recarrega para aplicar o token
      } else {
        setLoginError('Senha incorreta');
      }
    } catch (error) {
      setLoginError('Erro ao fazer login');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['/api/admin/stats'],
    enabled: isAdmin,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  // Show login page if not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Admin Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Senha de Administrador
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                  placeholder="Digite a senha"
                  required
                  data-testid="input-admin-password"
                />
              </div>
              {loginError && (
                <p className="text-sm text-destructive">{loginError}</p>
              )}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoggingIn}
                data-testid="button-admin-login"
              >
                {isLoggingIn ? 'Entrando...' : 'Entrar'}
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                className="w-full" 
                onClick={() => window.location.href = '/'}
                data-testid="button-back-to-game"
              >
                Voltar ao Jogo
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const MenuItem = ({ 
    icon: Icon, 
    label, 
    section, 
    testId 
  }: { 
    icon: any; 
    label: string; 
    section: Section; 
    testId: string;
  }) => (
    <button
      onClick={() => setActiveSection(section)}
      data-testid={testId}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors rounded-lg",
        activeSection === section 
          ? "bg-primary text-primary-foreground" 
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );

  const SectionHeader = ({ 
    label, 
    isOpen, 
    onToggle 
  }: { 
    label: string; 
    isOpen: boolean; 
    onToggle: () => void;
  }) => (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
    >
      {label}
      <ChevronDown className={cn(
        "h-4 w-4 transition-transform",
        isOpen && "transform rotate-180"
      )} />
    </button>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Dices className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg">Roleta CashGiro</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          <MenuItem 
            icon={SettingsIcon} 
            label="Dashboard" 
            section="dashboard" 
            testId="menu-dashboard"
          />

          <div className="pt-4">
            <SectionHeader 
              label="GESTÃO" 
              isOpen={gestaoOpen} 
              onToggle={() => setGestaoOpen(!gestaoOpen)}
            />
            {gestaoOpen && (
              <div className="mt-1 space-y-1">
                <MenuItem 
                  icon={Users} 
                  label="Usuários" 
                  section="users" 
                  testId="menu-users"
                />
                <MenuItem 
                  icon={UserPlus} 
                  label="Afiliados" 
                  section="affiliates" 
                  testId="menu-affiliates"
                />
                <MenuItem 
                  icon={Wallet} 
                  label="Depósitos" 
                  section="deposits" 
                  testId="menu-deposits"
                />
                <MenuItem 
                  icon={ArrowDownToLine} 
                  label="Saques" 
                  section="withdrawals" 
                  testId="menu-withdrawals"
                />
              </div>
            )}
          </div>

          <div className="pt-4">
            <SectionHeader 
              label="JOGOS" 
              isOpen={jogosOpen} 
              onToggle={() => setJogosOpen(!jogosOpen)}
            />
            {jogosOpen && (
              <div className="mt-1 space-y-1">
                <MenuItem 
                  icon={Dices} 
                  label="Roleta" 
                  section="roulette" 
                  testId="menu-roulette"
                />
              </div>
            )}
          </div>

          <div className="pt-4">
            <SectionHeader 
              label="SISTEMA" 
              isOpen={sistemaOpen} 
              onToggle={() => setSistemaOpen(!sistemaOpen)}
            />
            {sistemaOpen && (
              <div className="mt-1 space-y-1">
                <MenuItem 
                  icon={SettingsIcon} 
                  label="Configurações" 
                  section="general-settings" 
                  testId="menu-settings"
                />
              </div>
            )}
          </div>
        </nav>

        {/* User Info + Logout */}
        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              localStorage.removeItem('adminToken');
              setLocation('/admin');
            }}
            className="w-full justify-start"
            data-testid="button-logout"
          >
            <span className="text-sm">Sair</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="border-b border-border bg-card sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-display font-bold">Dashboard</h1>
              {activeSection === 'dashboard' && (
                <p className="text-sm text-muted-foreground">
                  Olá, Santzim!
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-muted-foreground">Usuários Online: 1</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                SZ
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {activeSection === 'dashboard' && (
            <>
              <p className="text-muted-foreground mb-6">
                Aqui está um resumo das principais métricas do sistema
              </p>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Lucro do Jogo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-display font-bold" data-testid="text-profit">
                      R$ {stats?.platformProfit || '0,00'}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Apostado (Jogo)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-display font-bold" data-testid="text-total-bets">
                      R$ {stats?.totalBets || '0,00'}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">Depósitos de Hoje</CardTitle>
                      <span className="text-xs text-muted-foreground">0%</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-display font-bold" data-testid="text-today-deposits">
                      R$ {stats?.todayDeposits || '0,00'}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Prêmios Pagos (Jogo)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-display font-bold" data-testid="text-winnings">
                      R$ {stats?.totalWinnings || '0,00'}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                      <span className="text-xs text-green-500 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        100%
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-display font-bold" data-testid="text-users">
                      {stats?.totalUsers || 0}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Depósitos Confirmados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-display font-bold" data-testid="text-confirmed-deposits">
                      {stats?.confirmedDeposits || 0}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Saldo Total em Contas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-display font-bold" data-testid="text-account-balance">
                      R$ {stats?.accountBalance || '0,00'}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">Saques Pagos</CardTitle>
                      <span className="text-xs text-muted-foreground">0 pendentes</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-display font-bold" data-testid="text-paid-withdrawals">
                      R$ {stats?.paidWithdrawals || '0,00'}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {activeSection === 'users' && <UsersManagement />}
          {activeSection === 'affiliates' && <AffiliatesManagement />}
          {activeSection === 'deposits' && <TransactionsManagement />}
          {activeSection === 'withdrawals' && <WithdrawalsManagement />}
          {activeSection === 'roulette' && <RouletteSettings />}
          {activeSection === 'general-settings' && <GeneralSettings />}
        </div>
      </main>
    </div>
  );
}
