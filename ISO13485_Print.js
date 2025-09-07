/* =========================================================
   ISO 13485 – Relatório (botão Imprimir PDF)
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  // Cria o botão
  const btn = document.createElement("button");
  btn.id = "btnPrint";
  btn.textContent = "Imprimir PDF";
  btn.className = "btn";

  // Onde inserir (footer)
  const footer = document.querySelector(".app-footer");
  if (footer) {
    footer.appendChild(document.createElement("br"));
    footer.appendChild(btn);
  }

  // Ação do botão
  btn.addEventListener("click", () => {
    // Oculta elementos que não devem sair no PDF
    document.querySelectorAll(".float-stack, .filter-sticky").forEach(el => {
      el.classList.add("hidden-print");
    });

    // Chama impressão
    window.print();

    // Reexibe elementos após impressão
    document.querySelectorAll(".hidden-print").forEach(el => {
      el.classList.remove("hidden-print");
    });
  });
});
