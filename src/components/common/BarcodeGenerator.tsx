import React, { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';
import { FormControlLabel, Radio, RadioGroup } from '@mui/material';

interface Asset {
  id: number;
  serial: string;
  location: {
    id: number;
    name: string;
    details: string | null;
  };
  category: {
    id: number;
    name: string;
    label: string;
    pyr_id: string;
    type: string;
  };
  status: string;
  pyrcode: string;
  origin?: string;
}

interface BarcodeGeneratorProps {
  assets: Asset[];
  onClose?: () => void;
}

export const BarcodeGenerator: React.FC<BarcodeGeneratorProps> = ({ 
  assets, 
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [error, setError] = React.useState<string>('');
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [orientation, setOrientation] = React.useState<'landscape' | 'portrait'>('landscape');
  const barcodeRef = useRef<HTMLCanvasElement>(null);

  // Generowanie kodu kreskowego
  useEffect(() => {
    if (!assets || !assets.length || !barcodeRef.current) return;

    const canvas = barcodeRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ZAWSZE landscape
    canvas.width = 240;
    canvas.height = 120;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    JsBarcode(canvas, assets[currentIndex].pyrcode, {
      format: 'CODE128',
      width: 2,
      height: 40,
      displayValue: true,
      fontSize: 12,
      margin: 5,
      background: '#FFFFFF',
      lineColor: '#000000',
      textAlign: 'center',
      textPosition: 'bottom',
      textMargin: 2,
      text: assets[currentIndex].pyrcode
    });
  }, [assets, currentIndex]);

  const generateBarcodeSVGDataUrl = (value: string, options: any = {}, isPortrait = false) => {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");

    // Definicje wymiarów i parametrów w zależności od orientacji
    const svgWidth = isPortrait ? 240 : 400;
    const svgHeight = isPortrait ? 400 : 180; // Znacznie wyższy SVG dla pionu
    const barcodeLineWidth = 2; // Grubsze linie dla pionu
    const barcodeHeight = 40; // Wyższy kod kreskowy dla pionu
    const fontSize = 18;    // Większa czcionka dla pionu
    const margin = 5;       // Większy margines SVG dla pionu
    const textMargin = 2;     // Większy margines tekstu dla pionu

    svg.setAttribute("width", svgWidth.toString());
    svg.setAttribute("height", svgHeight.toString());
    svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`); // Ustawienie viewBox

    JsBarcode(svg, value, {
      format: 'CODE128',
      width: barcodeLineWidth,
      height: barcodeHeight,
      displayValue: true,
      fontSize: fontSize,
      margin: margin,
      background: '#FFFFFF',
      lineColor: '#000000',
      textAlign: 'center',
      textPosition: 'bottom',
      textMargin: textMargin,
      text: value,
      ...options
    });

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const svgBase64 = btoa(unescape(encodeURIComponent(svgString)));
    return 'data:image/svg+xml;base64,' + svgBase64;
  };

  const handleDownloadPDF = async () => {
    if (!barcodeRef.current) return;
    setIsGenerating(true);
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [40, 80]
      });

      const pdfWidth = 80;
      const pdfHeight = 40;
      const barcodeWidth = 60;
      const barcodeHeight = 25;
      const x = (pdfWidth - barcodeWidth) / 2;
      const y = (pdfHeight - barcodeHeight) / 2;

      for (let i = 0; i < assets.length; i++) {
        if (i > 0) doc.addPage();
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 400;
        tempCanvas.height = 240;
        JsBarcode(tempCanvas, assets[i].pyrcode, {
          format: 'CODE128',
          width: 2,
          height: 40,
          displayValue: true,
          fontSize: 12,
          margin: 5,
          background: '#FFFFFF',
          lineColor: '#000000',
          textAlign: 'center',
          textPosition: 'bottom',
          textMargin: 2,
          text: assets[i].pyrcode
        });
        doc.addImage(tempCanvas.toDataURL('image/png', 1.0), 'PNG', x, y, barcodeWidth, barcodeHeight);
      }

      doc.save(`barcodes-${assets.length}.pdf`);
      setIsGenerating(false);
    } catch (error) {
      console.error('Błąd podczas generowania PDF:', error);
      setError('Nie udało się wygenerować PDF');
      setIsGenerating(false);
    }
  };

  const handlePrint = async () => {
    setIsGenerating(true);
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) throw new Error('Nie można otworzyć okna drukowania');
      let htmlContent = `
        <html>
          <head>
            <title>Drukuj kody kreskowe</title>
            <style>
              @page { size: ${orientation}; margin: 0; }
              body { margin: 0; display: flex; flex-direction: column; align-items: center; background: white; }
              .barcode-container { 
                page-break-after: always; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                height: 100vh; 
                width: 100%; 
              }
              .barcode-container:last-child { page-break-after: avoid; }
            </style>
          </head>
          <body>
      `;
      for (let i = 0; i < assets.length; i++) {
        const isPortrait = orientation === 'portrait';
        const svgDataUrl = generateBarcodeSVGDataUrl(assets[i].pyrcode, {}, isPortrait);
        htmlContent += `
          <div class="barcode-container">
            <img src="${svgDataUrl}" style="${isPortrait 
              ? 'transform: rotate(-90deg); width: 95vh; height: auto; margin: auto; display: block;'
              : 'width: 95%; height: auto; margin: auto; display: block;'}" />
          </div>
        `;
      }
      htmlContent += `
          </body>
        </html>
      `;
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      await new Promise(resolve => {
        const imgs = printWindow.document.querySelectorAll('img');
        let loaded = 0;
        imgs.forEach(img => {
          img.onload = () => {
            loaded++;
            if (loaded === imgs.length) resolve(null);
          };
        });
      });
      printWindow.print();
      printWindow.close();
    } catch {
      setError('Nie udało się wydrukować');
    } finally {
      setIsGenerating(false);
    }
  };

  // Przejście do następnego elementu
  const handleNext = () => {
    if (currentIndex < assets.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Przejście do poprzedniego elementu
  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12}>
            <Typography variant="h5" sx={{ mb: 3, textAlign: 'center' }}>
              Generowanie kodów kreskowych
            </Typography>      
      {error && (
              <Typography color="error" sx={{ mb: 2, textAlign: 'center' }}>
          {error}
        </Typography>
      )}
      
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '4px',
              width: '100%',
              maxWidth: '300px',
              margin: '0 auto',
              mb: 3
            }}>
              <canvas 
                ref={barcodeRef} 
                style={{
                  width: '100%',
                  height: 'auto',
                  backgroundColor: 'white'
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Typography variant="body1" sx={{ mb: 1 }}>
                Element {currentIndex + 1} z {assets.length}
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, width: '100%', maxWidth: '300px', mb: 2 }}>
                <Button 
                  variant="outlined" 
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  sx={{ flex: 1 }}
                >
                  Poprzedni
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={handleNext}
                  disabled={currentIndex === assets.length - 1}
                  sx={{ flex: 1 }}
                >
                  Następny
                </Button>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', maxWidth: '300px' }}>
              <Button 
                variant="contained" 
                  color="secondary"
                onClick={handleDownloadPDF}
                  disabled={isGenerating}
                  fullWidth
              >
                {isGenerating ? 'Generowanie...' : 'Pobierz PDF'}
              </Button>
              <Box sx={{ mb: 0 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Orientacja druku:
                </Typography>
                <RadioGroup
                  row
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value as 'landscape' | 'portrait')}
                  sx={{
                     width: '100%',
                     display: 'flex',
                  }}
                >
                  <FormControlLabel 
                    value="landscape" 
                    control={<Radio />} 
                    label="Pozioma" 
                  />
                  <FormControlLabel 
                    value="portrait" 
                    control={<Radio />} 
                    label="Pionowa" 
                  />
                </RadioGroup>
              </Box>  
              <Button 
                variant="contained" 
                  color="primary"
                onClick={handlePrint}
                  disabled={isGenerating}
                  fullWidth
              >
                {isGenerating ? 'Generowanie...' : 'Drukuj'}
              </Button>
              {onClose && (
                <Button 
                  variant="outlined" 
                  onClick={onClose}
                    fullWidth
                >
                  Zamknij
                </Button>
              )}
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}; 