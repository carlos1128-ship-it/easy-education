async function main() {
  console.log("Seed ignorado: o app usa apenas dados reais por usuario.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
