import fs from "fs-extra";
import { parse, parseFile } from "fast-csv";

function HandleRank() {
  const list = fs
    .readFileSync("raw/bnc15000.dsl")
    .toString()
    .replaceAll("\n\t", ",")
    .split("\n")
    .filter((item) => {
      return item.indexOf(",Rank") !== -1;
    })
    .map((item) => {
      const x = item.split(",");
      if (x.length !== 2) {
        console.log(item);
        throw item;
      }
      return [
        x[0].trim(),
        parseInt(x[1].replace("Rank\\[", "").replace("\\]", "").trim()),
      ];
    })
    .map((item) => item[0]);

  fs.writeJSONSync("public/dataBNC15000En.json", list);
}

function HandleLemma() {
  const list: Array<[string, string[]]> = fs
    .readFileSync("raw/lemma.en.txt")
    .toString()
    .split("\n")
    .filter((i) => i.trim() !== "" && !i.startsWith(";"))
    .map((i) => {
      if (i.indexOf(" -> ") == -1) {
        console.log("wrong:" + i);
        throw "wrong:" + i;
      }
      const [word, others] = i.split(" -> ");
      return [word.split("/")[0], others.split(",").map((i) => i.trim())];
    });

  const array = list.reduce<Array<[string, string]>>((prev, [word, others]) => {
    prev.push(...others.map<[string, string]>((i) => [i, word]));
    return prev;
  }, []);
  console.log(array);

  fs.writeJSONSync("public/data/lemma.en.json", list);
}

function getCSVData() {
  type Data = Array<{word:string, translation:string}>
  return new Promise<Data>((resolve, reject) => {
    const data: Data = [];
    parseFile("raw/EnWords.csv", { headers: true })
      .on("error", (error) => reject(error))
      .on("data", (row) => data.push(row))
      .on("end", (rowCount: number) => resolve(data));
  });
}
async function HandleTranslation() {
  const data = await getCSVData();
  fs.writeJSONSync("public/data/translation.json", data.map(i=>[i.word, i.translation]));
}
HandleTranslation();
