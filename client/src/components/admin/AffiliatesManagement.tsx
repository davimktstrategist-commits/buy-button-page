import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { 
  Users, 
  DollarSign,
  Link as LinkIcon,
  Search,
  ArrowDownToLine
} from "lucide-react";

interface AffiliateData {
  id: string;
  firstName: string;
  email: string;
  referralCode: string;
  totalReferrals: number;
  affiliateBalance: number;
  totalDeposited: number;
  createdAt: string;
}

export function AffiliatesManagement() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: affiliates, isLoading } = useQuery<AffiliateData[]>({
    queryKey: ['/api/admin/affiliates', searchTerm],
    queryFn: async () => {
      const url = searchTerm 
        ? `/api/admin/affiliates?search=${encodeURIComponent(searchTerm)}`
        : '/api/admin/affiliates';
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch affiliates');
      }
      
      return response.json();
    },
  });

  // Calcular estatísticas
  const totalAffiliates = affiliates?.length || 0;
  const totalReferrals = affiliates?.reduce((sum, a) => sum + a.totalReferrals, 0) || 0;
  const totalCommissions = affiliates?.reduce((sum, a) => sum + a.affiliateBalance, 0) || 0;
  const totalDeposited = affiliates?.reduce((sum, a) => sum + a.totalDeposited, 0) || 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Carregando dados de afiliados...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Afiliados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-display font-bold" data-testid="text-total-affiliates">
              {totalAffiliates}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Indicações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-display font-bold" data-testid="text-total-referrals">
              {totalReferrals}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              Comissões Totais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-display font-bold" data-testid="text-total-commissions">
              R$ {totalCommissions.toFixed(2).replace('.', ',')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ArrowDownToLine className="h-4 w-4 text-blue-500" />
              Total Depositado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-display font-bold" data-testid="text-total-deposited">
              R$ {totalDeposited.toFixed(2).replace('.', ',')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Affiliates List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Afiliados</CardTitle>
          <CardDescription>
            Ordenados por total depositado pelos indicados (maior primeiro)
          </CardDescription>
          <div className="flex items-center gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-affiliates"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {affiliates && affiliates.length > 0 ? (
              affiliates.map((affiliate) => (
                <div
                  key={affiliate.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover-elevate"
                  data-testid={`affiliate-${affiliate.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-semibold" data-testid={`text-affiliate-name-${affiliate.id}`}>
                          {affiliate.firstName}
                        </p>
                        <p className="text-sm text-muted-foreground">{affiliate.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="outline" className="gap-1">
                        <LinkIcon className="h-3 w-3" />
                        {affiliate.referralCode}
                      </Badge>
                      <Badge variant="secondary">
                        {affiliate.totalReferrals} indicações
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <ArrowDownToLine className="h-3 w-3" />
                        R$ {affiliate.totalDeposited.toFixed(2).replace('.', ',')} depositados
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600" data-testid={`text-affiliate-earnings-${affiliate.id}`}>
                      R$ {affiliate.affiliateBalance.toFixed(2).replace('.', ',')}
                    </div>
                    <p className="text-xs text-muted-foreground">Comissão acumulada</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                {searchTerm ? 'Nenhum afiliado encontrado' : 'Nenhum afiliado cadastrado ainda'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
