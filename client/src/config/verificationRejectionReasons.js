/** Preset decline reasons — keep in sync with server/verificationReasons.js */
export const VERIFICATION_REJECTION_REASONS = [
  { id: "id_not_clear", label: "ID image is not clear or readable" },
  { id: "id_looks_fake", label: "ID looks altered or not genuine" },
  { id: "id_name_mismatch", label: "Name on ID does not match profile" },
  { id: "social_not_found", label: "Social profile could not be found" },
  { id: "social_no_activity", label: "Social profile has no posts or activity" },
  { id: "social_mismatch", label: "Social profile does not match seller identity" },
  { id: "phone_invalid", label: "Phone number could not be verified" },
  { id: "incomplete_submission", label: "Submission was incomplete" },
  { id: "other", label: "Other (custom note)" },
];
