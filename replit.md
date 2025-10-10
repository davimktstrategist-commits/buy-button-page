# Roleta do Tigre - Aplicativo de Jogo com PIX

## Visão Geral
Aplicativo completo de jogo de roleta com tema de tigre verde, integração BRPIX para depósitos/saques via PIX. **Site totalmente público (sem login)** - usa sessões anônimas via localStorage.

## Status do Projeto
✅ **MVP Completo e Público** - Frontend HTML original integrado, backend Node.js/Express com rotas PHP-compatíveis, sistema de sessões anônimas via localStorage funcionando perfeitamente

## Arquitetura

### Frontend (HTML/CSS/JavaScript Original)
- **Arquivos estáticos**: HTML, CSS, JS servidos da pasta `public/`
- **UI**: Bootstrap 5 + CSS customizado
- **Tema**: Verde escuro de cassino com imagens originais
- **Autenticação**: Sistema totalmente público com sessionId anônimo via localStorage
- **SessionID**: UUID v4 gerado automaticamente, armazenado em localStorage
- **Interceptor fetch()**: Adiciona sessionId em todas as requisições para `/ajax/` e `/api/`
- **Design**: Imagens originais do jogo (fundo.png, roleta1.png, roleta2.png, cima.png, ceta.png, baixo.png)

### Backend (Express + TypeScript)
- **Framework**: Express.js
- **Database**: PostgreSQL (Neon)
- **ORM**: Drizzle ORM
- **Autenticação**: REMOVIDA - Todas as rotas são públicas com sessionId
- **Pagamentos**: BRPIX PIX Gateway
- **Sessão**: Auto-criação de usuário anônimo quando sessionId não existe
- **Rotas PHP-compatíveis**: Endpoints `/ajax/*.php` e `/api/*.php` para compatibilidade com frontend original

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
- **Usuários**: Sistema público com sessionId anônimo (UUID v4) via localStorage
- **Admin**: Sistema de autenticação seguro com tokens temporários
  - Login com senha (ADMIN_PASSWORD secret)
  - Tokens gerados pelo servidor (64 bytes hex)
  - Expiração de 24 horas
  - Validação em todas as rotas admin
  - Senha nunca exposta no frontend
- **BRPIX**: Credenciais armazenadas como secrets (BRPIX_SECRET_KEY, BRPIX_COMPANY_ID)
- **Sessões**: Auto-criação de usuários anônimos com sessionId

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

### Rotas PHP-Compatíveis (Frontend HTML Original)

#### AJAX - Jogo
- `GET /ajax/winners.php` - Lista de ganhadores recentes (formato: `{success: true, winners: [...]}`)
- `GET /ajax/get_saldo.php?sessionId=...` - Obter saldo do usuário
- `GET /ajax/get_history.php?sessionId=...` - Histórico de jogos do usuário
- `POST /ajax/start_spin.php` - Iniciar giro/aposta (body: `{sessionId, betAmount}`)
- `POST /ajax/finish_spin.php` - Finalizar giro (apenas confirmação)
- `GET /ajax/get_affiliate_data.php?sessionId=...` - Dados de afiliado

#### API - Pagamentos e Saques
- `POST /api/payment.php` - Criar pagamento PIX (body: `{sessionId, amount}`)
- `GET /api/check_payment_status.php?transactionId=...` - Verificar status do pagamento
- `POST /api/withdraw.php` - Solicitar saque (body: `{sessionId, amount, pixKeyType, pixKey}`)
- `GET /api/check_rollover.php?sessionId=...` - Verificar rollover

#### AJAX - Admin (requer token admin)
- `POST /ajax/admin_login.php` - Login admin (body: `{password}`) - retorna token temporário
- `GET /ajax/admin_stats.php?sessionId={token}` - Estatísticas do dashboard
- `GET /ajax/admin_users.php?sessionId={token}` - Lista de usuários
- `GET /ajax/admin_transactions.php?sessionId={token}` - Todas as transações
- `GET /ajax/admin_withdrawals.php?sessionId={token}` - Solicitações de saque
- `POST /ajax/admin_approve_withdrawal.php` - Aprovar saque (body: `{sessionId, withdrawalId}`)
- `POST /ajax/admin_reject_withdrawal.php` - Rejeitar saque (body: `{sessionId, withdrawalId, reason}`)
- `GET /ajax/admin_roulette_config.php?sessionId={token}` - Configurações da roleta
- `POST /ajax/admin_update_roulette.php` - Atualizar probabilidade (body: `{sessionId, configId, probability}`)

### Rotas Legacy (API JSON)

#### Usuário
- `GET /api/user/balance` - Saldo do usuário (com autenticação)
- `GET /api/games/history` - Histórico de jogos
- `POST /api/games/play` - Jogar roleta
- `POST /api/deposits` - Criar depósito PIX
- `POST /api/deposits/:id/confirm` - Confirmar depósito
- `POST /api/withdrawals` - Criar solicitação de saque

#### Admin (requer autenticação + role admin)
- `GET /api/admin/stats` - Estatísticas do dashboard
- `GET /api/admin/users` - Lista de usuários
- `GET /api/admin/transactions` - Todas as transações
- `GET /api/admin/withdrawals` - Solicitações de saque
- `POST /api/admin/withdrawals/:id/approve` - Aprovar saque
- `POST /api/admin/withdrawals/:id/reject` - Rejeitar saque
- `GET /api/admin/roulette-config` - Configurações da roleta
- `PUT /api/admin/roulette-config/:id` - Atualizar probabilidade

**Nota**: Todas as rotas PHP-compatíveis aceitam `sessionId` via query param, header `X-Session-Id` ou body.

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

### 1. Novo Usuário (Sistema Público - Sem Login)
1. Acessa a página do jogo
2. Sistema gera automaticamente um `sessionId` UUID v4
3. SessionId é armazenado no localStorage
4. Usuário anônimo é criado automaticamente no backend
5. Pode fazer depósito PIX para adicionar saldo
6. Joga roleta normalmente

### 2. Fazer Depósito
1. Usuário clica em "Depositar"
2. Escolhe valor (ou usa sugeridos)
3. Sistema gera QR Code PIX via BRPIX
4. Usuário paga via app bancário
5. Sistema verifica pagamento (polling)
6. Saldo é creditado automaticamente
7. 10,5% vai para conta de split (comissão)

### 3. Jogar Roleta
1. Usuário seleciona valor da aposta
2. Clica em "Girar"
3. Sistema verifica saldo via sessionId
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
