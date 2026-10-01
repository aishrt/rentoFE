import { describe, expect, it } from 'vitest';
import { smallPhoto } from './photos';

describe('smallPhoto', () => {
  it('uses the 800 px copy of an uploaded listing photo', () => {
    expect(smallPhoto('https://media.rentovroom.com/vehicles/v1/photos/0f8e-1600.webp')).toBe(
      'https://media.rentovroom.com/vehicles/v1/photos/0f8e-800.webp',
    );
  });

  it('leaves any other photo as it is', () => {
    for (const url of [
      'https://placehold.co/1600x1200/0254C2/FFFFFF/webp?text=Corolla',
      'http://localhost:4610/api/v1/files/vehicles/v1/photos/0f8e.jpg',
      'https://media.rentovroom.com/vehicles/v1/photos/0f8e-1600.webp?v=2',
    ]) {
      expect(smallPhoto(url)).toBe(url);
    }
  });
});
