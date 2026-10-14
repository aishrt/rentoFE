import { CircleAlert, MapPin, Plane, Truck } from 'lucide-react';
import type { HostVehicle } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { IconBadge } from '@/components/ui/icon-badge';
import { formatNumber } from '@/lib/format';
import { formatAddress, formatDayValue, formatNzd, todayNz } from './listing-format';
import {
  BODY_TYPE_LABELS,
  DELIVERY_LABELS,
  FUEL_LABELS,
  FUEL_POLICY_LABELS,
  TRANSMISSION_LABELS,
  tierLabel,
  type DeliveryOption,
} from './listing-labels';
import { Fact, FactList, ReviewSection } from './review-section';

/*
 * The listing's details for staff to check against its documents and photos (plan §9, Days 8–11). Staff
 * see everything the Host entered, including the plate, VIN and full addresses that guests don't (plan §3).
 */

const hours = (count: number) => `${formatNumber(count)} ${count === 1 ? 'hour' : 'hours'}`;
const days = (count: number) => `${formatNumber(count)} ${count === 1 ? 'day' : 'days'}`;

/** "1,798 cc · 4 cylinders" or "450 km range · 75 kWh battery", plus the Host's description. */
function powertrainLine(powertrain: HostVehicle['powertrain']): string | undefined {
  if (!powertrain) return undefined;
  const parts = [
    powertrain.engineCc && `${formatNumber(powertrain.engineCc)} cc`,
    powertrain.cylinders && `${powertrain.cylinders} cylinders`,
    powertrain.evRangeKm && `${formatNumber(powertrain.evRangeKm)} km range`,
    powertrain.batteryKwh && `${formatNumber(powertrain.batteryKwh)} kWh battery`,
    powertrain.description,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

export function VehicleDetailsSection({ vehicle }: { vehicle: HostVehicle }) {
  const extras = [vehicle.petFriendly && 'Pet friendly', vehicle.childSeat && 'Child seat available'].filter(
    Boolean,
  );
  return (
    <ReviewSection
      id="details"
      title="Vehicle details"
      description="Check them against the registration papers."
    >
      <FactList>
        <Fact term="Number plate">
          {vehicle.regoPlate && <span className="font-semibold tracking-wide">{vehicle.regoPlate}</span>}
        </Fact>
        {/* Imports without a VIN have a chassis number instead (plan §9, Days 8–11). */}
        {vehicle.chassisNo && !vehicle.vin ? (
          <Fact term="Chassis number">{vehicle.chassisNo}</Fact>
        ) : (
          <Fact term="VIN">{vehicle.vin}</Fact>
        )}
        {vehicle.vin && vehicle.chassisNo && <Fact term="Chassis number">{vehicle.chassisNo}</Fact>}
        <Fact term="Make">{vehicle.make}</Fact>
        <Fact term="Model">{vehicle.model}</Fact>
        <Fact term="Year">{vehicle.year}</Fact>
        <Fact term="Variant">{vehicle.variant}</Fact>
        <Fact term="Body type">{vehicle.bodyType && BODY_TYPE_LABELS[vehicle.bodyType]}</Fact>
        <Fact term="Fuel">{vehicle.fuelType && FUEL_LABELS[vehicle.fuelType]}</Fact>
        <Fact term="Transmission">{vehicle.transmission && TRANSMISSION_LABELS[vehicle.transmission]}</Fact>
        <Fact term="Seats">{vehicle.seats}</Fact>
        <Fact term="Doors">{vehicle.doors}</Fact>
        <Fact term="Engine or powertrain">{powertrainLine(vehicle.powertrain)}</Fact>
        <Fact term="Registered owner">
          {vehicle.ownerIsHost ? 'The Host' : 'Someone else: their written consent is needed'}
        </Fact>
        <Fact term="Location">{[vehicle.suburb, vehicle.city].filter(Boolean).join(', ')}</Fact>
        <Fact term="Extras">{extras.length > 0 ? extras.join(', ') : 'None'}</Fact>
        <Fact term="Features" wide>
          {vehicle.features.length > 0 ? (
            <ul aria-label="Features" className="mt-1 flex flex-wrap gap-1.5">
              {vehicle.features.map((feature) => (
                <li key={feature}>
                  <Badge variant="outline">{feature}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            'None listed'
          )}
        </Fact>
        <Fact term="Existing damage" wide>
          {vehicle.damageNotes ? (
            <span className="whitespace-pre-line">{vehicle.damageNotes}</span>
          ) : (
            'None declared'
          )}
        </Fact>
      </FactList>
    </ReviewSection>
  );
}

/** "12 Oct 2027", with "Expired" in words when it's in the past. */
function ExpiryDate({ value, today }: { value: string; today: string }) {
  const expired = value < today;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2">
      {formatDayValue(value)}
      {expired && (
        <span className="inline-flex items-center gap-1 font-medium text-danger">
          <CircleAlert aria-hidden="true" className="size-3.5" />
          Expired
        </span>
      )}
    </span>
  );
}

/** Diesel, EV and plug-in hybrid cars pay Road User Charges (plan §3). */
const needsRuc = (fuelType: HostVehicle['fuelType']) =>
  fuelType === 'DIESEL' || fuelType === 'EV' || fuelType === 'PHEV';

export function ComplianceSection({ vehicle }: { vehicle: HostVehicle }) {
  const today = todayNz();
  return (
    <ReviewSection
      id="compliance"
      title="Registration and WOF"
      description="The dates the Host entered. Check them against the documents above."
    >
      <FactList>
        <Fact term="Registration expires">
          {vehicle.regoExpiry && <ExpiryDate value={vehicle.regoExpiry} today={today} />}
        </Fact>
        {vehicle.cofExpiry ? (
          <Fact term="CoF expires">
            <ExpiryDate value={vehicle.cofExpiry} today={today} />
          </Fact>
        ) : (
          <Fact term="WOF expires">
            {vehicle.wofExpiry && <ExpiryDate value={vehicle.wofExpiry} today={today} />}
          </Fact>
        )}
        <Fact term="Road User Charges paid to">
          {vehicle.rucValidToKm !== undefined
            ? `${formatNumber(vehicle.rucValidToKm)} km on the odometer`
            : needsRuc(vehicle.fuelType)
              ? undefined
              : 'Not needed for this fuel'}
        </Fact>
      </FactList>
    </ReviewSection>
  );
}

export function PricingSection({ vehicle }: { vehicle: HostVehicle }) {
  const { pricing, rules } = vehicle;
  return (
    <ReviewSection id="pricing" title="Pricing and trip rules">
      <FactList>
        <Fact term="Daily price">{pricing && formatNzd(pricing.dailyCents)}</Fact>
        <Fact term="Weekly discount">{pricing && `${pricing.weeklyDiscountPct}%`}</Fact>
        <Fact term="Monthly discount">{pricing && `${pricing.monthlyDiscountPct}%`}</Fact>
        <Fact term="Kilometres">
          {vehicle.unlimitedKm
            ? 'Unlimited'
            : vehicle.kmAllowancePerDay
              ? `${formatNumber(vehicle.kmAllowancePerDay)} km a day`
              : undefined}
        </Fact>
        <Fact term="Extra kilometres">
          {vehicle.unlimitedKm ? 'Not charged' : pricing && `${formatNzd(pricing.extraKmCents)} a km`}
        </Fact>
        <Fact term="Fuel policy">{FUEL_POLICY_LABELS[vehicle.fuelPolicy]}</Fact>
        <Fact term="Trip length">
          {rules.minDays === rules.maxDays
            ? days(rules.minDays)
            : `${formatNumber(rules.minDays)} to ${days(rules.maxDays)}`}
        </Fact>
        <Fact term="Minimum notice">{hours(rules.minNoticeHours)}</Fact>
        <Fact term="Preparation time between trips">{hours(rules.bufferHours)}</Fact>
        <Fact term="Instant Book">{rules.instantBook ? 'On' : 'Off: the Host accepts each request'}</Fact>
        <Fact term="Cancellation policy">
          {rules.cancellationTier ? tierLabel(rules.cancellationTier) : 'The platform default'}
        </Fact>
      </FactList>
    </ReviewSection>
  );
}

const deliveryIcons: Record<DeliveryOption['type'], typeof MapPin> = {
  PICKUP: MapPin,
  DELIVERY: Truck,
  AIRPORT: Plane,
  CUSTOM: MapPin,
};

export function DeliverySection({ vehicle }: { vehicle: HostVehicle }) {
  return (
    <ReviewSection
      id="delivery"
      title="Pick-up and delivery"
      description="Full addresses: guests only see the suburb until their booking is confirmed."
    >
      {vehicle.deliveryOptions.length === 0 ? (
        <p className="text-sm text-muted">No pick-up or delivery options yet.</p>
      ) : (
        <ul className="divide-y divide-line rounded-control border border-line">
          {vehicle.deliveryOptions.map((option) => {
            const Icon = deliveryIcons[option.type];
            const typeLabel = DELIVERY_LABELS[option.type];
            return (
              <li key={option.id} className="flex gap-3 p-4">
                <IconBadge size="sm" tone="muted">
                  <Icon />
                </IconBadge>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium text-ink">
                    {option.label && option.label !== typeLabel ? `${typeLabel}: ${option.label}` : typeLabel}
                  </p>
                  {option.address && <p className="mt-0.5 text-ink">{formatAddress(option.address)}</p>}
                  <p className="mt-0.5 text-muted">
                    {[
                      option.feeCents > 0 ? `${formatNzd(option.feeCents)} fee` : 'No fee',
                      option.radiusKm !== undefined && `Within ${formatNumber(option.radiusKm)} km`,
                      option.airportCode && `Airport ${option.airportCode}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {option.instructions && (
                    <p className="mt-1 whitespace-pre-line text-muted">
                      <span className="text-ink">Instructions: </span>
                      {option.instructions}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </ReviewSection>
  );
}
