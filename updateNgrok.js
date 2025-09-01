const fs = require("fs");
const path = require("path");
const ngrok = require("ngrok");
const simpleGit = require("simple-git");

async function run() {
  try {
    // 1️⃣ Conecta no ngrok na porta do backend
    const url = await ngrok.connect(3000);
    console.log("✅ Nova URL ngrok:", url);

    // 2️⃣ Caminho do index.html
    const indexPath = path.join(__dirname, "public", "index.html"); // ajuste se necessário
    let indexHtml = fs.readFileSync(indexPath, "utf-8");

    // 3️⃣ Substitui placeholder pela nova URL
    const newIndexHtml = indexHtml.replace(/NGROK_URL_PLACEHOLDER/g, url);
    fs.writeFileSync(indexPath, newIndexHtml);
    console.log("✅ index.html atualizado com a nova URL!");

    // 4️⃣ Git: commit e push forçado
    const git = simpleGit();

    await git.add(indexPath);
    await git.commit("chore: update ngrok url");
    await git.push("origin", "main", { "--force": null });
    console.log("✅ Mudança enviada pro GitHub com sucesso!");

  } catch (err) {
    console.error("❌ Erro no updateNgrok.js:", err);
  }
}

run();
