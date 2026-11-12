# Jogo de Desenho Ao Vivo: guia rápido

## Uma vez só
1. Extraia o ZIP DENTRO da pasta do projeto ("live tik tok"), substituindo os arquivos.
2. No terminal do VS Code: `npm install tiktok-live-connector`

## Toda vez que for jogar
1. `npm start`
2. Abra o painel pelo link "Painel admin" que aparece no terminal (tem a senha no final do link).
3. Tela do jogo (a que vai pro TikTok): http://localhost:3000
4. Teste sem live: painel > "5. Testar sem live"  (ou http://localhost:3000/?test=1)

## Regras do jogo
- Rodada de 2 minutos (muda em Data/Story.js ou no painel).
- Alguém acertou: sobe de fase. Ninguém acertou no tempo: FIM DE JOGO, tela dos melhores e volta para a fase 1.
- Palavras acabaram: painel > "Reiniciar histórico de palavras".
