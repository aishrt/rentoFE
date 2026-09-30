import { z } from 'zod';
import type { HostVehicle, PublicPolicies, VehiclePatch } from '@/api/types';
import { fieldMap } from './use-step-save';
import { needsRuc, type DocumentType } from './vehicle-labels';

/*
 * Step 2, documents (plan §9, Days 8–11): the rego and WOF (or CoF) expiry dates, the Road User Charges
 * reading for diesel, EV and PHEV cars, and whether the Host is the registered owner. The files upload
 * straight away, apart from this form.
 */

export const documentsSchema = z.object({
  regoExpiry: z.string(),
  needsCof: z.boolean(),
  inspectionExpiry: z.string(),
  rucValidToKm: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === '' ||
        (/^\d+$/.test(value.replaceAll(',', '')) && Number(value.replaceAll(',', '')) <= 2_000_000),
      'Enter the odometer reading in kilometres, like 152000',
    ),
  ownerIsHost: z.boolean(),
});

export type DocumentsValues = z.infer<typeof documentsSchema>;

export function documentsDefaults(vehicle: HostVehicle): DocumentsValues {
  return {
    regoExpiry: vehicle.regoExpiry ?? '',
    needsCof: Boolean(vehicle.cofExpiry),
    inspectionExpiry: vehicle.cofExpiry ?? vehicle.wofExpiry ?? '',
    rucValidToKm: vehicle.rucValidToKm === undefined ? '' : String(vehicle.rucValidToKm),
    ownerIsHost: vehicle.ownerIsHost,
  };
}

export function documentsPatch(values: DocumentsValues, fuelType?: string): VehiclePatch {
  const inspection = values.inspectionExpiry || null;
  const ruc = values.rucValidToKm.replaceAll(',', '');
  return {
    ...(values.regoExpiry && { regoExpiry: values.regoExpiry }),
    wofExpiry: values.needsCof ? null : inspection,
    cofExpiry: values.needsCof ? inspection : null,
    ...(needsRuc(fuelType) && { rucValidToKm: ruc ? Number(ruc) : null }),
    ownerIsHost: values.ownerIsHost,
  };
}

export const documentsFieldFor = fieldMap<keyof DocumentsValues>({
  regoExpiry: 'regoExpiry',
  wofExpiry: 'inspectionExpiry',
  cofExpiry: 'inspectionExpiry',
  rucValidToKm: 'rucValidToKm',
  ownerIsHost: 'ownerIsHost',
});

export interface DocumentSlot {
  type: DocumentType;
  required: boolean;
}

/**
 * The documents to ask for, required ones first: those in settings (a CoF in place of the WOF when the car
 * needs one), the owner's consent when the Host isn't the registered owner, then the RUC licence for cars
 * that pay it, and Other. Any other type already uploaded is listed too, so it can be removed.
 */
export function documentSlots(
  policies: PublicPolicies,
  vehicle: HostVehicle,
  values: Pick<DocumentsValues, 'needsCof' | 'ownerIsHost'>,
  fuelType?: string,
): DocumentSlot[] {
  const inspection: DocumentType = values.needsCof ? 'COF' : 'WOF';
  const required = policies.vehicles.requiredDocuments.map((type) =>
    type === 'WOF' || type === 'COF' ? inspection : type,
  );
  if (!values.ownerIsHost) required.push('OWNER_CONSENT');
  const optional: DocumentType[] = [];
  if (needsRuc(fuelType)) optional.push('RUC');
  optional.push('OTHER');
  for (const document of vehicle.documents) {
    if (!required.includes(document.type) && !optional.includes(document.type))
      optional.splice(-1, 0, document.type);
  }
  const unique = <T>(list: T[]) => [...new Set(list)];
  return [
    ...unique(required).map((type) => ({ type, required: true })),
    ...unique(optional)
      .filter((type) => !required.includes(type))
      .map((type) => ({ type, required: false })),
  ];
}
