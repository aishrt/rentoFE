import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BlurText } from './blur-text';
import { MotionProvider } from './motion-provider';

describe('BlurText', () => {
  it('keeps the heading readable as one sentence', () => {
    render(
      <MotionProvider>
        <h1>
          <BlurText text="Rent a car from local owners." />
        </h1>
      </MotionProvider>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Rent a car from local owners.' }),
    ).toBeInTheDocument();
  });
});
