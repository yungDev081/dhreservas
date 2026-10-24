# Dev. House — PWA de reservas

Aplicação web responsiva para cadastrar os dados do locatário, consultar CEP via ViaCEP, calcular a taxa de prevenção de danos de 10% e gerar um contrato em PDF.

## Como executar
- Para testar rapidamente, abra `index.html` no navegador. A consulta de CEP e a biblioteca PDF precisam de internet.
- Para instalar como PWA e habilitar o service worker, sirva a pasta por HTTPS ou localhost. Exemplo com Python: `python3 -m http.server 8000` e acesse `http://localhost:8000`.
- Para publicar, envie os arquivos para uma hospedagem HTTPS.

## Recursos
- Layout adaptável para celular, tablet e desktop.
- Máscaras simples para CPF, WhatsApp e CEP.
- Busca de CEP usando a API pública ViaCEP.
- Cálculo automático de taxa (10%) e total.
- Geração local de PDF com jsPDF.
- Manifesto e service worker para instalação/cache básico.

## Importante
- O endereço retornado pelo ViaCEP geralmente não inclui o número do imóvel; revise o endereço e informe o número no campo Endereço.
- A aplicação não armazena reservas em banco de dados. O preenchimento permanece na página até ser limpo/fechado; o PDF é gerado no dispositivo.
- O CPF recebe uma validação básica de preenchimento, não uma validação completa dos dígitos verificadores.
- O contrato é um modelo inicial, não aconselhamento jurídico. Revise as regras de pagamento, cancelamento, ocupação, vistoria e a natureza da taxa de prevenção de danos antes de usar. Considere revisão jurídica.
- O carregamento da biblioteca jsPDF usa CDN; por isso a geração de PDF depende de conexão com a internet, salvo se você baixar e hospedar a biblioteca localmente.


## Ícone do aplicativo
O favicon da página e os ícones PWA para Android/iOS usam a logomarca oficial da Dev. House (icon-192.png e icon-512.png). O cache do service worker foi atualizado para v3.
