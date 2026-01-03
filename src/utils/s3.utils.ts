import { Conditions as PolicyEntry } from '@aws-sdk/s3-presigned-post/dist-types/types';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';

const FOLDER_NAME_PREFIX = process.env.FOLDER_NAME_PREFIX!;
const BUCKET_NAME = process.env.BUCKET_NAME!;
const FILE_SIZE_IN_MB = parseInt(process.env.FILE_SIZE_LIMIT!);

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client();
    console.log('Connected to S3 - Bucket: ', BUCKET_NAME);
  }
  return s3Client;
}

function getPutCommand(key: string) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  return command;
}

export const generatePresignedUrl = (key: string) => {
  const client = getS3Client();
  const putCommand = getPutCommand(key);
  return getSignedUrl(client, putCommand, { expiresIn: 3600 });
};

export const generatePresignedUrlPost = async (key: string) => {
  try {
    const client = getS3Client();
    const fileSizeLimitinBytes = FILE_SIZE_IN_MB * 1024 * 1024;
    const Conditions: PolicyEntry[] = [
      ['content-length-range', 0, fileSizeLimitinBytes],
      { bucket: BUCKET_NAME },
      ['starts-with', '$key', FOLDER_NAME_PREFIX],
    ];
    const Fields = {
      acl: 'bucket-owner-full-control',
    };
    return await createPresignedPost(client, {
      Bucket: BUCKET_NAME,
      Key: key,
      Conditions,
      Fields,
      Expires: 3600,
    });
  } catch (error) {
    console.error((error as Error).message);
    throw new Error('Error Creating Presigned Url');
  }
};
