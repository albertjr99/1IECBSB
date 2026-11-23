# Site da Primeira Igreja Evangélica Congregacional de Brasília

Site institucional com **painel administrativo**: tudo o que aparece no site
(textos, horários, eventos, fotos, liderança, ministérios, menu, cores,
contatos, mapa e filtros de vídeos) é editado em `/admin`, com prévia ao vivo
antes de publicar.

## O que tem

| Página | Conteúdo |
|---|---|
| `/` | Destaque, programação semanal, quem somos, últimas mensagens, eventos, versículo, contribua, mapa |
| `/sobre` | História, missão, visão, valores, o que cremos |
| `/lideranca` | Pastores e grupos de liderança com fotos |
| `/ministerios` | Ministérios com líder, horário e botão de WhatsApp |
| `/programacao` | Atividades da semana e agenda de eventos |
| `/mensagens` | Todos os vídeos do canal, com busca e filtros por playlist |
| `/ao-vivo` | Transmissão ao vivo automática; fora do horário, a próxima agendada |
| `/contribua` | PIX (com botão copiar) e contas bancárias |
| `/contato` | Contatos, formulário que abre o WhatsApp, mapa e rotas |
| `/boletins`, `/boletim/AAAA-MM-DD` | Boletim dominical no modelo da igreja, com PDF e compartilhamento |
| `/votar/<link>` | Cédula da votação online (link pessoal de cada votante) |

**Boletim**: montado no painel sobre o modelo em Word da igreja (mesmas fontes,
tamanhos, cores e tabelas — Carlito e Caladea têm as métricas de Calibri e
Cambria). Seções podem ser incluídas, editadas, reordenadas e excluídas; o texto
corre entre colunas de larguras diferentes como no Word; a prévia avisa se algo
passar do fim da página. Publica no site e gera PDF (Chromium no servidor).

**Deliberação**: Votação Online (link individual por votante, voto secreto /
reservado / aberto, prazo, quórum, encerramento automático, apuração e ata) e
Assembleia Online (em breve). **Finanças**: em breve.

**Painel (`/admin`)**: login pelo primeiro nome · rascunho salvo automaticamente · prévia ao vivo
(computador e celular) · publicar com um clique · histórico de versões com
restauração · registro de quem alterou o quê · usuários administradores e
editores · envio de fotos com compressão automática.

**YouTube**: a chave fica só no servidor. A lista de vídeos é guardada em cache
por 1 hora e a checagem de "ao vivo" a cada 90 segundos — bem dentro da cota
gratuita do Google. Quando a igreja entra ao vivo, aparece um selo vermelho
**AO VIVO** no topo do site e o player na página inicial.

**Evento em destaque**: marque "Aviso em destaque" num evento e ele abre como
janela ao entrar no site, até a data passar.

## Publicar na Vercel

1. Em [vercel.com/new](https://vercel.com/new), importe este repositório (sem mudar nenhuma configuração de build).
2. No projeto, vá em **Storage** e conecte:
   - **Neon** (Postgres) → cria `DATABASE_URL`. As tabelas são criadas sozinhas.
   - **Blob** → cria `BLOB_READ_WRITE_TOKEN` para as fotos.
3. Em **Settings → Environment Variables**, cadastre:
   - `ADMIN_USUARIO` (primeiro nome) e `ADMIN_SENHA` — o primeiro acesso ao painel. Depois de
     entrar, crie os demais usuários em *Usuários e senha*.
   - `SESSION_SECRET` — um texto aleatório longo.
   - `YOUTUBE_API_KEY` (recomendado) e `VITE_GOOGLE_MAPS_KEY` (opcional).
4. Faça um novo deploy (**Deployments → Redeploy**) para as variáveis valerem.
5. Acesse `seu-dominio/admin`, entre e publique o conteúdo.

> Recomendado: no [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
> restrinja a chave do YouTube à "YouTube Data API v3" e a do Maps ao domínio do site.

## Rodar localmente

```sh
npm install
npm run dev        # http://localhost:3000
```

Sem `DATABASE_URL`, os dados ficam em `.dados-locais/` e o primeiro acesso ao
painel é `admin` / `admin123`.

## Como o código está organizado

- `src/lib/conteudo.ts` — **modelo de conteúdo**: todos os campos editáveis e seus valores padrão.
- `src/routes/_site/*` — páginas públicas (só leem o conteúdo).
- `src/components/painel/editores.tsx` — um editor por seção do painel.
- `src/server/` — banco (Neon), sessão/senhas e YouTube. Nunca vai para o navegador.
- `src/lib/api.ts` — funções de servidor chamadas pelo site e pelo painel.

Para tornar algo novo editável: acrescente o campo em `conteudo.ts`, use-o na
página e crie o campo no editor correspondente.

Stack: TanStack Start (React 19) · Tailwind CSS 4 · Nitro (Vercel) · Neon · Vercel Blob.
