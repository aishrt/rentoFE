import { MapPin, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { IconButton } from '@/components/ui/icon-button';
import { Select } from '@/components/ui/select';
import { CAR_AREAS, areaName } from './car-areas';
import { CarDiagram, type DiagramPin } from './car-diagram';

export interface EditablePin {
  id: string;
  x: number;
  y: number;
  note: string;
}

let nextPin = 1;

interface DamageEditorProps {
  pins: EditablePin[];
  onChange: (pins: EditablePin[]) => void;
  /** Damage already recorded, shown for reference and not editable. */
  earlier?: DiagramPin[];
  /** Check-in records damage already there; check-out and later record new damage. */
  kind: 'existing' | 'new';
}

/**
 * Marking damage on the car diagram (spec §14): tap where it is, or choose the part of the car, then say
 * what it is. Earlier damage shows in grey so only what's new is marked again.
 */
export function DamageEditor({ pins, onChange, earlier = [], kind }: DamageEditorProps) {
  const [selected, setSelected] = useState<string | undefined>();
  const [area, setArea] = useState('');

  const add = (x: number, y: number) => {
    const pin = { id: `pin-${nextPin++}`, x, y, note: '' };
    onChange([...pins, pin]);
    setSelected(pin.id);
  };

  const shown: DiagramPin[] = [...earlier, ...pins.map((pin) => ({ ...pin, isNew: kind === 'new' }))];

  return (
    <div className="grid items-start gap-6 md:grid-cols-[14rem_minmax(0,1fr)]">
      <div className="grid gap-3">
        <CarDiagram pins={shown} onAdd={add} selectedId={selected} onSelect={setSelected} />
        {earlier.length > 0 && (
          <p className="text-center text-xs text-muted">
            <span className="mr-1 inline-block size-2.5 rounded-full bg-ink/55 align-middle" /> At check-in
            <span className="mr-1 ml-3 inline-block size-2.5 rounded-full bg-danger align-middle" /> New
          </p>
        )}
      </div>
      <div className="grid gap-4">
        <p className="text-ink/80">
          {kind === 'existing'
            ? 'Tap the car where there’s a scratch, dent or chip already, so it isn’t blamed on this trip. No damage? Carry on.'
            : 'Tap the car where there’s new damage since check-in. Nothing new? Carry on.'}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={area}
            onChange={(value) => {
              setArea('');
              const spot = CAR_AREAS.find((candidate) => candidate.label === value);
              if (spot) add(spot.x, spot.y);
            }}
            options={CAR_AREAS.map((candidate) => ({ value: candidate.label, label: candidate.label }))}
            placeholder="Or choose the part of the car"
            icon={<MapPin aria-hidden="true" />}
            listLabel="Parts of the car"
            className="max-w-sm"
          />
        </div>
        {pins.length > 0 && (
          <ol className="grid gap-3">
            {pins.map((pin) => {
              const number = earlier.length + pins.indexOf(pin) + 1;
              return (
                <li
                  key={pin.id}
                  className={`flex items-center gap-3 rounded-control border p-3 ${pin.id === selected ? 'border-primary' : 'border-line'}`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${kind === 'new' ? 'bg-danger' : 'bg-ink/55'}`}
                  >
                    {number}
                  </span>
                  <Input
                    aria-label={`What’s the damage at ${areaName(pin.x, pin.y).toLowerCase()}?`}
                    placeholder={`${areaName(pin.x, pin.y)}: e.g. a small scratch`}
                    maxLength={500}
                    value={pin.note}
                    onFocus={() => setSelected(pin.id)}
                    onChange={(event) =>
                      onChange(
                        pins.map((other) =>
                          other.id === pin.id ? { ...other, note: event.target.value } : other,
                        ),
                      )
                    }
                  />
                  <IconButton
                    label={`Remove mark ${number}`}
                    tooltip="none"
                    onClick={() => onChange(pins.filter((other) => other.id !== pin.id))}
                  >
                    <Trash2 aria-hidden="true" />
                  </IconButton>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
