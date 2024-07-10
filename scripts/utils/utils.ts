export function generateRandomString(length: number): string {
  let result = '';
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  const charactersLength = characters.length;

  for (let i = 1; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
}

export function makeArrayFromRange(startNumber: number, endNumber: number): number[] {
  const data: number[] = [];
  for (let i = startNumber; i <= endNumber; i++) {
    data.push(i);
  }

  return [...new Set(data)];
}
