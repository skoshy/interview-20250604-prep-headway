import express, { Response } from 'express';

const PORT = 3000;

const MAX_REQUESTS = 5;
const MAX_TIME_SECONDS = 5;

const app = express();

type RequestDetail = {
  ipAddress: string;
  timestamp: number;
}

const ipCount: Record<string, number> = {};
const requestLog: RequestDetail[] = [];

const getOrCreateRequestDetailMapForIp = (ipAddress: string) => {
  return {
    ipAddress,
    timestamp: new Date().getTime(),
  }
}

const handleTooManyRequests = (res: Response) => {
  res.statusCode = 429
  res.setHeader('Retry-After', MAX_TIME_SECONDS);
  res.send('Too many requests');
}

app.use((req, res, next) => {
  const ipAddress = req.ip;

  console.log(`Request: ${req.path}, IP: ${ipAddress}`);

  if (ipAddress === undefined) {
    console.log('No IP address gathered; just send the request through');
    return next();
  }

  ipCount[ipAddress] = ipCount[ipAddress] ?? 0;

  if (ipCount[ipAddress] >= 5) {
    handleTooManyRequests(res);
    return;
  }

  ipCount[ipAddress]++;

  const requestEntry = getOrCreateRequestDetailMapForIp(ipAddress);
  requestLog.push(requestEntry);

  // console.log({requestLog})
  next();
});

app.set('trust proxy', true);

app.get('/', (_, res) => {
  res.send('Hi')
});

app.listen(3000);

setInterval(() => {
  console.log('Interval Start', requestLog);

  const currentTime = new Date().getTime();
  const expirationTime = currentTime - (MAX_TIME_SECONDS * 1000);

  while (requestLog.length > 0 && requestLog[0].timestamp < expirationTime) {
    const expiredRequest = requestLog.shift();;

    console.log('removing entry', expiredRequest, { currentTime });
    if (expiredRequest) {
      ipCount[expiredRequest.ipAddress]--;
    }
  }

  console.log('Interval End', requestLog);
}, MAX_TIME_SECONDS * 1000);
