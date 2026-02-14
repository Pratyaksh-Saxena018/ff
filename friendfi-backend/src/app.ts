import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import routes from './routes';
import { apiRateLimiter } from './middlewares/rateLimitMiddleware';
import { errorMiddleware } from './middlewares/errorMiddleware';

const app = express();

app.use(cors({
  origin: env.CORS_ORIGINS.split(',').map((s: string) => s.trim()),
  credentials: true,
}));
app.use(express.json());
app.use(apiRateLimiter);
app.use('/api', routes);

app.use(errorMiddleware);

export default app;
