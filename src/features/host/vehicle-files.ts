import type { HostVehicle } from '@/api/types';
import { attachDocumentRequest, attachPhotoRequest } from './host-api';
import type { PreparedPhoto } from './photo-checks';
import { contentTypeOf, uploadFile } from './upload';
import type { DocumentType, PhotoType } from './vehicle-labels';

/*
 * A photo or document from the Host's phone to their car: upload it, then attach what storage answered.
 * Both answer with the whole car, whose photo or document now waits for our team (plan §3, "Changes to
 * live listings").
 */

interface Progress {
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

export async function uploadVehiclePhoto({
  vehicleId,
  type,
  photo,
  filename,
  ...progress
}: Progress & {
  vehicleId: string;
  type: PhotoType;
  photo: PreparedPhoto;
  filename?: string;
}): Promise<HostVehicle> {
  const upload = await uploadFile({
    purpose: 'VEHICLE_PHOTO',
    vehicleId,
    file: photo.file,
    contentType: photo.contentType,
    filename,
    ...progress,
  });
  return attachPhotoRequest(vehicleId, {
    type,
    upload,
    ...(photo.width && photo.height && { width: photo.width, height: photo.height }),
    qualityFlag: photo.qualityFlag,
  });
}

export async function uploadVehicleDocument({
  vehicleId,
  type,
  file,
  expiry,
  ...progress
}: Progress & { vehicleId: string; type: DocumentType; file: File; expiry?: string }): Promise<HostVehicle> {
  const upload = await uploadFile({
    purpose: 'VEHICLE_DOCUMENT',
    vehicleId,
    file,
    contentType: contentTypeOf(file),
    filename: file.name,
    ...progress,
  });
  return attachDocumentRequest(vehicleId, { type, upload, ...(expiry && { expiry }) });
}
