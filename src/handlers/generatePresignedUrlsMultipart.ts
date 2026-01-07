import { UploadEvent, GenratePresignedUrlEventBody } from '../types';
import { getPresignedUrls } from '../utils/s3.utils';
import { createResponse } from '../utils/utils';

export const handler = async (event: UploadEvent) => {
  try {
    const body: GenratePresignedUrlEventBody = JSON.parse(event.body);
    const { key, uploadId, partCount } = body ?? {};

    if (!key || !uploadId || !partCount)
      return createResponse('Key, UploadID and PartCount are required', 400);

    const presignedUrls = await getPresignedUrls(key, uploadId, partCount);

    return createResponse(JSON.stringify(presignedUrls));
  } catch (error: unknown) {
    console.error((error as Error).message);
    return createResponse('Internal Server Error', 500);
  }
};
