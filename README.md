# Meu Mundo Minha Vida

Organizador pessoal diário em **React + TypeScript + Vite + Tailwind CSS + Express**, com salvamento local (`localStorage` e IndexedDB), suporte a **PWA** (instalável e modo offline) e rotas `/api/*` compatíveis tanto com servidor Node local quanto com **Vercel Serverless Functions**.

## Funcionalidades principais

- **Início & Agenda**: Compromissos do dia, tarefas rápidas, hábitos diários, notificações e resumo de produtividade.
- **Devocional & Palavra do Dia**: Devocionais diários, Palavra do Dia, anotações pessoais e gravação/reprodução de áudio próprio.
- **Mídia & Entretenimento**: YouTube integrado, Música, Podcasts com feed RSS real, Rádios ao vivo, Livros (leitura e audiolivros) e Galeria de Fotos.
- **Organização Pessoal**:
  - **Finanças**: Controle simples de receitas, gastos pagos vs. a pagar, totais e orçamento por categoria.
  - **Investimentos & Calculadora**: Carteira, simulador, cotações ao vivo (Selic, CDI, IPCA, Dólar, Euro e Cripto) e calculadora multifunção.
  - **Supermercado**: Lista de compras com carrinho ao vivo, controle de despensa, comparador de preço por kg/L/un, dicas e histórico integrado às Finanças.
  - **Estudar**: Organização por matérias e assuntos com status de conclusão, cronograma, itens extras e dicas de estudo.
  - **Bloco de Anotações**: Modelos prontos, tags, cores, checklist interativo, exportação `.txt` e envio para a Agenda.
  - **Metas & Viagens**: Acompanhamento de metas por etapas/valor/quantidade e planejador completo de viagens (roteiro dia a dia, mala, reservas e orçamento).
- **Comunicação & Busca**: Contatos, Mensagens, Favoritos, Histórico e busca global na aba **Explorar**.

## Rodar localmente

```bash
npm install
npm run dev
```

O aplicativo ficará disponível em `http://localhost:3000` com todas as rotas `/api/*` ativas.

### Verificar tipos e gerar build de produção

```bash
npm run lint
npm run build
```

## Publicar no GitHub e na Vercel

### 1. Enviar para a branch principal (`main`) no GitHub

```bash
git init
git add .
git commit -m "chore: preparar projeto para GitHub e Vercel"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
git push -u origin main
```

> Caso o código já esteja no GitHub em outra branch (como `master` ou uma branch de preview), faça o merge para `main` para atualizar o deploy de **Produção** na Vercel.

### 2. Deploy na Vercel

1. Acesse [vercel.com](https://vercel.com), clique em **Add New Project** e importe seu repositório do GitHub.
2. As configurações do projeto já são reconhecidas automaticamente:
   - **Framework**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **API Serverless (`/api/*`)**: Todas as rotas de busca/proxy (YouTube, músicas, rádios, podcasts, taxas financeiras, livros e `/api/health`) são atendidas pela função serverless da Vercel.
   - **SPA & PWA**: Reescrita de rotas do aplicativo e cabeçalhos corretos para `manifest.webmanifest` e `sw.js`.
3. Não é obrigatório configurar variáveis de ambiente para o funcionamento principal.
4. Após o deploy em **Produção** (branch `main`), teste `https://seu-dominio.vercel.app/api/health` — o retorno esperado é `{ "ok": true, ... }`.
   - *Observação*: URLs temporárias de **Preview** (`*-equipe.vercel.app`) podem exigir login caso **Deployment Protection / Vercel Authentication** esteja ativado nas configurações da Vercel; use sempre o domínio de **Produção** ou ajuste a proteção em **Project Settings → Deployment Protection**.
