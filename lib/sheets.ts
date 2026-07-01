import { google } from "googleapis";

const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
const privateKey = process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n");

function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

export async function getValues(range: string) {
  const sheets = getSheetsClient();
  const cacheKey = range;
  const now = Date.now();
  const cached = valuesCache.get(cacheKey);
  if (cached && now - cached.ts < 30000) return cached.data; // 30s cache
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const data = res.data.values ?? [];
  valuesCache.set(cacheKey, { data, ts: now });
  return data;
}

// Simple in-memory cache to avoid exceeding Sheets API quota
const valuesCache = new Map<string, { data: string[][]; ts: number }>();

// Call this to bust cache after writes
export function clearCache() {
  valuesCache.clear();
}

export async function updateValues(range: string, values: (string | number)[][]) {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId, range, valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
  clearCache();
}

export async function appendValues(range: string, values: (string | number)[][]) {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId, range, valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });
  clearCache();
}

export function rowsToObjects(rows: string[][]) {
  if (rows.length < 2) return [];
  const [headers, ...data] = rows;
  return data.map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, i) => { obj[header] = row[i] ?? ""; });
    return obj;
  });
}

export async function getConfigMap() {
  const rows = await getValues("Config!A:B");
  const objs = rowsToObjects(rows as string[][]);
  const map: Record<string, string> = {};
  objs.forEach((r) => { map[String(r.Key).trim()] = r.Value ?? ""; });
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

// Players sheet actual columns:
// A:PlayerID  B:Name  C:Role  D:Line  E:Status  F:MaxConsecutive  G:Priority  H:Notes
export async function getPlayers() {
  const rows = (await getValues("Players!A:H")) as string[][];
  return rowsToObjects(rows);
}

// Points sheet actual columns (your existing + new ones we append):
// A:PointID  B:PointNumber  C:LineType  D:PossessionType  E:PlayersCSV
// F:StartTime  G:EndTime  H:DurationSec  I:Result  J:ScoreUsAfter
// K:ScoreThemAfter  L:Status  M:Notes  N:GameDay
// NEW cols we add: O:SetPlay  P:SetPlaySuccess  Q:GameID
export async function getPoints() {
  const rows = (await getValues("Points!A:Q")) as string[][];
  return rowsToObjects(rows);
}

// Games sheet actual columns:
// A:GameID  B:GameName  C:Date  D:Opponent  E:Tournament
// F:ScoreUs  G:ScoreThem  H:Status  I:Notes
// NEW col we add: J:EndTime
export async function getGames() {
  const rows = (await getValues("Games!A:J")) as string[][];
  return rowsToObjects(rows);
}
