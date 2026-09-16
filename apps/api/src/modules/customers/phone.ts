export function normalizeVietnamesePhone(value: string): string | null {
  let phone = value.replace(/[^\d+]/g, "");
  if (phone.startsWith("+84")) phone = `0${phone.slice(3)}`;
  if (phone.startsWith("84") && phone.length === 11) phone = `0${phone.slice(2)}`;
  return /^0(3|5|7|8|9)\d{8}$/.test(phone) ? phone : null;
}
