# My works: a media-first gallery

The user requested the prompt-library card treatment for real history: image or
video preview first, a short prompt underneath, not full-height text columns.

Use a restrained white/navy gallery consistent with the existing library.
Uniform 4:3 covers display the first saved result without cropping image artwork.
Videos show a muted first-frame preview and a play affordance; opening the card
uses the existing full task viewer, never starts another generation.

Keep model, two-line prompt excerpt, creation time, dimensions and true status.
The complete prompt/settings remain in the existing record. Add small all/image/
video filters and responsive four/three/two/one-column layout.

Read existing OSS URLs, inline fallback images and owner-scoped local blobs.
Expired, missing, failed and running records get explicit placeholders. Release
owned object URLs on unmount. Switching keys immediately hides the old owner's
cards. Do not migrate, delete or rewrite user history, storage or credentials.

Verify component behavior with real local-store tests; verify media rendering,
long prompts, keyboard/card activation and responsive layouts with isolated
browser fixtures. No paid generation is needed for this presentation change.
