# Dev. House — PWA de contratos modelo 2

Esta é uma versão separada do PWA de reservas, com o modelo do PDF de locação por temporada integrado ao gerador.

## Como abrir

- Abra `index.html` para preencher e gerar o contrato em PDF.
- Para instalar como PWA e habilitar o cache, sirva a raiz do projeto em HTTPS ou localhost e acesse `/contratos-v2/`.

## O que o PDF inclui

- As 19 cláusulas do modelo de referência.
- A cláusula 1.1 com o inventário de móveis e utensílios da casa.
- Dados variáveis do locatário, datas, horários, limite de hóspedes, valor do aluguel e autorização de animais.
- Cálculo de TCI de 10%, sinal de 50% do total e saldo para pagamento no check-in.

A TCI, o sinal e o saldo são calculados pelo formulário a partir do valor do aluguel. Os dados bancários/PIX e os dados do imóvel e do locador estão fixados conforme o PDF de referência.

A biblioteca jsPDF continua sendo carregada por CDN, então a geração do arquivo exige conexão com a internet.
