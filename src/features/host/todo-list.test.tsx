import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockApi, renderWithProviders } from '@/test/utils';
import { HostTodoList } from './todo-list';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HostTodoList', () => {
  it('says when the list didn’t load, and loads it again on request', async () => {
    let fail = true;
    mockApi({
      'GET /host/todo': () =>
        fail
          ? {
              status: 500,
              body: { error: { code: 'INTERNAL', message: 'Something went wrong on our side.' } },
            }
          : {
              status: 200,
              body: {
                items: [
                  {
                    kind: 'REQUESTS',
                    title: 'A booking request to answer',
                    detail: 'Requests expire after 24 hours.',
                    link: '/host/bookings',
                    urgent: true,
                  },
                ],
              },
            },
    });
    renderWithProviders(<HostTodoList />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We couldn’t load your to-do list');
    expect(alert).toHaveTextContent('Something went wrong on our side.');

    fail = false;
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    const todo = within(await screen.findByRole('region', { name: 'To do' }));
    expect(todo.getByRole('link', { name: /A booking request to answer/ })).toHaveAttribute(
      'href',
      '/host/bookings',
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
