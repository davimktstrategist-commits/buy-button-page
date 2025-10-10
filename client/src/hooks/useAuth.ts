// Hook para gerenciar autenticação de admin (password-based)
import { useQuery } from "@tanstack/react-query";

interface AdminSession {
  isAdmin: boolean;
  token?: string;
}

export function useAuth() {
  // Verifica se há token admin no localStorage
  const adminToken = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
  
  const { data, isLoading } = useQuery<AdminSession>({
    queryKey: ["/api/admin/verify"],
    retry: false,
    enabled: !!adminToken,
    queryFn: async () => {
      const response = await fetch('/api/admin/verify', {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      return response.json();
    }
  });

  const isAdmin = adminToken && data?.isAdmin === true;

  return {
    user: isAdmin ? { role: 'admin' } : null,
    isLoading: adminToken ? isLoading : false,
    isAuthenticated: !!isAdmin,
    isAdmin: !!isAdmin,
  };
}
