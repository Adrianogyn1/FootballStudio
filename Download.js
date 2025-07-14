// Classe Resultado
class Resultado {
  constructor({ horario, home, away, resultado, troca_de_baralho }) {
    this.horario = horario;
    this.home = home;
    this.away = away;
    this.resultado = resultado;
    this.troca_de_baralho = troca_de_baralho;
  }

  equals(other) {
    return other && this.horario === other.horario;
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

const fs = require("fs");
const https = require("https");
const path = require("path");

const url = "https://app.ingridfs.com/inc/historico.php";
const outputDir = "data";
fs.mkdirSync(outputDir, { recursive: true });

https.get(url, (res) => {
  let data = "";

  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    try {
      const json = JSON.parse(data);
      const porDia = {};

      const resultados = json.map((item) => new Resultado(item));

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
        for (const r of todos) {
          unicosMap.set(r.horario, r);
        }
        const unicos = Array.from(unicosMap.values()).sort(
          (a, b) => new Date(a.horario) - new Date(b.horario)
        );

        fs.writeFileSync(
          caminho,
          JSON.stringify(unicos.map((r) => r.toJSON()), null, 2)
        );

        console.log(`Atualizado: ${nome} (${unicos.length} registros únicos)`);
      }

      // Gerar lista.json com todos os arquivos da pasta data
      const arquivos = fs.readdirSync(outputDir)
        .filter(nome => nome.endsWith(".json") && nome !== "lista.json");

      const listaPath = path.join(outputDir, "lista.json");
      fs.writeFileSync(listaPath, JSON.stringify(arquivos, null, 2), "utf8");
      console.log(`Gerado: lista.json com ${arquivos.length} arquivos.`);

    } catch (e) {
      console.error("Erro ao processar JSON:", e);
      process.exit(1);
    }
  });
}).on("error", (err) => {
  console.error("Erro ao baixar JSON:", err);
  process.exit(1);
});
