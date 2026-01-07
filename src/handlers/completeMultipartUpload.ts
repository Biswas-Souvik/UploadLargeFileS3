import { UploadEvent, CompleteMultipartUploadEventBody } from '../types';
import { completeMultipartUpload } from '../utils/s3.utils';
import { createResponse } from '../utils/utils';

export const handler = async (event: UploadEvent) => {
  try {
    const body: CompleteMultipartUploadEventBody = JSON.parse(event.body);
    const { key, uploadId, parts } = body ?? {};

    if (!key || !uploadId || !parts)
      return createResponse('Key, UploadID and Parts are required', 400);

    const response = await completeMultipartUpload(key, uploadId, parts);

    return createResponse(JSON.stringify(response));
  } catch (error: unknown) {
    console.error((error as Error).message);
    return createResponse('Internal Server Error', 500);
  }
};
