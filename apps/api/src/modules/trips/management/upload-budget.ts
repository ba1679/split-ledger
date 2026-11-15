import type { FastifyReply, FastifyRequest } from 'fastify';
import { HttpError } from '../../../http.js';
import { imageTooLarge, MAX_MULTIPART_BYTES, requireUploadConnected } from './image-processor.js';

const timeout = () =>
  new HttpError(408, 'UPLOAD_TIMEOUT', '圖片傳輸或處理逾時，請先確認保存結果。');

/** Receive and conversion have separate absolute budgets; neither timer runs during COMMIT. */
export function monitorUpload(
  request: FastifyRequest,
  reply: FastifyReply,
  controller: AbortController,
) {
  let receivedBytes = 0;
  let processingTimer: ReturnType<typeof setTimeout> | undefined;
  const stop = (error: HttpError) => {
    if (controller.signal.aborted) return;
    controller.abort(error);
    if (reply.sent) return;
    // req.destroy shares the response socket. Flush the rejection before closing an incomplete body.
    reply.header('Connection', 'close');
    reply.raw.once('finish', () => {
      if (!request.raw.complete) request.raw.destroy();
    });
    void reply.code(error.statusCode).send({ code: error.code, message: error.message });
  };
  const receiveTimer = setTimeout(() => stop(timeout()), 60000);
  receiveTimer.unref();
  const count = (chunk: Buffer) => {
    receivedBytes += chunk.length;
    if (receivedBytes > MAX_MULTIPART_BYTES) stop(imageTooLarge());
  };

  return {
    beginReading() {
      // multipart consumes request.raw, not Fastify's preParsing payload. Pause before adding
      // the observer; the immediately following parts() iterator pipes/resumes with backpressure.
      request.raw.pause();
      request.raw.on('data', count);
    },
    received(fileBytes: number) {
      clearTimeout(receiveTimer);
      request.raw.off('data', count);
      requireUploadConnected(controller.signal);
      if (receivedBytes - fileBytes > 65536) throw imageTooLarge();
    },
    async process<T>(work: () => Promise<T>): Promise<T> {
      processingTimer = setTimeout(() => stop(timeout()), 10000);
      processingTimer.unref();
      try {
        // Keep awaiting the actual native work after an early timeout response. The caller's
        // full-job finally owns admission release and completion, even if native cancellation is late.
        const result = await work();
        requireUploadConnected(controller.signal);

        return result;
      } finally {
        clearTimeout(processingTimer);
      }
    },
    detach() {
      clearTimeout(receiveTimer);
      clearTimeout(processingTimer);
      request.raw.off('data', count);
      // Parser/header failures may finish the handler before the client finishes its body.
      // Stop that input after the error response flushes, even though the job context is gone.
      if (!request.raw.complete && !request.raw.destroyed) {
        if (!reply.sent) reply.header('Connection', 'close');
        if (reply.raw.writableFinished) request.raw.destroy();
        else reply.raw.once('finish', () => request.raw.destroy());
      }
    },
  };
}
