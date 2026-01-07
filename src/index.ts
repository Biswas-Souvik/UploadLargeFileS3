import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import 'dotenv/config';

interface IntiateResponseData {
  uploadId: string;
  key: string;
}

interface UrlResponseData {
  partNumber: string;
  url: string;
}

const API_BASE_URL = process.env.API_BASE_URL!;
const LOCAL_FILE_PATH = '.uploads/PokeAPI Walkthrough.mp4';
const PART_SIZE = 5 * 1024 * 1024; // 5 MB in bytes

async function uploadFile() {
  try {
    const startTime = Date.now();
    const fileName = path.basename(LOCAL_FILE_PATH);
    const mimeType = mime.lookup(LOCAL_FILE_PATH);

    const fileSize = fs.statSync(LOCAL_FILE_PATH).size;

    const initiateResp = await fetch(`${API_BASE_URL}/multipart/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName,
        mimeType,
      }),
    });

    if (!initiateResp.ok) {
      throw new Error('Initiate upload failed');
    }
    const initiateRespData = (await initiateResp.json()) as IntiateResponseData;
    console.log('Initiate Upload Resp: ', initiateRespData);

    const { uploadId, key } = initiateRespData;
    if (!uploadId || !key) {
      throw new Error('Invalid initiate response');
    }
    const partCount = Math.ceil(fileSize / PART_SIZE);

    const urlResp = await fetch(`${API_BASE_URL}/multipart/url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, uploadId, partCount }),
    });

    if (!urlResp.ok) {
      throw new Error('Failed to get presigned URLs');
    }
    const urlRespData = (await urlResp.json()) as UrlResponseData[];
    console.log('Presigned URLs: ', urlRespData);

    const totalParts = urlRespData.length;

    const fileStream = fs.createReadStream(LOCAL_FILE_PATH, {
      highWaterMark: PART_SIZE,
    });

    let i = 0;
    const uploadedParts = [];

    for await (const chunk of fileStream) {
      const { partNumber, url } = urlRespData[i];

      const res = await fetch(url, {
        method: 'PUT',
        body: chunk,
      });
      if (!res.ok) {
        throw new Error(`Upload failed at part ${i}: ${await res.text()}`);
      }

      const etag = res.headers.get('ETag');
      if (!etag) throw new Error('ETag missing');

      console.log(res.headers);

      uploadedParts.push({
        partNumber,
        ETag: etag,
      });
      console.log(`Uploaded part ${i + 1}/${totalParts}`);
      i++;
    }

    const completeRes = await fetch(`${API_BASE_URL}/multipart/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, uploadId, parts: uploadedParts }),
    });

    if (!completeRes.ok) {
      throw new Error(`Complete upload failed: ${await completeRes.text()}`);
    }
    const completeRespData = (await completeRes.json()) as { Location: string };

    console.log('Multipart Upload Completed');
    console.log('Time Taken: ', (Date.now() - startTime) / 1000, 'seconds');
    console.log('File Location: ', completeRespData.Location);
  } catch (err: unknown) {
    console.error('Error during upload: ', (err as Error).message);
  }
}

uploadFile();
