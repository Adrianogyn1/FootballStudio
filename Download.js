const fs = require("fs");
const https = require("https");
const path = require("path");

class Resultado {
  constructor({ horario, home, away, resultado, troca_de_baralho }) {
    this.horario = horario;
    this.home = home;
    this.away = away;
    this.resultado = resultado;
    this.troca_de_baralho = troca_de_baralho;
  }

  toJSON() {
    return {
      horario: this.horario,
      home: this.home,
      away: this.away,
      resultado: this.resultado,
      troca_de_baralho: this.troca_de_baralho,
    };
  }
}

function baixarJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";

      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    }).on("error", (err) => reject(err));
  });
}

async function executar() {
  const url = "https://app.ingridfs.com/inc/historico.php";
  const outputDir = "data";
  fs.mkdirSync(outputDir, { recursive: true });

  try {
    const data = await baixarJson(url);
    const json = JSON.parse(data);
    const resultados = json.map((item) => new Resultado(item));
    console.log(`Total de registros baixados: ${resultados.length}`);

    // Backup bruto
    const backupFile = `backup_${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`;
    fs.writeFileSync(path.join(outputDir, backupFile), JSON.stringify(json, null, 2));

    // Agrupar por data
    const porDia = {};
    for (const resultado of resultados) {
      const [dataStr] = resultado.horario.split(" ");
      const [ano, mes, dia] = dataStr.split("-");
      const nomeArquivo = `resultado_${dia}_${mes}_${ano}.json`;

      if (!porDia[nomeArquivo]) porDia[nomeArquivo] = [];
      porDia[nomeArquivo].push(resultado);
    }

    for (const nome in porDia) {
      const caminho = path.join(outputDir, nome);

      let existentes = [];
      if (fs.existsSync(caminho)) {
        try {
          const existentesJson = JSON.parse(fs.readFileSync(caminho, "utf8"));
          existentes = existentesJson.map((item) => new Resultado(item));
        } catch {}
      }

      const todos = [...existentes, ...porDia[nome]];
      const unicosMap = new Map();
      for (const r of todos) unicosMap.set(r.horario, r);

      const unicos = Array.from(unicosMap.values()).sort(
        (a, b) => new Date(a.horario) - new Date(b.horario)
      );

      fs.writeFileSync(
        caminho,
        JSON.stringify(unicos.map((r) => r.toJSON()), null, 2)
      );

      console.log(`Atualizado: ${nome} (${unicos.length} registros únicos)`);
    }
/*
    const outputDir = "data";

// Depois de salvar todos os arquivos JSON na pasta `data`...

// Lê todos os arquivos JSON da pasta
const arquivos = fs.readdirSync(outputDir)
  .filter(nome => nome.endsWith(".json"));

// Salva a lista em um arquivo `lista.json` na mesma pasta
fs.writeFileSync(
  path.join(outputDir, "lista.json"),
  JSON.stringify(arquivos, null, 2),
  "utf8"
);*/

  } catch (err) {
    console.error("Erro ao baixar ou processar:", err.message);
    process.exit(1);
  }
}

executar();
