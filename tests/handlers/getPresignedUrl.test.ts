import { generatePresignedUrlPost } from '../../src/utils/s3.utils';

jest.mock('../../src/utils/s3.utils', () => ({
  generatePresignedUrlPost: jest.fn(),
}));

describe('getPresignedUrl handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    process.env.FOLDER_NAME_PREFIX = 'files/';
  });

  const baseEvent = {
    queryStringParameters: {
      fileName: 'test.png',
    },
  };

  it('should return 400 if fileName is missing', async () => {
    const { handler } = await import('../../src/handlers/getPreSignedUrl');

    const result = await handler({} as any);

    expect(result).toEqual({
      statusCode: 400,
      body: 'FileName is required',
    });

    expect(generatePresignedUrlPost).not.toHaveBeenCalled();
  });

  it('should return 200 with presigned POST url when fileName is provided', async () => {
    const { handler } = await import('../../src/handlers/getPreSignedUrl');

    const mockPresignedPost = {
      url: 'https://s3.amazonaws.com/test-bucket',
      fields: { key: 'files/test.png' },
    };

    (generatePresignedUrlPost as jest.Mock).mockResolvedValue(
      mockPresignedPost
    );

    const result = await handler(baseEvent as any);

    expect(generatePresignedUrlPost).toHaveBeenCalledWith('files/test.png');

    expect(result).toEqual({
      statusCode: 200,
      body: JSON.stringify(mockPresignedPost),
    });
  });

  it('should return 500 if generatePresignedUrlPost throws', async () => {
    const { handler } = await import('../../src/handlers/getPreSignedUrl');

    (generatePresignedUrlPost as jest.Mock).mockRejectedValue(
      new Error('S3 failure')
    );

    const result = await handler(baseEvent as any);

    expect(generatePresignedUrlPost).toHaveBeenCalledWith('files/test.png');

    expect(result).toEqual({
      statusCode: 500,
      body: 'Internal Server Error',
    });
  });
});
