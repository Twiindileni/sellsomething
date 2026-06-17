/** Preset decline reasons — keep in sync with client/src/config/verificationRejectionReasons.js */
const VERIFICATION_REJECTION_REASONS = [
  { id: "id_not_clear", label: "ID image is not clear or readable — please upload a sharper photo." },
  { id: "id_looks_fake", label: "ID document could not be verified — it may appear altered or not genuine." },
  { id: "id_name_mismatch", label: "Name on your ID does not match your profile name." },
  { id: "social_not_found", label: "We could not find the social media profile you provided." },
  { id: "social_no_activity", label: "Social media profile has little or no activity — we need an active seller presence." },
  { id: "social_mismatch", label: "Social profile does not appear to belong to you or match your listing identity." },
  { id: "phone_invalid", label: "Phone number could not be verified — please use a working Namibian cellphone." },
  { id: "incomplete_submission", label: "Submission was incomplete — please resubmit with all required details." },
  { id: "other", label: "Other (see note below)" },
];

function getRejectionReasonLabel(code) {
  return VERIFICATION_REJECTION_REASONS.find((r) => r.id === code)?.label || null;
}

function resolveRejectionReason(code, customNote) {
  const trimmedCode = (code || "").trim();
  const note = (customNote || "").trim().slice(0, 500);

  if (!trimmedCode) {
    throw new Error("Please select a decline reason.");
  }

  if (trimmedCode === "other") {
    if (!note) throw new Error("Please enter a decline reason in the note field.");
    return note;
  }

  const preset = getRejectionReasonLabel(trimmedCode);
  if (!preset) throw new Error("Invalid decline reason.");

  return note ? `${preset} Additional note: ${note}` : preset;
}

module.exports = {
  VERIFICATION_REJECTION_REASONS,
  getRejectionReasonLabel,
  resolveRejectionReason,
};
