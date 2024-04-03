import crypto from 'k6/crypto';

export function rand(max: number): number {
  return Math.floor(Math.random() * max) + 1;
}

export function generateRandomString(length: number): string {
  let result = '';
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  const charactersLength = characters.length;

  for (let i = 1; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
}

export function generateRandomNumber(min: number = 0, max: number = 999999): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function makeArrayFromRange(startNumber: number, endNumber: number): number[] {
  const data: number[] = [];
  for (let i = startNumber; i <= endNumber; i++) {
    data.push(i);
  }

  return [...new Set(data)];
}

export function generateActorID(data: {
  idInInstance: number;
  idInTest: number;
  iterationInInstance: number;
  iterationInScenario: number;
}): number {
  const { idInInstance, idInTest, iterationInInstance, iterationInScenario } = data;
  // Concatenate the parameters into a string
  const concatenatedString = `${idInInstance}${idInTest}${iterationInInstance}${iterationInScenario}`;

  const hash = crypto.sha256(concatenatedString, 'hex');

  // Convert the hash to an integer within the range [1, 4000]
  const actorID = (parseInt(hash, 16) % 4000) + 1;

  return actorID;
}
