
const fs = require("fs");
const https = require("https");
const path = require("path");

const url = "https://app.ingridfs.com/inc/historico.php";
const outputDir = "data";
fs.mkdirSync(outputDir, { recursive: true });

const idPath = path.join(outputDir, "ultima_jogada.txt");
let jogadaId = fs.existsSync(idPath) ? parseInt(fs.readFileSync(idPath)) : 1;

https.get(url, (res) => {
  let data = "";
  res.on("data", (chunk) => data += chunk);
  res.on("end", () => {
    try {
      const json = JSON.parse(data);
      let buffer = [];

      for (const item of json) {
        buffer.push(item);

        if (item.troca_de_baralho === true) {
          if (buffer.length > 1) {
            const filename = path.join(outputDir, `jogada_${jogadaId}.json`);
            fs.writeFileSync(filename, JSON.stringify(buffer.slice(0, -1), null, 2));
            jogadaId++;
            fs.writeFileSync(idPath, jogadaId.toString());
          }
          buffer = [item];
        }
      }

      fs.writeFileSync(path.join(outputDir, "temporario.json"), JSON.stringify(buffer, null, 2));
    } catch (e) {
      console.error("Erro ao processar JSON:", e);
    }
  });
}).on("error", (err) => {
  console.error("Erro ao baixar JSON:", err);
});
