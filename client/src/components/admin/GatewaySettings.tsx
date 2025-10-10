import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Key, Save } from "lucide-react";

interface GatewayConfig {
  publicKey: string;
  privateKey: string;
}

export function GatewaySettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [publicKey, setPublicKey] = useState("");
  const [privateKey, setPrivateKey] = useState("");

  const { data: config, isLoading } = useQuery<GatewayConfig>({
    queryKey: ['/api/admin/gateway-config'],
  });

  useEffect(() => {
    if (config) {
      setPublicKey(config.publicKey || "");
      // Don't set private key as it comes masked
    }
  }, [config]);

  const saveConfigMutation = useMutation({
    mutationFn: async (data: { publicKey: string; privateKey: string }) => {
      return apiRequest("POST", "/api/admin/gateway-config", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/gateway-config'] });
      toast({
        title: "Configuração salva",
        description: "As chaves do gateway BRPIX foram atualizadas com sucesso.",
      });
      setPrivateKey(""); // Clear private key after saving
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!publicKey) {
      toast({
        title: "Campos obrigatórios",
        description: "A chave pública é obrigatória.",
        variant: "destructive",
      });
      return;
    }

    if (!privateKey && !config?.privateKey) {
      toast({
        title: "Campos obrigatórios",
        description: "A chave privada é obrigatória na primeira configuração.",
        variant: "destructive",
      });
      return;
    }

    saveConfigMutation.mutate({
      publicKey,
      privateKey: privateKey || config?.privateKey || "",
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Carregando configuração...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Configuração do Gateway BRPIX
        </CardTitle>
        <CardDescription>
          Configure as chaves de API para integração com o gateway de pagamento BRPIX
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="publicKey">Chave Pública (X-Public-Key)</Label>
          <Input
            id="publicKey"
            type="text"
            placeholder="Insira a chave pública do BRPIX"
            value={publicKey}
            onChange={(e) => setPublicKey(e.target.value)}
            data-testid="input-public-key"
          />
          <p className="text-xs text-muted-foreground">
            Esta chave é usada para identificar sua conta no BRPIX
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="privateKey">Chave Privada (X-Private-Key)</Label>
          <Input
            id="privateKey"
            type="password"
            placeholder={config?.privateKey ? "••••••••••••••••" : "Insira a chave privada do BRPIX"}
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            data-testid="input-private-key"
          />
          <p className="text-xs text-muted-foreground">
            {config?.privateKey 
              ? "Deixe em branco para manter a chave atual" 
              : "Esta chave é usada para autenticação segura com o BRPIX"}
          </p>
        </div>

        <div className="flex items-center gap-3 pt-4">
          <Button
            onClick={handleSave}
            disabled={saveConfigMutation.isPending}
            data-testid="button-save-gateway"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveConfigMutation.isPending ? "Salvando..." : "Salvar Configuração"}
          </Button>
          
          {config?.publicKey && (
            <p className="text-sm text-muted-foreground">
              Última atualização: configuração ativa
            </p>
          )}
        </div>

        <div className="bg-muted/50 rounded-lg p-4 mt-6">
          <h4 className="text-sm font-medium mb-2">Como obter as chaves BRPIX:</h4>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Acesse o painel do BRPIX em brpix.com</li>
            <li>Faça login na sua conta</li>
            <li>Vá em Configurações → API</li>
            <li>Copie a chave pública e privada</li>
            <li>Cole aqui e clique em Salvar</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
