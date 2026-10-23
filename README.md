# 🎙️ VozLivre — Leitor de Textos em Áudio

**VozLivre** é uma aplicação full-stack de alta performance desenvolvida para transformar qualquer texto (artigos, livros, anotações, documentos e resumos) em áudio natural em português, permitindo ouvir enquanto você realiza outras tarefas — **inclusive com a tela do celular apagada/bloqueada**.

---

## 📱 Destaques do Projeto

1. **Reprodução em Segundo Plano Real (Prioridade Máxima)**:
   - Utiliza arquivos de áudio reais (**MP3**) transmitidos com suporte a requisições parciais **HTTP 206 (Range Requests)**.
   - Integração completa com a **Media Session API**: título, capa, autor ("VozLivre") e botões de controle integrados diretamente na tela bloqueada e na central de notificações do Android e iOS.
   - Suporte a botões de fones de ouvido Bluetooth (Play, Pause, Avançar 15s, Retroceder 15s).
   - Memória contínua da posição do áudio (retoma exatamente de onde você parou).
2. **Síntese de Voz Neural Gratuita e com Qualidade Humana**:
   - Camada desacoplada com suporte primário a **Vozes Neurais de alta definição em português** (`pt-BR-FranciscaNeural`, `pt-BR-AntonioNeural`, `pt-BR-ThalitaNeural`, `pt-PT-RaquelNeural`, `pt-PT-DuarteNeural`).
   - Sistema de contingência automática (**fallback**) para garantir que a geração nunca falhe.
   - Chunking inteligente de parágrafos e pontuação para leitura de capítulos extensos de livros sem corte de palavras.
3. **PWA (Progressive Web App) & Modo Offline**:
   - Instalável como aplicativo nativo na tela inicial do celular Android e iPhone.
   - Cache de áudio offline usando **IndexedDB** e **Cache API**: ouça áudios já gerados sem precisar de conexão com a internet.
4. **Design Moderno e Ergonômico**:
   - Tema escuro elegante em grafite/preto (`#090d14`), com acentos vibrantes em ciano/azul elétrico (`#06b6d4`).
   - Navegação inferior adaptada para uso com apenas uma mão em celulares.
   - Mini Player flutuante persistente e visualizador de ondas sonoras dinâmico.
   - Temporizador para dormir (Sleep Timer: 5, 10, 15, 30, 45, 60 min).
   - Ajuste de velocidade: 0.75x, 1x, 1.25x, 1.5x, 1.75x e 2x.

---

## 🛠️ Tecnologias Utilizadas

### Frontend (`/client`)
- **React.js 19** com **TypeScript**
- **Vite** para build ultrarrápido
- **Tailwind CSS v4** + Glassmorphism e tema escuro
- **React Router 7**
- **Vite PWA Plugin** com Service Worker e manifesto
- **Media Session API** + HTML5 Audio
- **IndexedDB** para armazenamento offline de arquivos de áudio
- **Lucide React** para ícones modernos

### Backend (`/server`)
- **Node.js** com **Express** e **TypeScript**
- **Prisma ORM** para modelagem e persistência
- **SQLite** para execução imediata sem configuração externa
- **PostgreSQL** pronto para produção via arquivo `prisma/schema.postgresql.prisma`
- **Streaming HTTP 206 (Accept-Ranges: bytes)**
- **TTS Engine**: Camada de abstração modular com `msedge-tts` (Vozes neurais gratuitas) e `google-tts-api` (contingência)

---

## 📂 Estrutura do Projeto

```text
vozlivre/
├── client/                     # Frontend React + TypeScript + Vite + PWA
│   ├── public/                 # Ícones PWA e manifesto
│   ├── src/
│   │   ├── components/         # BottomNav, MiniPlayer, PWAInstallPrompt, AudioWave
│   │   ├── context/            # AudioPlayerContext (MediaSession, Background Audio, Cache)
│   │   ├── pages/              # Home, Editor, PlayerPage, Library, Settings
│   │   ├── services/           # api.ts, offlineStorage.ts (IndexedDB)
│   │   ├── types/              # Definições TypeScript
│   │   ├── App.tsx             # Rotas e layout
│   │   ├── index.css           # Design system escuro e classes de vidro
│   │   └── main.tsx
│   ├── vite.config.ts
│   └── package.json
│
├── server/                     # Backend Node.js + Express + Prisma ORM
│   ├── prisma/
│   │   ├── schema.prisma       # Schema ativo (SQLite para dev local)
│   │   └── schema.postgresql.prisma # Schema pronto para PostgreSQL
│   ├── src/
│   │   ├── routes/             # texts.ts, audio.ts (HTTP 206 stream), user.ts
│   │   ├── services/tts/       # Abstração TTS (edgeProvider, googleProvider, chunker)
│   │   ├── prisma.ts           # Singleton Prisma Client
│   │   ├── index.ts            # Servidor Express e CORS
│   │   └── test-api.ts         # Teste de integração automatizado
│   ├── .env.example
│   └── package.json
│
├── package.json                # Scripts globais do monorepo
└── README.md
```

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- **Node.js** (v18 ou superior instalado)
- **NPM**

### 1. Iniciar o Servidor Backend

Abra um terminal na pasta `server`:

```bash
cd server
npm install --ignore-scripts
npx prisma db push
npm run dev
```

O servidor iniciará em `http://localhost:3001`.

### 2. Iniciar o Frontend Client

Abra outro terminal na pasta `client`:

```bash
cd client
npm install
npm run dev
```

O cliente iniciará em `http://localhost:5173`. O Vite já possui proxy configurado para redirecionar requisições `/api` para a porta `3001`.

---

## 🧪 Executando os Testes Automatizados

O backend inclui um teste de integração de ponta a ponta que cria um texto, dispara a geração do áudio neural, aguarda a finalização e valida o streaming com cabeçalhos HTTP Range (206):

```bash
cd server
npx tsx src/test-api.ts
```

---

## 🔒 Reprodução com Tela Apagada & Media Session

### No Android:
1. Abra `http://localhost:5173` no Google Chrome.
2. Toque no aviso na parte superior ou nos 3 pontinhos e selecione **"Instalar aplicativo"**.
3. Ao tocar em Play no áudio, aperte o botão físico para desligar a tela.
4. O áudio continuará tocando e você poderá pausar, avançar 15s ou retroceder diretamente na tela de bloqueio e na central de notificações.

### No iPhone (iOS Safari):
1. Abra no navegador **Safari**.
2. Toque no ícone de **Compartilhar (⎋)** na barra inferior do Safari.
3. Selecione **"Adicionar à Tela de Início"**.
4. Abra o VozLivre direto pelo ícone criado na tela de início.
5. Inicie a reprodução e bloqueie a tela do iPhone. Os controles aparecerão no player da tela bloqueada do iOS.
*Nota de compatibilidade:* A reprodução contínua em segundo plano depende de arquivos de áudio reais (MP3) com streaming HTTP 206, exatamente como implementado no VozLivre.

---

## 🗄️ Alternando entre SQLite e PostgreSQL

Por padrão, o projeto utiliza **SQLite** para que você possa rodar e testar imediatamente sem precisar instalar ou configurar serviços de banco de dados externos.

Para alternar para **PostgreSQL**:
1. Copie o arquivo `server/prisma/schema.postgresql.prisma` para `server/prisma/schema.prisma`.
2. No arquivo `server/.env`, altere:
   ```env
   DATABASE_URL="postgresql://usuario:senha@localhost:5432/vozlivre?schema=public"
   ```
3. Execute no diretório `server`:
   ```bash
   npx prisma db push
   ```

---

## 📡 Endpoints da API REST

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/texts` | Cria um novo texto (título, conteúdo, favorito) |
| `GET` | `/api/texts` | Lista textos salvos (suporta busca e filtro de favoritos) |
| `GET` | `/api/texts/:id` | Retorna um texto específico com seus áudios associados |
| `PUT` | `/api/texts/:id` | Atualiza título, conteúdo ou status de favorito |
| `DELETE`| `/api/texts/:id` | Exclui o texto e os arquivos de áudio gerados no disco |
| `POST` | `/api/texts/:id/audio` | Solicita síntese de voz (voz, velocidade, idioma) |
| `GET` | `/api/audio/:id/status` | Consulta o progresso em tempo real da conversão |
| `GET` | `/api/audio/:id/stream` | Transmite o áudio via **HTTP 206 Partial Content** |
| `GET` | `/api/audio/:id/download` | Baixa o arquivo MP3 gerado |
| `GET` | `/api/tts/voices` | Lista as vozes neurais e de contingência disponíveis |
| `GET` | `/api/user/preferences` | Consulta preferências de voz e velocidade |
| `PUT` | `/api/user/preferences` | Atualiza preferências do usuário |
| `POST` | `/api/user/progress` | Salva a posição atual de reprodução do áudio |
| `GET` | `/api/user/progress/:audioId` | Recupera a posição de onde parou |

---

## 💰 Provedores de TTS & Custos

- **Microsoft Edge Neural TTS (Padrão Ativo)**:
  - Custo: **Gratuito (R$ 0,00)**.
  - Vozes de estúdio com entonação humana natural (`pt-BR-FranciscaNeural`, `pt-BR-AntonioNeural`, etc.).
  - Gera arquivos MP3 sem limite estrito de caracteres graças ao módulo de divisão em blocos (`chunker.ts`).
- **Google Translate TTS (Fallback Ativo)**:
  - Custo: **Gratuito (R$ 0,00)**.
  - Utilizado automaticamente como contingência se houver oscilação de rede no provedor neural.
- **Preparação para OpenAI TTS / ElevenLabs**:
  - A interface `TTSProvider` em `src/services/tts/types.ts` permite adicionar novos provedores pagos em poucas linhas de código, bastando implementar o método `generateAudio()`.
