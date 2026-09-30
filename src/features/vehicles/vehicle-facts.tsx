import {
  BatteryCharging,
  CarFront,
  Check,
  CircleAlert,
  CircleCheck,
  Cog,
  DoorOpen,
  Fuel,
  Gauge,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { VehicleCompliance, VehicleDetail } from '@/api/types';
import { IconBadge } from '@/components/ui/icon-badge';
import { cn } from '@/lib/cn';
import { ListingSection } from './listing-section';
import { BODY_TYPE_LABELS, FUEL_LABELS, TRANSMISSION_LABELS, formatExpiryMonth } from './vehicle-format';

/** "2.5L petrol hybrid, AWD", "2.8 litre, 4 cylinders" or "460 km range · 64.8 kWh battery". */
function powertrainLine(vehicle: VehicleDetail): string | undefined {
  const powertrain = vehicle.powertrain;
  if (!powertrain) return undefined;
  const electric = [
    powertrain.evRangeKm ? `${powertrain.evRangeKm} km range` : undefined,
    powertrain.batteryKwh ? `${powertrain.batteryKwh} kWh battery` : undefined,
  ].filter(Boolean);
  if (vehicle.fuelType === 'EV' && electric.length > 0) return electric.join(' · ');
  if (powertrain.description) return powertrain.description;
  const engine = [
    powertrain.engineCc ? `${(powertrain.engineCc / 1000).toFixed(1)} litre` : undefined,
    powertrain.cylinders ? `${powertrain.cylinders} cylinders` : undefined,
  ].filter(Boolean);
  return engine.length > 0 ? engine.join(', ') : electric.join(' · ') || undefined;
}

interface Spec {
  icon: LucideIcon;
  label: string;
  value: string;
}

/** Transmission, fuel, engine or powertrain, seats and doors (spec §6), then the car's features. */
export function SpecsSection({ vehicle }: { vehicle: VehicleDetail }) {
  const engine = powertrainLine(vehicle);
  const specs: Spec[] = [
    { icon: Cog, label: 'Transmission', value: TRANSMISSION_LABELS[vehicle.transmission] },
    {
      icon: vehicle.fuelType === 'EV' ? BatteryCharging : Fuel,
      label: 'Fuel',
      value: FUEL_LABELS[vehicle.fuelType],
    },
    ...(engine
      ? [{ icon: Gauge, label: vehicle.fuelType === 'EV' ? 'Powertrain' : 'Engine', value: engine }]
      : []),
    { icon: Users, label: 'Seats', value: String(vehicle.seats) },
    { icon: DoorOpen, label: 'Doors', value: String(vehicle.doors) },
    { icon: CarFront, label: 'Body', value: BODY_TYPE_LABELS[vehicle.bodyType] },
  ];
  const features = [
    ...vehicle.features,
    ...(vehicle.childSeat ? ['Child seat available'] : []),
    ...(vehicle.petFriendly ? ['Pet friendly'] : []),
    ...(vehicle.unlimitedKm ? ['Unlimited kilometres'] : []),
  ];

  return (
    <>
      <ListingSection id="specs" title="The car">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {specs.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="flex items-start gap-3 rounded-card border border-line/80 bg-surface p-4 shadow-card"
            >
              <IconBadge size="sm">
                <Icon />
              </IconBadge>
              <div className="min-w-0">
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="mt-0.5 font-medium text-ink">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </ListingSection>

      {features.length > 0 && (
        <ListingSection id="features" title="Features">
          <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-ink">
                <Check aria-hidden="true" className="size-4.5 shrink-0 text-primary" />
                {feature}
              </li>
            ))}
          </ul>
        </ListingSection>
      )}
    </>
  );
}

type Status = VehicleCompliance['rego']['status'];

function statusText(status: Status, expiresMonth?: string): string {
  if (status === 'EXPIRED') return 'Expired';
  if (status === 'NOT_RECORDED') return 'Not recorded yet';
  const month = formatExpiryMonth(expiresMonth);
  return month ? `Current, until ${month}` : 'Current';
}

function ComplianceRow({ label, detail, ok }: { label: string; detail: string; ok: boolean }) {
  return (
    <li className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0">
      {ok ? (
        <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" />
      ) : (
        <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted" />
      )}
      <div>
        <p className="font-medium text-ink">{label}</p>
        <p className={cn('text-sm', ok ? 'text-muted' : 'text-ink/85')}>{detail}</p>
      </div>
    </li>
  );
}

/**
 * Registration and WOF (spec §6, plan §3): each one's status with the month it runs to, the Certificate of
 * Fitness instead of a WOF where the car needs one, and road user charges for diesel, electric and plug-in
 * hybrid cars. Never the number plate: the guest sees it once the booking is confirmed.
 */
export function ComplianceSection({ compliance }: { compliance: VehicleCompliance }) {
  const { rego, inspection, ruc } = compliance;
  const inspectionName =
    inspection.kind === 'COF' ? 'Certificate of Fitness (CoF)' : 'Warrant of Fitness (WOF)';

  return (
    <ListingSection
      id="compliance"
      title="Registration and WOF"
      description="Checked by our team. The number plate is shared once your booking is confirmed."
    >
      <ul className="divide-y divide-line rounded-card border border-line/80 bg-surface p-5 shadow-card">
        <ComplianceRow
          label="Registration"
          detail={statusText(rego.status, rego.expiresMonth)}
          ok={rego.status === 'CURRENT'}
        />
        <ComplianceRow
          label={inspectionName}
          detail={statusText(inspection.status, inspection.expiresMonth)}
          ok={inspection.status === 'CURRENT'}
        />
        {ruc.required && (
          <ComplianceRow
            label="Road user charges (RUC)"
            detail={
              ruc.recorded
                ? 'Licence recorded. Diesel, electric and plug-in hybrid cars pay road user charges by the kilometre.'
                : 'Not recorded yet'
            }
            ok={ruc.recorded}
          />
        )}
      </ul>
    </ListingSection>
  );
}
