// scripts/switch-env.mjs
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const mode = process.argv[2]; // 'development' ou 'production'
if (!mode) {
  console.error("Uso: node scripts/switch-env.mjs <dev|prod>");
  process.exit(1);
}

const from = path.join(root, `.env.${mode}`);
const to = path.join(root, `.env`);

if (!fs.existsSync(from)) {
  console.error(`Arquivo ${from} não encontrado. Crie-o antes de continuar.`);
  process.exit(1);
}

fs.copyFileSync(from, to);
console.log(`✅ .env atualizado a partir de ${path.basename(from)}`);
