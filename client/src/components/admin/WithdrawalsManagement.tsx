import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Withdrawal } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, X, Wallet, TrendingUp, Search, Filter } from "lucide-react";
import { useState } from "react";

interface WithdrawalWithUser extends Withdrawal {
  userName?: string;
  userEmail?: string;
}

export function WithdrawalsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  const { data: withdrawals = [] } = useQuery<WithdrawalWithUser[]>({
    queryKey: ['/api/admin/withdrawals', searchTerm, statusFilter, dateFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (dateFilter !== 'all') params.append('days', dateFilter);

      const url = params.toString() 
        ? `/api/admin/withdrawals?${params.toString()}`
        : '/api/admin/withdrawals';

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch withdrawals');
      }

      return response.json();
    },
  });

  const approveWithdrawalMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/admin/withdrawals/${id}/approve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/withdrawals'] });
      toast({
        title: "Saque aprovado",
        description: "O saque foi aprovado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao aprovar saque",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectWithdrawalMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return apiRequest("POST", `/api/admin/withdrawals/${id}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/withdrawals'] });
      toast({
        title: "Saque rejeitado",
        description: "O saque foi rejeitado.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao rejeitar saque",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      completed: 'default',
      pending: 'outline',
      processing: 'outline',
      failed: 'destructive',
      cancelled: 'destructive',
    };
    
    const labels: Record<string, string> = {
      completed: 'Aprovado',
      pending: 'Pendente',
      processing: 'Processando',
      failed: 'Falhou',
      cancelled: 'Rejeitado',
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Solicitações de Saque</CardTitle>
        <CardDescription>
          Gerencie as solicitações de saque dos usuários
        </CardDescription>
        
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou chave PIX..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-withdrawals"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="completed">Aprovado</SelectItem>
              <SelectItem value="cancelled">Rejeitado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-date-filter">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo período</SelectItem>
              <SelectItem value="1">Hoje</SelectItem>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Chave PIX</TableHead>
              <TableHead>Tipo PIX</TableHead>
              <TableHead>Carteira</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {withdrawals.map((withdrawal) => (
              <TableRow key={withdrawal.id} data-testid={`row-withdrawal-${withdrawal.id}`}>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-sm" data-testid={`text-user-name-${withdrawal.id}`}>
                      {withdrawal.userName || 'Sem nome'}
                    </span>
                    <span className="text-xs text-muted-foreground" data-testid={`text-user-email-${withdrawal.id}`}>
                      {withdrawal.userEmail}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {format(new Date(withdrawal.createdAt), "dd/MM/yy HH:mm", { locale: ptBR })}
                </TableCell>
                <TableCell className="font-mono font-bold">
                  R$ {parseFloat(withdrawal.amount).toFixed(2)}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {withdrawal.pixKey}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{withdrawal.pixKeyType}</Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={withdrawal.walletType === 'affiliateBalance' ? 'default' : 'secondary'}
                    className="gap-1"
                    data-testid={`badge-wallet-type-${withdrawal.id}`}
                  >
                    {withdrawal.walletType === 'affiliateBalance' ? (
                      <>
                        <TrendingUp className="h-3 w-3" />
                        Afiliado
                      </>
                    ) : (
                      <>
                        <Wallet className="h-3 w-3" />
                        Principal
                      </>
                    )}
                  </Badge>
                </TableCell>
                <TableCell>
                  {getStatusBadge(withdrawal.status)}
                </TableCell>
                <TableCell>
                  {withdrawal.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => approveWithdrawalMutation.mutate(withdrawal.id)}
                        disabled={approveWithdrawalMutation.isPending}
                        data-testid={`button-approve-${withdrawal.id}`}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rejectWithdrawalMutation.mutate({ 
                          id: withdrawal.id, 
                          reason: 'Rejeitado pelo administrador' 
                        })}
                        disabled={rejectWithdrawalMutation.isPending}
                        data-testid={`button-reject-${withdrawal.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {withdrawals.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Nenhum saque pendente
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
