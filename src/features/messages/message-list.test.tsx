import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MessageList } from './message-list';
import { message } from './test-fixtures';

const NOTICE = 'This message was removed by Rento Vroom support.';
const removedAt = '2026-10-06T02:00:00.000Z';

describe('MessageList: a message support removed', () => {
  it('shows the Guest and Host only the notice, with nothing to report', () => {
    const onReport = vi.fn();
    render(
      <MessageList
        otherName="Hana"
        onReport={onReport}
        messages={[
          message({ id: 'm1', body: NOTICE, removed: { at: removedAt } }),
          message({ id: 'm2', body: 'See you at 10!', createdAt: '2026-10-06T03:00:00.000Z' }),
          message({ id: 'm3', from: 'ME', sender: 'GUEST', body: NOTICE, removed: { at: removedAt } }),
        ]}
      />,
    );

    const log = within(screen.getByRole('log', { name: 'Messages with Hana' }));
    const items = log.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent(`Hana: ${NOTICE}`);
    expect(items[2]).toHaveTextContent(`You: ${NOTICE}`);
    expect(log.queryByRole('img')).not.toBeInTheDocument();
    // Only the message still there can be reported.
    expect(log.getAllByRole('button', { name: 'Report this message from Hana' })).toHaveLength(1);
    expect(
      within(items[1]!).getByRole('button', { name: 'Report this message from Hana' }),
    ).toBeInTheDocument();
  });

  it('shows support staff the message as it was, marked removed with why', () => {
    render(
      <MessageList
        otherName="Kiri and Hana"
        names={{ me: 'Hana', them: 'Kiri' }}
        messages={[
          message({
            id: 'm1',
            from: 'THEM',
            sender: 'GUEST',
            body: 'Pay me in cash or else',
            attachments: [
              { url: 'https://files.test/photo.jpg', name: 'photo.jpg', contentType: 'image/jpeg' },
            ],
            removed: { at: removedAt, reason: 'Threatening the Host' },
          }),
        ]}
      />,
    );

    // The message's own item, which holds a list of its photos.
    const item = within(screen.getByText('Pay me in cash or else').closest('li')!);
    expect(item.getByText('Pay me in cash or else')).toBeInTheDocument();
    expect(item.getByRole('img', { name: 'photo.jpg' })).toBeInTheDocument();
    expect(
      item.getByText('Removed by support, hidden from both sides: Threatening the Host'),
    ).toBeInTheDocument();
    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument();
  });
});
