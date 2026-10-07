import type { components, paths } from './schema';

/**
 * Names for the API shapes the website uses. They all come from schema.d.ts, which
 * `npm run api:types` generates from the backend's openapi.json (plan §2.3), so they can't drift.
 */
type Schemas = components['schemas'];

export type SessionUser = Schemas['PublicUser'];
export type Role = SessionUser['roles'][number];
/** A legal document a user accepts: TERMS, PRIVACY, GUEST or HOST (agreement). */
export type AgreementType = SessionUser['pendingAgreements'][number];
export type LoginRequest = paths['/auth/login']['post']['requestBody']['content']['application/json'];
export type SignupRequest = paths['/auth/signup']['post']['requestBody']['content']['application/json'];
export type AdminOverview = Schemas['AdminOverview'];
/** A staff member's authenticator app setup: a QR code and the key to type by hand. */
export type MfaSetup = Schemas['MfaSetupResponse'];
/** A staff member's two-factor sign-in: whether it's on, and their authenticator apps (up to two). */
export type MfaStatus = Schemas['MfaStatus'];
export type MfaDevice = Schemas['MfaDevice'];
/** The admin, the support team and the invitations not yet accepted (plan §6.2). */
export type StaffList = Schemas['StaffList'];
export type StaffMember = Schemas['StaffMember'];
export type StaffInvite = Schemas['StaffInvite'];
export type StaffInviteInput =
  paths['/admin/staff/invites']['post']['requestBody']['content']['application/json'];
/** Who a support team invitation is for, shown before they choose a password. */
export type StaffInviteDetails = Schemas['StaffInviteDetails'];
/** Everything an admin can change on the Platform settings tab (plan §3 `platformSettings`, §16). */
export type PlatformSettings = Schemas['PlatformSettings'];
export type PlatformSettingsResponse = Schemas['PlatformSettingsResponse'];
export type PlatformSettingsUpdate = Schemas['PlatformSettingsUpdate'];
/** One of the client's decisions, each PENDING until an admin marks it confirmed. */
export type DecisionKey = keyof PlatformSettings['decisions'];
/** The day's exchange rates per NZ$1, for estimates in other currencies. */
export type ExchangeRates = Schemas['ExchangeRates'];
/** A NZ$1 sandbox payment from the staff portal, and how it went. */
export type TestPayment = Schemas['TestPayment'];
export type TestPaymentStatus = Schemas['TestPaymentStatus'];

// Search and listings (Phase 2).
/** One suggestion for the "Where are you going?" field: one of our places, or a street address. */
export type PlaceSuggestion = Schemas['PlaceSuggestion'];
export type PlaceDetails = Schemas['PlaceDetails'];
export type SearchParams = NonNullable<paths['/search']['get']['parameters']['query']>;
export type SearchResults = Schemas['SearchResults'];
/** A car in search results, Browse Cars, featured cars and destination pages. */
export type VehicleCard = Schemas['VehicleCard'];
export type VehicleMakes = Schemas['VehicleMakes'];
export type Rating = Schemas['Rating'];
export type VehicleDetail = Schemas['VehicleDetail'];
export type PublicHost = Schemas['PublicHost'];
export type VehicleCompliance = Schemas['VehicleCompliance'];
export type DeliveryOptionSummary = Schemas['DeliveryOptionSummary'];
export type ProtectionPlanSummary = Schemas['ProtectionPlanSummary'];
export type VehicleAvailability = Schemas['VehicleAvailability'];
export type VehicleReviews = Schemas['VehicleReviews'];
export type VehicleReview = Schemas['VehicleReview'];
export type QuoteRequest = Schemas['QuoteRequest'];
/** The price breakdown for chosen dates and options, and anything in the way. */
export type Quote = Schemas['Quote'];
export type LineItem = Schemas['LineItem'];
export type TripProblem = Schemas['TripProblem'];
/** Where to deliver the car: a structured NZ address with its coordinates. */
export type DeliveryAddress = NonNullable<QuoteRequest['deliveryAddress']>;
/** A structured NZ address (plan §3): unit, street number and name, suburb, city, region, postcode. */
export type NzAddressInput = NonNullable<PlaceDetails['address']>;

// Public content (Phase 2).
export type DestinationSummary = Schemas['DestinationSummary'];
export type DestinationDetail = Schemas['DestinationDetail'];
export type LegalPage = Schemas['LegalPage'];
export type Faq = Schemas['Faq'];
/** Fees, cancellation tiers, protection plans and listing rules in force. */
export type PublicPolicies = Schemas['PublicPolicies'];
export type CancellationTier = PublicPolicies['cancellation']['tiers'][number];
export type FeaturedReviews = Schemas['FeaturedReviews'];
export type ContactRequest = Schemas['ContactRequest'];
/** The ids of the cars the user saved with the heart. */
export type Favourites = Schemas['Favourites'];
export type LastSearch = Schemas['LastSearch'];

// Hosting (Phase 2).
export type HostProfile = Schemas['HostProfile'];
export type HostApplicationRequest = Schemas['HostApplicationRequest'];
/** One of the Host's own cars, with everything they can edit and what's missing. */
export type HostVehicle = Schemas['HostVehicle'];
export type HostVehicleSummary = Schemas['HostVehicleSummary'];
export type VehiclePatch = Schemas['VehiclePatch'];
export type ListingChecklist = Schemas['ListingChecklist'];
export type DeliveryOptionInput = Schemas['DeliveryOptionInput'];
export type AddressWithPoint = Schemas['AddressWithPoint'];
export type PhotoAttach = Schemas['PhotoAttach'];
export type DocumentAttach = Schemas['DocumentAttach'];
export type UploadRequest = Schemas['UploadRequest'];
export type UploadTarget = Schemas['UploadTarget'];
export type HostCalendar = Schemas['HostCalendar'];
export type CalendarBlock = Schemas['CalendarBlock'];
export type BlockInput = Schemas['BlockInput'];
export type RecurringRulesInput = Schemas['RecurringRulesInput'];
export type RecurringResult = Schemas['RecurringResult'];
export type NotificationItem = Schemas['NotificationItem'];
export type Notifications = Schemas['Notifications'];

// Staff approval queues (Phase 2).
export type HostApplication = Schemas['HostApplication'];
export type ReviewQueueItem = Schemas['ReviewQueueItem'];
export type AdminVehicle = Schemas['AdminVehicle'];

// Booking flow (Phase 2).
export type CreateBookingRequest = Schemas['CreateBookingRequest'];
/** A booking as the signed-in user sees it: as the Guest, the Host or staff. */
export type Booking = Schemas['Booking'];
export type BookingSummary = Schemas['BookingSummary'];
export type PaymentSession = Schemas['PaymentSession'];
export type CancellationPreview = Schemas['CancellationPreview'];
/** What checkout's verification step still needs: mobile, licence details and eligibility. */
export type CheckoutReadiness = Schemas['CheckoutReadiness'];
export type DriverLicenceInput = Schemas['DriverLicenceInput'];

// Guest dashboard (Phase 3).
/** The Saved cars page: each car, priced for the last searched dates when it can be booked for them. */
export type SavedCars = Schemas['SavedCars'];
export type SavedCar = Schemas['SavedCar'];
/** A card saved with Stripe for checkout and post-trip charges. */
export type SavedCard = Schemas['SavedCard'];
export type PaymentHistoryItem = Schemas['PaymentHistoryItem'];
/** The GST receipt for a paid booking. */
export type Receipt = Schemas['Receipt'];
/** Whether the account can be closed now, and what stops it. */
export type AccountClosure = Schemas['AccountClosure'];
export type PrivacyRequest = Schemas['PrivacyRequest'];
export type PrivacyRequestResponse = Schemas['PrivacyRequestResponse'];
export type SupportTicketSummary = Schemas['SupportTicketSummary'];
/** One of the user's own support tickets, with its replies. */
export type SupportTicket = Schemas['SupportTicket'];
export type HelpArticleSummary = Schemas['HelpArticleSummary'];
export type HelpArticle = Schemas['HelpArticle'];
