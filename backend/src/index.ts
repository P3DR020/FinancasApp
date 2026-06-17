import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { authMiddleware } from './middleware/auth';

// Routes
import transacoesRouter from './routes/transacoes';
import fixosRouter from './routes/fixos';
import metasRouter from './routes/metas';
import investimentosRouter from './routes/investimentos';
import cartoesRouter from './routes/cartoes';
import orcamentosRouter from './routes/orcamentos';
import parcelamentosRouter from './routes/parcelamentos';
import dashboardRouter from './routes/dashboard';
import contasRouter from './routes/contas';
import importarRouter from './routes/importar';
import buscaRouter from './routes/busca';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares globais
app.use(helmet());
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174'
].filter(Boolean) as string[];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// Health check (sem auth)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rotas protegidas (com auth)
app.use('/api/transacoes', authMiddleware, transacoesRouter);
app.use('/api/fixos', authMiddleware, fixosRouter);
app.use('/api/metas', authMiddleware, metasRouter);
app.use('/api/investimentos', authMiddleware, investimentosRouter);
app.use('/api/cartoes', authMiddleware, cartoesRouter);
app.use('/api/orcamentos', authMiddleware, orcamentosRouter);
app.use('/api/parcelamentos', authMiddleware, parcelamentosRouter);
app.use('/api/dashboard', authMiddleware, dashboardRouter);
app.use('/api/contas', authMiddleware, contasRouter);
app.use('/api/importar', authMiddleware, importarRouter);
app.use('/api/busca', authMiddleware, buscaRouter);

// ─── Keep-Alive: Self-ping para evitar cold start no Render Free ───
// O Render free tier desliga o servidor após ~15 min de inatividade.
// Este cron pinga o próprio /api/health a cada 14 minutos para manter ativo.
const RENDER_URL = process.env.RENDER_EXTERNAL_URL; // Fornecido automaticamente pelo Render

if (RENDER_URL) {
  cron.schedule('*/14 * * * *', async () => {
    try {
      const res = await fetch(`${RENDER_URL}/api/health`);
      const data = (await res.json()) as { status: string };
      console.log(`🏓 Keep-alive ping: ${data.status} (${new Date().toLocaleTimeString()})`);
    } catch (err) {
      console.warn('⚠️ Keep-alive ping falhou:', (err as Error).message);
    }
  });
  console.log('🏓 Keep-alive cron ativado (a cada 14 min)');
} else {
  console.log('ℹ️ RENDER_EXTERNAL_URL não definida — keep-alive desativado (ambiente local)');
}

// Start
app.listen(PORT, () => {
  console.log(`🚀 FinançasApp API rodando na porta ${PORT}`);
  console.log(`📡 CORS habilitado para: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
});
