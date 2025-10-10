import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Zap, Shield, Coins } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      {/* Header */}
      <header className="border-b border-border backdrop-blur-sm sticky top-0 z-40 bg-background/95">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center">
              <span className="text-3xl">🐯</span>
            </div>
            <h1 className="text-2xl font-display font-bold">Roleta do Tigre</h1>
          </div>
          <Button 
            size="lg" 
            onClick={handleLogin}
            data-testid="button-login"
          >
            Entrar / Cadastrar
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="inline-block">
            <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-primary via-chart-2 to-chart-3 flex items-center justify-center shadow-2xl animate-pulse">
              <span className="text-7xl">🐯</span>
            </div>
          </div>
          
          <h2 className="text-5xl md:text-7xl font-display font-bold bg-gradient-to-r from-primary via-chart-2 to-chart-3 bg-clip-text text-transparent">
            Gire e Ganhe Prêmios Incríveis!
          </h2>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            A Roleta do Tigre é o jogo mais emocionante do momento. 
            Depósitos e saques rápidos via PIX. Multiplicadores de até <span className="text-yellow-500 font-bold">100x</span>!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              size="lg" 
              className="text-lg h-14 px-8"
              onClick={handleLogin}
              data-testid="button-hero-start"
            >
              <Trophy className="mr-2 h-5 w-5" />
              Começar a Jogar
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover-elevate">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-display font-bold">Depósitos Rápidos</h3>
              <p className="text-muted-foreground">
                Depósito instantâneo via PIX. Seu saldo cai na hora!
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-chart-2/20 flex items-center justify-center">
                <Coins className="h-8 w-8 text-chart-2" />
              </div>
              <h3 className="text-xl font-display font-bold">Até 100x de Prêmio</h3>
              <p className="text-muted-foreground">
                Multiplicadores incríveis. Transforme R$ 10 em R$ 1.000!
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-chart-3/20 flex items-center justify-center">
                <Shield className="h-8 w-8 text-chart-3" />
              </div>
              <h3 className="text-xl font-display font-bold">100% Seguro</h3>
              <p className="text-muted-foreground">
                Sistema criptografado e auditado. Seus dados protegidos.
              </p>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
                <Trophy className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="text-xl font-display font-bold">Saques Fáceis</h3>
              <p className="text-muted-foreground">
                Retire seus ganhos a qualquer momento via PIX.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How to Play */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-4xl font-display font-bold text-center mb-12">
            Como Jogar?
          </h3>
          
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6 flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0 font-display font-bold text-xl">
                  1
                </div>
                <div>
                  <h4 className="text-xl font-display font-bold mb-2">Faça seu Depósito</h4>
                  <p className="text-muted-foreground">
                    Deposite via PIX de forma rápida e segura. Valores a partir de R$ 1,00.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-chart-2 flex items-center justify-center flex-shrink-0 font-display font-bold text-xl text-white">
                  2
                </div>
                <div>
                  <h4 className="text-xl font-display font-bold mb-2">Escolha sua Aposta</h4>
                  <p className="text-muted-foreground">
                    Selecione o valor da aposta e clique em "Girar". A roleta vai determinar seu multiplicador!
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-chart-3 flex items-center justify-center flex-shrink-0 font-display font-bold text-xl text-black">
                  3
                </div>
                <div>
                  <h4 className="text-xl font-display font-bold mb-2">Ganhe e Retire</h4>
                  <p className="text-muted-foreground">
                    Ganhou? Seu saldo é creditado na hora! Solicite o saque via PIX quando quiser.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-12">
            <Button 
              size="lg" 
              className="text-lg h-14 px-12"
              onClick={handleLogin}
              data-testid="button-cta-play"
            >
              Jogar Agora
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>© 2024 Roleta do Tigre. Jogue com responsabilidade. +18 anos.</p>
        </div>
      </footer>
    </div>
  );
}
