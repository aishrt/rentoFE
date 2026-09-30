import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, CircleAlert, ExternalLink, FileText, X } from 'lucide-react';
import { useState } from 'react';
import type { HostVehicle } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { IconBadge } from '@/components/ui/icon-badge';
import { toast } from '@/components/ui/toast';
import { formatNumber } from '@/lib/format';
import { ConfirmDialog } from './confirm-dialog';
import {
  adminVehicleQueryKey,
  decideDocumentRequest,
  reviewErrorMessage,
  reviewQueueQueryKey,
  withVehicle,
} from './listing-api';
import { formatDayValue, todayNz } from './listing-format';
import { DOCUMENT_LABELS, DOCUMENT_NAMES, type DocumentType, type VehicleDocument } from './listing-labels';
import { DocumentStatusBadge } from './review-badge';
import { ReviewSection } from './review-section';

const ORDER = Object.keys(DOCUMENT_LABELS) as DocumentType[];

/**
 * The listing's documents (plan §9, Days 8–11): registration, WOF or CoF, RUC, insurance and the owner's
 * consent. They're private files, opened through a short-lived link (plan §3, public and private files).
 */
export function DocumentReview({
  vehicleId,
  documents,
}: {
  vehicleId: string;
  documents: HostVehicle['documents'];
}) {
  const queryClient = useQueryClient();
  // Kept while the dialog closes, so its text doesn't change as it animates out.
  const [rejecting, setRejecting] = useState<VehicleDocument | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const showResult = (vehicle: HostVehicle, title: string, description?: string) => {
    queryClient.setQueryData(adminVehicleQueryKey(vehicleId), withVehicle(vehicle));
    void queryClient.invalidateQueries({ queryKey: reviewQueueQueryKey });
    toast(title, { description });
  };

  const verify = useMutation({
    mutationFn: (document: VehicleDocument) =>
      decideDocumentRequest({ id: vehicleId, documentId: document.id, decision: 'VERIFY' }),
    onSuccess: (vehicle, document) => showResult(vehicle, `${DOCUMENT_LABELS[document.type]} verified`),
  });

  const reject = async () => {
    if (!rejecting) return;
    const vehicle = await decideDocumentRequest({
      id: vehicleId,
      documentId: rejecting.id,
      decision: 'REJECT',
    });
    setConfirmOpen(false);
    showResult(
      vehicle,
      `${DOCUMENT_LABELS[rejecting.type]} rejected`,
      "We've asked the Host to upload it again.",
    );
  };

  const today = todayNz();
  const sorted = [...documents].sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type));
  const waiting = documents.filter((document) => document.status === 'PENDING').length;
  const busyId = verify.isPending ? verify.variables.id : null;

  return (
    <ReviewSection
      id="documents"
      title="Documents"
      description="Each link works for 10 minutes; the page renews them while it's open."
      aside={<p className="text-sm text-muted">{formatNumber(waiting)} waiting</p>}
    >
      {verify.isError && (
        <Alert variant="danger" role="alert" className="mb-4">
          {reviewErrorMessage(verify.error)}
        </Alert>
      )}

      {sorted.length === 0 ? (
        <p className="text-sm text-muted">No documents yet.</p>
      ) : (
        <ul aria-label="Documents" className="divide-y divide-line rounded-control border border-line">
          {sorted.map((document) => {
            const label = DOCUMENT_LABELS[document.type];
            const name = DOCUMENT_NAMES[document.type];
            const expired = document.expiry !== undefined && document.expiry < today;
            return (
              <li
                key={document.id}
                aria-label={label}
                className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4"
              >
                <div className="flex min-w-0 flex-1 basis-64 items-start gap-3">
                  <IconBadge size="sm" tone="muted">
                    <FileText />
                  </IconBadge>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="font-medium text-ink">{label}</p>
                      <DocumentStatusBadge status={document.status} />
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted">
                      {document.expiry ? `Expires ${formatDayValue(document.expiry)}` : 'No expiry date'}
                      {expired && (
                        <span className="inline-flex items-center gap-1 font-medium text-danger">
                          <CircleAlert aria-hidden="true" className="size-3.5" />
                          Expired
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="ghost" size="sm" asChild>
                    <a
                      href={document.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open the ${name} (new tab)`}
                    >
                      <ExternalLink aria-hidden="true" />
                      Open
                    </a>
                  </Button>
                  {document.status !== 'VERIFIED' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      aria-label={`Verify the ${name}`}
                      loading={busyId === document.id}
                      disabled={busyId !== null}
                      onClick={() => verify.mutate(document)}
                    >
                      <Check aria-hidden="true" />
                      Verify
                    </Button>
                  )}
                  {document.status !== 'REJECTED' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Reject the ${name}`}
                      disabled={busyId !== null}
                      onClick={() => {
                        setRejecting(document);
                        setConfirmOpen(true);
                      }}
                    >
                      <X aria-hidden="true" />
                      Reject
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Reject the ${rejecting ? DOCUMENT_NAMES[rejecting.type] : 'document'}?`}
        description="It counts as missing until the Host uploads a new one. We'll ask them to."
        confirmLabel="Reject document"
        onConfirm={reject}
      />
    </ReviewSection>
  );
}
