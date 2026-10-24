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
  let y = 18;
  const lineGap = 5.2;
  const addText = (text, opts = {}) => {
    const size = opts.size || 10;
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, maxW);
    if (y + lines.length * lineGap > 278) { doc.addPage(); y = 18; }
    doc.text(lines, margin, y);
    y += lines.length * (opts.gap || lineGap) + (opts.after ?? 2);
  };
  const section = (text) => {
    y += 2; doc.setDrawColor(11, 89, 98); doc.setLineWidth(.4); doc.line(margin, y, pageW - margin, y); y += 6;
    addText(text, { bold: true, size: 10.5, after: 2 });
  };
  const data = {
    name: $('fullName').value.trim(), cpf: $('cpf').value.trim(), whatsapp: $('whatsapp').value.trim(), email: $('email').value.trim(),
    address: $('address').value.trim(), residenceNumber: $('residenceNumber').value.trim(), complement: $('complement').value.trim(), cep: $('cep').value.trim(),
    checkin: formatDate($('checkin').value), checkinTime: $('checkinTime').value, checkout: formatDate($('checkout').value), checkoutTime: $('checkoutTime').value, guestLimit: Number($('guestLimit').value),
    stay: Number($('stayValue').value) || 0, fee: (Number($('stayValue').value) || 0) * .10,
    pets: $('pets').value
  };
  const total = data.stay + data.fee;
  const fullAddress = [[data.address, data.residenceNumber ? 'nº ' + data.residenceNumber : ''].filter(Boolean).join(', '), data.complement, data.cep ? 'CEP ' + data.cep : ''].filter(Boolean).join(', ');
  doc.setFillColor(11, 89, 98); doc.rect(0, 0, pageW, 13, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text('DEV. HOUSE  |  CONTRATO DE LOCAÇÃO POR TEMPORADA', margin, 8.5);
  doc.setTextColor(25, 50, 57);
  y = 24;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
  doc.text('DEV. HOUSE | CONTRATO DE LOCAÇÃO DE IMÓVEL PARA TEMPORADA', pageW / 2, y, { align: 'center' });
  y += 9;
  addText('Pelo presente instrumento particular, as partes abaixo identificadas acordam a locação por temporada do imóvel de hospedagem identificado comercialmente como Dev. House, mediante as condições seguintes.', { size: 9.5 });
  section('1. DAS PARTES');
  addText(`LOCADOR: Willyan Marques Viana da Silva, inscrito no CPF nº 109.741.394-24, residente e domiciliado à Rua Beira Mar II, nº 213, Santa Rita, Igarassu - PE, CEP 53620-736.`, { size: 9.5 });
  addText(`LOCATÁRIO(A): ${data.name}, CPF nº ${data.cpf}, WhatsApp ${data.whatsapp}, e-mail ${data.email}, endereço ${fullAddress}.`, { size: 9.5 });
  section('2. DO OBJETO E PERÍODO DA LOCAÇÃO');
  addText(`O objeto deste contrato é a locação temporária do imóvel localizado no endereço Av. Eng. Paulo de Sá Leitão, Nº139, Forte Orange, Ilha de Itamaracá - PE, com as seguintes características: Térreo: Área de lazer, espaço gourmet, churrasqueira, piscina, chuveirão, salão de jogos (sinuca, totó e fliperama), 2 banheiros sociais, garagem para 6 carros. 1º andar: 2 quartos (1 suíte), total de 5 camas (acomoda 6 pessoas), 1 banheiro social, cozinha completa, sala de estar com TV e som ambiente integrado. No período de ${data.checkin}, às ${data.checkinTime} (check-in), a ${data.checkout}, às ${data.checkoutTime} (check-out). A ocupação máxima permitida é de ${data.guestLimit} ${data.guestLimit === 1 ? 'pessoa' : 'pessoas'}, incluindo o locatário e todos os acompanhantes. O locatário declara estar ciente de que deverá respeitar esse limite, as regras do imóvel, a vizinhança e os horários de entrada e saída estabelecidos neste contrato.`, { size: 9.5 });
  addText('É expressamente proíbida a entrada e permanência de qualquer pessoa que esteja fora do acordado presente neste contrato.  O descumprimento desta cláusula está sujeito a cancelamento imediato da reserva sem ressarcimento de valor.');
  section('3. DO MONITORAMENTO E SEGURANÇA DO IMÓVEL');
  addText('O imóvel conta com cerca elétrica e monitoramento por câmeras de segurança. Nenhuma área de banho (piscina, chuveirão) é monitorada.  Durante toda estádia apenas a área externa (ruas de acesso ao imóvel) e garagem do imóvel são monitoradas para segurança do hóspede e do locador.');
  section('3. DOS VALORES E PAGAMENTO');
  addText(`Valor da estadia: ${money(data.stay)}. Taxa de prevenção de danos (10%): ${money(data.fee)}. Valor total contratado: ${money(total)}. A forma, o prazo e as condições de pagamento deverão ser confirmados entre as partes por escrito.`, { size: 9.5 });
  addText('A taxa de prevenção de danos destina-se a cobrir danos ou custos extraordinários atribuíveis ao uso do imóvel, quando aplicável. A natureza da taxa (caução reembolsável ou taxa não reembolsável), o procedimento de vistoria, os prazos para apuração e eventual devolução ou cobrança complementar devem ser definidos expressamente pelas partes antes da assinatura. Este modelo não presume automaticamente a retenção da taxa.', { size: 9.2 });
  addText('Caso não seja identificado nenhum dano ao imóvel a taxa será reembolsada integralmente ao locatário em até 72 horas após a data e horário de check-out.');
  section('4. DOS ANIMAIS DE ESTIMAÇÃO');
  addText(`É ${data.pets === 'Sim' ? 'permitida' : 'proibida'} a permanência de animais de estimação no imóvel. ${data.pets === 'Sim' ? 'O locatário responsabiliza-se por danos, sujeira ou perturbações causados pelos animais.' : 'A entrada de animais depende de autorização prévia e expressa do locador.'}`, { size: 9.5 });
  section('5. DAS OBRIGAÇÕES E RESPONSABILIDADES');
  addText('O locatário compromete-se a: (a) utilizar o imóvel exclusivamente para a finalidade contratada; (b) zelar pela conservação do imóvel, móveis, utensílios e enxoval; (c) não exceder a capacidade de ocupação previamente acordada; (d) não realizar festas ou eventos sem autorização expressa; (e) observar as orientações e placas informativas existentes no imóvel; (f) comunicar prontamente qualquer dano ou problema; e (g) devolver o imóvel e seus itens em condições compatíveis com o uso normal, ressalvado o desgaste natural.', { size: 9.2 });
  addText('O locatário responderá pelos danos comprovadamente causados por si, seus acompanhantes ou convidados, sem prejuízo da análise da taxa de prevenção de danos nos termos definidos por escrito entre as partes. O locador compromete-se a disponibilizar o imóvel nas condições ajustadas e a informar previamente regras relevantes para a estadia.', { size: 9.2 });
  section('6. CANCELAMENTO E DISPOSIÇÕES GERAIS');
  addText('As condições de cancelamento, alteração de datas, reembolso e eventuais penalidades deverão ser acordadas por escrito entre as partes antes da confirmação da reserva, observada a legislação aplicável. Qualquer alteração deste contrato deverá ser registrada por escrito. Este instrumento poderá ser assinado física ou eletronicamente, conforme aceito pelas partes.', { size: 9.2 });
  section('7. ASSINATURAS');
  addText(`E, por estarem de acordo, as partes assinam este instrumento.`, { size: 9.5 });
  y += 8;
  if (y > 250) { doc.addPage(); y = 25; }
  doc.setDrawColor(100, 120, 120); doc.line(margin, y, 95, y); doc.line(115, y, pageW - margin, y);
  y += 5;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text('LOCADOR', margin, y);
  doc.text('LOCATÁRIO(A)', 115, y);
  y += 5; doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  doc.text('Willyan Marques Viana da Silva', margin, y);
  doc.text(data.name, 115, y);
  y += 9;
  //addText('Local e data: ____________________________________________________________', { size: 9 });
  y += 1;
  //addText('Observação: este documento é um modelo inicial e deve ser revisado para refletir as condições reais da reserva e a legislação aplicável antes de ser utilizado ou assinado.', { size: 8.2 });
  const safeName = data.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  doc.save(`Contrato_Dev_House_${safeName || 'Locatario'}.pdf`);
}

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(() => { }));
}

