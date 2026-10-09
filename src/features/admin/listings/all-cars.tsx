import { CarFront, ListFilter, Search, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { AdminVehicleRow } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DataTable, Pagination, Td, Th, Tr } from '@/features/admin/ops/admin-table';
import { EmptyList, ListSkeleton, LoadError } from '@/features/admin/ops/query-feedback';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import {
  VEHICLES_PAGE_SIZE,
  VEHICLE_STATUSES,
  hasVehicleFilters,
  useAdminVehicles,
  vehicleFiltersFrom,
  vehicleFiltersToParams,
  vehicleStatusFrom,
  type VehicleFilters,
} from './listing-api';
import { formatDateNz } from './listing-format';
import { VEHICLE_STATUS_LABELS } from './listing-labels';
import { VehicleStatusBadge } from './review-badge';

const STATUS_OPTIONS = [
  { value: '', label: 'Any status' },
  ...VEHICLE_STATUSES.map((status) => ({ value: status, label: VEHICLE_STATUS_LABELS[status] })),
];

/**
 * Every car, whatever its status (plan §12.6): find a live car to suspend, a suspended one to put back, or
 * a car's calendar, by its name, plate or Host. The search is in the address, so the Host's record can link
 * to their cars and the back button brings a search back.
 */
export function AllCarsPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = vehicleFiltersFrom(searchParams);
  const cars = useAdminVehicles(filters);

  // Any change but the page starts again from page 1.
  const update = (change: Partial<VehicleFilters>) =>
    setSearchParams(vehicleFiltersToParams({ ...filters, page: 1, ...change }), { replace: true });

  return (
    <div>
      <Filters key={filters.q} filters={filters} onChange={update} />

      {filters.hostId && (
        <Alert
          className="mt-6"
          title={cars.data?.host ? `${cars.data.host.name}’s cars` : 'One Host’s cars'}
          action={
            <Button variant="secondary" size="sm" onClick={() => update({ hostId: '' })}>
              <X aria-hidden="true" />
              Every Host
            </Button>
          }
        >
          {cars.data?.host ? (
            <Link
              to={`/admin/users/${cars.data.host.id}`}
              className="rounded-inner text-primary hover:underline"
            >
              Open {cars.data.host.name}’s record
            </Link>
          ) : (
            'Only the cars of the Host you came from.'
          )}
        </Alert>
      )}

      <div className="mt-6">
        {cars.isPending && <ListSkeleton label="Loading the cars" rows={8} />}

        {cars.isError && (
          <LoadError
            title="We couldn’t load the cars"
            error={cars.error}
            onRetry={() => cars.refetch()}
            retrying={cars.isFetching}
          />
        )}

        {cars.data?.vehicles.length === 0 &&
          (hasVehicleFilters(filters) ? (
            <EmptyList
              icon={<Search />}
              title="No cars match"
              description="Check the spelling or the plate, or try fewer filters."
            />
          ) : (
            <EmptyList
              icon={<CarFront />}
              title="No cars yet"
              description="Cars show here as soon as a Host starts a listing."
            />
          ))}

        {cars.data && cars.data.vehicles.length > 0 && (
          <div aria-busy={cars.isPlaceholderData || undefined}>
            <CarsTable
              cars={cars.data.vehicles}
              className={cn('transition-opacity duration-200', cars.isPlaceholderData && 'opacity-60')}
            />
            <Pagination
              page={cars.data.page}
              total={cars.data.total}
              pageSize={VEHICLES_PAGE_SIZE}
              noun="cars"
              onChange={(page) => update({ page })}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Filters({
  filters,
  onChange,
}: {
  filters: VehicleFilters;
  onChange: (change: Partial<VehicleFilters>) => void;
}) {
  // Typing doesn't search on every letter: Enter or Search does.
  const [text, setText] = useState(filters.q);
  const search = (event: FormEvent) => {
    event.preventDefault();
    onChange({ q: text.trim() });
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_14rem] lg:items-end">
        <form role="search" onSubmit={search} className="flex items-end gap-2">
          <Field label="Search" className="min-w-0 flex-1">
            <Input
              type="search"
              value={text}
              maxLength={100}
              onChange={(event) => setText(event.target.value)}
              placeholder="Toyota Corolla, a plate, or the Host’s name or email"
              leadingIcon={<Search />}
              enterKeyHint="search"
            />
          </Field>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
        <Field label="Status">
          <Select
            value={filters.status}
            onChange={(value) => onChange({ status: vehicleStatusFrom(value) })}
            options={STATUS_OPTIONS}
            icon={<ListFilter />}
            listLabel="Car statuses"
          />
        </Field>
      </div>
      {hasVehicleFilters(filters) && (
        <Button
          variant="ghost"
          size="sm"
          className="justify-self-start"
          onClick={() => onChange({ q: '', status: '', hostId: '' })}
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}

function CarsTable({ cars, className }: { cars: AdminVehicleRow[]; className?: string }) {
  return (
    <DataTable label="Cars" className={className}>
      <thead>
        <tr>
          <Th>Car</Th>
          <Th>Status</Th>
          <Th>Host</Th>
          <Th>City</Th>
          <Th align="right">Trips</Th>
          <Th>Changed</Th>
        </tr>
      </thead>
      <tbody>
        {cars.map((car) => (
          <Tr key={car.id}>
            <Td>
              <Link
                to={`/admin/vehicles/${car.id}`}
                className="rounded-inner font-medium text-primary hover:underline"
              >
                {car.title}
              </Link>
              <p className="mt-0.5 font-semibold tracking-wide text-muted">
                {car.regoPlate ?? 'No plate yet'}
              </p>
            </Td>
            <Td>
              <div className="flex flex-wrap gap-1.5">
                <VehicleStatusBadge status={car.status} waitingForPayouts={car.waitingForPayouts} />
                {car.hostSuspended && <Badge variant="outline">Host suspended</Badge>}
              </div>
            </Td>
            <Td>
              <Link to={`/admin/users/${car.host.id}`} className="rounded-inner text-primary hover:underline">
                {car.host.name}
              </Link>
              {car.host.email && <p className="mt-0.5 text-muted">{car.host.email}</p>}
            </Td>
            <Td>{car.city ?? <span className="text-muted">–</span>}</Td>
            <Td align="right">{formatNumber(car.tripCount)}</Td>
            <Td className="whitespace-nowrap">{formatDateNz(car.updatedAt)}</Td>
          </Tr>
        ))}
      </tbody>
    </DataTable>
  );
}
