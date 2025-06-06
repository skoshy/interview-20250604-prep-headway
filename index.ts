import express, { RequestHandler } from 'express';

const PORT = 3000;
const app = express();

const MAX_COUNT = 5;
const TIMER_RESET_SECONDS = 5;

const rateLimitMemo: Record<string, Map<string, {
  timestamp: number,
  removalTimeout: NodeJS.Timeout,
}>> = {};

const getOrCreateRateLimitMap = (ipAddress: string) => {
  rateLimitMemo[ipAddress] = rateLimitMemo[ipAddress] || new Map();
  return rateLimitMemo[ipAddress];
}

const rateLimiter :RequestHandler = (req, res, next) => {
  const ipAddress = req.ip;

  if (!ipAddress) {
    // allow requests through if there's no captured IP
    next();
    return;
  }

  const rateLimitMapForIp = getOrCreateRateLimitMap(ipAddress);

  const requestId = crypto.randomUUID();
  const timestamp = new Date().getTime();

  rateLimitMapForIp.set(requestId, {
    timestamp,
    removalTimeout: setTimeout(() => {
      console.log(`For IP: ${ipAddress}, Deleting request ${requestId}`)
      rateLimitMapForIp.delete(requestId);
    }, TIMER_RESET_SECONDS * 1000),
  })

  if (rateLimitMapForIp.size > MAX_COUNT) {
    res.setHeader('Retry-After', TIMER_RESET_SECONDS);
    res.status(429).send('Exceeded limit');
    return;
  }

  console.log(`Req for ${req.path}`);

  next();
};

app.set('trust proxy', true);
app.use(rateLimiter);

app.get('/', (_, res) => {
  res.send('Hello');
});

app.get('/howdy', (_, res) => {
  res.send('Howdy');
});

app.listen(PORT, () => {
  console.log('Server running');
});
