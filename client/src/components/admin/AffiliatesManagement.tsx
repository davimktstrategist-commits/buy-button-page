import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export function AffiliatesManagement() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Gestão de Afiliados
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-muted-foreground mb-2">
              Sistema de afiliados em desenvolvimento
            </p>
            <p className="text-sm text-muted-foreground">
              Em breve você poderá gerenciar afiliados e comissões
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
