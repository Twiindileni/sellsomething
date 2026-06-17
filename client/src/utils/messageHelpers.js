const STORAGE_PREFIX = "ss_message_read_";

export function messageThreadKey({ product, employee, otherUser }) {
  const otherId = otherUser?.id;
  if (!otherId) return "";
  if (employee?.id) return `emp_${employee.id}_${otherId}`;
  if (product?.id) return `prod_${product.id}_${otherId}`;
  return "";
}

export function getMessageReadState(userId) {
  if (!userId) return {};
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function markThreadRead(userId, threadKey) {
  if (!userId || !threadKey) return;
  const state = getMessageReadState(userId);
  state[threadKey] = new Date().toISOString();
  localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(state));
}

export function countUnreadInThread(messages, userId, threadKey, readState) {
  if (!userId || !threadKey || !Array.isArray(messages)) return 0;
  const lastRead = readState[threadKey] ? new Date(readState[threadKey]) : null;
  return messages.filter((m) => {
    if (m.receiver_id !== userId) return false;
    if (!lastRead) return true;
    return new Date(m.created_at) > lastRead;
  }).length;
}
