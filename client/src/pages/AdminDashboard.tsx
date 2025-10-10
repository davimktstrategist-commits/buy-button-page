import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  ArrowLeft,
  Settings as SettingsIcon
} from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { RouletteSettings } from "@/components/admin/RouletteSettings";
import { UsersManagement } from "@/components/admin/UsersManagement";
import { TransactionsManagement } from "@/components/admin/TransactionsManagement";
import { WithdrawalsManagement } from "@/components/admin/WithdrawalsManagement";
import { GatewaySettings } from "@/components/admin/GatewaySettings";

interface DashboardStats {
  totalUsers: number;
  totalDeposits: string;
  totalBets: string;
  totalWinnings: string;
  platformProfit: string;
  activeGames: number;
  pendingWithdrawals: number;
  accountBalance: string;
}

export default function AdminDashboard() {
  const { isAdmin, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect if not admin
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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation('/')}
                data-testid="button-back-game"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-display font-bold">Painel Administrativo</h1>
                <p className="text-sm text-muted-foreground">Roleta do Tigre</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lucro do Jogo</CardTitle>
              <TrendingUp className="h-4 w-4 text-chart-2" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-display font-bold text-chart-2" data-testid="text-profit">
                R$ {stats?.platformProfit || '0,00'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total apostado - Prêmios pagos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Apostado</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-display font-bold" data-testid="text-total-bets">
                R$ {stats?.totalBets || '0,00'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Depósitos</CardTitle>
              <TrendingUp className="h-4 w-4 text-chart-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-display font-bold" data-testid="text-deposits">
                R$ {stats?.totalDeposits || '0,00'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Prêmios Pagos</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-display font-bold text-destructive" data-testid="text-winnings">
                R$ {stats?.totalWinnings || '0,00'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-chart-5" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-display font-bold" data-testid="text-users">
                {stats?.totalUsers || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saques Pendentes</CardTitle>
              <DollarSign className="h-4 w-4 text-chart-5" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-display font-bold" data-testid="text-pending-withdrawals">
                {stats?.pendingWithdrawals || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Total em Contas</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-display font-bold" data-testid="text-account-balance">
                R$ {stats?.accountBalance || '0,00'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Management Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="h-4 w-4 mr-2" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="transactions" data-testid="tab-transactions">
              <DollarSign className="h-4 w-4 mr-2" />
              Transações
            </TabsTrigger>
            <TabsTrigger value="withdrawals" data-testid="tab-withdrawals">
              <TrendingDown className="h-4 w-4 mr-2" />
              Saques
            </TabsTrigger>
            <TabsTrigger value="roulette" data-testid="tab-roulette">
              <SettingsIcon className="h-4 w-4 mr-2" />
              Roleta
            </TabsTrigger>
            <TabsTrigger value="gateway" data-testid="tab-gateway">
              <SettingsIcon className="h-4 w-4 mr-2" />
              Gateway
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UsersManagement />
          </TabsContent>

          <TabsContent value="transactions">
            <TransactionsManagement />
          </TabsContent>

          <TabsContent value="withdrawals">
            <WithdrawalsManagement />
          </TabsContent>

          <TabsContent value="roulette">
            <RouletteSettings />
          </TabsContent>

          <TabsContent value="gateway">
            <GatewaySettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
