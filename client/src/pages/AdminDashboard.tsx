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
import { AffiliatesManagement } from "@/components/admin/AffiliatesManagement";
import { DepositsChart } from "@/components/admin/DepositsChart";
import { TopBalancesChart } from "@/components/admin/TopBalancesChart";

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

type Section = 'dashboard' | 'users' | 'affiliates' | 'deposits' | 'withdrawals' | 'roulette' | 'system';

export default function AdminDashboard() {
  const { user, isAdmin, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [gestaoOpen, setGestaoOpen] = useState(true);
  const [jogosOpen, setJogosOpen] = useState(true);
  const [sistemaOpen, setSistemaOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      setLocation('/');
    }
  }, [isAdmin, isLoading, setLocation]);

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

  if (!isAdmin) return null;

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
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Dices className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg">Roleta do Tigre</span>
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
                {/* Futuras configurações */}
              </div>
            )}
          </div>
        </nav>

        {/* User Info + Logout */}
        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/')}
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
                  Olá, NextSistemas!
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-muted-foreground">Usuários Online: 1</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                NE
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
                <Card className="relative overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Lucro do Jogo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-display font-bold" data-testid="text-profit">
                      R$ {stats?.platformProfit || '0,00'}
                    </div>
                    <div className="h-16 mt-2">
                      <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                        <path d="M0,20 Q25,10 50,15 T100,25" fill="none" stroke="rgb(251, 191, 36)" strokeWidth="2" />
                      </svg>
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Apostado (Jogo)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-display font-bold" data-testid="text-total-bets">
                      R$ {stats?.totalBets || '0,00'}
                    </div>
                    <div className="h-16 mt-2">
                      <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                        <path d="M0,25 Q25,15 50,20 T100,18" fill="none" stroke="rgb(34, 197, 94)" strokeWidth="2" />
                      </svg>
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden">
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
                    <div className="h-16 mt-2">
                      <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                        <path d="M0,30 Q25,28 50,25 T100,30" fill="none" stroke="rgb(59, 130, 246)" strokeWidth="2" />
                      </svg>
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Prêmios Pagos (Jogo)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-display font-bold" data-testid="text-winnings">
                      R$ {stats?.totalWinnings || '0,00'}
                    </div>
                    <div className="h-16 mt-2">
                      <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                        <path d="M0,15 Q25,20 50,18 T100,22" fill="none" stroke="rgb(239, 68, 68)" strokeWidth="2" />
                      </svg>
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden">
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
                    <div className="h-16 mt-2">
                      <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                        <path d="M0,35 Q25,30 50,32 T100,28" fill="none" stroke="rgb(168, 85, 247)" strokeWidth="2" />
                      </svg>
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Depósitos Confirmados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-display font-bold" data-testid="text-confirmed-deposits">
                      {stats?.confirmedDeposits || 0}
                    </div>
                    <div className="h-16 mt-2">
                      <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                        <path d="M0,22 Q25,18 50,20 T100,16" fill="none" stroke="rgb(14, 165, 233)" strokeWidth="2" />
                      </svg>
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Saldo Total em Contas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-display font-bold" data-testid="text-account-balance">
                      R$ {stats?.accountBalance || '0,00'}
                    </div>
                    <div className="h-16 mt-2">
                      <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                        <path d="M0,20 Q25,22 50,19 T100,21" fill="none" stroke="rgb(251, 191, 36)" strokeWidth="2" />
                      </svg>
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden">
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
                    <div className="h-16 mt-2">
                      <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                        <path d="M0,25 Q25,23 50,26 T100,24" fill="none" stroke="rgb(107, 114, 128)" strokeWidth="2" />
                      </svg>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DepositsChart />
                <TopBalancesChart />
              </div>
            </>
          )}

          {activeSection === 'users' && <UsersManagement />}
          {activeSection === 'affiliates' && <AffiliatesManagement />}
          {activeSection === 'deposits' && <TransactionsManagement />}
          {activeSection === 'withdrawals' && <WithdrawalsManagement />}
          {activeSection === 'roulette' && <RouletteSettings />}
        </div>
      </main>
    </div>
  );
}
