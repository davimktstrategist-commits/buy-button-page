# Roleta do Tigre - Aplicativo de Jogo com PIX

## Visão Geral
Aplicativo completo de jogo de roleta com tema de tigre verde, integração BRPIX para depósitos/saques via PIX. **Site totalmente público (sem login)** - usa sessões anônimas via localStorage.

## Status do Projeto
✅ **MVP Completo e Público** - Frontend redesenhado, backend com sessões anônimas, e integração BRPIX funcionando

## Arquitetura

### Frontend (React + TypeScript)
- **Framework**: React 18 com Vite
- **Roteamento**: Wouter
- **UI**: Shadcn UI + Tailwind CSS
- **Tema**: Verde escuro de cassino com escamas de dragão (backgrounds reais aplicados)
- **Autenticação**: REMOVIDA - Sistema totalmente público com sessionId anônimo
- **State Management**: TanStack Query v5
- **Design**: Imagens reais do jogo (fundo.png, roleta1.png, roleta2.png, cima.png, ceta.png, baixo.png)

### Backend (Express + TypeScript)
- **Framework**: Express.js
- **Database**: PostgreSQL (Neon)
- **ORM**: Drizzle ORM
- **Autenticação**: REMOVIDA - Todas as rotas são públicas com sessionId
- **Pagamentos**: BRPIX PIX Gateway
- **Sessão**: Auto-criação de usuário anônimo quando sessionId não existe

## Funcionalidades Principais

### 🎰 Jogo de Roleta
- Roleta principal animada com 12 segmentos
- Multiplicadores: 1x, 2x, 3x, 4x, 5x, 10x, 15x, 20x, 30x, 50x, 100x (2x o 100x)
- Roleta bônus menor girando em sentido oposto
- Indicadores dourados (cima.png) e barra inferior decorativa (baixo.png)
- Background de templo verde escuro (fundo.png)
- Sistema de apostas com saldo em tempo real
- Histórico de resultados recentes
- Animações de vitória/derrota

### 💰 Sistema de Pagamentos (BRPIX)
- **Depósitos via PIX**:
  - Geração de QR Code dinâmico
  - Código Copia e Cola
  - Expiração configurável (30min padrão)
  - Split automático de 10,5% para conta de comissão
- **Saques**:
  - Solicitação de saque via chave PIX
  - Aprovação/rejeição pelo admin
  - Tipos suportados: CPF, CNPJ, Email, Telefone, Chave aleatória

### 👑 Painel Administrativo
- **Dashboard com métricas**:
  - Lucro da plataforma (apostas - prêmios)
  - Total apostado e prêmios pagos
  - Número de usuários
  - Saques pendentes
  - Saldo total em contas
  
- **Gestão de Usuários**:
  - Lista de todos os usuários
  - Visualização de saldos e histórico
  - Status ativo/inativo
  
- **Gestão de Transações**:
  - Histórico completo de transações
  - Filtros por tipo (depósito, saque, aposta, ganho)
  - Visualização de IDs BRPIX e valores de split
  
- **Gestão de Saques**:
  - Aprovação/rejeição de saques
  - Visualização de chaves PIX
  
- **Configuração da Roleta**:
  - Ajuste de probabilidades por multiplicador
  - Roleta Principal e Roleta Bônus
  - Validação de soma de probabilidades (deve somar 100%)

### 🔐 Autenticação e Segurança
- Login via Replit Auth (Google, GitHub, Email, etc)
- Proteção de rotas (middleware isAuthenticated)
- Acesso admin restrito (middleware isAdmin)
- Credenciais BRPIX armazenadas como secrets (não expostas no frontend)
- Sessões persistidas em PostgreSQL

## Estrutura do Banco de Dados

### Tabelas Principais
1. **users** - Usuários do sistema
   - Dados Replit Auth (id, email, nome, foto)
   - Saldo, total depositado, total ganho, total apostado
   - Role (user/admin)

2. **games** - Histórico de jogos
   - Referência ao usuário
   - Valor da aposta, multiplicador, valor ganho
   - Tipo de roleta (main/bonus)

3. **transactions** - Transações financeiras
   - Tipo (deposit, withdrawal, bet, win)
   - Dados BRPIX (ID transação, QR Code, etc)
   - Split amount e percentage
   - Status (pending, processing, completed, failed, cancelled)

4. **withdrawals** - Solicitações de saque
   - Chave PIX e tipo
   - Status e motivo de rejeição
   - Data de processamento

5. **roulette_config** - Configuração da roleta
   - Tipo (main/bonus)
   - Multiplicador e probabilidade
   - Status ativo/inativo

6. **sessions** - Sessões de autenticação (Replit Auth)

## Integração BRPIX

### Credenciais (armazenadas como secrets)
- `BRPIX_SECRET_KEY`: Chave secreta da API BRPIX
- `BRPIX_COMPANY_ID`: ID da empresa BRPIX

### Split Automático
- **Percentual**: 10,5% de cada depósito
- **Processamento**: Automático na criação da transação PIX
- **Conta de destino**: Configurada nas credenciais BRPIX

### Endpoints BRPIX Utilizados
- `POST /transactions` - Criar transação PIX
- `GET /transactions/:id` - Consultar status
- `GET /transactions` - Listar transações

## Endpoints da API

### Autenticação
- `GET /api/login` - Iniciar login
- `GET /api/logout` - Fazer logout
- `GET /api/callback` - Callback OAuth
- `GET /api/auth/user` - Dados do usuário logado

### Usuário
- `GET /api/user/balance` - Saldo do usuário
- `GET /api/games/history` - Histórico de jogos
- `POST /api/games/play` - Jogar roleta
- `POST /api/deposits` - Criar depósito PIX
- `POST /api/deposits/:id/confirm` - Confirmar depósito

### Admin (requer autenticação + role admin)
- `GET /api/admin/stats` - Estatísticas do dashboard
- `GET /api/admin/users` - Lista de usuários
- `GET /api/admin/transactions` - Todas as transações
- `GET /api/admin/withdrawals` - Solicitações de saque
- `POST /api/admin/withdrawals/:id/approve` - Aprovar saque
- `POST /api/admin/withdrawals/:id/reject` - Rejeitar saque
- `GET /api/admin/roulette-config` - Configurações da roleta
- `PUT /api/admin/roulette-config/:id` - Atualizar probabilidade

## Scripts Disponíveis

```bash
npm run dev          # Inicia servidor de desenvolvimento
npm run db:push      # Sincroniza schema com banco de dados
npm run db:studio    # Abre Drizzle Studio (visualizar DB)
npx tsx server/seed.ts  # Popular configurações iniciais da roleta
```

## Variáveis de Ambiente

### Automáticas (Replit)
- `DATABASE_URL` - URL do PostgreSQL
- `REPL_ID` - ID do Repl
- `REPLIT_DOMAINS` - Domínios do Repl
- `SESSION_SECRET` - Secret para sessões

### Manuais (Secrets)
- `BRPIX_SECRET_KEY` - Chave da API BRPIX
- `BRPIX_COMPANY_ID` - ID da empresa BRPIX

## Design System

### Cores
- **Primary**: Verde escuro (#2d5016 / hsl(147 70% 35%))
- **Background**: Verde muito escuro (#0a1409 / hsl(147 25% 12%))
- **Accent Gold**: Dourado (#e8a800 / hsl(45 90% 55%))
- **Success**: Verde brilhante (#34c759 / hsl(142 76% 36%))
- **Danger**: Vermelho (#ef4444 / hsl(0 72% 51%))

### Tipografia
- **Sans**: Inter (UI, corpo)
- **Display**: Poppins (títulos, números grandes)

### Componentes
- Todos os componentes Shadcn UI customizados
- Sistema de elevação com hover/active states
- Animações suaves para roleta e vitórias

## Fluxos Principais

### 1. Novo Usuário
1. Acessa landing page
2. Clica em "Entrar/Cadastrar"
3. Autentica via Replit Auth
4. Vê popup de boas-vindas
5. Pode fazer depósito PIX
6. Joga roleta

### 2. Fazer Depósito
1. Usuário clica em "Depositar"
2. Escolhe valor (ou usa sugeridos)
3. Gera QR Code PIX
4. Paga via app bancário
5. Sistema verifica pagamento (polling)
6. Saldo é creditado automaticamente
7. 10,5% vai para conta de split

### 3. Jogar Roleta
1. Usuário seleciona valor da aposta
2. Clica em "Girar"
3. Sistema verifica saldo
4. Calcula resultado baseado em probabilidades
5. Roda animação (3 segundos)
6. Mostra resultado com animação
7. Atualiza saldo e histórico

### 4. Admin Gerenciar Probabilidades
1. Admin acessa /admin
2. Vai para aba "Roleta"
3. Ajusta probabilidades
4. Salva alterações
5. Novas probabilidades aplicadas imediatamente

## Próximos Passos (Pós-MVP)

### Funcionalidades Adicionais
- [ ] Sistema de afiliados com links de referência
- [ ] Roleta Bônus ativável
- [ ] Histórico detalhado de transações com filtros
- [ ] Notificações em tempo real (WebSocket)
- [ ] Sistema de limites diários/semanais
- [ ] Backup automático de dados
- [ ] Logs de auditoria admin

### Melhorias Técnicas
- [ ] Webhook BRPIX para confirmação instantânea
- [ ] Cache com Redis para dados frequentes
- [ ] Rate limiting nas APIs
- [ ] Testes automatizados (unit + e2e)
- [ ] CI/CD pipeline
- [ ] Monitoramento com logs estruturados

## Observações Importantes

### Segurança
- ✅ Credenciais BRPIX nunca expostas no frontend
- ✅ Split automático processado no backend
- ✅ Rotas admin protegidas com middleware
- ✅ Validação de dados em todas as requisições
- ✅ Sessões seguras com PostgreSQL

### Performance
- ✅ Queries otimizadas com índices
- ✅ Relacionamentos modelados corretamente
- ✅ Cache de queries no frontend (TanStack Query)
- ✅ Lazy loading de componentes pesados

### UX
- ✅ Estados de loading em todas as ações
- ✅ Mensagens de erro claras
- ✅ Feedback visual para ações (toasts)
- ✅ Animações suaves e profissionais
- ✅ Design responsivo (mobile-first)

## Suporte

Para dúvidas ou problemas:
1. Verificar logs do workflow "Start application"
2. Verificar Drizzle Studio (npm run db:studio)
3. Consultar documentação BRPIX: https://brpixdigital.readme.io

---

**Última atualização**: 2024-10-10  
**Versão**: 1.0.0 MVP  
**Status**: ✅ Pronto para uso
