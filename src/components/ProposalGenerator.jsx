import React from 'react';
import { useApp } from '../context/AppContext';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, BorderStyle, WidthType, AlignmentType, Header, Footer } from 'docx';
import { saveAs } from 'file-saver';
import { FileText, Download, FileType } from 'lucide-react';

function ProposalGenerator({ projectId, projectData, lineItems }) {
  const { companySettings } = useApp();

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;

    // Company Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(companySettings.company_name || 'WhitTech.AI', 20, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (companySettings.address) { doc.text(companySettings.address, 20, yPosition); yPosition += 5; }
    if (companySettings.phone) { doc.text(`Phone: ${companySettings.phone}`, 20, yPosition); yPosition += 5; }
    if (companySettings.email) { doc.text(`Email: ${companySettings.email}`, 20, yPosition); yPosition += 5; }

    // Proposal Title
    yPosition += 15;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('PROJECT ESTIMATE', pageWidth / 2, yPosition, { align: 'center' });

    // Project Information
    yPosition += 15;
    doc.setFontSize(12);
    doc.text('Project Information', 20, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Project: ${projectData.name}`, 20, yPosition); yPosition += 6;
    doc.text(`Project Number: ${projectData.project_number}`, 20, yPosition); yPosition += 6;
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, yPosition); yPosition += 6;

    // Client Information
    yPosition += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Prepared For:', 20, yPosition);
    yPosition += 6;
    doc.setFont('helvetica', 'normal');
    if (projectData.client_name) { doc.text(projectData.client_name, 20, yPosition); yPosition += 6; }
    if (projectData.client_company) { doc.text(projectData.client_company, 20, yPosition); yPosition += 6; }
    if (projectData.client_address) { doc.text(projectData.client_address, 20, yPosition); yPosition += 6; }

    // Description
    if (projectData.description) {
      yPosition += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Project Description:', 20, yPosition);
      yPosition += 6;
      doc.setFont('helvetica', 'normal');
      const splitDescription = doc.splitTextToSize(projectData.description, pageWidth - 40);
      doc.text(splitDescription, 20, yPosition);
      yPosition += (splitDescription.length * 5) + 5;
    }

    // Line Items Table
    yPosition += 10;
    const tableData = lineItems.map(item => {
      const materialTotal = item.quantity * item.material_cost;
      const laborTotal = item.quantity * item.labor_hours * item.labor_rate;
      const subtotal = materialTotal + laborTotal;
      const itemTotal = subtotal * (1 + item.markup_percent / 100);
      return [
        item.description,
        `${item.quantity} ${item.unit}`,
        `$${item.material_cost.toFixed(2)}`,
        `${item.labor_hours} hrs @ $${item.labor_rate.toFixed(2)}`,
        `${item.markup_percent}%`,
        `$${itemTotal.toFixed(2)}`
      ];
    });

    doc.autoTable({
      startY: yPosition,
      head: [['Description', 'Quantity', 'Material', 'Labor', 'Markup', 'Total']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 25, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 25, halign: 'right' }
      }
    });

    // Calculate totals
    let materialTotal = 0, laborTotal = 0, grandTotal = 0;
    lineItems.forEach(item => {
      const matTotal = item.quantity * item.material_cost;
      const labTotal = item.quantity * item.labor_hours * item.labor_rate;
      const subtotal = matTotal + labTotal;
      const itemTotal = subtotal * (1 + item.markup_percent / 100);
      materialTotal += matTotal;
      laborTotal += labTotal;
      grandTotal += itemTotal;
    });

    // Totals Summary
    const finalY = doc.lastAutoTable.finalY + 10;
    const totalsX = pageWidth - 70;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Material Subtotal:', totalsX, finalY);
    doc.text(`$${materialTotal.toFixed(2)}`, totalsX + 45, finalY, { align: 'right' });
    doc.text('Labor Subtotal:', totalsX, finalY + 6);
    doc.text(`$${laborTotal.toFixed(2)}`, totalsX + 45, finalY + 6, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('GRAND TOTAL:', totalsX, finalY + 15);
    doc.text(`$${grandTotal.toFixed(2)}`, totalsX + 45, finalY + 15, { align: 'right' });

    // Terms and Conditions
    let termsY = finalY + 30;
    if (termsY > 250) {
      doc.addPage();
      termsY = 20;
    }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Terms & Conditions', 20, termsY);
    termsY += 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const terms = companySettings.proposal_terms || 'Payment due within 30 days. 50% deposit required to commence work.';
    const splitTerms = doc.splitTextToSize(terms, pageWidth - 40);
    doc.text(splitTerms, 20, termsY);

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 20;
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(`This estimate is valid for 30 days from date of issue. | ${companySettings.company_name}`, pageWidth / 2, footerY, { align: 'center' });

    // Save PDF
    doc.save(`${projectData.project_number}-Estimate.pdf`);
  };

  const generateWordDoc = () => {
    // Calculate totals first
    let materialTotal = 0, laborTotal = 0, grandTotal = 0;
    lineItems.forEach(item => {
      const matTotal = item.quantity * item.material_cost;
      const labTotal = item.quantity * item.labor_hours * item.labor_rate;
      const subtotal = matTotal + labTotal;
      const itemTotal = subtotal * (1 + item.markup_percent / 100);
      materialTotal += matTotal;
      laborTotal += labTotal;
      grandTotal += itemTotal;
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Company Header
          new Paragraph({
            text: companySettings.company_name || 'WhitTech.AI',
            heading: 'Heading1',
            spacing: { after: 100 }
          }),
          new Paragraph({ text: companySettings.address || '' }),
          new Paragraph({ text: companySettings.phone ? `Phone: ${companySettings.phone}` : '' }),
          new Paragraph({ text: companySettings.email ? `Email: ${companySettings.email}` : '' }),
          new Paragraph({ text: '' }), // Spacer

          // Title
          new Paragraph({
            text: 'PROJECT ESTIMATE',
            heading: 'Heading2',
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 400 }
          }),

          // Information Table (2 columns: Project | Client)
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: 'Project Information', bold: true })]
                      }),
                      new Paragraph({ text: `Project: ${projectData.name}` }),
                      new Paragraph({ text: `Number: ${projectData.project_number}` }),
                      new Paragraph({ text: `Date: ${new Date().toLocaleDateString()}` }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: 'Prepared For', bold: true })]
                      }),
                      new Paragraph({ text: projectData.client_name || '' }),
                      new Paragraph({ text: projectData.client_company || '' }),
                      new Paragraph({ text: projectData.client_address || '' }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ text: '' }), // Spacer

          // Description
          ...(projectData.description ? [
            new Paragraph({
              children: [new TextRun({ text: 'Project Description:', bold: true })],
              spacing: { before: 200 }
            }),
            new Paragraph({ text: projectData.description, spacing: { after: 400 } })
          ] : []),

          // Line Items Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              // Header
              new TableRow({
                children: ['Description', 'Qty', 'Material', 'Labor', 'Markup', 'Total'].map(text =>
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
                    shading: { fill: "EEEEEE" }
                  })
                )
              }),
              // Items
              ...lineItems.map(item => {
                const materialTotal = item.quantity * item.material_cost;
                const laborTotal = item.quantity * item.labor_hours * item.labor_rate;
                const subtotal = materialTotal + laborTotal;
                const itemTotal = subtotal * (1 + item.markup_percent / 100);

                return new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ text: item.description })] }),
                    new TableCell({ children: [new Paragraph({ text: `${item.quantity} ${item.unit}` })] }),
                    new TableCell({ children: [new Paragraph({ text: `$${item.material_cost.toFixed(2)}` })] }),
                    new TableCell({ children: [new Paragraph({ text: `${item.labor_hours} @ $${item.labor_rate}` })] }),
                    new TableCell({ children: [new Paragraph({ text: `${item.markup_percent}%` })] }),
                    new TableCell({ children: [new Paragraph({ text: `$${itemTotal.toFixed(2)}` })] }),
                  ]
                });
              })
            ],
          }),

          new Paragraph({ text: '' }), // Spacer

          // Totals
          new Table({
            width: { size: 40, type: WidthType.PERCENTAGE },
            alignment: AlignmentType.RIGHT,
            rows: [
              new TableRow({
                children: [
                  new TableCell({ borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }, children: [new Paragraph({ text: 'Material Subtotal:' })] }),
                  new TableCell({ borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }, children: [new Paragraph({ text: `$${materialTotal.toFixed(2)}`, alignment: AlignmentType.RIGHT })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }, children: [new Paragraph({ text: 'Labor Subtotal:' })] }),
                  new TableCell({ borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }, children: [new Paragraph({ text: `$${laborTotal.toFixed(2)}`, alignment: AlignmentType.RIGHT })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }, children: [new Paragraph({ children: [new TextRun({ text: 'GRAND TOTAL:', bold: true })] })] }),
                  new TableCell({ borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }, children: [new Paragraph({ children: [new TextRun({ text: `$${grandTotal.toFixed(2)}`, bold: true })], alignment: AlignmentType.RIGHT })] })
                ]
              }),
            ]
          }),

          // Terms
          new Paragraph({
            children: [new TextRun({ text: 'Terms & Conditions', bold: true })],
            spacing: { before: 800, after: 200 }
          }),
          new Paragraph({
            text: companySettings.proposal_terms || 'Payment due within 30 days.',
          }),

          new Paragraph({
            text: `Estimate valid for 30 days. | ${companySettings.company_name}`,
            alignment: AlignmentType.CENTER,
            spacing: { before: 800 },
            color: "888888"
          })
        ]
      }]
    });

    Packer.toBlob(doc).then(blob => {
      saveAs(blob, `${projectData.project_number}-Estimate.docx`);
    });
  };

  const calculateGrandTotal = () => {
    return lineItems.reduce((total, item) => {
      const materialTotal = item.quantity * item.material_cost;
      const laborTotal = item.quantity * item.labor_hours * item.labor_rate;
      const subtotal = materialTotal + laborTotal;
      return total + (subtotal * (1 + item.markup_percent / 100));
    }, 0);
  };

  return (
    <div className="proposal-generator">
      <div className="proposal-header">
        <div><h3>Generate Proposal</h3><p>Create a professional proposal for this project</p></div>
      </div>
      <div className="proposal-preview">
        <div className="preview-card">
          <FileText size={48} className="preview-icon" />
          <h4>{projectData.name}</h4>
          <p className="preview-client">{projectData.client_name}</p>
          <p className="preview-total">${calculateGrandTotal().toFixed(2)}</p>
          <p className="preview-items">{lineItems.length} line items</p>
          <div className="button-group" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="btn btn-primary btn-large" onClick={generatePDF}>
              <Download size={20} /> PDF Proposal
            </button>
            <button className="btn btn-secondary btn-large" onClick={generateWordDoc}>
              <FileType size={20} /> Word Document
            </button>
          </div>
        </div>
        <div className="proposal-info">
          <h4>What's Included:</h4>
          <ul>
            <li>✓ Company branding and contact information</li>
            <li>✓ Project and client details</li>
            <li>✓ Detailed line item breakdown</li>
            <li>✓ Material and labor cost itemization</li>
            <li>✓ Professional formatting and layout</li>
            <li>✓ Terms and conditions</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ProposalGenerator;
