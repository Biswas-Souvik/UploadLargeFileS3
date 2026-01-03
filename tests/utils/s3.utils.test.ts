import { S3Client, PutObjectCommand, Bucket$ } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(),
  PutObjectCommand: jest.fn(),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

jest.mock('@aws-sdk/s3-presigned-post', () => ({
  createPresignedPost: jest.fn(),
}));

describe('S3 Presigned URL Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    process.env.BUCKET_NAME = 'test-bucket'!;
    process.env.FOLDER_NAME_PREFIX = 'files/'!;
    process.env.FILE_SIZE_LIMIT = '5'!;
  });

  describe('generatePresignedUrl', () => {
    it('should reuse the same S3 client instance', async () => {
      const { generatePresignedUrl } = await import('../../src/utils/s3.utils');
      (getSignedUrl as jest.Mock).mockResolvedValue('url');

      await generatePresignedUrl('files/a.png');
      await generatePresignedUrl('files/b.png');

      expect(S3Client).toHaveBeenCalledTimes(1);
    });

    it('should generate a presigned PUT url', async () => {
      const { generatePresignedUrl } = await import('../../src/utils/s3.utils');
      const mockUrl = 'https://signed-url';

      (getSignedUrl as jest.Mock).mockResolvedValue(mockUrl);

      const result = await generatePresignedUrl('files/test.png');

      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: process.env.BUCKET_NAME,
        Key: 'files/test.png',
      });

      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.any(S3Client),
        expect.any(PutObjectCommand),
        { expiresIn: 3600 }
      );

      expect(result).toBe(mockUrl);
    });
  });

  describe('generatePresignedUrlPost', () => {
    it('should generate a presigned POST url', async () => {
      const { generatePresignedUrlPost } = await import(
        '../../src/utils/s3.utils'
      );
      const fileName = 'test.png';
      const keyName = process.env.FOLDER_NAME_PREFIX + fileName;

      const mockPostResponse = {
        url: 'https://s3.amazonaws.com/test-bucket',
        fields: { key: keyName },
      };

      (createPresignedPost as jest.Mock).mockResolvedValue(mockPostResponse);

      const result = await generatePresignedUrlPost(keyName);

      expect(createPresignedPost).toHaveBeenCalledWith(
        expect.any(S3Client),
        expect.objectContaining({
          Bucket: 'test-bucket',
          Key: 'files/test.png',
          Expires: 3600,
          Fields: {
            acl: 'bucket-owner-full-control',
          },
          Conditions: [
            ['content-length-range', 0, 5 * 1024 * 1024],
            { bucket: 'test-bucket' },
            ['starts-with', '$key', 'files/'],
          ],
        })
      );

      expect(result).toBe(mockPostResponse);
    });

    it('should throw custom error when createPresignedPost fails', async () => {
      const { generatePresignedUrlPost } = await import(
        '../../src/utils/s3.utils'
      );
      (createPresignedPost as jest.Mock).mockRejectedValue(
        new Error('AWS error')
      );

      await expect(generatePresignedUrlPost('files/error.png')).rejects.toThrow(
        'Error Creating Presigned Url'
      );
    });
  });
});
