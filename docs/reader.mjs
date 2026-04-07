import xlsx from 'xlsx';

const workbook = xlsx.readFile('d:/AI_Lap/QLPhongTro/docs/TT người trọ.xlsx');
const sheetName = workbook.SheetNames[0];
const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
console.log(JSON.stringify(data, null, 2));
