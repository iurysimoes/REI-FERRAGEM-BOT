const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const bwipjs = require('bwip-js');

async function gerarBoletoPDF({
  nome,
  cpfCnpj,
  valor,
  vencimento,
  linhaDigitavel,
  codigoBarra,
  recebedorNome,
  recebedorCnpj
}) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const filePath = path.join(__dirname, '..', 'temp', `boleto_${Date.now()}.pdf`);
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      doc.font('Helvetica');

      // ===== Cabeçalho =====
      doc.fontSize(14).text(recebedorNome || 'Nome da Empresa', 40, 40, { continued: true });
      doc.fontSize(10).text(` | CNPJ: ${recebedorCnpj || '00.000.000/0000-00'}`, { align: 'left' });

      // Linha digitável (topo, centralizado e grande)
      doc.fontSize(10).fillColor('black').text(linhaDigitavel || '', 40, 70, {
        width: 515,
        align: 'center'
      });

      doc.moveTo(40, 90).lineTo(555, 90).stroke();

      // ===== Local de Pagamento e Vencimento =====
      doc.fontSize(9).text('Local de Pagamento:', 40, 100);
      doc.fontSize(10).text('Pagável em qualquer banco até o vencimento.', 40, 115);

      doc.fontSize(9).text('Vencimento:', 460, 100);
      doc.fontSize(10).text(new Date(vencimento).toLocaleDateString('pt-BR'), 460, 115);

      doc.moveTo(40, 135).lineTo(555, 135).stroke();

      // ===== Beneficiário e Valor do Documento =====
      doc.fontSize(9).text('Beneficiário:', 40, 145);
      doc.fontSize(10).text(recebedorNome || '', 40, 160);
      doc.fontSize(10).text(`CNPJ: ${recebedorCnpj || ''}`, 40, 175);

      doc.fontSize(9).text('Valor do Documento:', 460, 145);
      doc.fontSize(12).text(`R$ ${parseFloat(valor).toFixed(2)}`, 460, 160);

      doc.moveTo(40, 190).lineTo(555, 190).stroke();

      // ===== Pagador =====
      doc.fontSize(9).text('Pagador:', 40, 200);
      doc.fontSize(10).text(nome || '', 40, 215);
      doc.fontSize(10).text(`CPF/CNPJ: ${cpfCnpj || ''}`, 40, 230);

      doc.moveTo(40, 255).lineTo(555, 255).stroke();

      // ===== Sacador/Avalista =====
      doc.fontSize(9).text('Sacador/Avalista:', 40, 265);
      doc.fontSize(10).text(`Empresa: ${recebedorNome || ''}`, 40, 280);
      doc.fontSize(10).text(`CNPJ: ${recebedorCnpj || ''}`, 40, 295);

      doc.moveTo(40, 320).lineTo(555, 320).stroke();

      // ===== Código de barras gráfico =====
      doc.fontSize(10).text('Código de Barras:', 40, 330);

      // Gerar imagem do código de barras no padrão boleto (interleaved2of5)
      const pngBuffer = await bwipjs.toBuffer({
        bcid: 'interleaved2of5',
        text: codigoBarra || '',
        scale: 3,
        height: 50,
        includetext: false,
        backgroundcolor: 'FFFFFF'
      });

      doc.image(pngBuffer, 40, 350, { width: 515, height: 50 });

      // Finaliza PDF
      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);

    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { gerarBoletoPDF };
