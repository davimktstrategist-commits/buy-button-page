import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Transaction } from '@shared/schema';

interface Admin2Config {
  brpixSecretKey: string;
  brpixCompanyId: string;
  distributionPrimary: number;
  distributionSecondary: number;
}

interface Admin2Stats {
  totalPaid: string;
  depositsToday: string;
  totalCount: number;
  countToday: number;
}

export default function Admin2() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [secretKey, setSecretKey] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [distributionPrimary, setDistributionPrimary] = useState(10);
  const [distributionSecondary, setDistributionSecondary] = useState(3);
  const [page, setPage] = useState(1);
  const limit = 20;
  
  // Admin2 separate authentication
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Check admin2 authentication on mount
  useEffect(() => {
    const admin2Token = sessionStorage.getItem('admin2Token');
    if (admin2Token) {
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch config (always call hooks, but conditionally enable)
  const { data: config } = useQuery<Admin2Config>({
    queryKey: ['/api/admin2/config'],
    enabled: isAuthenticated,
  });

  // Update form when config loads
  useEffect(() => {
    if (config) {
      setSecretKey(config.brpixSecretKey || '');
      setCompanyId(config.brpixCompanyId || '');
      setDistributionPrimary(config.distributionPrimary || 10);
      setDistributionSecondary(config.distributionSecondary || 3);
    }
  }, [config]);

  // Fetch stats
  const { data: stats } = useQuery<Admin2Stats>({
    queryKey: ['/api/admin2/stats'],
    enabled: isAuthenticated,
  });

  // Fetch deposits
  const { data: depositsData, isLoading: isLoadingDeposits } = useQuery<{ deposits: Transaction[]; total: number }>({
    queryKey: ['/api/admin2/deposits', page],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/admin2/deposits?page=${page}&limit=${limit}`);
      return response.json();
    },
    enabled: isAuthenticated,
  });

  const deposits = depositsData?.deposits || [];
  const totalPages = Math.ceil((depositsData?.total || 0) / limit);

  // Save config mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (data: Admin2Config) => {
      return apiRequest('POST', '/api/admin2/config', data);
    },
    onSuccess: () => {
      toast({
        title: 'Configurações salvas',
        description: 'As configurações foram salvas com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin2/config'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin2/stats'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar configurações',
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    saveConfigMutation.mutate({
      brpixSecretKey: secretKey,
      brpixCompanyId: companyId,
      distributionPrimary,
      distributionSecondary,
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const response = await fetch('/api/admin2/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (data.success && data.token) {
        sessionStorage.setItem('admin2Token', data.token);
        localStorage.setItem('adminToken', data.token);
        setIsAuthenticated(true);
        setPassword('');
      } else {
        setLoginError(data.message || 'Senha incorreta');
      }
    } catch (error) {
      setLoginError('Erro ao fazer login');
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin 2 - Autenticação</CardTitle>
            <CardDescription>
              Digite a senha do Admin 2 para acessar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin2-password">Senha</Label>
                <Input
                  id="admin2-password"
                  type="password"
                  placeholder="Digite a senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="input-admin2-password"
                />
              </div>
              {loginError && (
                <p className="text-sm text-destructive">{loginError}</p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoggingIn}
                data-testid="button-admin2-login"
              >
                {isLoggingIn ? 'Entrando...' : 'Entrar'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => navigate('/admin')}
                data-testid="button-back-to-admin"
              >
                Voltar para Admin Principal
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold" data-testid="text-admin2-title">Admin 2 - Conta Secundária</h1>
          <Button 
            variant="outline" 
            onClick={() => navigate('/admin')}
            data-testid="button-back-admin"
          >
            Voltar para Admin Principal
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card data-testid="card-total-paid">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pago (Conta 2)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-paid">
                R$ {stats?.totalPaid || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.totalCount || 0} depósitos no total
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-deposits-today">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Depósitos Hoje</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-deposits-today">
                R$ {stats?.depositsToday || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.countToday || 0} depósitos hoje
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-distribution">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Distribuição</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-distribution">
                {distributionPrimary} / {distributionSecondary}
              </div>
              <p className="text-xs text-muted-foreground">
                Primária / Secundária
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-status">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-status">
                {secretKey && companyId ? '✓ Ativo' : '✗ Inativo'}
              </div>
              <p className="text-xs text-muted-foreground">
                {secretKey && companyId ? 'Conta configurada' : 'Aguardando configuração'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Configuração */}
        <Card data-testid="card-config">
          <CardHeader>
            <CardTitle>Configuração da Conta Secundária</CardTitle>
            <CardDescription>
              Configure as credenciais BRPIX e a distribuição de pagamentos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="secretKey">BRPIX Secret Key</Label>
                <Input
                  id="secretKey"
                  type="password"
                  placeholder="Digite a chave secreta"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  data-testid="input-secret-key"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyId">BRPIX Company ID</Label>
                <Input
                  id="companyId"
                  placeholder="Digite o ID da empresa"
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  data-testid="input-company-id"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="distributionPrimary">PIX para Conta Primária</Label>
                <Input
                  id="distributionPrimary"
                  type="number"
                  placeholder="Ex: 10"
                  value={distributionPrimary}
                  onChange={(e) => setDistributionPrimary(parseInt(e.target.value) || 0)}
                  data-testid="input-distribution-primary"
                />
                <p className="text-xs text-muted-foreground">
                  Quantidade de PIX que vão para a conta principal
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="distributionSecondary">PIX para Conta Secundária</Label>
                <Input
                  id="distributionSecondary"
                  type="number"
                  placeholder="Ex: 3"
                  value={distributionSecondary}
                  onChange={(e) => setDistributionSecondary(parseInt(e.target.value) || 0)}
                  data-testid="input-distribution-secondary"
                />
                <p className="text-xs text-muted-foreground">
                  Quantidade de PIX que vão para a conta secundária
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={saveConfigMutation.isPending}
                data-testid="button-save-config"
              >
                {saveConfigMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Depósitos */}
        <Card data-testid="card-deposits">
          <CardHeader>
            <CardTitle>Depósitos Secundários</CardTitle>
            <CardDescription>
              Lista de todos os depósitos processados pela conta secundária
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingDeposits ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>BRPIX ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deposits.map((deposit) => (
                      <TableRow key={deposit.id} data-testid={`row-deposit-${deposit.id}`}>
                        <TableCell className="text-sm">
                          {format(new Date(deposit.createdAt), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="font-mono">
                          R$ {parseFloat(deposit.amount).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={deposit.status === 'completed' ? 'default' : 'outline'}>
                            {deposit.status === 'completed' ? 'Pago' : 'Pendente'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {deposit.brpixTransactionId || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {deposits.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Nenhum depósito encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                
                {totalPages > 1 && (
                  <div className="flex items-center justify-between gap-4 mt-4">
                    <div className="text-sm text-muted-foreground">
                      Página {page} de {totalPages} ({depositsData?.total || 0} depósitos)
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        data-testid="button-prev-page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        data-testid="button-next-page"
                      >
                        Próxima
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Explicação */}
        <Card data-testid="card-explanation">
          <CardHeader>
            <CardTitle>Como funciona</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              O sistema distribui automaticamente os depósitos entre a conta principal e a conta secundária.
            </p>
            <p>
              <strong>Exemplo:</strong> Se configurar 10 PIX primários e 3 secundários:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Os primeiros 10 depósitos vão para a conta principal</li>
              <li>Os próximos 3 depósitos vão para a conta secundária</li>
              <li>Depois volta para 10 na principal, 3 na secundária, e assim por diante</li>
            </ul>
            <p className="mt-4">
              <strong>Importante:</strong> Depósitos na conta secundária creditam o usuário normalmente, mas não aparecem em "Depósitos Hoje" no painel principal.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
