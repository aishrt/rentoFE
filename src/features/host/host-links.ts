/*
 * The pages Hosts share with Guests (spec §9, §13): the inbox and reviews. Opened as a Host (`?as=host`), from
 * the Host area, they take the Host's dashboard frame (HostShell) instead of the Guest's.
 */

export const HOST_INBOX = '/messages?as=host';
export const HOST_REVIEWS = '/account/reviews?as=host';

/** Whether a page Hosts share with Guests was opened as a Host. */
export const openedAsHost = (params: URLSearchParams) => params.get('as') === 'host';
