// Script de Emergência para Imagens - Adriel Claro Corretor
// Este script contém as imagens em base64 e vai inseri-las diretamente na página

// Função principal
(function() {
  // Imagens em base64 pré-codificadas
  // Estes são placeholders - você pode substituir pelo código real gerado pela página direta-fix.html
  const LOGO_DATA_URI = 'data:image/png;base64,...'; // Será substituído pelo valor real
  const BG_DATA_URI = 'data:image/jpeg;base64,...';  // Será substituído pelo valor real
  
  // Função para aplicar as correções
  function applyImageFixes() {
    console.log('Aplicando correções de emergência para imagens...');
    
    // 1. Substituir o logo
    document.querySelectorAll('img').forEach(function(img) {
      const src = img.getAttribute('src');
      if (!src) return;
      
      // Verificar se é uma imagem de logo
      if (src.includes('logo') || img.classList.contains('logo-img') || 
          img.alt && img.alt.toLowerCase().includes('logo')) {
        console.log('Substituindo logo:', img);
        img.src = LOGO_DATA_URI;
      }
    });
    
    // 2. Substituir backgrounds
    // Substituir o background principal
    const servicoContainer = document.querySelector('#s__serviços .container');
    if (servicoContainer) {
      console.log('Substituindo background principal');
      servicoContainer.style.backgroundImage = 'url(' + BG_DATA_URI + ')';
      servicoContainer.style.backgroundSize = 'cover';
      servicoContainer.style.backgroundPosition = 'center';
    }
    
    // 3. Corrigir todos os elementos com background-image
    document.querySelectorAll('[style*="background-image"]').forEach(function(el) {
      const style = getComputedStyle(el).backgroundImage;
      if (style.includes('bg1.jpg') || !style || style === 'none') {
        console.log('Corrigindo background para:', el);
        el.style.backgroundImage = 'url(' + BG_DATA_URI + ')';
      }
    });
    
    // 4. Criar um CSS com correções específicas
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      /* Correções de emergência */
      #s__serviços .container {
        background-image: url(${BG_DATA_URI}) !important;
        background-size: cover !important;
        background-position: center !important;
      }
      
      .hero-section {
        background-image: url(${BG_DATA_URI}) !important;
        background-size: cover !important;
        background-position: center !important;
      }
      
      /* Adicionar mais seletores específicos aqui se necessário */
    `;
    document.head.appendChild(styleElement);
    
    console.log('Correções de emergência aplicadas!');
  }
  
  // Executar a função quando o DOM estiver carregado
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyImageFixes);
  } else {
    applyImageFixes();
  }
  
  // Executar também após carregar completamente a página
  window.addEventListener('load', applyImageFixes);
  
  // Executar novamente após um pequeno atraso
  setTimeout(applyImageFixes, 1000);
})(); 