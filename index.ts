import express, { Response } from 'express';

const PORT = 3000;

const MAX_REQUESTS = 5;
const MAX_TIME_SECONDS = 5;

const app = express();

type RequestDetail = {
  timestamp: number;
  timeout: NodeJS.Timeout;
}

const requestLog = new Map<string, Map<string, RequestDetail>>();

const getOrCreateRequestDetailMapForIp = (ipAddress: string) => {
  const requestDetailMapForIp: Map<string, RequestDetail> = requestLog.get(ipAddress) || new Map();
  requestLog.set(ipAddress, requestDetailMapForIp);
  return requestDetailMapForIp;
}

const handleTooManyRequests = (res: Response) => {
  res.statusCode = 429
  res.setHeader('Retry-After', MAX_TIME_SECONDS);
  res.send('Too many requests');
}

const createRequestDetail = (ipAddress: string, requestDetailMapForIp: Map<string, RequestDetail>): [string, RequestDetail] => {
  const requestKey = crypto.randomUUID();
  const requestDetail: RequestDetail = {
    timestamp: new Date().getTime(),
    timeout: setTimeout(() => {
      requestDetailMapForIp.delete(requestKey);

      if (requestLog.get(ipAddress)?.size) {
        // there's still requests being tracked, keep IP
        return;
      }

      requestLog.delete(ipAddress);
    }, MAX_TIME_SECONDS * 1000),
  }

  return [requestKey, requestDetail];
}

app.use((req, res, next) => {
  const ipAddress = req.ip;

  console.log(`Request: ${req.path}, IP: ${ipAddress}`);

  if (ipAddress === undefined) {
    console.log('No IP address gathered; just send the request through');
    return next();
  }

  const requestDetailMapForIp = getOrCreateRequestDetailMapForIp(ipAddress);

  if (requestDetailMapForIp.size >= 5) {
    handleTooManyRequests(res);
    return;
  }

  const [requestKey, newRequestForMap] = createRequestDetail(ipAddress, requestDetailMapForIp);

  requestDetailMapForIp.set(requestKey, newRequestForMap);

  console.log({requestLog})
  next();
});

app.set('trust proxy', true);

app.get('/', (_, res) => {
  res.send('Hi')
});

app.listen(3000);


