import { google } from "googleapis";

const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
const privateKey = process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n");

function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

export async function getValues(range: string) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  return res.data.values ?? [];
}

export async function updateValues(range: string, values: (string | number)[][]) {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
}

export async function appendValues(range: string, values: (string | number)[][]) {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
}

export function rowsToObjects(rows: string[][]) {
  if (rows.length < 2) return [];
  const [headers, ...data] = rows;
  return data.map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, i) => {
      obj[header] = row[i] ?? "";
    });
    return obj;
  });
}

export async function getConfigMap() {
  const rows = await getValues("Config!A:B");
  const objs = rowsToObjects(rows as string[][]);
  const map: Record<string, string> = {};
  objs.forEach((r) => {
    map[String(r.Key).trim()] = r.Value ?? "";
  });
  return map;
}

export async function setConfigValue(key: string, value: string | number) {
  const rows = (await getValues("Config!A:B")) as string[][];
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][0] ?? "").trim() === key) {
      await updateValues(`Config!B${i + 1}`, [[value]]);
      return;
    }
  }
  await appendValues("Config!A:B", [[key, value]]);
}

export async function getPlayers() {
  const rows = (await getValues("Players!A:G")) as string[][];
  return rowsToObjects(rows);
}

export async function getPoints() {
  const rows = (await getValues("Points!A:M")) as string[][];
  return rowsToObjects(rows);
}