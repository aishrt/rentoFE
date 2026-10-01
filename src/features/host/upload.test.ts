import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UploadTarget } from '@/api/types';
import { mockApi } from '@/test/utils';
import { contentTypeOf, sendFile, uploadProblem } from './upload';
import { uploadVehicleDocument, uploadVehiclePhoto } from './vehicle-files';

/** A stand-in for XMLHttpRequest that records what was sent and answers with `FakeXhr.reply`. */
class FakeXhr {
  static sent: FakeXhr[] = [];
  static reply: (xhr: FakeXhr) => void = () => {};

  method = '';
  url = '';
  withCredentials = false;
  headers: Record<string, string> = {};
  body: unknown;
  status = 0;
  responseText = '';
  upload: { onprogress: ((event: Partial<ProgressEvent>) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  send(body: unknown) {
    this.body = body;
    FakeXhr.sent.push(this);
    queueMicrotask(() => FakeXhr.reply(this));
  }
  abort() {
    this.onabort?.();
  }
  progress(loaded: number, total: number) {
    this.upload.onprogress?.({ lengthComputable: true, loaded, total });
  }
  respond(status: number, body: unknown) {
    this.respondText(status, JSON.stringify(body));
  }
  respondText(status: number, text: string) {
    this.status = status;
    this.responseText = text;
    this.onload?.();
  }
}

beforeEach(() => {
  FakeXhr.sent = [];
  vi.stubGlobal('XMLHttpRequest', FakeXhr);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const localTarget: UploadTarget = {
  driver: 'local',
  method: 'PUT',
  url: 'http://api.test/api/v1/uploads/local/signed-token',
  headers: { 'Content-Type': 'image/jpeg' },
  key: 'vehicles/v1/photos/front.jpg',
  maxBytes: 15 * 1024 * 1024,
};

const s3Target: UploadTarget = {
  driver: 's3',
  method: 'POST',
  url: 'https://rento-vroom-media.s3.ap-southeast-2.amazonaws.com/',
  fields: {
    key: 'private/vehicles/v1/documents/wof.pdf',
    'Content-Type': 'application/pdf',
    Policy: 'policy',
    'X-Amz-Signature': 'sig',
  },
  key: 'private/vehicles/v1/documents/wof.pdf',
  maxBytes: 15 * 1024 * 1024,
};

const photo = new Blob(['jpeg bytes'], { type: 'image/jpeg' });

describe('sendFile', () => {
  it('PUTs a local upload with the session cookie and its headers, reporting progress', async () => {
    FakeXhr.reply = (xhr) => {
      xhr.progress(5, 10);
      xhr.respond(201, { key: 'vehicles/v1/photos/front.jpg' });
    };
    const progress: number[] = [];

    const key = await sendFile(localTarget, photo, { onProgress: (fraction) => progress.push(fraction) });

    expect(key).toBe('vehicles/v1/photos/front.jpg');
    const [xhr] = FakeXhr.sent;
    expect(xhr).toMatchObject({ method: 'PUT', url: localTarget.url, withCredentials: true });
    expect(xhr?.headers).toEqual({ 'Content-Type': 'image/jpeg' });
    expect(xhr?.body).toBe(photo);
    expect(progress).toEqual([0.5, 1]);
  });

  it('POSTs an S3 upload as a form with every signed field, then the file, without cookies', async () => {
    FakeXhr.reply = (xhr) => xhr.respondText(204, '');

    const reference = await sendFile(s3Target, photo, { filename: 'wof.jpg' });

    expect(reference).toBe(s3Target.key);
    const [xhr] = FakeXhr.sent;
    expect(xhr).toMatchObject({ method: 'POST', url: s3Target.url, withCredentials: false });
    const form = xhr?.body as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect(Object.fromEntries([...form.entries()].filter(([name]) => name !== 'file'))).toEqual(
      s3Target.fields,
    );
    // S3 reads the fields up to the file and ignores anything after it.
    expect([...form.keys()].at(-1)).toBe('file');
    expect((form.get('file') as File).name).toBe('wof.jpg');
  });

  it("explains S3's refusals: a file that's too large, or a link that expired", async () => {
    FakeXhr.reply = (xhr) =>
      xhr.respondText(
        400,
        '<Error><Code>EntityTooLarge</Code><Message>Your proposed upload exceeds the maximum allowed size</Message></Error>',
      );
    await expect(sendFile(s3Target, photo)).rejects.toMatchObject({
      code: 'FILE_TOO_LARGE',
      message: 'Files can be up to 15 MB.',
    });

    FakeXhr.reply = (xhr) =>
      xhr.respondText(
        403,
        '<Error><Code>AccessDenied</Code><Message>Invalid according to Policy: Policy expired.</Message></Error>',
      );
    await expect(sendFile(s3Target, photo)).rejects.toMatchObject({ code: 'UPLOAD_EXPIRED' });

    FakeXhr.reply = (xhr) => xhr.respondText(403, '<Error><Code>AccessDenied</Code></Error>');
    await expect(sendFile(s3Target, photo)).rejects.toMatchObject({ code: 'UPLOAD_FAILED' });
  });

  it('renews an expired session once and tries a local upload again', async () => {
    const fetchMock = mockApi({ 'POST /auth/refresh': { status: 204 } });
    FakeXhr.reply = (xhr) =>
      FakeXhr.sent.length === 1
        ? xhr.respond(401, { error: { code: 'UNAUTHENTICATED', message: 'Sign in' } })
        : xhr.respond(201, { key: 'vehicles/v1/photos/front.jpg' });

    await expect(sendFile(localTarget, photo)).resolves.toBe('vehicles/v1/photos/front.jpg');
    expect(FakeXhr.sent).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("passes on the API's message when an upload is refused", async () => {
    FakeXhr.reply = (xhr) =>
      xhr.respond(403, { error: { code: 'UPLOAD_EXPIRED', message: 'This upload link has expired.' } });

    await expect(sendFile(localTarget, photo)).rejects.toMatchObject({
      code: 'UPLOAD_EXPIRED',
      message: 'This upload link has expired.',
    });
  });
});

describe('uploading to a car', () => {
  it("signs, uploads and attaches a photo with the target's key", async () => {
    let signature: unknown;
    let attached: unknown;
    mockApi({
      'POST /uploads/signature': (init) => {
        signature = JSON.parse(String(init?.body));
        return { status: 200, body: localTarget };
      },
      'POST /host/vehicles/v1/photos': (init) => {
        attached = JSON.parse(String(init?.body));
        return { status: 201, body: { vehicle: { id: 'v1' } } };
      },
    });
    FakeXhr.reply = (xhr) => xhr.respond(201, { key: localTarget.key });

    await uploadVehiclePhoto({
      vehicleId: 'v1',
      type: 'FRONT',
      photo: {
        file: photo,
        contentType: 'image/jpeg',
        width: 2000,
        height: 1500,
        qualityFlag: 'DARK',
        checked: true,
      },
    });

    expect(signature).toEqual({
      purpose: 'VEHICLE_PHOTO',
      vehicleId: 'v1',
      contentType: 'image/jpeg',
      size: photo.size,
    });
    expect(attached).toEqual({
      type: 'FRONT',
      upload: localTarget.key,
      width: 2000,
      height: 1500,
      qualityFlag: 'DARK',
    });
  });

  it('attaches a document uploaded to S3 with its key and its expiry', async () => {
    let attached: unknown;
    mockApi({
      'POST /uploads/signature': { status: 200, body: s3Target },
      'POST /host/vehicles/v1/documents': (init) => {
        attached = JSON.parse(String(init?.body));
        return { status: 201, body: { vehicle: { id: 'v1' } } };
      },
    });
    FakeXhr.reply = (xhr) => xhr.respondText(204, '');
    const pdf = new File(['%PDF'], 'wof.pdf', { type: 'application/pdf' });

    await uploadVehicleDocument({ vehicleId: 'v1', type: 'WOF', file: pdf, expiry: '2027-03-31' });

    expect(attached).toEqual({
      type: 'WOF',
      upload: s3Target.key,
      expiry: '2027-03-31',
    });
  });
});

describe('before uploading', () => {
  it('knows HEIC photos by their name when the browser gives no type', () => {
    expect(contentTypeOf(new File(['x'], 'IMG_0001.HEIC'))).toBe('image/heic');
  });

  it('refuses the wrong kind of file, and files over 15 MB', () => {
    const pdf = new File(['%PDF'], 'rego.pdf', { type: 'application/pdf' });
    expect(uploadProblem(pdf, 'VEHICLE_PHOTO')).toBe('Photos can be JPEG, PNG, WebP or HEIC.');
    expect(uploadProblem(pdf, 'VEHICLE_DOCUMENT')).toBeNull();
    const huge = { size: 16 * 1024 * 1024, type: 'image/jpeg' } as Blob;
    expect(uploadProblem(huge, 'VEHICLE_PHOTO')).toBe('Files can be up to 15 MB.');
  });
});
