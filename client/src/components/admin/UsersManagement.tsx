import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from "@shared/schema";

export function UsersManagement() {
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usuários Cadastrados</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Saldo</TableHead>
              <TableHead>Total Depositado</TableHead>
              <TableHead>Total Ganho</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Função</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.profileImageUrl || undefined} />
                      <AvatarFallback>
                        {user.firstName?.[0] || user.email?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span>{user.firstName || user.email?.split('@')[0] || 'Sem nome'}</span>
                  </div>
                </TableCell>
                <TableCell>{user.email || '-'}</TableCell>
                <TableCell className="font-mono">R$ {parseFloat(user.balance).toFixed(2)}</TableCell>
                <TableCell className="font-mono">R$ {parseFloat(user.totalDeposited).toFixed(2)}</TableCell>
                <TableCell className="font-mono">R$ {parseFloat(user.totalWon).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? "default" : "destructive"}>
                    {user.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.role === 'admin' ? "default" : "outline"}>
                    {user.role === 'admin' ? 'Admin' : 'Usuário'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Nenhum usuário cadastrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
