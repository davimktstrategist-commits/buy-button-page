import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Mail, Lock, User, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AuthModal({ open, onClose, onSuccess }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const [registerData, setRegisterData] = useState({
    nome: "",
    email: "",
    telefone: "",
    password: "",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiRequest("POST", "/api/auth/login", loginData) as any;
      if (response.success) {
        toast({
          title: "Login realizado!",
          description: "Bem-vindo de volta!",
        });
        onSuccess();
        onClose();
      } else {
        toast({
          title: "Erro ao fazer login",
          description: response.message || "Credenciais inválidas",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao fazer login",
        variant: "destructive",
      });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    const palavras = registerData.nome.trim().split(' ').filter(p => p.length > 0);
    if (palavras.length < 2) {
      toast({
        title: "Nome inválido",
        description: "Digite seu nome completo (nome e sobrenome)",
        variant: "destructive",
      });
      return;
    }

    const telefone = registerData.telefone.replace(/\D/g, '');
    if (telefone.length < 10 || telefone.length > 11) {
      toast({
        title: "Telefone inválido",
        description: "Use o formato (11) 99999-9999",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiRequest("POST", "/api/auth/register", {
        ...registerData,
        telefone: telefone,
      }) as any;
      
      if (response.success) {
        toast({
          title: "Cadastro realizado!",
          description: "Sua conta foi criada com sucesso!",
        });
        onSuccess();
        onClose();
      } else {
        toast({
          title: "Erro ao cadastrar",
          description: response.message || "Erro ao criar conta",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar conta",
        variant: "destructive",
      });
    }
  };

  const formatTelefone = (value: string) => {
    let numeros = value.replace(/\D/g, '');
    if (numeros.length <= 11) {
      numeros = numeros.replace(/^(\d{2})(\d)/g, '($1) $2');
      numeros = numeros.replace(/(\d)(\d{4})$/, '$1-$2');
    } else {
      numeros = numeros.substring(0, 11);
      numeros = numeros.replace(/^(\d{2})(\d)/g, '($1) $2');
      numeros = numeros.replace(/(\d)(\d{4})$/, '$1-$2');
    }
    return numeros;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] w-[79%] bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] border-2 border-[#ff9d2f]/30 p-8">
        <VisuallyHidden>
          <DialogTitle>Login/Cadastro</DialogTitle>
          <DialogDescription>Entre ou cadastre-se para jogar</DialogDescription>
        </VisuallyHidden>
        <button
          onClick={onClose}
          className="absolute top-2 right-4 text-[#888] hover:text-[#ff6c2f] text-3xl"
          data-testid="button-close-auth"
        >
          <X />
        </button>

        {/* Tabs */}
        <div className="flex mb-6 bg-[#252525] rounded-xl p-1" data-testid="auth-tabs">
          <button
            onClick={() => setActiveTab("login")}
            className={`flex-1 py-2 px-4 rounded-lg font-bold transition-all ${
              activeTab === "login"
                ? "bg-gradient-to-br from-[#ff6c2f] to-[#ff8c47] text-white"
                : "bg-transparent text-[#aaa]"
            }`}
            data-testid="tab-login"
          >
            Entrar
          </button>
          <button
            onClick={() => setActiveTab("register")}
            className={`flex-1 py-2 px-4 rounded-lg font-bold transition-all ${
              activeTab === "register"
                ? "bg-gradient-to-br from-[#ff6c2f] to-[#ff8c47] text-white"
                : "bg-transparent text-[#aaa]"
            }`}
            data-testid="tab-register"
          >
            Cadastrar
          </button>
        </div>

        {/* Login Form */}
        {activeTab === "login" && (
          <form onSubmit={handleLogin} className="flex flex-col gap-4" data-testid="form-login">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888] w-5 h-5" />
              <Input
                type="email"
                placeholder="Email"
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value.toLowerCase() })}
                className="pl-12 bg-[#2c2c2c] border-[#444] text-white"
                required
                data-testid="input-login-email"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888] w-5 h-5" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Senha"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                className="pl-12 pr-12 bg-[#2c2c2c] border-[#444] text-white"
                required
                data-testid="input-login-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888]"
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>

            <Button
              type="submit"
              className="bg-gradient-to-br from-[#ff6c2f] to-[#ff8c47] hover:translate-y-[-2px] transition-transform"
              data-testid="button-login-submit"
            >
              Entrar
            </Button>
          </form>
        )}

        {/* Register Form */}
        {activeTab === "register" && (
          <form onSubmit={handleRegister} className="flex flex-col gap-4" data-testid="form-register">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888] w-5 h-5" />
              <Input
                type="text"
                placeholder="Nome Completo"
                value={registerData.nome}
                onChange={(e) => setRegisterData({ ...registerData, nome: e.target.value })}
                className="pl-12 bg-[#2c2c2c] border-[#444] text-white"
                required
                data-testid="input-register-name"
              />
            </div>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888] w-5 h-5" />
              <Input
                type="email"
                placeholder="Email"
                value={registerData.email}
                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value.toLowerCase() })}
                className="pl-12 bg-[#2c2c2c] border-[#444] text-white"
                required
                data-testid="input-register-email"
              />
            </div>

            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888] w-5 h-5" />
              <Input
                type="tel"
                placeholder="(11) 99999-9999"
                value={registerData.telefone}
                onChange={(e) => setRegisterData({ ...registerData, telefone: formatTelefone(e.target.value) })}
                className="pl-12 bg-[#2c2c2c] border-[#444] text-white"
                required
                data-testid="input-register-phone"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888] w-5 h-5" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Senha (mín. 6 caracteres)"
                value={registerData.password}
                onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                className="pl-12 pr-12 bg-[#2c2c2c] border-[#444] text-white"
                required
                minLength={6}
                data-testid="input-register-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888]"
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>

            <Button
              type="submit"
              className="bg-gradient-to-br from-[#ff6c2f] to-[#ff8c47] hover:translate-y-[-2px] transition-transform mt-2"
              data-testid="button-register-submit"
            >
              Cadastrar
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
