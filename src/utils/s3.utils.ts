import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const BUCKET_NAME = process.env.BUCKET_NAME;
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
