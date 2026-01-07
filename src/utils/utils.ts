export function createResponse(body: string, statusCode: Number = 200) {
  return {
    body,
    statusCode,
  };
}
