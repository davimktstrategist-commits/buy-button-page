import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import type { Withdrawal } from "@shared/schema";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, X } from "lucide-react";

export function WithdrawalsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: withdrawals = [] } = useQuery<Withdrawal[]>({
    queryKey: ['/api/admin/withdrawals'],
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
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Chave PIX</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {withdrawals.map((withdrawal) => (
              <TableRow key={withdrawal.id} data-testid={`row-withdrawal-${withdrawal.id}`}>
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
                <TableCell colSpan={6} className="text-center text-muted-foreground">
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
