import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';
import { useSession } from '@/features/auth/use-session';
import type * as UploadModule from '@/features/host/upload';
import { uploadFile } from '@/features/host/upload';
import { guestUser, mockApi, renderWithProviders } from '@/test/utils';
import { ProfilePhotoPicker } from './profile-photo-picker';

// Uploads go through XMLHttpRequest, which these tests don't run: each test says what the upload does.
vi.mock('@/features/host/upload', async (importOriginal) => ({
  ...(await importOriginal<typeof UploadModule>()),
  uploadFile: vi.fn(),
}));

const KEY = 'members/u2/photo/0b6a3c1e-0000-4000-8000-000000000000.jpg';
const PHOTO = `http://localhost:4000/api/v1/files/${KEY}`;
const user = { ...guestUser, lastName: 'Tester', nameLocked: false, hostStatus: null };

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.mocked(uploadFile).mockReset();
});

/** The picker as the settings page has it: given the session's user, so it shows what the session says. */
function SessionPicker() {
  const { data } = useSession();
  return data ? <ProfilePhotoPicker user={data} /> : null;
}

const fileInput = () => document.querySelector<HTMLInputElement>('input[type="file"]')!;
const photo = () => new File(['photo bytes'], 'me.jpg', { type: 'image/jpeg' });

describe('ProfilePhotoPicker', () => {
  it('shows the initials, then uploads a photo with its progress and shows it', async () => {
    let sent: unknown;
    mockApi({
      'POST /auth/session': { status: 200, body: { user } },
      'PUT /me/photo': (init) => {
        sent = JSON.parse(String(init?.body));
        return { status: 200, body: { user: { ...user, avatarUrl: PHOTO } } };
      },
    });
    let finish: (key: string) => void = () => undefined;
    vi.mocked(uploadFile).mockImplementation(({ onProgress }) => {
      onProgress?.(0.4);
      return new Promise((resolve) => (finish = resolve));
    });
    renderWithProviders(<SessionPicker />);

    expect(await screen.findByText('KT')).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
    expect(fileInput()).toHaveAttribute('accept', expect.stringContaining('image/*'));

    await userEvent.click(screen.getByRole('button', { name: 'Add photo' }));
    await userEvent.upload(fileInput(), photo());
    expect(await screen.findByRole('progressbar', { name: 'Uploading your photo' })).toHaveAttribute(
      'aria-valuenow',
      '40',
    );
    expect(document.querySelector('img')).toHaveAttribute('src', 'blob:preview');
    expect(vi.mocked(uploadFile)).toHaveBeenCalledWith(
      expect.objectContaining({ purpose: 'PROFILE_PHOTO', filename: 'me.jpg' }),
    );

    finish(KEY);
    expect(await screen.findByText('Your photo is saved.')).toBeInTheDocument();
    expect(sent).toEqual({ key: KEY });
    expect(document.querySelector('img')).toHaveAttribute('src', PHOTO);
    expect(screen.queryByText('KT')).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change photo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });

  it('removes the photo, back to the initials', async () => {
    const sent = vi.fn();
    mockApi({
      'POST /auth/session': { status: 200, body: { user: { ...user, avatarUrl: PHOTO } } },
      'DELETE /me/photo': () => (sent(), { status: 200, body: { user } }),
    });
    renderWithProviders(<SessionPicker />);

    await userEvent.click(await screen.findByRole('button', { name: 'Remove' }));

    expect(await screen.findByText('Your photo is removed.')).toBeInTheDocument();
    expect(sent).toHaveBeenCalledOnce();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText('KT')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add photo' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
  });

  it('refuses a file that isn’t a photo without uploading it', async () => {
    mockApi({ 'POST /auth/session': { status: 200, body: { user } } });
    renderWithProviders(<SessionPicker />);
    await screen.findByText('KT');

    await userEvent
      .setup({ applyAccept: false })
      .upload(fileInput(), new File(['%PDF'], 'licence.pdf', { type: 'application/pdf' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Photos can be JPEG, PNG, WebP or HEIC.');
    expect(vi.mocked(uploadFile)).not.toHaveBeenCalled();
  });

  it('says why a photo couldn’t be used, and keeps the initials', async () => {
    mockApi({
      'POST /auth/session': { status: 200, body: { user } },
      'PUT /me/photo': {
        status: 400,
        body: {
          error: {
            code: 'UNREADABLE_IMAGE',
            message: 'We couldn’t read that photo. Please try another one, or save it as a JPEG first.',
          },
        },
      },
    });
    vi.mocked(uploadFile).mockResolvedValue(KEY);
    renderWithProviders(<SessionPicker />);
    await screen.findByText('KT');

    await userEvent.upload(fileInput(), photo());

    expect(await screen.findByRole('alert')).toHaveTextContent('We couldn’t read that photo.');
    expect(screen.getByText('KT')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add photo' })).toBeEnabled();
  });

  it('says when the upload itself failed', async () => {
    mockApi({ 'POST /auth/session': { status: 200, body: { user } } });
    vi.mocked(uploadFile).mockRejectedValue(
      new ApiError(0, 'NETWORK_ERROR', "The upload didn't finish. Check your connection and try again."),
    );
    renderWithProviders(<SessionPicker />);
    await screen.findByText('KT');

    await userEvent.upload(fileInput(), photo());

    expect(await screen.findByRole('alert')).toHaveTextContent('Check your connection and try again.');
  });
});
