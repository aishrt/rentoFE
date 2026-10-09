import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import { PhotoCapture } from './photo-capture';

/** A rear camera: getUserMedia answers with a stream whose one track can be stopped. */
function mockCamera(getUserMedia?: () => Promise<MediaStream>) {
  const track = { stop: vi.fn() };
  const stream = { getTracks: () => [track] } as unknown as MediaStream;
  const request = vi.fn(getUserMedia ?? (async () => stream));
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: request },
  });
  return { track, stream, request };
}

/** jsdom can't play video or draw on a canvas: the frame "draws" and comes out as a small JPEG. */
function mockFrames() {
  const drawImage = vi.fn();
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as never);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) =>
    callback(new Blob(['frame'], { type: 'image/jpeg' })),
  );
  return drawImage;
}

/** The live view's video, once the camera has started and its size is known. */
async function cameraReady(stream: MediaStream) {
  const video = document.querySelector('video')!;
  await vi.waitFor(() => expect(video.srcObject).toBe(stream));
  Object.defineProperty(video, 'videoWidth', { configurable: true, value: 4032 });
  Object.defineProperty(video, 'videoHeight', { configurable: true, value: 3024 });
  fireEvent.loadedMetadata(video);
  return video;
}

const renderCapture = (onTake = vi.fn<(file: File) => Promise<string | null>>(async () => null)) => {
  renderWithProviders(<PhotoCapture angle="FRONT" position={{ index: 1, total: 8 }} onTake={onTake} />);
  return onTake;
};

let drawImage: ReturnType<typeof mockFrames>;
beforeEach(() => {
  drawImage = mockFrames();
});

afterEach(() => {
  Reflect.deleteProperty(navigator, 'mediaDevices');
  Reflect.deleteProperty(navigator, 'permissions');
  vi.restoreAllMocks();
});

describe('PhotoCapture with the in-app camera', () => {
  it('shows the rear camera full screen with the outline and count, and takes the shot as a JPEG', async () => {
    const { track, stream, request } = mockCamera();
    const onTake = renderCapture();

    await userEvent.click(screen.getByRole('button', { name: 'Take the front photo' }));
    const camera = within(await screen.findByRole('dialog', { name: 'Front, photo 1 of 8' }));
    expect(camera.getByText('Front 1/8')).toBeInTheDocument();
    expect(camera.getByText(/whole front is in the photo/)).toBeInTheDocument();
    expect(document.querySelector('[role="dialog"] svg[viewBox="0 0 120 64"]')).not.toBeNull();
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        audio: false,
        video: expect.objectContaining({ facingMode: 'environment' }),
      }),
    );
    const shutter = camera.getByRole('button', { name: 'Take the front photo' });
    expect(shutter).toHaveFocus();
    expect(shutter).toHaveAttribute('aria-disabled', 'true');

    const video = await cameraReady(stream);
    expect(shutter).toHaveAttribute('aria-disabled', 'false');
    await userEvent.click(shutter);

    await vi.waitFor(() => expect(onTake).toHaveBeenCalledTimes(1));
    const shot = onTake.mock.calls[0]![0];
    expect(shot).toBeInstanceOf(File);
    expect(shot).toMatchObject({ name: 'front.jpg', type: 'image/jpeg' });
    // A 4032 × 3024 frame is drawn 2560 px across, at most, for a quick upload.
    expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 2560, 1920);
    expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.9);
    // The camera goes off as the view closes.
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(track.stop).toHaveBeenCalled();
  });

  it('closes with Escape or the close button, switching the camera off', async () => {
    const { track, stream } = mockCamera();
    const onTake = renderCapture();
    const open = screen.getByRole('button', { name: 'Take the front photo' });

    await userEvent.click(open);
    await screen.findByRole('dialog', { name: 'Front, photo 1 of 8' });
    await cameraReady(stream);
    await userEvent.keyboard('{Escape}');
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(track.stop).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(open).toHaveFocus());

    await userEvent.click(open);
    await userEvent.click(await screen.findByRole('button', { name: 'Close the camera' }));
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await vi.waitFor(() => expect(track.stop).toHaveBeenCalledTimes(2));
    expect(onTake).not.toHaveBeenCalled();
  });

  it('falls back to the file input when camera access is refused', async () => {
    mockCamera(async () => {
      throw new DOMException('Permission denied', 'NotAllowedError');
    });
    const onTake = renderCapture();
    const chooser = vi.spyOn(HTMLInputElement.prototype, 'click');

    await userEvent.click(screen.getByRole('button', { name: 'Take the front photo' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Camera access is off');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Take the front photo' }));
    expect(chooser).toHaveBeenCalledTimes(1);
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    expect(input).toHaveAttribute('capture', 'environment');
    const photo = new File(['jpeg'], 'IMG_0001.jpg', { type: 'image/jpeg' });
    await userEvent.upload(input, photo);
    await vi.waitFor(() => expect(onTake).toHaveBeenCalledWith(photo));
  });

  it('says when there’s no camera to use', async () => {
    mockCamera(async () => {
      throw new DOMException('Requested device not found', 'NotFoundError');
    });
    renderCapture();
    await userEvent.click(screen.getByRole('button', { name: 'Take the front photo' }));
    expect(await screen.findByText('There’s no camera to use here')).toBeInTheDocument();
    expect(screen.getByText(/A photo taken earlier shows its own date/)).toBeInTheDocument();
  });

  it('offers to try the camera again when it didn’t start', async () => {
    const { stream } = mockCamera();
    const request = vi
      .fn<() => Promise<MediaStream>>()
      .mockRejectedValueOnce(new DOMException('Could not start video source', 'NotReadableError'))
      .mockResolvedValue(stream);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: request },
    });
    renderCapture();

    await userEvent.click(screen.getByRole('button', { name: 'Take the front photo' }));
    expect(await screen.findByText('The camera didn’t start')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try the camera again' }));
    expect(await screen.findByRole('dialog', { name: 'Front, photo 1 of 8' })).toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('goes straight to the file input without getUserMedia, or once camera access is off', async () => {
    const chooser = vi.spyOn(HTMLInputElement.prototype, 'click');
    const { unmount } = renderWithProviders(
      <PhotoCapture angle="REAR" position={{ index: 2, total: 8 }} onTake={vi.fn(async () => null)} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Take the rear photo' }));
    expect(chooser).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // An old browser: nothing to explain.
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    unmount();

    const { request } = mockCamera();
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: { query: vi.fn(async () => ({ state: 'denied' })) },
    });
    renderWithProviders(
      <PhotoCapture angle="REAR" position={{ index: 2, total: 8 }} onTake={vi.fn(async () => null)} />,
    );
    expect(await screen.findByText('Camera access is off')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Take the rear photo' }));
    expect(chooser).toHaveBeenCalledTimes(2);
    expect(request).not.toHaveBeenCalled();
  });
});
