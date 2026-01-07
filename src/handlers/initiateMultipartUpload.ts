import { UploadEvent, MultipartUploadEventBody } from '../types';
import { initiateMultipartUploadS3 } from '../utils/s3.utils';
import { createResponse } from '../utils/utils';

const FOLDER_NAME_PREFIX = process.env.FOLDER_NAME_PREFIX!;

export const handler = async (event: UploadEvent) => {
  try {
    const body: MultipartUploadEventBody = JSON.parse(event.body);
    const { fileName, mimeType } = body ?? {};

    if (!fileName || !mimeType)
      return createResponse('FileName & MimeType are required', 400);
    const key = FOLDER_NAME_PREFIX + fileName;

    const presignedUrl = await initiateMultipartUploadS3(key, mimeType);

    return createResponse(JSON.stringify(presignedUrl));
  } catch (error: unknown) {
    console.error((error as Error).message);
    return createResponse('Internal Server Error', 500);
  }
};
