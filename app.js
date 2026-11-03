const $ = (id) => document.getElementById(id);
const money = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
const digits = (value) => value.replace(/\D/g, '');

function updateTotals() {
  const stay = Math.max(0, Number($('stayValue').value) || 0);
  const fee = stay * 0.10;
  $('stayDisplay').textContent = money(stay);
  $('feeDisplay').textContent = money(fee);
  $('totalDisplay').textContent = money(stay + fee);
}
$('stayValue').addEventListener('input', updateTotals);

$('cpf').addEventListener('input', e => {
  let v = digits(e.target.value).slice(0, 11);
  v = v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  e.target.value = v;
});
$('whatsapp').addEventListener('input', e => {
  let v = digits(e.target.value).slice(0, 11);
  if (v.length > 10) v = v.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3');
  else if (v.length > 6) v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
  else if (v.length > 2) v = v.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
  else if (v.length) v = '(' + v;
  e.target.value = v.trim().replace(/-$/, '');
});
$('cep').addEventListener('input', e => {
  const v = digits(e.target.value).slice(0, 8);
  e.target.value = v.length > 5 ? v.slice(0, 5) + '-' + v.slice(5) : v;
  if (v.length === 8) lookupCep();
});
$('lookupCep').addEventListener('click', lookupCep);

async function lookupCep() {
  const cep = digits($('cep').value);
  const msg = $('cepMessage');
  if (cep.length !== 8) { msg.textContent = 'Informe um CEP válido com 8 números.'; msg.style.color = '#a23a2b'; return; }
  msg.textContent = 'Consultando CEP…'; msg.style.color = '';
  $('lookupCep').disabled = true;
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!response.ok) throw new Error('Falha na consulta');
    const data = await response.json();
    if (data.erro) throw new Error('CEP não encontrado.');
    const parts = [data.logradouro, data.bairro, [data.localidade, data.uf].filter(Boolean).join(' - ')].filter(Boolean);
    $('address').value = parts.join(', ');
    if (data.complemento && !$('complement').value) $('complement').value = data.complemento;
    msg.textContent = 'Endereço preenchido. Confira e informe o número, se necessário.';
    msg.style.color = '#167a5a';
    $('address').focus();
  } catch (err) {
    msg.textContent = err.message === 'CEP não encontrado.' ? err.message : 'Não foi possível consultar. Verifique o CEP e tente novamente.';
    msg.style.color = '#a23a2b';
  } finally { $('lookupCep').disabled = false; }
}

$('checkin').addEventListener('change', () => {
  $('checkout').min = $('checkin').value || '';
  if ($('checkout').value && $('checkout').value <= $('checkin').value) $('checkout').value = '';
});
$('reservationForm').addEventListener('reset', () => {
  setTimeout(() => {
    $('cepMessage').textContent = 'Digite o CEP para preencher o endereço automaticamente.';
    $('cepMessage').style.color = '';
    $('checkout').min = '';
    $('formError').hidden = true;
    updateTotals();
  }, 0);
});

function formatDate(value) {
  if (!value) return '';
  const [y, m, d] = value.split('-');
  return `${d}/${m}/${y}`;
}
function validateForm() {
  const errors = [];
  const required = [['fullName', 'Informe o nome completo.'], ['cpf', 'Informe o CPF.'], ['whatsapp', 'Informe o WhatsApp.'], ['email', 'Informe o e-mail.'], ['cep', 'Informe o CEP.'], ['address', 'Informe o endereço.'], ['residenceNumber', 'Informe o número da residência.'], ['checkin', 'Informe a data de check-in.'], ['checkinTime', 'Informe o horário de check-in.'], ['checkout', 'Informe a data de check-out.'], ['checkoutTime', 'Informe o horário de check-out.'], ['guestLimit', 'Informe a quantidade máxima de pessoas permitida.'], ['stayValue', 'Informe o valor da estadia.']];
  required.forEach(([id, msg]) => { if (!$(id).value.trim()) errors.push(msg); });
  const cpf = digits($('cpf').value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) errors.push('Confira o CPF: ele deve conter 11 números válidos.');
  if (digits($('whatsapp').value).length < 10) errors.push('Confira o número do WhatsApp.');
  if ($('email').value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($('email').value.trim())) errors.push('Confira o formato do e-mail.');
  if (digits($('cep').value).length !== 8) errors.push('O CEP deve conter 8 números.');
  if ($('checkin').value && $('checkout').value && $('checkout').value <= $('checkin').value) errors.push('O check-out deve ser posterior ao check-in.');
  if ($('stayValue').value !== '' && Number($('stayValue').value) < 0) errors.push('O valor da estadia não pode ser negativo.');
  if ($('guestLimit').value !== '' && (!Number.isInteger(Number($('guestLimit').value)) || Number($('guestLimit').value) < 1)) errors.push('A quantidade de pessoas deve ser um número inteiro maior que zero.');
  return errors;
}

$('generateBtn').addEventListener('click', () => {
  const errors = validateForm();
  const errorBox = $('formError');
  if (errors.length) {
    errorBox.textContent = errors.join(' ');
    errorBox.hidden = false;
    errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  errorBox.hidden = true;
  if (!window.jspdf || !window.jspdf.jsPDF) {
    errorBox.textContent = 'A biblioteca de PDF não carregou. Verifique sua conexão e tente novamente.';
    errorBox.hidden = false; return;
  }
  generateContract();
});

function generateContract() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210, margin = 18, maxW = pageW - margin * 2;
  let y = 23;
  const lineGap = 4.4;
  const header = () => {
    doc.setFillColor(11, 89, 98); doc.rect(0, 0, pageW, 14, 'F');
    doc.setTextColor(255, 235, 201); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('DEV. HOUSE', margin, 9.2);
    doc.setFontSize(8); doc.text('CONTRATO DE LOCAÇÃO POR TEMPORADA', pageW - margin, 9.2, { align: 'right' });
    doc.setTextColor(25, 50, 57);
  };
  const ensure = (height) => { if (y + height > 276) { doc.addPage(); header(); y = 22; } };
  const addText = (text, opts = {}) => {
    const size = opts.size || 9.1;
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal'); doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, maxW);
    ensure(lines.length * (opts.gap || lineGap) + (opts.after ?? 2));
    doc.text(lines, margin, y);
    y += lines.length * (opts.gap || lineGap) + (opts.after ?? 2);
  };
  const section = (title) => {
    ensure(11); y += 1; doc.setDrawColor(11, 89, 98); doc.setLineWidth(.35);
    doc.line(margin, y, pageW - margin, y); y += 5;
    addText(title, { bold: true, size: 9.7, after: 2 });
  };
  const addTable = (rows, widths, options = {}) => {
    const fs = options.fontSize || 7.4, pad = 2.1, rowHeights = rows.map(row => {
      const cellLines = row.map((cell, i) => {
        doc.setFont('helvetica', options.header && options.header.includes(rows.indexOf(row)) ? 'bold' : 'normal');
        doc.setFontSize(fs); return doc.splitTextToSize(String(cell), widths[i] - pad * 2);
      });
      return Math.max(...cellLines.map(c => c.length)) * 3.6 + pad * 2;
    });
    rows.forEach((row, ri) => {
      ensure(rowHeights[ri] + 1);
      let x = margin;
      row.forEach((cell, ci) => {
        doc.setDrawColor(105, 115, 115); doc.setLineWidth(.2);
        doc.rect(x, y, widths[ci], rowHeights[ri]);
        doc.setFont('helvetica', options.header && options.header.includes(ri) ? 'bold' : 'normal');
        doc.setFontSize(fs); doc.setTextColor(25, 45, 48);
        doc.text(doc.splitTextToSize(String(cell), widths[ci] - pad * 2), x + pad, y + pad + 2.6);
        x += widths[ci];
      });
      y += rowHeights[ri];
    });
    y += options.after ?? 3;
  };
  const data = {
    name: $('fullName').value.trim(), cpf: $('cpf').value.trim(), whatsapp: $('whatsapp').value.trim(), email: $('email').value.trim(),
    address: $('address').value.trim(), residenceNumber: $('residenceNumber').value.trim(), complement: $('complement').value.trim(), cep: $('cep').value.trim(),
    checkin: formatDate($('checkin').value), checkinRaw: $('checkin').value, checkinTime: $('checkinTime').value,
    checkout: formatDate($('checkout').value), checkoutRaw: $('checkout').value, checkoutTime: $('checkoutTime').value,
    guestLimit: Number($('guestLimit').value), rent: Number($('stayValue').value) || 0, pets: $('pets').value
  };
  const tci = data.rent * .10, total = data.rent + tci, sinal = total * .50, saldo = total - sinal;
  const nights = Math.max(1, Math.round((Date.parse(data.checkoutRaw + 'T12:00:00Z') - Date.parse(data.checkinRaw + 'T12:00:00Z')) / 86400000));
  const fullAddress = [[data.address, data.residenceNumber ? 'nº ' + data.residenceNumber : ''].filter(Boolean).join(', '), data.complement, data.cep ? 'CEP ' + data.cep : ''].filter(Boolean).join(', ');
  const fmt = (v) => money(v);
  header();
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text('CONTRATO DE LOCAÇÃO POR TEMPORADA', pageW / 2, y, { align: 'center' }); y += 9;
  section('LOCADOR:');
  addTable([
    ['NOME', 'WILLYAN MARQUES VIANA DA SILVA'], ['CPF/CNPJ', '109.741.394-24'],
    ['ENDEREÇO', 'Av. Eng. Paulo de Sá Leitão, Nº 139, Forte Orange, Ilha de Itamaracá - PE'],
    ['CEP', '53900-000'], ['E-MAIL', 'devhouseilha@gmail.com'], ['WHATSAPP', '+55 81 98548-3142']
  ], [26, 148], { fontSize: 8.1 });
  section('LOCATÁRIO:');
  addTable([
    ['NOME', data.name], ['CPF', data.cpf], ['ENDEREÇO', fullAddress], ['CEP', data.cep], ['E-MAIL', data.email], ['WHATSAPP', data.whatsapp]
  ], [26, 148], { fontSize: 8.1 });
  section('1) IMÓVEL LOCADO:');
  addText('Locação por temporada do imóvel localizado no endereço Av. Eng. Paulo de Sá Leitão, Nº 139, Forte Orange, Ilha de Itamaracá - PE, com as seguintes características:', { size: 9.1 });
  addText('Térreo: Área de lazer, espaço gourmet, churrasqueira, piscina, chuveirão, salão de jogos (sinuca, totó e fliperama), 2 banheiros sociais, garagem para 6 carros.', { size: 9.1 });
  addText('1º andar: 2 quartos (1 suíte), total de 5 camas (acomoda 6 pessoas), 1 banheiro social, cozinha completa, sala de estar com TV e som ambiente integrado.', { size: 9.1 });
  section('1.1) MÓVEIS E UTENSÍLIOS:');
  addText('O imóvel é guarnecido pelos seguintes móveis e utensílios, todos em bom estado de conservação e funcionamento:', { size: 9.1 });
  const inventoryLeft = ['1 TV', '1 MICROONDAS', '1 SANDUICHEIRA', '1 LIQUIDIFICADOR', '1 GELADEIRA', '1 FOGÃO 6 BOCAS', '1 CONJUNTO DE TALHERES DE 30 PEÇAS', '6 COPOS DE VIDRO', '6 XÍCARAS DE PORCELANA', '6 PRATOS DE VIDRO', '1 JOGO DE PANELAS COM 6 PANELAS', '1 RALADOR', '1 PENEIRA', '1 BOTIJÃO DE GÁS', '1 ESCORREDOR DE LOUÇAS', '1 ESCORREDOR DE ALIMENTOS', '2 SECADORES DE CABELO', '1 CAMA BOX CASAL', '4 CAMAS DE SOLTEIRO', '1 CHUVEIRO ELÉTRICO', '4 ESPELHOS', '2 AR-CONDICIONADOS', '4 ESTANTES', '1 JOGO DE SOFÁ COM 3 PEÇAS', '1 MESA DE CENTRO', '1 MESA COM 4 CADEIRAS', '1 CONJUNTO DE PANELAS COM 8 ITENS'];
  const inventoryRight = ['1 TÁBUA DE CHURRASCO', '1 CONJUNTO DE CHURRASCO COM 3 ITENS', '1 ESCORREDOR DE LOUÇAS', '1 COOKTOP DE 4 BOCAS', '1 BOTIJÃO DE GÁS', '3 MESAS', '12 CADEIRAS', '1 FREEZER VERTICAL', '1 FREEZER HORIZONTAL', '1 MESA DE SINUCA COM 5 TACOS E 16 BOLAS', '1 MESA DE TOTÓ', '1 FLIPERAMA', '1 ALEXA', '1 GUARDA-SOL', '1 CADEIRA P/ BANHO DE SOL'];
  const inventory = [['CASA', 'ÁREA GOURMET / ÁREA DE LAZER']];
  for (let i = 0; i < Math.max(inventoryLeft.length, inventoryRight.length); i++) inventory.push([inventoryLeft[i] || '', inventoryRight[i] || '']);
  addTable(inventory, [73, 101], { fontSize: 7.1, header: [0], after: 5 });
  section('2) DO PRAZO DA LOCAÇÃO:');
  addText(`Os contratantes ajustam pelo presente instrumento particular a locação do imóvel supra descrito, para locação por temporada, pelo período de ${nights} ${nights === 1 ? 'noite' : 'noites'}, com check-in às ${data.checkinTime} de ${data.checkin}, com check-out às ${data.checkoutTime} de ${data.checkout}.`);
  section('3) DO NÚMERO DE HÓSPEDES:');
  addText(`O presente contrato autoriza a hospedagem de no máximo ${data.guestLimit} (${numberWords(data.guestLimit)}) pessoas (adultos) no imóvel, ainda que o imóvel tenha espaço para acomodar mais pessoas.`);
  addText('É expressamente proibida a entrada e permanência de qualquer pessoa que esteja fora do acordado presente neste contrato. O descumprimento desta cláusula está sujeito a cancelamento imediato da reserva sem ressarcimento de valor.');
  section('4) DO MONITORAMENTO E SEGURANÇA DO IMÓVEL:');
  addText('O imóvel conta com cerca elétrica e monitoramento por câmeras de segurança. Nenhuma área de banho (piscina, chuveirão) é monitorada. Durante toda estadia apenas a área externa (ruas de acesso ao imóvel) e garagem do imóvel são monitoradas para segurança do hóspede e do locador.');
  section('5) DO VALOR DA LOCAÇÃO:');
  addText(`O valor total do aluguel para o período acima fica ajustado em ${fmt(data.rent)}, referente a ${nights} ${nights === 1 ? 'noite' : 'noites'}.`);
  section('6) DA INEXISTÊNCIA DE DEVOLUÇÃO:');
  addText('No caso de encerramento da estadia em momento anterior ao previsto, por qualquer motivo, o locador não devolverá valores ao inquilino. Uma nova data pode ser agendada mediante disponibilidade do calendário do imóvel.');
  section('7) DA DEMORA NA DESOCUPAÇÃO:');
  addText('A permanência no imóvel após o prazo contratado implicará no pagamento da diária em dobro, por dia que exceder até a definitiva desocupação, bem como perdas e danos em razão de eventual atraso na entrega do imóvel para o próximo inquilino.');
  section('8) DO VALOR DA TAXA DE TCI (TAXA DE CONSERVAÇÃO DO IMÓVEL):');
  addText(`Será cobrada uma taxa única de 10% (dez por cento) sobre o valor total do aluguel, que totaliza ${fmt(tci)}, taxa essa que servirá para custear qualquer dano ao imóvel.`);
  addText('Caso o dano causado tenha valor superior ao da taxa cobrada, o locatário é responsabilizado em pagar a diferença restante.');
  addText('A taxa deverá ser paga no momento do check-in no imóvel, juntamente com o saldo devedor da locação.');
  addText('Caso não seja identificado nenhum dano ao imóvel a taxa será reembolsada integralmente ao locatário em até 72 horas após a data e horário de check-out.');
  section('9) DO VALOR DA TAXA DE LIMPEZA:');
  addText('A taxa de limpeza não será cobrada se o locatário entregar a casa limpa, organizada e com lixo recolhido.');
  addText('Caso o imóvel seja entregue em condições divergentes das descritas acima, a taxa de TCI será revertida para taxa de limpeza do local e não será reembolsada ao locatário.');
  section('10) DO SINAL DE GARANTIA:');
  addText(`O inquilino pagará como sinal o valor de ${fmt(sinal)}, referente a 50% do valor do aluguel + 50% do valor da taxa de TCI até a data de assinatura do contrato, mediante transferência bancária via PIX.`);
  addText('O valor do sinal pago antecipadamente será abatido do valor total da locação.');
  addText(`O saldo remanescente do aluguel deverá ser pago no ato do check-in no imóvel, juntamente com os 50% restantes da taxa de TCI, totalizando ${fmt(saldo)}.`);
  addText('É indispensável a transmissão do presente contrato devidamente preenchido e assinado por e-mail, juntamente com o comprovante de depósito.');
  section('11) NO CASO DE DESISTÊNCIA:');
  addText('No caso de desistência da locação o valor do sinal não será devolvido, e uma nova data poderá ser agendada mediante a consulta no calendário de disponibilidade do imóvel.');
  section('12) DOS ANIMAIS DE ESTIMAÇÃO:');
  addText('Não será permitida em nenhuma hipótese a presença de animais de estimação no imóvel, de qualquer porte, ainda que transitoriamente, exceto se combinado com o locador previamente antes da assinatura deste contrato.');
  addText(`Foi permitido pelo locador algum animal de estimação?  ${data.pets === 'Sim' ? 'Sim ( X )   Não (   )' : 'Sim (   )   Não ( X )'}`);
  section('13) DA VISTORIA:');
  addText('No momento da saída do imóvel, uma nova vistoria será realizada em até 72 horas após a data e horário de check-out sem a obrigatoriedade da presença do inquilino para averiguar se houve algum dano ou avaria.');
  section('14) DESPESAS DE ÁGUA, LUZ, GÁS, IMPOSTOS, CONDOMÍNIO, TV A CABO, INTERNET:');
  addText('O valor da locação inclui todas essas despesas, bem como outras não discriminadas expressamente neste contrato.');
  section('15) DA RESPONSABILIDADE:');
  addText('O locador não se responsabiliza por objetos deixados no imóvel, bem como por furtos / roubos dos bens do inquilino e outros danos causados por caso fortuito ou força maior que ocasionem danos.');
  addText('O locador não é responsável por eventos que podem vir ocorrer no imóvel durante a locação, como por exemplo falta de água ou de energia elétrica, uma vez que a responsabilidade é da concessionária de serviço público.');
  section('16) DAS OBRIGAÇÕES FINAIS DO INQUILINO:');
  addText('O inquilino se obriga a:');
  addText('a) não ceder ou franquear o imóvel para outrem, sem o prévio e expresso consentimento da administradora, mesmo que temporariamente;');
  addText('b) restituir o imóvel nas mesmas e perfeitas condições que lhe foi entregue: sem estragos, avarias ou danos, inclusive aos móveis e utensílios, guarnições e demais pertences;');
  addText('c) comunicar ao locador ou administradora quaisquer ocorrências imprevistas havidas no imóvel e seus utensílios.');
  section('17) DA INTEGRAÇÃO DO CONTRATO:');
  addText('Faz parte integrante deste contrato todos os e-mails ou mensagens trocadas pelas partes antes da assinatura do mesmo (Ex: Whatsapp), as quais podem ser utilizadas como prova de cláusulas não contidas neste contrato, desde que haja prova de concordância da outra parte (ex: resposta com ciência).');
  section('18) DO FORO:');
  addText('Elege-se o foro da comarca de Igarassu no Pernambuco, para dirimir quaisquer dúvidas oriundas do presente contrato.');
  section('19) DAS ASSINATURAS:');
  addText('Por estarem acordadas, assinam o presente instrumento em duas vias, de igual teor e conteúdo.');
  ensure(32); y += 7;
  doc.setDrawColor(80, 90, 90); doc.line(margin, y, 94, y); doc.line(116, y, pageW - margin, y); y += 5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.text('LOCADOR', margin, y); doc.text('LOCATÁRIO', 116, y);
  y += 5; doc.text('Willyan Marques Viana da Silva', margin, y); doc.text(data.name, 116, y);
  y += 8; doc.text(`Ilha de Itamaracá, ${formatDate(new Date().toISOString().slice(0, 10))}.`, margin, y);
  const pageCount = doc.internal.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page); doc.setDrawColor(190, 205, 205); doc.line(margin, 284, pageW - margin, 284);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(90, 105, 105);
    doc.text('Dev. House | Contrato de locação por temporada', margin, 289);
    doc.text(`${page}/${pageCount}`, pageW - margin, 289, { align: 'right' });
  }
  const safeName = data.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  doc.save(`Contrato_Locacao_Dev_House_${safeName || 'Locatario'}.pdf`);
}
function numberWords(n) {
  const words = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez'];
  return words[n] || String(n);
}


if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(() => { }));
}

