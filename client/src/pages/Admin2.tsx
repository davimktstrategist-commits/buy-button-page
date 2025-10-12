import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

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

  // Check admin token
  const token = localStorage.getItem('adminToken');
  if (!token) {
    navigate('/admin');
    return null;
  }

  // Fetch config
  const { data: config } = useQuery<Admin2Config>({
    queryKey: ['/api/admin2/config'],
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
  });

  // Save config mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (data: Admin2Config) => {
      return apiRequest('/api/admin2/config', 'POST', data);
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
