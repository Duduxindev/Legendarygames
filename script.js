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
    let trucoPedido = false;
    let trucoNivel = 0; // 0 = normal, 1 = truco (3pts), 2 = seis (6pts), 3 = nove (9pts), 4 = doze (12pts)
    let timeQuePediuTruco = null;
    let modoCartaVirada = false; // Nova variável para controlar o modo de jogo da carta
    
    // Estado da Rodada
    let rodadaAtual = 1;
    let placarRodada = { team1: 0, team2: 0 };
    let cartasNaMesa = [];
    let primeiroAJogarNaRodada = 0;
    
    // --- CONSTANTES ---
    const NAIPE_ICONS = { 
        '♦️': '<svg viewBox="0 0 24 24"><path d="M12 1.5L20.5 12L12 22.5L3.5 12L12 1.5Z"/></svg>', 
        '♠️': '<svg viewBox="0 0 24 24"><path d="M12 1.5C14.21 1.5 16.5 2.66 18 4.5C19.5 6.34 20.5 8.67 21 11H19C15.69 11 13 13.69 13 17V22.5L12 21.5L11 22.5V17C11 13.69 8.31 11 5 11H3C3.5 8.67 4.5 6.34 6 4.5C7.5 2.66 9.79 1.5 12 1.5Z"/></svg>',
        '♥️': '<svg viewBox="0 0 24 24"><path d="M12 21.5L10.4 20.09C5.07 15.24 1.5 12.05 1.5 8.19C1.5 5 4 2.5 7.19 2.5C9.02 2.5 10.78 3.39 12 4.82C13.22 3.39 14.98 2.5 16.81 2.5C20 2.5 22.5 5 22.5 8.19C22.5 12.05 18.93 15.24 13.6 20.09L12 21.5Z"/></svg>',
        '♣️': '<svg viewBox="0 0 24 24"><path d="M12 2C8.69 2 6 4.69 6 8C6 11.31 8.69 14 12 14C15.31 14 18 11.31 18 8C18 4.69 15.31 2 12 2ZM15.66 15H8.34C5.4 15 3 17.4 3 20.34V22H21V20.34C21 17.4 18.6 15 15.66 15Z"/></svg>'
    };
    const VALORES = ["4", "5", "6", "7", "Q", "J", "K", "A", "2", "3"];
    const NAIPES = ["♦️", "♠️", "♥️", "♣️"];
    const FORCA_COMUM = { "4": 1, "5": 2, "6": 3, "7": 4, "Q": 5, "J": 6, "K": 7, "A": 8, "2": 9, "3": 10 };
    const MANILHAS_FIXAS = { '4♣️': 14, '7♥️': 13, 'A♠️': 12, '7♦️': 11 };
    const TRUCO_VALORES = [1, 3, 6, 9, 12];
    const TRUCO_NOMES = ["Normal", "Truco", "Seis", "Nove", "Doze"];
    const PENSAMENTOS_BOT = {
        easy: [
            "Hmm, que carta eu jogo agora?",
            "Não sei bem o que fazer...",
            "Vou jogar essa carta aqui!",
            "Espero que essa seja boa!"
        ],
        medium: [
            "Preciso analisar as cartas na mesa...",
            "Tenho que vencer essa rodada!",
            "Vou guardar minhas cartas boas para o final",
            "Acho que posso vencer com essa carta"
        ],
        hard: [
            "Analisando a melhor jogada estratégica...",
            "Vou guardar minha manilha para a última rodada",
            "Preciso fazer essa rodada para garantir a mão",
            "Vou jogar minha carta mais forte agora"
        ],
        trucoDecisions: {
            accept: [
                "Aceito o desafio!",
                "Minhas cartas são boas, vamos lá!",
                "Você vai se arrepender de pedir truco!"
            ],
            refuse: [
                "Melhor não arriscar...",
                "Minhas cartas não são boas o suficiente",
                "Vou correr dessa vez"
            ],
            ask: [
                "Tá com medo?",
                "Quero ver se você aguenta!",
                "Vamos aumentar a aposta!"
            ]
        },
        cartaVirada: [
            "Vou jogar essa fechada para confundir...",
            "Não vou mostrar o que tenho na mão",
            "Uma carta virada pode enganar o adversário",
            "Melhor não revelar meu jogo agora"
        ]
    };

    // --- FUNÇÕES DE SETUP E RENDERIZAÇÃO ---
    function criarBaralho() { 
        baralho = []; 
        for (const naipe of NAIPES) 
            for (const valor of VALORES) 
                baralho.push({ valor, naipe, forca: FORCA_COMUM[valor], manilha: false }); 
    }

    function embaralhar() { 
        for (let i = baralho.length - 1; i > 0; i--) { 
            const j = Math.floor(Math.random() * (i + 1)); 
            [baralho[i], baralho[j]] = [baralho[j], baralho[i]]; 
        } 
    }
    
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
        if (facedown || carta.virada) return '<div class="card facedown"></div>';
        const cor = (carta.naipe === '♦️' || carta.naipe === '♥️') ? 'red' : 'black';
        const classeManilha = carta.manilha ? ' manilha' : '';
        return `<div class="card ${cor}${classeManilha}" data-valor="${carta.valor}" data-naipe="${carta.naipe}">
                   <span>${carta.valor}</span>
                   <div class="card-icon">${NAIPE_ICONS[carta.naipe]}</div>
               </div>`;
    }

    function renderizarTudo() {
        jogadores.forEach((jogador, i) => {
            const area = playerAreas[i];
            area.handEl.innerHTML = jogador.mao.map(c => renderizarCarta(c, i !== 0)).join('');
            const cartaNaMesa = cartasNaMesa.find(jc => jc.jogadorIndex === i);
            area.tableEl.innerHTML = cartaNaMesa ? renderizarCarta(cartaNaMesa.carta, false) : '';
        });
        adicionarListenersCartasJogador();
        trucoButton.textContent = `${TRUCO_NOMES[trucoNivel]}!`;
        
        // Atualiza o botão de carta virada
        const cartaViradaBtn = document.getElementById('carta-virada-btn');
        if (cartaViradaBtn) {
            cartaViradaBtn.textContent = modoCartaVirada ? "Modo: Carta Virada" : "Modo: Carta Normal";
            cartaViradaBtn.classList.toggle('active', modoCartaVirada);
        }
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

        dealButton.addEventListener('click', iniciarNovaMao);
        trucoButton.addEventListener('click', pedirTruco);
        
        // Adiciona botão para jogar carta virada
        const actionsEl = document.getElementById('actions');
        const cartaViradaBtn = document.createElement('button');
        cartaViradaBtn.id = 'carta-virada-btn';
        cartaViradaBtn.textContent = "Modo: Carta Normal";
        cartaViradaBtn.addEventListener('click', toggleModoCartaVirada);
        actionsEl.appendChild(cartaViradaBtn);
    }
    
    function toggleModoCartaVirada() {
        if (jogadorDaVezIndex === 0 && !lockBoard) {
            modoCartaVirada = !modoCartaVirada;
            renderizarTudo();
            atualizarMensagem(modoCartaVirada ? 
                "Modo carta virada: a próxima carta será jogada fechada." : 
                "Modo carta normal: a próxima carta será jogada aberta.");
        }
    }

    function pedirTruco() {
        if (!jogoEmAndamento || lockBoard || trucoPedido) return;
        
        if (trucoNivel >= 4) {
            atualizarMensagem("Já estamos no valor máximo!");
            return;
        }
        
        trucoPedido = true;
        timeQuePediuTruco = jogadores[0].time;
        atualizarMensagem("TRUCO! O time adversário está decidindo...");
        trucoButton.disabled = true;
        
        setTimeout(() => {
            const timeAdversario = timeQuePediuTruco === 1 ? 2 : 1;
            const jogadoresAdversarios = jogadores.filter(j => j.time === timeAdversario);
            
            // Lógica de decisão baseada na dificuldade e na qualidade das cartas
            let forcaMediaCartas = 0;
            jogadoresAdversarios.forEach(j => {
                forcaMediaCartas += j.mao.reduce((sum, c) => sum + c.forca, 0) / j.mao.length;
            });
            forcaMediaCartas /= jogadoresAdversarios.length;
            
            // Chances de aceitar o truco variam com a dificuldade
            let chanceDeAceitar = 0;
            switch (gameSettings.difficulty) {
                case 'easy': chanceDeAceitar = 0.8; break; // Aceita mais facilmente
                case 'medium': chanceDeAceitar = 0.5 + (forcaMediaCartas / 20); break; // Considera a força das cartas
                case 'hard': chanceDeAceitar = 0.3 + (forcaMediaCartas / 15); break; // Mais cauteloso
            }
            
            // Diminui a chance de aceitar em níveis mais altos de truco
            chanceDeAceitar -= trucoNivel * 0.1;
            
            const aceita = Math.random() < chanceDeAceitar;
            
            if (aceita) {
                const pensamento = PENSAMENTOS_BOT.trucoDecisions.accept[Math.floor(Math.random() * PENSAMENTOS_BOT.trucoDecisions.accept.length)];
                mostrarPensamentoCPU(pensamento);
                
                trucoNivel++;
                valorDaMao = TRUCO_VALORES[trucoNivel];
                atualizarMensagem(`Truco ACEITO! Valor da mão: ${valorDaMao} pontos`);
                
                setTimeout(() => {
                    trucoPedido = false;
                    trucoButton.disabled = false;
                    trucoButton.textContent = `${TRUCO_NOMES[trucoNivel]}!`;
                    processarTurno();
                }, 1500);
            } else {
                const pensamento = PENSAMENTOS_BOT.trucoDecisions.refuse[Math.floor(Math.random() * PENSAMENTOS_BOT.trucoDecisions.refuse.length)];
                mostrarPensamentoCPU(pensamento);
                
                atualizarMensagem("Truco RECUSADO! Você ganhou a mão.");
                placar[`team${timeQuePediuTruco}`] += TRUCO_VALORES[trucoNivel];
                atualizarPlacarUI();
                
                setTimeout(() => {
                    jogadorDaVezIndex = (jogadorDaVezIndex + 1) % 4;
                    iniciarNovaMao();
                }, 2000);
            }
        }, 2000);
    }

    function cpuPedirTruco(cpu) {
        if (trucoNivel >= 4 || trucoPedido) return false;
        
        let forcaMedia = cpu.mao.reduce((sum, c) => sum + c.forca, 0) / cpu.mao.length;
        let limiarTruco;
        
        switch (gameSettings.difficulty) {
            case 'easy': limiarTruco = 10; break; // Raramente pede truco
            case 'medium': limiarTruco = 8; break; // Pede truco com cartas médias
            case 'hard': limiarTruco = 7; break; // Pede truco com mais frequência
        }
        
        // Chance maior de pedir truco quando está perdendo
        if (placar[`team${cpu.time === 1 ? 2 : 1}`] > placar[`team${cpu.time}`]) {
            limiarTruco--;
        }
        
        // Chance maior de pedir truco em rodadas avançadas
        if (rodadaAtual >= 2) {
            limiarTruco--;
        }
        
        if (forcaMedia >= limiarTruco && Math.random() < 0.3) {
            const pensamento = PENSAMENTOS_BOT.trucoDecisions.ask[Math.floor(Math.random() * PENSAMENTOS_BOT.trucoDecisions.ask.length)];
            mostrarPensamentoCPU(pensamento);
            
            trucoPedido = true;
            timeQuePediuTruco = cpu.time;
            atualizarMensagem(`${cpu.nome} pediu ${TRUCO_NOMES[trucoNivel+1]}! Aceita?`);
            
            // Cria botões temporários para aceitar/recusar
            const aceitaBtn = document.createElement('button');
            aceitaBtn.textContent = "Aceitar";
            aceitaBtn.classList.add('truco-response');
            
            const recusaBtn = document.createElement('button');
            recusaBtn.textContent = "Recusar";
            recusaBtn.classList.add('truco-response');
            
            const btnContainer = document.createElement('div');
            btnContainer.id = 'truco-response-container';
            btnContainer.style.position = 'fixed';
            btnContainer.style.top = '50%';
            btnContainer.style.left = '50%';
            btnContainer.style.transform = 'translate(-50%, -50%)';
            btnContainer.style.zIndex = '100';
            btnContainer.style.display = 'flex';
            btnContainer.style.gap = '20px';
            
            btnContainer.appendChild(aceitaBtn);
            btnContainer.appendChild(recusaBtn);
            document.body.appendChild(btnContainer);
            
            aceitaBtn.addEventListener('click', () => {
                document.body.removeChild(btnContainer);
                trucoNivel++;
                valorDaMao = TRUCO_VALORES[trucoNivel];
                atualizarMensagem(`Você aceitou o ${TRUCO_NOMES[trucoNivel]}! Valor da mão: ${valorDaMao} pontos`);
                trucoButton.textContent = `${TRUCO_NOMES[trucoNivel]}!`;
                trucoPedido = false;
                setTimeout(processarTurno, 1500);
            });
            
            recusaBtn.addEventListener('click', () => {
                document.body.removeChild(btnContainer);
                atualizarMensagem(`Você recusou o ${TRUCO_NOMES[trucoNivel+1]}! Adversários ganham a mão.`);
                placar[`team${cpu.time}`] += TRUCO_VALORES[trucoNivel];
                atualizarPlacarUI();
                setTimeout(() => {
                    jogadorDaVezIndex = (jogadorDaVezIndex + 1) % 4;
                    iniciarNovaMao();
                }, 2000);
            });
            
            return true;
        }
        
        return false;
    }

    // --- LÓGICA PRINCIPAL DO JOGO ---
    function iniciarJogo() {
        placar = { team1: 0, team2: 0 };
        jogadorDaVezIndex = 0;
        iniciarNovaMao();
    }

    function iniciarNovaMao() {
        if (placar.team1 >= 12 || placar.team2 >= 12) {
            const vencedor = placar.team1 >= 12 ? "Seu time" : "Time adversário";
            atualizarMensagem(`FIM DE JOGO! ${vencedor} venceu! Placar: ${placar.team1} a ${placar.team2}`);
            dealButton.textContent = "Nova Partida";
            dealButton.onclick = () => window.location.reload();
            return;
        }
        
        lockBoard = true;
        jogoEmAndamento = true;
        valorDaMao = 1;
        trucoNivel = 0;
        trucoPedido = false;
        modoCartaVirada = false;
        rodadaAtual = 1;
        placarRodada = { team1: 0, team2: 0 };
        cartasNaMesa = [];
        dealButton.disabled = true;
        trucoButton.disabled = false;
        trucoButton.textContent = "TRUCO!";
        
        criarBaralho();
        aplicarManilhasFixas();
        embaralhar();
        
        jogadores = [
            { id: 0, nome: 'Você', time: 1, mao: baralho.splice(0, 3), tipo: 'humano' },
            { id: 1, nome: 'Oponente 1', time: 2, mao: baralho.splice(0, 3), tipo: 'cpu' },
            { id: 2, nome: 'Parceiro', time: 1, mao: baralho.splice(0, 3), tipo: 'cpu' },
            { id: 3, nome: 'Oponente 2', time: 2, mao: baralho.splice(0, 3), tipo: 'cpu' }
        ];

        // Ajuste de dificuldade: distribuir melhores cartas baseado na dificuldade
        if (gameSettings.difficulty === 'easy') {
            // No modo fácil, aumentamos a chance do jogador ter boas cartas
            const todasCartas = [...jogadores[0].mao, ...jogadores[1].mao, ...jogadores[2].mao, ...jogadores[3].mao];
            todasCartas.sort((a, b) => b.forca - a.forca);
            
            jogadores[0].mao = todasCartas.slice(0, 3); // Jogador humano recebe as melhores cartas
            jogadores[2].mao = todasCartas.slice(3, 6); // Parceiro recebe cartas médias-altas
            jogadores[1].mao = todasCartas.slice(6, 9); // Oponentes recebem as piores cartas
            jogadores[3].mao = todasCartas.slice(9, 12);
        } else if (gameSettings.difficulty === 'hard') {
            // No modo difícil, os oponentes recebem melhores cartas
            const todasCartas = [...jogadores[0].mao, ...jogadores[1].mao, ...jogadores[2].mao, ...jogadores[3].mao];
            todasCartas.sort((a, b) => b.forca - a.forca);
            
            jogadores[1].mao = todasCartas.slice(0, 3); // Oponentes recebem as melhores cartas
            jogadores[3].mao = todasCartas.slice(3, 6);
            jogadores[2].mao = todasCartas.slice(6, 9); // Parceiro recebe cartas médias-baixas
            jogadores[0].mao = todasCartas.slice(9, 12); // Jogador humano recebe as piores cartas
        }
        
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
            // CPU pode pedir truco antes de jogar
            if (cpuPedirTruco(jogadorAtual)) {
                return; // Espera a resposta do jogador ao truco
            }
            
            setTimeout(() => cpuJoga(jogadorAtual), 1500);
        }
    }

    function adicionarListenersCartasJogador() {
        playerAreas[0].handEl.querySelectorAll('.card').forEach(cardEl => {
            cardEl.addEventListener('click', () => {
                if (lockBoard || jogadores[jogadorDaVezIndex].tipo !== 'humano' || trucoPedido) return;
                const valor = cardEl.dataset.valor;
                const naipe = cardEl.dataset.naipe;
                const cartaJogada = jogadores[0].mao.find(c => c.valor === valor && c.naipe === naipe);
                
                // Marca a carta como virada se o modo estiver ativado
                if (modoCartaVirada) {
                    cartaJogada.virada = true;
                    // Desativa o modo após jogar uma carta virada
                    modoCartaVirada = false;
                }
                
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
    
    function mostrarPensamentoCPU(pensamento) {
        const balaoEl = document.createElement('div');
        balaoEl.classList.add('cpu-thought');
        balaoEl.style.position = 'fixed';
        balaoEl.style.top = '30%';
        balaoEl.style.left = '50%';
        balaoEl.style.transform = 'translate(-50%, -50%)';
        balaoEl.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        balaoEl.style.padding = '15px 20px';
        balaoEl.style.borderRadius = '20px';
        balaoEl.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.2)';
        balaoEl.style.zIndex = '100';
        balaoEl.style.fontFamily = 'var(--font-main)';
        balaoEl.style.maxWidth = '300px';
        balaoEl.style.textAlign = 'center';
        
        balaoEl.textContent = pensamento;
        document.body.appendChild(balaoEl);
        
        setTimeout(() => {
            balaoEl.style.opacity = '0';
            balaoEl.style.transition = 'opacity 0.5s ease';
            setTimeout(() => document.body.removeChild(balaoEl), 500);
        }, 2000);
    }
    
    function cpuJoga(cpu) {
        // Mostra o "pensamento" do CPU
        const dificuldade = gameSettings.difficulty;
        let pensamentos = PENSAMENTOS_BOT[dificuldade];
        
        // Decide se vai jogar carta virada
        let jogaCartaVirada = false;
        if (Math.random() < 0.2 && gameSettings.difficulty !== 'easy') { // 20% de chance em médio e difícil
            jogaCartaVirada = true;
            pensamentos = PENSAMENTOS_BOT.cartaVirada;
        }
        
        const pensamento = pensamentos[Math.floor(Math.random() * pensamentos.length)];
        mostrarPensamentoCPU(pensamento);
        
        // Lógica de jogo baseada na dificuldade
        let cartaJogada;
        cpu.mao.sort((a, b) => a.forca - b.forca);
        
        const cartasNaRodada = cartasNaMesa.slice(-(cartasNaMesa.length % 4));
        // Filtra apenas cartas visíveis para considerar a maior força
        const cartasVisiveis = cartasNaRodada.filter(c => !c.carta.virada);
        const maiorForcaNaMesa = cartasVisiveis.length > 0 ? 
            Math.max(...cartasVisiveis.map(c => c.carta.forca)) : 0;
        const maiorCartaInfo = cartasVisiveis.length > 0 ? 
            cartasVisiveis.reduce((maior, atual) => atual.carta.forca > maior.carta.forca ? atual : maior) : 
            null;
        
        switch (dificuldade) {
            case 'easy':
                // No fácil, joga praticamente aleatório
                if (Math.random() < 0.7) {
                    cartaJogada = cpu.mao[Math.floor(Math.random() * cpu.mao.length)];
                } else {
                    // Às vezes tenta ganhar
                    const cartaParaGanhar = cpu.mao.find(c => c.forca > maiorForcaNaMesa);
                    cartaJogada = cartaParaGanhar || cpu.mao[Math.floor(Math.random() * cpu.mao.length)];
                }
                break;
                
            case 'medium':
                // No médio, tem alguma estratégia
                if (rodadaAtual === 1) {
                    // Na primeira rodada, tenta economizar cartas fortes
                    if (cartasNaRodada.length === 0 || 
                        (maiorCartaInfo && maiorCartaInfo.time === cpu.time)) {
                        // Se é o primeiro a jogar ou se seu time já está vencendo, joga carta fraca
                        cartaJogada = cpu.mao[0]; // Carta mais fraca
                    } else {
                        // Tenta ganhar a rodada com a carta mais fraca possível
                        const cartaParaGanhar = cpu.mao.find(c => c.forca > maiorForcaNaMesa);
                        cartaJogada = cartaParaGanhar || cpu.mao[cpu.mao.length - 1]; // A mais forte se não tiver como ganhar
                    }
                } else {
                    // Nas outras rodadas, joga mais estrategicamente
                    if (placarRodada[`team${cpu.time}`] > 0) {
                        // Se já ganhou uma rodada, tenta ganhar com carta fraca
                        const cartaParaGanhar = cpu.mao.find(c => c.forca > maiorForcaNaMesa);
                        cartaJogada = cartaParaGanhar || cpu.mao[0];
                    } else {
                        // Precisa ganhar, joga mais forte
                        cartaJogada = cpu.mao[cpu.mao.length - 1]; // Carta mais forte
                    }
                }
                break;
                
            case 'hard':
                // No difícil, joga quase como um profissional
                if (rodadaAtual === 1) {
                    // Na primeira rodada, avalia se vale a pena tentar ganhar
                    const parceiro = jogadores.find(j => j.time === cpu.time && j.id !== cpu.id);
                    const parceiroJogou = cartasNaRodada.some(c => c.jogadorIndex === parceiro.id);
                    
                    if (parceiroJogou && maiorCartaInfo && maiorCartaInfo.time === cpu.time) {
                        // Parceiro já está ganhando, joga fraco
                        cartaJogada = cpu.mao[0];
                    } else if (cartasNaRodada.length === 0 || cartasNaRodada.length === 2) {
                        // É o primeiro ou terceiro a jogar, joga forte
                        if (cpu.mao.some(c => c.manilha)) {
                            // Se tem manilha, joga ela para garantir
                            cartaJogada = cpu.mao.find(c => c.manilha);
                        } else {
                            cartaJogada = cpu.mao[cpu.mao.length - 1]; // Carta mais forte
                        }
                    } else {
                        // É o segundo ou quarto, tenta ganhar com o mínimo necessário
                        const cartaParaGanhar = cpu.mao.find(c => c.forca > maiorForcaNaMesa);
                        if (cartaParaGanhar) {
                            // Se pode ganhar, joga a mais fraca possível para isso
                            const cartasGanhadoras = cpu.mao.filter(c => c.forca > maiorForcaNaMesa);
                            cartasGanhadoras.sort((a, b) => a.forca - b.forca);
                            cartaJogada = cartasGanhadoras[0];
                        } else {
                            // Se não pode ganhar, joga a mais fraca
                            cartaJogada = cpu.mao[0];
                        }
                    }
                } else {
                    // Em rodadas avançadas, joga mais calculadamente
                    if (placarRodada[`team${cpu.time}`] > 0) {
                        // Se já ganhou uma rodada, só precisa de mais uma
                        if (cartasNaRodada.length === 0 || 
                            (maiorCartaInfo && maiorCartaInfo.time === cpu.time)) {
                            // Se é o primeiro ou se está ganhando, joga fraco
                            cartaJogada = cpu.mao[0];
                        } else {
                            // Tenta ganhar com o mínimo necessário
                            const cartaParaGanhar = cpu.mao.find(c => c.forca > maiorForcaNaMesa);
                            cartaJogada = cartaParaGanhar || cpu.mao[0];
                        }
                    } else if (placarRodada[`team${cpu.time === 1 ? 2 : 1}`] > 0) {
                        // Adversário já ganhou uma, precisa ganhar essa a qualquer custo
                        if (cpu.mao.some(c => c.manilha)) {
                            cartaJogada = cpu.mao.find(c => c.manilha);
                        } else {
                            cartaJogada = cpu.mao[cpu.mao.length - 1]; // Carta mais forte
                        }
                    } else {
                        // Ainda está 0x0, joga médio
                        if (cartasNaRodada.length === 0) {
                            // É o primeiro, joga médio
                            cartaJogada = cpu.mao[Math.floor(cpu.mao.length / 2)];
                        } else if (maiorCartaInfo && maiorCartaInfo.time === cpu.time) {
                            // Time já está ganhando, economiza
                            cartaJogada = cpu.mao[0];
                        } else {
                            // Tenta ganhar
                            const cartaParaGanhar = cpu.mao.find(c => c.forca > maiorForcaNaMesa);
                            cartaJogada = cartaParaGanhar || cpu.mao[cpu.mao.length - 1];
                        }
                    }
                }
                break;
        }
        
        // Aplica a decisão de jogar carta virada
        if (jogaCartaVirada) {
            cartaJogada.virada = true;
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
        
        // Revela todas as cartas viradas no final da rodada
        rodadaAtualCartas.forEach(info => {
            if (info.carta.virada) {
                info.carta.virada = false;
                renderizarTudo();
            }
        });
        
        // Pausa para que o jogador possa ver as cartas reveladas
        setTimeout(() => {
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
        }, 1500);
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
            atualizarMensagem(`Time ${vencedor} venceu a mão! +${valorDaMao} pontos`);
        } else {
            atualizarMensagem("Mão empatada! Ninguém marca pontos.");
        }
        
        atualizarPlacarUI();
        dealButton.disabled = false;
        trucoButton.disabled = true;
        jogadorDaVezIndex = (jogadorDaVezIndex + 1) % 4;
        jogoEmAndamento = false;
    }

    function atualizarMensagem(msg) { 
        messageBoxEl.textContent = msg; 
    }
    
    function atualizarPlacarUI() { 
        scoresEl.team1.textContent = placar.team1; 
        scoresEl.team2.textContent = placar.team2; 
    }

    // --- INICIALIZAÇÃO ---
    setupMenu();
});
