export type SendEvent = (event: string, data: unknown) => void;

export function createSseHelpers(
  res: {
    write: (chunk: string) => void;
    setHeader: (name: string, value: string) => void;
    flushHeaders?: () => void;
    statusCode: number;
  }
) {
  const sendEvent: SendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const startStream = () => {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
  };

  return { sendEvent, startStream };
}
