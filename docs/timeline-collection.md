# Timeline collection

All activity producers must use `api.postTimelineEntry`, which delegates to the
shared local `postAdmittedTimeline` helper. The helper captures the event time
before reading the signed-in account’s fresh collection preference. Off, missing,
unknown, denied or pre-interval state sends no payload. Enabled events carry the
exact `collection_revision` returned by the platform.

Capture the action timestamp before awaiting locale/header lookup, and pass it
unchanged to admission. Emitters accept an optional original timestamp when a
caller already knows it; never replace that timestamp after asynchronous work.

Do not cache consent, persist pending Timeline payloads, or retry rejected events
after re-enable. Preserve original event times. App-owned records are separate
from optional Timeline collection. The platform independently enforces permission,
account admission and collection at commit; a producer precheck is not authority.

`tests/timeline-consent.spec.mjs` covers denied/off/unknown/old-interval behavior
and exact-revision submission without retry.
`tests/timeline-localization-consent.spec.mjs` delays the real emitters' locale
lookup across a consent change and verifies original-timestamp admission.
Installed journeys and update or recovery compatibility require separate runtime
acceptance.
