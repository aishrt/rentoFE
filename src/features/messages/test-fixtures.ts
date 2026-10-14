import type { Message, ThreadDetail, ThreadSummary } from '@/api/types';

/** A conversation in the inbox: Kiri's trip with Hana's car. */
export function threadSummary(overrides: Partial<ThreadSummary> = {}): ThreadSummary {
  return {
    ref: 'RV-7K2Q9M',
    bookingStatus: 'CONFIRMED',
    role: 'GUEST',
    vehicle: { title: '2022 Toyota RAV4' },
    start: '2026-10-11T21:00:00.000Z',
    end: '2026-10-14T21:00:00.000Z',
    otherParty: { id: 'host-1', firstName: 'Hana' },
    lastMessage: {
      body: 'See you at 10!',
      from: 'THEM',
      hasPhotos: false,
      createdAt: '2026-10-06T01:00:00.000Z',
    },
    unreadCount: 1,
    readOnly: false,
    ...overrides,
  };
}

export function threadDetail(overrides: Partial<ThreadDetail> = {}): ThreadDetail {
  return {
    ...threadSummary(),
    canSend: true,
    blockedByMe: false,
    contactsHidden: false,
    closesAt: '2026-11-14T21:00:00.000Z',
    ...overrides,
  };
}

export function message(overrides: Partial<Message> = {}): Message {
  return {
    id: 'm1',
    from: 'THEM',
    sender: 'HOST',
    body: 'See you at 10!',
    attachments: [],
    createdAt: '2026-10-06T01:00:00.000Z',
    ...overrides,
  };
}
