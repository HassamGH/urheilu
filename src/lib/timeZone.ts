// Every viewer sees Pakistan Standard Time, regardless of where they are or what timezone the
// server process runs in — both because the audience is expected to be viewing from Pakistan, and
// because a per-viewer/per-runtime timezone can't produce identical output between SSR and
// hydration (Node's server process and a viewer's browser don't share a timezone), which is what
// was actually surfacing as React hydration mismatches before this was pinned.
export const DISPLAY_TIME_ZONE = 'Asia/Karachi';
