/*
 * Insurance and protection page copy (plan §9, Days 12–14; spec §22, §23). The plans, prices and excesses
 * come from GET /policies; the words here only explain them. Final cover terms come from the insurance
 * partner (plan §16 item 9), so nothing here promises cover beyond each plan's own summary.
 */

export const hero = {
  eyebrow: 'Insurance and protection',
  title: 'Protection for every trip, explained plainly.',
  lead: 'Choose how much excess you’re comfortable with. Each plan’s daily price and excess are shown here, and again before you pay.',
};

export const plansHeading = {
  eyebrow: 'Protection plans',
  title: 'Choose your level of protection',
};

export const excessHeading = {
  eyebrow: 'How the excess works',
  title: 'The most you’d pay towards a claim',
};

export const excessPoints = [
  'The excess is the most you’d pay towards a covered claim for damage or theft during your trip.',
  'A plan with a lower excess costs more a day. The choice is yours, with both figures side by side before you book.',
  'Your plan and its excess stay in your booking and on your trip, so you always know where you stand.',
];

export const checkoutHeading = {
  eyebrow: 'At checkout',
  title: 'Choosing a plan',
};

export const checkoutSteps = [
  {
    title: 'Pick your car and dates',
    text: 'Each listing shows the protection options before you start to book.',
  },
  {
    title: 'Choose a plan',
    text: 'The plan included by default is already selected. Choose another for a lower excess.',
  },
  {
    title: 'Check the total',
    text: 'The plan’s daily price shows in your price breakdown, in NZD, before you pay.',
  },
  {
    title: 'Keep it handy',
    text: 'Your plan, its excess and the roadside assistance number stay in your booking for the whole trip.',
  },
];

export const partnerNote = {
  title: 'Final cover terms come from our insurance partner',
  text: 'The summaries on this page are the plans our booking system uses today. The full terms, conditions and exclusions of each plan come from our insurance partner, and they apply over these summaries.',
};

export const closing = {
  title: 'Know what to do if something happens',
  description: 'Our Safety page covers accidents, thefts and breakdowns, step by step.',
};
