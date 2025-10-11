import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  DollarSign, 
  TrendingUp,
  Link as LinkIcon,
  Clock,
  CheckCircle,
  ArrowDownToLine
} from "lucide-react";

interface PublicSettings {
  depositMin: number;
  depositMax: number;
  withdrawalMin: number;
  withdrawalMax: number;
  affiliateCpaPercent: number;
  affiliateCpaFixed: number;
}

interface AffiliateStats {
  totalAffiliates: number;
  activeAffiliates: number;
  totalCommissionsPaid: string;
  totalReferrals: number;
  pendingCommissions: string;
}

interface AffiliateData {
  userId: string;
  userName: string;
  email: string;
  referralCode: string;
  totalReferrals: number;
  totalCommissionEarned: string;
  totalReferredDeposits: string;
  activeReferrals: number;
  createdAt: string;
}

interface CommissionHistory {
  id: string;
  affiliateUserName: string;
  referredUserName: string;
  commissionAmount: string;
  depositAmount: string;
  commissionType: string;
  createdAt: string;
  status: string;
}

export function AffiliatesManagement() {
  const { data: stats, isLoading: statsLoading } = useQuery<AffiliateStats>({
    queryKey: ['/api/admin/affiliates/stats'],
  });

  const { data: affiliates, isLoading: affiliatesLoading } = useQuery<AffiliateData[]>({
    queryKey: ['/api/admin/affiliates/list'],
  });

  const { data: commissions, isLoading: commissionsLoading } = useQuery<CommissionHistory[]>({
    queryKey: ['/api/admin/affiliates/commissions'],
  });

  const { data: settings } = useQuery<PublicSettings>({
    queryKey: ['/api/public-settings'],
  });

  const cpaPercent = settings?.affiliateCpaPercent ?? 25;

  if (statsLoading || affiliatesLoading || commissionsLoading) {
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Afiliados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-display font-bold" data-testid="text-total-affiliates">
              {stats?.totalAffiliates || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-display font-bold" data-testid="text-active-affiliates">
              {stats?.activeAffiliates || 0}
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
              {stats?.totalReferrals || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              Comissões Pagas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-display font-bold" data-testid="text-total-commissions">
              R$ {stats?.totalCommissionsPaid || '0,00'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-display font-bold" data-testid="text-pending-commissions">
              R$ {stats?.pendingCommissions || '0,00'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Affiliates List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Afiliados</CardTitle>
          <CardDescription>
            Todos os usuários que possuem link de afiliado ativo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {affiliates && affiliates.length > 0 ? (
              affiliates.map((affiliate) => (
                <div
                  key={affiliate.userId}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover-elevate"
                  data-testid={`affiliate-${affiliate.userId}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-semibold" data-testid={`text-affiliate-name-${affiliate.userId}`}>
                          {affiliate.userName}
                        </p>
                        <p className="text-sm text-muted-foreground">{affiliate.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="gap-1">
                        <LinkIcon className="h-3 w-3" />
                        {affiliate.referralCode}
                      </Badge>
                      <Badge variant="secondary">
                        {affiliate.totalReferrals} indicações
                      </Badge>
                      {affiliate.activeReferrals > 0 && (
                        <Badge variant="default">
                          {affiliate.activeReferrals} ativos
                        </Badge>
                      )}
                      <Badge variant="outline" className="gap-1">
                        <ArrowDownToLine className="h-3 w-3" />
                        R$ {affiliate.totalReferredDeposits} depositados
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600" data-testid={`text-affiliate-earnings-${affiliate.userId}`}>
                      R$ {affiliate.totalCommissionEarned}
                    </div>
                    <p className="text-xs text-muted-foreground">Comissão ({cpaPercent}% CPA)</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhum afiliado cadastrado ainda
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Commission History */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Comissões</CardTitle>
          <CardDescription>
            Últimas comissões geradas no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {commissions && commissions.length > 0 ? (
              commissions.map((commission) => (
                <div
                  key={commission.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg"
                  data-testid={`commission-${commission.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <p className="font-semibold">{commission.affiliateUserName}</p>
                      <span className="text-muted-foreground">→</span>
                      <p className="text-sm text-muted-foreground">indicou {commission.referredUserName}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">
                        Depósito: R$ {commission.depositAmount}
                      </Badge>
                      <Badge variant="secondary">
                        {commission.commissionType}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(commission.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      R$ {commission.commissionAmount}
                    </div>
                    <Badge 
                      variant={commission.status === 'paid' ? 'default' : 'secondary'}
                      className="mt-1"
                    >
                      {commission.status === 'paid' ? 'Pago' : 'Pendente'}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma comissão registrada ainda
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
