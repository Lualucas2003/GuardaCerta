# Transcrição de Áudio - Implementação Gratuita

## Como Funciona

A aplicação agora usa a **Web Speech API** do navegador para transcrição de áudio **gratuita e sem necessidade de API keys**.

### Funcionalidades

- **Transcrição ao Vivo**: Durante a gravação, o texto aparece em tempo real
- **Transcrição Final**: Após parar a gravação, o texto final é salvo
- **Suporte a Português**: Configurado para `pt-BR`
- **Sem Custos**: Usa apenas recursos do navegador

### Compatibilidade

- ✅ Chrome/Chromium (completo)
- ✅ Edge (completo)
- ✅ Safari (limitado)
- ❌ Firefox (não suporta)

### Como Usar

1. Clique em "Gravar Áudio"
2. Permita acesso ao microfone quando solicitado
3. Fale claramente em português
4. Veja a transcrição aparecer em tempo real
5. Clique em "Parar Gravação" quando terminar
6. O texto transcrito será salvo automaticamente

### Limitações

- Funciona apenas durante a gravação (não em arquivos salvos)
- Requer conexão com internet para alguns navegadores
- Qualidade depende da clareza da fala e do microfone
- Não funciona offline em todos os navegadores

### Alternativa com API (Opcional)

Se precisar transcrever arquivos de áudio salvos, pode reverter para usar Gemini API:

1. Instale: `npm install @google/genai`
2. Adicione `VITE_GEMINI_API_KEY=sua_key` no `.env`
3. Modifique o código para usar a API externa

Mas para uso básico, a Web Speech API é suficiente e gratuita!