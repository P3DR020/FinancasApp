import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
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
app.use(express.json());

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

// Start
app.listen(PORT, () => {
  console.log(`🚀 FinançasApp API rodando na porta ${PORT}`);
  console.log(`📡 CORS habilitado para: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
});
