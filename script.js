document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DO DOM ---
    const mainMenuEl = document.getElementById('main-menu');
    const tableTopEl = document.getElementById('table-top');
    const startGameBtn = document.getElementById('start-game-btn');
    const difficultyBtns = document.querySelectorAll('.difficulty-btn');
    const scoresEl = { team1: document.getElementById('team1-score'), team2: document.getElementById('team2-score') };
    const messageBoxEl = document.getElementById('message-box');
    const dealButton = document.getElementById('deal-button');
    const trucoButton = document.getElementById('truco-button');
    const playerAreas = [
        { handEl: document.getElementById('player-hand'), tableEl: document.getElementById('card-spot-player') },
        { handEl: document.getElementById('opponent1-hand'), tableEl: document.getElementById('card-spot-opponent1') },
        { handEl: document.getElementById('partner-hand'), tableEl: document.getElementById('card-spot-partner') },
        { handEl: document.getElementById('opponent2-hand'), tableEl: document.getElementById('card-spot-opponent2') }
    ];

    // --- ESTADO E CONFIGURAÇÕES DO JOGO ---
    let gameSettings = { difficulty: 'easy' };
    let jogadores = [];
    let baralho = [];
    let placar = { team1: 0, team2: 0 };
    let valorDaMao = 1;
    let jogoEmAndamento = false;
    let jogadorDaVezIndex = 0;
    let lockBoard = false;
    
    // Estado da Rodada
    let rodadaAtual = 1;
    let placarRodada = { team1: 0, team2: 0 };
    let cartasNaMesa = [];
    let primeiroAJogarNaRodada = 0;
    
    // --- CONSTANTES ---
    const NAIPE_ICONS = { '♦️': '<svg viewBox="0 0 24 24"><path d="M12 1.5L20.5 12L12 22.5L3.5 12L12 1.5Z"/></svg>', '♠️': '<svg viewBox="0 0 24 24"><path d="M12 1.5C14.21 1.5 16.5 2.66 18 4.5C19.5 6.34 20.5 8.79 20.5 11.5C20.5 15.5 17.5 19.5 12 22.5C6.5 19.5 3.5 15.5 3.5 11.5C3.5 8.79 4.5 6.34 6 4.5C7.5 2.66 9.79 1.5 12 1.5ZM12 4.5C10.16 4.5 8.5 5.25 7.5 6.5C6.5 7.75 6 9.5 6 11.5C6 14.5 8.5 17.5 12 19.5C15.5 17.5 18 14.5 18 11.5C18 9.5 17.5 7.75 16.5 6.5C15.5 5.25 13.84 4.5 12 4.5Z M10.5 18.5V19.5H13.5V18.5H10.5Z"/></svg>', '♥️': '<svg viewBox="0 0 24 24"><path d="M12 22.5C6.5 19.5 3.5 15.5 3.5 11.5C3.5 8.79 4.5 6.34 6 4.5C7.5 2.66 9.79 1.5 12 1.5C14.21 1.5 16.5 2.66 18 4.5C19.5 6.34 20.5 8.79 20.5 11.5C20.5 15.5 17.5 19.5 12 22.5Z"/></svg>', '♣️': '<svg viewBox="0 0 24 24"><path d="M18 10.5C18 8.03 16.47 6 14.5 6C12.53 6 11 8.03 11 10.5C11 12.16 11.83 13.58 13 14.44V18.5H16V14.44C17.17 13.58 18 12.16 18 10.5ZM9.5 6C7.53 6 6 8.03 6 10.5C6 12.16 6.83 13.58 8 14.44V18.5H11V14.44C9.83 13.58 9 12.16 9 10.5ZM15.5 4.5C16.96 4.5 18.17 5.28 18.81 6.5H20.5V9.5H18.81C18.17 10.72 16.96 11.5 15.5 11.5C14.04 11.5 12.83 10.72 12.19 9.5H11.81C11.17 10.72 9.96 11.5 8.5 11.5C7.04 11.5 5.83 10.72 5.19 9.5H3.5V6.5H5.19C5.83 5.28 7.04 4.5 8.5 4.5C9.96 4.5 11.17 5.28 11.81 6.5H12.19C12.83 5.28 14.04 4.5 15.5 4.5ZM10.5 18.5V19.5H13.5V18.5H10.5Z"/></svg>',};
    const VALORES = ["4", "5", "6", "7", "Q", "J", "K", "A", "2", "3"];
    const NAIPES = ["♦️", "♠️", "♥️", "♣️"];
    const FORCA_COMUM = { "4": 1, "5": 2, "6": 3, "7": 4, "Q": 5, "J": 6, "K": 7, "A": 8, "2": 9, "3": 10 };
    const MANILHAS_FIXAS = { '4♣️': 14, '7♥️': 13, 'A♠️': 12, '7♦️': 11 };

    // --- FUNÇÕES DE SETUP E RENDERIZAÇÃO ---
    function criarBaralho() { baralho = []; for (const naipe of NAIPES) for (const valor of VALORES) baralho.push({ valor, naipe, forca: FORCA_COMUM[valor], manilha: false }); }
    function embaralhar() { for (let i = baralho.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [baralho[i], baralho[j]] = [baralho[j], baralho[i]]; } }
    
    // Lógica verificada para garantir que a propriedade 'manilha' seja atribuída corretamente.
    function aplicarManilhasFixas() {
        baralho.forEach(c => {
            const chave = c.valor + c.naipe;
            if (MANILHAS_FIXAS[chave]) {
                c.forca = MANILHAS_FIXAS[chave];
                c.manilha = true;
            }
        });
    }

    function renderizarCarta(carta, facedown = false) {
        if (!carta) return '';
        if (facedown) return '<div class="card facedown"></div>';
        const cor = (carta.naipe === '♦️' || carta.naipe === '♥️') ? 'red' : 'black';
        const classeManilha = carta.manilha ? ' manilha' : '';
        return `<div class="card ${cor}${classeManilha}" data-valor="${carta.valor}" data-naipe="${carta.naipe}"><span>${carta.valor}</span><div class="card-icon">${NAIPE_ICONS[carta.naipe]}</div></div>`;
    }

    function renderizarTudo() {
        jogadores.forEach((jogador, i) => {
            const area = playerAreas[i];
            area.handEl.innerHTML = jogador.mao.map(c => renderizarCarta(c, i !== 0)).join('');
            const cartaNaMesa = cartasNaMesa.find(jc => jc.jogadorIndex === i);
            area.tableEl.innerHTML = renderizarCarta(cartaNaMesa?.carta);
        });
        adicionarListenersCartasJogador();
    }
    
    // --- LÓGICA DO MENU ---
    function setupMenu() {
        difficultyBtns.forEach(btn => btn.addEventListener('click', () => {
            difficultyBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            gameSettings.difficulty = btn.dataset.difficulty;
        }));
        startGameBtn.addEventListener('click', () => {
            mainMenuEl.classList.add('hidden');
            tableTopEl.classList.remove('hidden');
            iniciarJogo();
        });
    }

    // --- LÓGICA PRINCIPAL DO JOGO ---
    function iniciarJogo() {
        placar = { team1: 0, team2: 0 };
        jogadorDaVezIndex = 0;
        iniciarNovaMao();
    }

    function iniciarNovaMao() {
        if (placar.team1 >= 12 || placar.team2 >= 12) {
            atualizarMensagem(`FIM DE JOGO! Placar: ${placar.team1} a ${placar.team2}`);
            dealButton.textContent = "Menu";
            dealButton.onclick = () => window.location.reload();
            return;
        }
        lockBoard = true;
        jogoEmAndamento = true; valorDaMao = 1; rodadaAtual = 1;
        placarRodada = { team1: 0, team2: 0 }; cartasNaMesa = [];
        dealButton.disabled = true; trucoButton.disabled = false;
        
        criarBaralho(); aplicarManilhasFixas(); embaralhar();
        
        jogadores = [
            { id: 0, nome: 'Você', time: 1, mao: baralho.splice(0, 3), tipo: 'humano' },
            { id: 1, nome: 'Oponente 1', time: 2, mao: baralho.splice(0, 3), tipo: 'cpu' },
            { id: 2, nome: 'Parceiro', time: 1, mao: baralho.splice(0, 3), tipo: 'cpu' },
            { id: 3, nome: 'Oponente 2', time: 2, mao: baralho.splice(0, 3), tipo: 'cpu' }
        ];
        
        primeiroAJogarNaRodada = jogadorDaVezIndex;
        renderizarTudo();
        atualizarPlacarUI();
        processarTurno();
    }
    
    function processarTurno() {
        if (!jogoEmAndamento) return;
        const jogadorAtual = jogadores[jogadorDaVezIndex];
        atualizarMensagem(`Vez de: ${jogadorAtual.nome}`);
        lockBoard = jogadorAtual.tipo === 'cpu';
        if (jogadorAtual.tipo === 'cpu') {
            setTimeout(() => cpuJoga(jogadorAtual), 1500);
        }
    }

    function adicionarListenersCartasJogador() {
        playerAreas[0].handEl.querySelectorAll('.card').forEach(cardEl => {
            cardEl.addEventListener('click', () => {
                if (lockBoard || jogadores[jogadorDaVezIndex].tipo !== 'humano') return;
                const valor = cardEl.dataset.valor; const naipe = cardEl.dataset.naipe;
                const cartaJogada = jogadores[0].mao.find(c => c.valor === valor && c.naipe === naipe);
                jogarCarta(jogadores[0], cartaJogada);
            });
        });
    }

    function jogarCarta(jogador, carta) {
        lockBoard = true;
        jogador.mao = jogador.mao.filter(c => c !== carta);
        cartasNaMesa.push({ carta, jogadorIndex: jogador.id, time: jogador.time });
        renderizarTudo();
        setTimeout(avancarTurno, 500);
    }
    
    function cpuJoga(cpu) {
        let cartaJogada;
        cpu.mao.sort((a, b) => a.forca - b.forca);
        switch (gameSettings.difficulty) {
            case 'easy': cartaJogada = cpu.mao[Math.floor(Math.random() * cpu.mao.length)]; break;
            case 'medium':
            case 'hard':
                const cartasNaRodada = cartasNaMesa.slice(-(cartasNaMesa.length % 4));
                const maiorForcaNaMesa = Math.max(0, ...cartasNaRodada.map(c => c.carta.forca));
                const cartaParaGanhar = cpu.mao.find(c => c.forca > maiorForcaNaMesa);
                if (gameSettings.difficulty === 'hard' && rodadaAtual === 1) {
                    cartaJogada = cpu.mao[cpu.mao.length - 1];
                } else {
                    cartaJogada = cartaParaGanhar || cpu.mao[0];
                }
                break;
        }
        jogarCarta(cpu, cartaJogada);
    }
    
    function avancarTurno() {
        if (cartasNaMesa.length > 0 && cartasNaMesa.length % 4 === 0) {
            concluirRodada();
        } else {
            jogadorDaVezIndex = (jogadorDaVezIndex + 1) % 4;
            processarTurno();
        }
    }
    
    function concluirRodada() {
        const rodadaAtualCartas = cartasNaMesa.slice(-4);
        let maiorCartaInfo = rodadaAtualCartas.reduce((maior, atual) => atual.carta.forca > maior.carta.forca ? atual : maior);
        let timeVencedor = maiorCartaInfo.time;
        const empatou = rodadaAtualCartas.some(c => c.time !== timeVencedor && c.carta.forca === maiorCartaInfo.carta.forca);
        
        if (empatou) {
            placarRodada[`team1`]++; placarRodada[`team2`]++;
            atualizarMensagem(`Rodada ${rodadaAtual} empatou!`);
            primeiroAJogarNaRodada = primeiroAJogarNaRodada;
        } else {
            placarRodada[`team${timeVencedor}`]++;
            atualizarMensagem(`Time ${timeVencedor} venceu a rodada ${rodadaAtual}!`);
            primeiroAJogarNaRodada = maiorCartaInfo.jogadorIndex;
        }
        setTimeout(verificarFimDaMao, 2000);
    }
    
    function verificarFimDaMao() {
        let vencedorDaMao = null;
        if (placarRodada.team1 >= 2) vencedorDaMao = 1;
        if (placarRodada.team2 >= 2) vencedorDaMao = 2;
        
        if(vencedorDaMao || rodadaAtual >= 3) {
            if(!vencedorDaMao) {
                 if(placarRodada.team1 > placarRodada.team2) vencedorDaMao = 1;
                 else if (placarRodada.team2 > placarRodada.team1) vencedorDaMao = 2;
                 else vencedorDaMao = 'empate';
            }
            finalizarMao(vencedorDaMao);
        } else {
            iniciarNovaRodada();
        }
    }
    
    function iniciarNovaRodada() {
        rodadaAtual++;
        cartasNaMesa = [];
        jogadorDaVezIndex = primeiroAJogarNaRodada;
        renderizarTudo();
        processarTurno();
    }
    
    function finalizarMao(vencedor) {
        if (vencedor !== "empate") {
            placar[`team${vencedor}`] += valorDaMao;
            atualizarMensagem(`Time ${vencedor} venceu a mão!`);
        } else {
            atualizarMensagem("Mão empatada! Ninguém marca pontos.");
        }
        
        jogadorDaVezIndex = (jogadorDaVezIndex + 1) % 4;
        setTimeout(iniciarNovaMao, 2500);
    }

    function atualizarMensagem(msg) { messageBoxEl.textContent = msg; }
    function atualizarPlacarUI() { scoresEl.team1.textContent = placar.team1; scoresEl.team2.textContent = placar.team2; }

    // --- INICIALIZAÇÃO ---
    setupMenu();
});
