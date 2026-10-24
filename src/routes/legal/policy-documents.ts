/**
 * The policy pages beyond the five legal documents (spec §3): plain-English policies that describe how Rento
 * Vroom works. Figures such as fees, tiers, excess amounts and eligibility are never written here; each
 * page shows them live from GET /policies (`live`), so the text can't drift from what the system charges.
 * The owner's decisions behind each page are recorded in POLICY_BUSINESS_DECISIONS.md (D-numbers).
 */

/** Which live figures a policy page shows above its text. */
export type PolicyLive = 'refunds' | 'driver' | 'vehicle' | 'fees' | 'excess';

export interface PolicyDocument {
  path: string;
  label: string;
  live?: PolicyLive;
  markdown: string;
}

/** When the policies were last changed, as an ISO date (shown as "Last updated"). */
export const POLICY_UPDATED_AT = '2026-10-24T00:00:00.000Z';

export const policyDocuments: readonly PolicyDocument[] = [
  {
    path: '/community-guidelines',
    label: 'Community guidelines',
    markdown: `# Community guidelines

Rento Vroom works because Guests and Hosts treat each other well. These guidelines set out what we expect from everyone on the platform.

## Be honest

- Use your real name and details, and keep your account to yourself.
- Describe a car accurately, with recent photos. A Host should mention damage, quirks and limits. A Guest should tell the Host about anything that happens on the trip.
- Write reviews about the trip you actually had.

## Treat people with respect

- No harassment, threats, abuse or discrimination, in messages, listings or reviews. This includes discrimination on the basis of race, colour, ethnicity, religion, sex, gender, sexual orientation, disability or age.
- Keep your conversations on Rento Vroom messages, so we can help if there is a problem.
- Don't ask someone to pay, or to take a booking, outside the platform.

## Look after the car

- Guests return the car in the condition it was handed over, with the fuel and cleanliness set by the listing.
- Hosts hand over a safe, roadworthy and clean car, and keep its WOF or CoF, registration and insurance details up to date.
- Photos at check-in and check-out protect both sides. Please take them.

## Keep everyone safe

- Drive legally and safely, within the road rules and the conditions of the licence you hold.
- Report an accident, damage or breakdown through the app as soon as it is safe to. See [Safety](/safety) and [Damage and claims](/damage-and-claims).

## Reviews and messages

- Reviews are moderated before they are published, and both sides' reviews appear together.
- We remove content that breaks these guidelines, including reviews that are abusive, off-topic or about a trip that didn't happen.

## If someone breaks the guidelines

Report it from the trip or the member's profile, or [contact us](/contact). Depending on how serious it is, we may issue a warning, restrict or suspend an account, remove a listing or review, cancel upcoming bookings, or permanently remove a member from Rento Vroom.
`,
  },
  {
    path: '/refund-policy',
    label: 'Refund policy',
    live: 'refunds',
    markdown: `# Refund policy

This page explains when money comes back to you. It works alongside the [Cancellation policy](/cancellation-policy), which sets what a Guest is refunded when they cancel.

## When a Guest cancels

The refund depends on the cancellation tier on the listing and how long before pickup the Guest cancels. The tiers in force are shown at the top of this page, and every listing shows its tier before you book. The tier's refund applies to the rental and the service fee. Any delivery fee and protection are always refunded in full. The refund goes back to the card used for the booking. A request the Host hasn't answered yet can be withdrawn at no cost.

## When a Host cancels

If a Host cancels a confirmed booking, the Guest is refunded in full. We will also help the Guest look for another car. Hosts who cancel often may be restricted. Any fee a Host owes for cancelling is shown to the Host before they cancel.

## When a booking isn't accepted or expires

For a request (a car that isn't Instant Book), your card is authorised and the Host has 24 hours to accept. If they decline or don't answer, the authorisation is released and you aren't charged.

## Returning a car early

Unused days are not refunded when a car comes back early. This is shown to you at booking.

## Protection and fees

Delivery fees and protection are always refunded in full when a booking is cancelled. The exact amounts are on your booking receipt.

## A car that isn't as described, or a trip that can't go ahead

If a car is not as described, is unsafe, breaks down through no fault of the Guest, or the Host doesn't hand it over, [contact us](/contact) as soon as you can, with your booking reference and photos. We review the evidence from both sides and may refund all or part of the booking, or help you find another car. Our team tells you what was decided and why.

## How long a refund takes

Refunds are returned to the original card. When they reach your account depends on your bank.

## Questions

See the [Help centre](/help) or [contact us](/contact).
`,
  },
  {
    path: '/vehicle-eligibility',
    label: 'Vehicle eligibility',
    live: 'vehicle',
    markdown: `# Vehicle eligibility requirements

To list a car on Rento Vroom it has to be safe, legal to drive in New Zealand and described honestly. The documents and photos we ask for are shown at the top of this page.

## The car must

- Be registered and have a current Warrant of Fitness (WOF) or Certificate of Fitness (CoF), where the vehicle needs one.
- Be roadworthy, with working lights, brakes, tyres and seatbelts.
- Have its road user charges (RUC) up to date where the vehicle needs them.
- Be listed by its owner, or by someone with the owner's written consent.
- Carry the Host's own insurance details, as we ask when you list.

## Listing information

- Clear photos from every required angle, at or above the minimum size.
- The vehicle's identification number (VIN) or chassis number.
- An accurate description of its seats, doors, fuel or power type, features and any limits, such as mileage.
- A daily price within the range the platform allows.

## Checks and changes

Our team checks documents by hand. We may ask for more information, pause or remove a listing that is out of date, unsafe or not as described. A Host must update the listing if the car's condition, WOF, registration or insurance changes.

## What we don't accept

We may refuse a car that doesn't meet these rules, or that is unsafe or unsuitable. See [Prohibited uses](/prohibited-uses) for how cars may not be used.
`,
  },
  {
    path: '/driver-eligibility',
    label: 'Driver eligibility',
    live: 'driver',
    markdown: `# Driver eligibility requirements

Everyone who drives a Rento Vroom car has to be allowed to. The current rules are shown at the top of this page, and they are checked again at booking.

## Who can book

- The Guest must meet the age and driving experience shown above.
- The licence must be one we accept (listed above). An overseas licence not in English needs an International Driving Permit or an approved translation, where shown above.
- The licence must be valid, in the Guest's name, and not suspended or restricted in a way that stops them driving the car.

## Identity checks

Before a first booking, a Guest verifies their identity, and a phone number and email address are confirmed. We may ask for more information at any time. Hosts verify their identity too. Our team checks licences and documents by hand.

## One driver per booking

A booking has one driver: the Guest who booked. Other people must not drive the car, even if they are licensed.

## Keeping your details current

Tell us if your licence is suspended, restricted or changes. Driving without a valid licence breaks the [Guest agreement](/guest-agreement) and may leave you without protection.
`,
  },
  {
    path: '/payment-and-fees',
    label: 'Payment and fees',
    live: 'fees',
    markdown: `# Payment and fees policy

This page explains how money moves through Rento Vroom. All prices are in New Zealand dollars (NZD).

## What a Guest pays

- The rental price, set by the Host, for the trip's dates.
- A Guest service fee, shown above and itemised at checkout.
- A protection plan, chosen at booking. See [Insurance and protection](/insurance).
- Any delivery or extra charges the listing allows.

The total, with GST where it applies, is shown before you pay and on your receipt.

## What a Host earns

A Host receives the rental price less our commission, shown above. A Host's share is released after the trip starts, once check-in is done, and a payout can be held while an incident or payment dispute on the trip is open. See the host payout article in the [Help centre](/help) for how and when.

## How payment works

Cards are processed securely by Stripe. We don't see or store your full card number. Rento Vroom currently pays the card processing fees, so they don't appear in your total.

## GST and receipts

Receipts show the GST rate above and the name of the business that issued them. Where the business is registered for GST, its GST number appears on the receipt.

## Charges after a trip

After a trip a Host or our team may add a charge, for example for extra kilometres, fuel, cleaning, a late return, or a toll or fine from the trip. See [Late returns and additional charges](/late-returns-and-charges). Each charge is shown to the Guest with the reason and the evidence.

## Disputed card payments

If a payment is disputed with your bank, please [contact us](/contact) first so we can fix it quickly. While a payment dispute is open we may pause the related booking payout and restrict the account until it is resolved.

## Problems with a payment

If a payment fails or you think you've been charged wrongly, [contact us](/contact) with your booking reference.
`,
  },
  {
    path: '/damage-and-claims',
    label: 'Damage and claims',
    live: 'excess',
    markdown: `# Damage and claims policy

Accidents and damage happen. This page explains what to do and how we deal with it. For full protection details see [Insurance and protection](/insurance).

## What to do straight away

1. Make sure everyone is safe, and call 111 if anyone is hurt or in danger.
2. Take photos of the damage, the scene and any other vehicles.
3. Report it in the app: open the trip and choose Report an incident. Your report reaches our team with your booking attached, and you get a case reference.
4. Tell the Host. Don't agree to pay or accept blame at the scene.

## Reporting window

Damage should be reported as soon as it's found, and within the damage report window set in our trip rules. Photos at check-in and check-out are the main evidence, so please take them.

## How a claim is handled

- We review the check-in and check-out photos, messages and any other evidence from both sides.
- The protection plan chosen at booking sets the most a Guest pays towards a covered claim (the excess), shown above.
- We tell both sides what we decided, and the reasons.

## Host claims

A Host who reports damage must attach photos taken at check-in and check-out, a description of the damage, and any repair quote or receipt. Claims without supporting evidence may be declined.

## Who pays

- **Covered damage.** The Guest pays up to the excess of the protection plan they chose. The excess is the most they pay towards a covered claim.
- **Damage that isn't covered.** If damage is outside the protection plan, for example because the car was used in a way our [Prohibited uses](/prohibited-uses) don't allow, the Guest may be responsible for the cost of repair.
- **Damage that was already there.** A Guest isn't responsible for damage shown in the check-in photos.

## If you disagree

You can ask for a decision to be reviewed by [contacting us](/contact) with your case reference and any extra evidence.
`,
  },
  {
    path: '/security-deposit',
    label: 'Security deposit',
    markdown: `# Security deposit policy

## Our current position

Rento Vroom does not currently take a security deposit. A Guest isn't asked to put an amount on hold on their card when booking.

If a deposit is introduced, this page will say how much it is, when it's held, when it is released and what it can be used for, and bookings made before then won't be affected.

## Instead of a deposit

- The protection plan you choose sets the most you would pay towards a covered claim. See [Insurance and protection](/insurance).
- Charges for things like extra distance, fuel, cleaning or a late return can be added after a trip, with evidence. See [Late returns and additional charges](/late-returns-and-charges).

## Questions

[Contact us](/contact) if you want to know how a charge on your card works.
`,
  },
  {
    path: '/prohibited-uses',
    label: 'Prohibited uses',
    markdown: `# Prohibited vehicle uses

A Guest must use the car lawfully and as the listing allows. Some uses can put people at risk or void protection, and they aren't allowed.

## You must not

- Drive without a valid licence, or let anyone else drive.
- Drive while affected by alcohol, drugs or fatigue, or use a phone while driving.
- Break the road rules, or take part in racing, speed trials, stunts or drifting.
- Use the car for a crime, or carry illegal goods.
- Take the car outside New Zealand.
- Drive off a sealed road, or on a beach or river bed, unless the listing allows it.
- Take the car on an interisland ferry unless the listing allows it.
- Tow, or carry loads beyond what the vehicle is designed for.
- Sublet the car, or use it to carry passengers or goods for payment (for example rideshare or courier work), unless the listing says so.
- Smoke or vape in the car, or carry animals, unless the listing allows it.
- Change or damage the car, or tamper with its tracking, if it has any.

## What happens if you do

Breaking these rules can end the rental, lead to charges and may leave you without protection. See the [Guest agreement](/guest-agreement) and [Damage and claims](/damage-and-claims).
`,
  },
  {
    path: '/late-returns-and-charges',
    label: 'Late returns and charges',
    markdown: `# Late returns and additional charges

## Returning on time

Return the car at the time and place you agreed, with the fuel level and cleanliness the listing sets. Do the check-out photos with the Host.

## If you're running late

Message your Host straight away. We give a short grace period past the return time. After that we remind you, tell the Host, and the Host can report a late return. If a car is more than a day overdue, our team steps in to complete the trip.

## Extending a trip

Ask your Host to agree to a longer trip before the end time, so the price and availability are handled properly. Any change is confirmed in writing through the app.

## Charges that can follow a trip

- **Late return.** A charge may apply for a late return, under the [Guest agreement](/guest-agreement). Our team sets the amount for the delay and tells you before it is charged.
- **Extra distance.** If the listing has a distance limit, kilometres above it can be charged at the rate on the listing. Large amounts are checked by our team before being charged.
- **Fuel.** If the car comes back with less fuel than the listing requires, the cost of refuelling can be charged, with any administration fee we tell you about.
- **Cleaning.** If the car needs more than a normal clean.
- **Tolls, fines and tickets.** You pay every toll, traffic fine, parking ticket and infringement notice from your trip, from pickup to check-out. If a notice reaches the Host, they report it with the notice attached. We may pass your driver details to the issuing authority so the notice is redirected to you, or charge the amount of the notice to your card on file.

Each charge is shown to the Guest with the reason and the evidence, such as odometer readings and photos. You can dispute a charge by [contacting us](/contact).
`,
  },
];

export function policyDocumentFor(path: string): PolicyDocument | undefined {
  const normalised = path.length > 1 ? path.replace(/\/+$/, '') : path;
  return policyDocuments.find((document) => document.path === normalised);
}
