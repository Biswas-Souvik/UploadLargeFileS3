import { GetPresignedUrlEvent } from '../types';
import { generatePresignedUrl } from '../utils/s3.utils';

const FOLDER_NAME_PREFIX = process.env.FOLDER_NAME_PREFIX;

function createResponse(body: string, statusCode: Number = 200) {
  return {
    body,
    statusCode,
  };
}

export const handler = async (event: GetPresignedUrlEvent) => {
  try {
    const { fileName } = event.queryStringParameters;
    if (!fileName) return createResponse('FileName is required', 400);
    const key = FOLDER_NAME_PREFIX + fileName;

    const presignedUrl = await generatePresignedUrl(key);

    const output = { uploadUrl: presignedUrl, fileName: key };
    return createResponse(JSON.stringify(output), 200);
  } catch (error: unknown) {
    console.error((error as Error).message);
    return createResponse('Internal Server Error', 500);
  }
};
