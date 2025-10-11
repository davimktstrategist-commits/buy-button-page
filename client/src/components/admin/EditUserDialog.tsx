import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

interface EditUserDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditUserDialog({ user, open, onOpenChange }: EditUserDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [balance, setBalance] = useState("0.00");
  const [influencerMode, setInfluencerMode] = useState(false);
  const [customCpaPercent, setCustomCpaPercent] = useState("");
  const [customCpaFixed, setCustomCpaFixed] = useState("");
  const [password, setPassword] = useState("");

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      setBalance(user.balance || "0.00");
      setInfluencerMode(user.influencerMode || false);
      setCustomCpaPercent(user.customAffiliateCpaPercent || "");
      setCustomCpaFixed(user.customAffiliateCpaFixed || "");
      setPassword("");
    }
  }, [user]);

  const updateUserMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/admin/users/${user?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao atualizar usuário');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Usuário atualizado",
        description: "As alterações foram salvas com sucesso.",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar usuário",
        description: error.message || "Ocorreu um erro ao salvar as alterações.",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/admin/users/${user?.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao deletar usuário');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Usuário deletado",
        description: "A conta foi removida com sucesso.",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao deletar usuário",
        description: error.message || "Ocorreu um erro ao deletar a conta.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updateData: any = {
      balance: parseFloat(balance) || 0,
      influencerMode,
    };

    if (customCpaPercent) {
      updateData.customAffiliateCpaPercent = parseFloat(customCpaPercent);
    }
    
    if (customCpaFixed) {
      updateData.customAffiliateCpaFixed = parseFloat(customCpaFixed);
    }

    if (password.trim()) {
      updateData.password = password;
    }

    updateUserMutation.mutate(updateData);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-edit-user">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>
            Altere as informações de {user.firstName || user.email || 'usuário'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="balance">Saldo (R$)</Label>
            <Input
              id="balance"
              type="number"
              step="0.01"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              data-testid="input-balance"
            />
          </div>

          <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="influencer-mode">Modo Influencer</Label>
              <p className="text-sm text-muted-foreground">
                Margem de 70% e sem rollover
              </p>
            </div>
            <Switch
              id="influencer-mode"
              checked={influencerMode}
              onCheckedChange={setInfluencerMode}
              data-testid="switch-influencer-mode"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpa-percent">CPA Personalizado - Percentual (%)</Label>
            <Input
              id="cpa-percent"
              type="number"
              step="0.01"
              placeholder="Deixe vazio para usar padrão"
              value={customCpaPercent}
              onChange={(e) => setCustomCpaPercent(e.target.value)}
              data-testid="input-cpa-percent"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpa-fixed">CPA Personalizado - Valor Fixo (R$)</Label>
            <Input
              id="cpa-fixed"
              type="number"
              step="0.01"
              placeholder="Deixe vazio para usar padrão"
              value={customCpaFixed}
              onChange={(e) => setCustomCpaFixed(e.target.value)}
              data-testid="input-cpa-fixed"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Nova Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="Deixe vazio para não alterar"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="input-password"
            />
          </div>

          <DialogFooter className="flex items-center justify-between">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  data-testid="button-delete-user"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Deletar Conta
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. A conta de {user.firstName || user.email || 'este usuário'} será permanentemente deletada.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteUserMutation.mutate()}
                    disabled={deleteUserMutation.isPending}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    data-testid="button-confirm-delete"
                  >
                    {deleteUserMutation.isPending ? "Deletando..." : "Deletar"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateUserMutation.isPending}
                data-testid="button-save"
              >
                {updateUserMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
